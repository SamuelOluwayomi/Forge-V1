use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

declare_id!("AkoaVinz9Md94KsC2k6sULNdwvqh2uF16KdKiWdpr6ye"); // replace after anchor build

#[program]
pub mod forge_escrow {
    use super::*;

    // ─────────────────────────────────────────────
    // 1. CREATE TASK
    // Called by the client when posting a new task.
    // Stores task metadata and escrow config on-chain.
    // Funds are NOT locked yet — locking happens on accept_worker.
    // ─────────────────────────────────────────────
    pub fn create_task(
        ctx: Context<CreateTask>,
        task_id: u64,
        amount: u64,
        review_window_days: u8,
        difficulty: u8,
        task_metadata_uri: String,
    ) -> Result<()> {
        // Validate inputs
        require!(amount > 0, ForgeError::InvalidAmount);
        require!(
            review_window_days >= 1 && review_window_days <= 7,
            ForgeError::InvalidReviewWindow
        );
        require!(
            difficulty >= 1 && difficulty <= 4,
            ForgeError::InvalidDifficulty
        );
        require!(
            task_metadata_uri.len() <= 200,
            ForgeError::MetadataUriTooLong
        );

        let escrow = &mut ctx.accounts.escrow_account;
        let clock = Clock::get()?;

        escrow.task_id = task_id;
        escrow.client = ctx.accounts.client.key();
        escrow.worker = Pubkey::default(); // no worker yet
        escrow.amount = amount;
        escrow.status = EscrowStatus::Open;
        escrow.difficulty = difficulty;
        escrow.review_window_days = review_window_days;
        escrow.auto_release_window = (review_window_days as i64) * 86_400; // seconds
        escrow.task_metadata_uri = task_metadata_uri;
        escrow.submission_uri = String::new();
        escrow.ai_report_hash = None;
        escrow.submission_timestamp = None;
        escrow.created_at = clock.unix_timestamp;
        escrow.bump = ctx.bumps.escrow_account;

        emit!(TaskCreated {
            task_id,
            client: escrow.client,
            amount,
            difficulty,
            review_window_days,
        });

        Ok(())
    }

    // ─────────────────────────────────────────────
    // 2. ACCEPT WORKER
    // Called by the client to select a worker.
    // USDC transfers from client's token account → escrow vault PDA.
    // Status moves Open → Active.
    // ─────────────────────────────────────────────
    pub fn accept_worker(ctx: Context<AcceptWorker>, worker: Pubkey) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow_account;

        require!(
            escrow.status == EscrowStatus::Open,
            ForgeError::InvalidStatus
        );
        require!(
            escrow.client == ctx.accounts.client.key(),
            ForgeError::Unauthorized
        );
        require!(worker != Pubkey::default(), ForgeError::InvalidWorker);

        // Transfer USDC from client → vault
        let transfer_ctx = CpiContext::new(
            ctx.accounts.token_program.key(),
            Transfer {
                from: ctx.accounts.client_token_account.to_account_info(),
                to: ctx.accounts.vault.to_account_info(),
                authority: ctx.accounts.client.to_account_info(),
            },
        );
        token::transfer(transfer_ctx, escrow.amount)?;

        escrow.worker = worker;
        escrow.status = EscrowStatus::Active;

        emit!(WorkerAccepted {
            task_id: escrow.task_id,
            client: escrow.client,
            worker,
        });

        Ok(())
    }

    // ─────────────────────────────────────────────
    // 3. SUBMIT WORK
    // Called by the worker when deliverable is ready.
    // Records submission timestamp — this starts the
    // client's review window countdown.
    // Status moves Active → Submitted.
    // ─────────────────────────────────────────────
    pub fn submit_work(
        ctx: Context<SubmitWork>,
        submission_uri: String,
        ai_report_hash: Option<[u8; 32]>,
    ) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow_account;
        let clock = Clock::get()?;

        require!(
            escrow.status == EscrowStatus::Active,
            ForgeError::InvalidStatus
        );
        require!(
            escrow.worker == ctx.accounts.worker.key(),
            ForgeError::Unauthorized
        );
        require!(
            submission_uri.len() <= 200,
            ForgeError::MetadataUriTooLong
        );

        escrow.submission_uri = submission_uri;
        escrow.ai_report_hash = ai_report_hash;
        escrow.submission_timestamp = Some(clock.unix_timestamp);
        escrow.status = EscrowStatus::Submitted;

        emit!(WorkSubmitted {
            task_id: escrow.task_id,
            worker: escrow.worker,
            submission_timestamp: clock.unix_timestamp,
            auto_release_at: clock.unix_timestamp + escrow.auto_release_window,
        });

        Ok(())
    }

    // ─────────────────────────────────────────────
    // 4. APPROVE WORK
    // Called by the client to approve the submission.
    // Releases USDC from vault → worker, minus protocol fee.
    // Status moves Submitted → Completed.
    // ─────────────────────────────────────────────
    pub fn approve_work(ctx: Context<ApproveWork>) -> Result<()> {
        // Extract needed values before mutable borrow
        let bump = ctx.accounts.escrow_account.bump;
        let task_id = ctx.accounts.escrow_account.task_id;
        let client_key = ctx.accounts.escrow_account.client;
        let worker_key = ctx.accounts.escrow_account.worker;
        let amount = ctx.accounts.escrow_account.amount;

        require!(
            ctx.accounts.escrow_account.status == EscrowStatus::Submitted,
            ForgeError::InvalidStatus
        );
        require!(
            client_key == ctx.accounts.client.key(),
            ForgeError::Unauthorized
        );

        // Calculate protocol fee (2%)
        let fee_amount = amount.checked_mul(200).unwrap().checked_div(10_000).unwrap();
        let worker_amount = amount.checked_sub(fee_amount).unwrap();

        let task_id_bytes = task_id.to_le_bytes();
        let seeds = &[
            b"escrow",
            client_key.as_ref(),
            task_id_bytes.as_ref(),
            &[bump],
        ];
        let signer_seeds = &[&seeds[..]];

        let escrow_info = ctx.accounts.escrow_account.to_account_info();

        // Release to worker
        let worker_transfer = CpiContext::new_with_signer(
            ctx.accounts.token_program.key(),
            Transfer {
                from: ctx.accounts.vault.to_account_info(),
                to: ctx.accounts.worker_token_account.to_account_info(),
                authority: escrow_info.clone(),
            },
            signer_seeds,
        );
        token::transfer(worker_transfer, worker_amount)?;

        // Send fee to Forge treasury
        let fee_transfer = CpiContext::new_with_signer(
            ctx.accounts.token_program.key(),
            Transfer {
                from: ctx.accounts.vault.to_account_info(),
                to: ctx.accounts.treasury.to_account_info(),
                authority: escrow_info.clone(),
            },
            signer_seeds,
        );
        token::transfer(fee_transfer, fee_amount)?;

        // Update status after CPI calls
        ctx.accounts.escrow_account.status = EscrowStatus::Completed;

        emit!(WorkApproved {
            task_id,
            client: client_key,
            worker: worker_key,
            worker_amount,
            fee_amount,
        });

        Ok(())
    }

    // ─────────────────────────────────────────────
    // 5. CLAIM COMPLETION (Auto-release)
    // Permissionless — anyone can call this after the
    // review window expires with no client response.
    // In practice, the worker calls it themselves.
    // Status moves Submitted → Completed.
    // ─────────────────────────────────────────────
    pub fn claim_completion(ctx: Context<ClaimCompletion>) -> Result<()> {
        let clock = Clock::get()?;

        // Extract needed values before mutable borrow
        let bump = ctx.accounts.escrow_account.bump;
        let task_id = ctx.accounts.escrow_account.task_id;
        let client_key = ctx.accounts.escrow_account.client;
        let worker_key = ctx.accounts.escrow_account.worker;
        let amount = ctx.accounts.escrow_account.amount;
        let auto_release_window = ctx.accounts.escrow_account.auto_release_window;

        require!(
            ctx.accounts.escrow_account.status == EscrowStatus::Submitted,
            ForgeError::InvalidStatus
        );

        let submission_time = ctx.accounts.escrow_account
            .submission_timestamp
            .ok_or(ForgeError::NoSubmissionFound)?;

        let deadline = submission_time
            .checked_add(auto_release_window)
            .unwrap();

        require!(
            clock.unix_timestamp >= deadline,
            ForgeError::ReviewWindowNotExpired
        );

        // Same fee logic as approve_work
        let fee_amount = amount.checked_mul(200).unwrap().checked_div(10_000).unwrap();
        let worker_amount = amount.checked_sub(fee_amount).unwrap();

        let task_id_bytes = task_id.to_le_bytes();
        let seeds = &[
            b"escrow",
            client_key.as_ref(),
            task_id_bytes.as_ref(),
            &[bump],
        ];
        let signer_seeds = &[&seeds[..]];

        let escrow_info = ctx.accounts.escrow_account.to_account_info();

        let worker_transfer = CpiContext::new_with_signer(
            ctx.accounts.token_program.key(),
            Transfer {
                from: ctx.accounts.vault.to_account_info(),
                to: ctx.accounts.worker_token_account.to_account_info(),
                authority: escrow_info.clone(),
            },
            signer_seeds,
        );
        token::transfer(worker_transfer, worker_amount)?;

        let fee_transfer = CpiContext::new_with_signer(
            ctx.accounts.token_program.key(),
            Transfer {
                from: ctx.accounts.vault.to_account_info(),
                to: ctx.accounts.treasury.to_account_info(),
                authority: escrow_info.clone(),
            },
            signer_seeds,
        );
        token::transfer(fee_transfer, fee_amount)?;

        // Update status after CPI calls
        ctx.accounts.escrow_account.status = EscrowStatus::Completed;

        emit!(AutoReleased {
            task_id,
            worker: worker_key,
            worker_amount,
            released_at: clock.unix_timestamp,
        });

        Ok(())
    }

    // ─────────────────────────────────────────────
    // 6. RAISE DISPUTE
    // Called by either client or worker.
    // Freezes funds until Forge multisig resolves.
    // Status moves Submitted → Disputed.
    // ─────────────────────────────────────────────
    pub fn raise_dispute(ctx: Context<RaiseDispute>, reason_uri: String) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow_account;

        require!(
            escrow.status == EscrowStatus::Submitted,
            ForgeError::InvalidStatus
        );

        let caller = ctx.accounts.caller.key();
        require!(
            caller == escrow.client || caller == escrow.worker,
            ForgeError::Unauthorized
        );
        require!(reason_uri.len() <= 200, ForgeError::MetadataUriTooLong);

        escrow.status = EscrowStatus::Disputed;

        emit!(DisputeRaised {
            task_id: escrow.task_id,
            raised_by: caller,
            reason_uri,
        });

        Ok(())
    }

    // ─────────────────────────────────────────────
    // 7. RESOLVE DISPUTE
    // Called by Forge multisig/arbitrator only.
    // Releases funds to winner (client or worker).
    // Status moves Disputed → Completed or Cancelled.
    // ─────────────────────────────────────────────
    pub fn resolve_dispute(
        ctx: Context<ResolveDispute>,
        release_to_worker: bool,
    ) -> Result<()> {
        // Extract needed values before mutable borrow
        let bump = ctx.accounts.escrow_account.bump;
        let task_id = ctx.accounts.escrow_account.task_id;
        let client_key = ctx.accounts.escrow_account.client;
        let amount = ctx.accounts.escrow_account.amount;

        require!(
            ctx.accounts.escrow_account.status == EscrowStatus::Disputed,
            ForgeError::InvalidStatus
        );

        let task_id_bytes = task_id.to_le_bytes();
        let seeds = &[
            b"escrow",
            client_key.as_ref(),
            task_id_bytes.as_ref(),
            &[bump],
        ];
        let signer_seeds = &[&seeds[..]];

        let escrow_info = ctx.accounts.escrow_account.to_account_info();

        if release_to_worker {
            // Worker wins — same fee applies
            let fee_amount = amount.checked_mul(200).unwrap().checked_div(10_000).unwrap();
            let worker_amount = amount.checked_sub(fee_amount).unwrap();

            let worker_transfer = CpiContext::new_with_signer(
                ctx.accounts.token_program.key(),
                Transfer {
                    from: ctx.accounts.vault.to_account_info(),
                    to: ctx.accounts.recipient_token_account.to_account_info(),
                    authority: escrow_info.clone(),
                },
                signer_seeds,
            );
            token::transfer(worker_transfer, worker_amount)?;

            let fee_transfer = CpiContext::new_with_signer(
                ctx.accounts.token_program.key(),
                Transfer {
                    from: ctx.accounts.vault.to_account_info(),
                    to: ctx.accounts.treasury.to_account_info(),
                    authority: escrow_info.clone(),
                },
                signer_seeds,
            );
            token::transfer(fee_transfer, fee_amount)?;

            ctx.accounts.escrow_account.status = EscrowStatus::Completed;
        } else {
            // Client wins — full refund, no fee
            let refund_transfer = CpiContext::new_with_signer(
                ctx.accounts.token_program.key(),
                Transfer {
                    from: ctx.accounts.vault.to_account_info(),
                    to: ctx.accounts.recipient_token_account.to_account_info(),
                    authority: escrow_info.clone(),
                },
                signer_seeds,
            );
            token::transfer(refund_transfer, amount)?;

            ctx.accounts.escrow_account.status = EscrowStatus::Cancelled;
        }

        emit!(DisputeResolved {
            task_id,
            release_to_worker,
        });

        Ok(())
    }

    // ─────────────────────────────────────────────
    // 8. CANCEL TASK
    // Called by client only if no worker selected yet.
    // No funds locked at this stage so no transfer needed.
    // Status moves Open → Cancelled.
    // ─────────────────────────────────────────────
    pub fn cancel_task(ctx: Context<CancelTask>) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow_account;

        require!(
            escrow.status == EscrowStatus::Open,
            ForgeError::InvalidStatus
        );
        require!(
            escrow.client == ctx.accounts.client.key(),
            ForgeError::Unauthorized
        );

        escrow.status = EscrowStatus::Cancelled;

        emit!(TaskCancelled {
            task_id: escrow.task_id,
            client: escrow.client,
        });

        Ok(())
    }
}

// ─────────────────────────────────────────────────────────────
// ACCOUNT STRUCTS
// ─────────────────────────────────────────────────────────────

#[account]
pub struct EscrowAccount {
    pub task_id: u64,
    pub client: Pubkey,
    pub worker: Pubkey,
    pub amount: u64,
    pub status: EscrowStatus,
    pub difficulty: u8,
    pub review_window_days: u8,
    pub auto_release_window: i64,
    pub task_metadata_uri: String,   // IPFS link to full task details + AI analysis
    pub submission_uri: String,      // worker's deliverable link
    pub ai_report_hash: Option<[u8; 32]>, // hash of AI review report
    pub submission_timestamp: Option<i64>,
    pub created_at: i64,
    pub bump: u8,
}

impl EscrowAccount {
    // 8 (discriminator)
    // + 8 (task_id)
    // + 32 (client)
    // + 32 (worker)
    // + 8 (amount)
    // + 1 (status)
    // + 1 (difficulty)
    // + 1 (review_window_days)
    // + 8 (auto_release_window)
    // + 4+200 (task_metadata_uri)
    // + 4+200 (submission_uri)
    // + 1+32 (ai_report_hash Option)
    // + 1+8 (submission_timestamp Option)
    // + 8 (created_at)
    // + 1 (bump)
    pub const LEN: usize = 8 + 8 + 32 + 32 + 8 + 1 + 1 + 1 + 8 + 204 + 204 + 33 + 9 + 8 + 1;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum EscrowStatus {
    Open,       // task posted, no worker selected
    Active,     // worker selected, funds locked in vault
    Submitted,  // worker submitted deliverable
    Completed,  // approved or auto-released
    Disputed,   // frozen pending arbitration
    Cancelled,  // cancelled or client won dispute
}

// ─────────────────────────────────────────────────────────────
// CONTEXTS
// ─────────────────────────────────────────────────────────────

#[derive(Accounts)]
#[instruction(task_id: u64)]
pub struct CreateTask<'info> {
    #[account(
        init,
        payer = client,
        space = EscrowAccount::LEN,
        seeds = [b"escrow", client.key().as_ref(), task_id.to_le_bytes().as_ref()],
        bump
    )]
    pub escrow_account: Account<'info, EscrowAccount>,

    #[account(mut)]
    pub client: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AcceptWorker<'info> {
    #[account(
        mut,
        seeds = [b"escrow", client.key().as_ref(), escrow_account.task_id.to_le_bytes().as_ref()],
        bump = escrow_account.bump,
    )]
    pub escrow_account: Account<'info, EscrowAccount>,

    #[account(mut)]
    pub client: Signer<'info>,

    #[account(mut)]
    pub client_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [b"vault", escrow_account.key().as_ref()],
        bump,
    )]
    pub vault: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SubmitWork<'info> {
    #[account(
        mut,
        seeds = [b"escrow", escrow_account.client.as_ref(), escrow_account.task_id.to_le_bytes().as_ref()],
        bump = escrow_account.bump,
        has_one = worker,
    )]
    pub escrow_account: Account<'info, EscrowAccount>,

    pub worker: Signer<'info>,
}

#[derive(Accounts)]
pub struct ApproveWork<'info> {
    #[account(
        mut,
        seeds = [b"escrow", client.key().as_ref(), escrow_account.task_id.to_le_bytes().as_ref()],
        bump = escrow_account.bump,
        has_one = client,
    )]
    pub escrow_account: Account<'info, EscrowAccount>,

    pub client: Signer<'info>,

    #[account(mut)]
    pub vault: Account<'info, TokenAccount>,

    #[account(mut)]
    pub worker_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub treasury: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct ClaimCompletion<'info> {
    #[account(
        mut,
        seeds = [b"escrow", escrow_account.client.as_ref(), escrow_account.task_id.to_le_bytes().as_ref()],
        bump = escrow_account.bump,
    )]
    pub escrow_account: Account<'info, EscrowAccount>,

    // permissionless — any signer can trigger this after deadline
    pub caller: Signer<'info>,

    #[account(mut)]
    pub vault: Account<'info, TokenAccount>,

    #[account(mut)]
    pub worker_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub treasury: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct RaiseDispute<'info> {
    #[account(
        mut,
        seeds = [b"escrow", escrow_account.client.as_ref(), escrow_account.task_id.to_le_bytes().as_ref()],
        bump = escrow_account.bump,
    )]
    pub escrow_account: Account<'info, EscrowAccount>,

    pub caller: Signer<'info>,
}

#[derive(Accounts)]
pub struct ResolveDispute<'info> {
    #[account(
        mut,
        seeds = [b"escrow", escrow_account.client.as_ref(), escrow_account.task_id.to_le_bytes().as_ref()],
        bump = escrow_account.bump,
    )]
    pub escrow_account: Account<'info, EscrowAccount>,

    // Only Forge arbitrator multisig can call this
    pub arbitrator: Signer<'info>,

    #[account(mut)]
    pub vault: Account<'info, TokenAccount>,

    #[account(mut)]
    pub recipient_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub treasury: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct CancelTask<'info> {
    #[account(
        mut,
        seeds = [b"escrow", client.key().as_ref(), escrow_account.task_id.to_le_bytes().as_ref()],
        bump = escrow_account.bump,
        has_one = client,
    )]
    pub escrow_account: Account<'info, EscrowAccount>,

    pub client: Signer<'info>,
}

// ─────────────────────────────────────────────────────────────
// EVENTS
// ─────────────────────────────────────────────────────────────

#[event]
pub struct TaskCreated {
    pub task_id: u64,
    pub client: Pubkey,
    pub amount: u64,
    pub difficulty: u8,
    pub review_window_days: u8,
}

#[event]
pub struct WorkerAccepted {
    pub task_id: u64,
    pub client: Pubkey,
    pub worker: Pubkey,
}

#[event]
pub struct WorkSubmitted {
    pub task_id: u64,
    pub worker: Pubkey,
    pub submission_timestamp: i64,
    pub auto_release_at: i64,
}

#[event]
pub struct WorkApproved {
    pub task_id: u64,
    pub client: Pubkey,
    pub worker: Pubkey,
    pub worker_amount: u64,
    pub fee_amount: u64,
}

#[event]
pub struct AutoReleased {
    pub task_id: u64,
    pub worker: Pubkey,
    pub worker_amount: u64,
    pub released_at: i64,
}

#[event]
pub struct DisputeRaised {
    pub task_id: u64,
    pub raised_by: Pubkey,
    pub reason_uri: String,
}

#[event]
pub struct DisputeResolved {
    pub task_id: u64,
    pub release_to_worker: bool,
}

#[event]
pub struct TaskCancelled {
    pub task_id: u64,
    pub client: Pubkey,
}

// ─────────────────────────────────────────────────────────────
// ERRORS
// ─────────────────────────────────────────────────────────────

#[error_code]
pub enum ForgeError {
    #[msg("Amount must be greater than zero")]
    InvalidAmount,

    #[msg("Review window must be between 1 and 7 days")]
    InvalidReviewWindow,

    #[msg("Difficulty must be between 1 (Apprentice) and 4 (Grandmaster)")]
    InvalidDifficulty,

    #[msg("Metadata URI exceeds maximum length of 200 characters")]
    MetadataUriTooLong,

    #[msg("Invalid escrow status for this instruction")]
    InvalidStatus,

    #[msg("You are not authorized to perform this action")]
    Unauthorized,

    #[msg("Invalid worker address")]
    InvalidWorker,

    #[msg("No submission found on this escrow")]
    NoSubmissionFound,

    #[msg("Review window has not expired yet")]
    ReviewWindowNotExpired,
}