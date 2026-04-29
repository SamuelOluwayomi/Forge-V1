use anchor_lang::prelude::*;
use anchor_lang::system_program;

declare_id!("AkoaVinz9Md94KsC2k6sULNdwvqh2uF16KdKiWdpr6ye"); // replace after anchor build

#[program]
pub mod forge_escrow {
    use super::*;

    pub const TREASURY_PUBKEY: Pubkey = pubkey!("EPpNW3G47SAJ4j1DatpjW7mJMLRTH9Z8K7LJtBfhR8Mt");

    // ─────────────────────────────────────────────
    // 1. CREATE TASK
    // ─────────────────────────────────────────────
    pub fn create_task(
        ctx: Context<CreateTask>,
        task_id: u64,
        amount: u64,
        review_window_days: u8,
        difficulty: u8,
        task_metadata_uri: String,
    ) -> Result<()> {
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
        escrow.worker = Pubkey::default(); 
        escrow.amount = amount;
        escrow.status = EscrowStatus::Open;
        escrow.difficulty = difficulty;
        escrow.review_window_days = review_window_days;
        escrow.auto_release_window = (review_window_days as i64) * 86_400; 
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
    // 2. ACCEPT WORKER (Native SOL)
    // ─────────────────────────────────────────────
    pub fn accept_worker(ctx: Context<AcceptWorker>, worker: Pubkey) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow_account;

        require!(escrow.status == EscrowStatus::Open, ForgeError::InvalidStatus);
        require!(escrow.client == ctx.accounts.client.key(), ForgeError::Unauthorized);
        require!(worker != Pubkey::default(), ForgeError::InvalidWorker);

        // Transfer SOL from client directly into the escrow PDA
        let ix = anchor_lang::solana_program::system_instruction::transfer(
            &ctx.accounts.client.key(),
            &escrow.key(),
            escrow.amount,
        );
        anchor_lang::solana_program::program::invoke(
            &ix,
            &[
                ctx.accounts.client.to_account_info(),
                escrow.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;

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
    // ─────────────────────────────────────────────
    pub fn submit_work(
        ctx: Context<SubmitWork>,
        submission_uri: String,
        ai_report_hash: Option<[u8; 32]>,
    ) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow_account;
        let clock = Clock::get()?;

        require!(escrow.status == EscrowStatus::Active, ForgeError::InvalidStatus);
        require!(escrow.worker == ctx.accounts.worker.key(), ForgeError::Unauthorized);
        require!(submission_uri.len() <= 200, ForgeError::MetadataUriTooLong);

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
    // 4. APPROVE WORK (Native SOL Payout)
    // ─────────────────────────────────────────────
    pub fn approve_work(ctx: Context<ApproveWork>) -> Result<()> {
        let task_id = ctx.accounts.escrow_account.task_id;
        let client_key = ctx.accounts.escrow_account.client;
        let worker_key = ctx.accounts.escrow_account.worker;
        let amount = ctx.accounts.escrow_account.amount;

        require!(ctx.accounts.escrow_account.status == EscrowStatus::Submitted, ForgeError::InvalidStatus);
        require!(client_key == ctx.accounts.client.key(), ForgeError::Unauthorized);

        let fee_amount = amount.checked_mul(200).unwrap().checked_div(10_000).unwrap();
        let worker_amount = amount.checked_sub(fee_amount).unwrap();

        // Direct Lamport transfer out of PDA
        **ctx.accounts.escrow_account.to_account_info().try_borrow_mut_lamports()? -= amount;
        **ctx.accounts.worker.to_account_info().try_borrow_mut_lamports()? += worker_amount;
        **ctx.accounts.treasury.to_account_info().try_borrow_mut_lamports()? += fee_amount;

        ctx.accounts.escrow_account.status = EscrowStatus::Completed;

        emit!(WorkApproved { task_id, client: client_key, worker: worker_key, worker_amount, fee_amount });
        Ok(())
    }

    // ─────────────────────────────────────────────
    // 5. CLAIM COMPLETION (Native SOL Payout)
    // ─────────────────────────────────────────────
    pub fn claim_completion(ctx: Context<ClaimCompletion>) -> Result<()> {
        let clock = Clock::get()?;
        let task_id = ctx.accounts.escrow_account.task_id;
        let worker_key = ctx.accounts.escrow_account.worker;
        let amount = ctx.accounts.escrow_account.amount;
        let auto_release_window = ctx.accounts.escrow_account.auto_release_window;

        require!(ctx.accounts.escrow_account.status == EscrowStatus::Submitted, ForgeError::InvalidStatus);

        let submission_time = ctx.accounts.escrow_account.submission_timestamp.ok_or(ForgeError::NoSubmissionFound)?;
        let deadline = submission_time.checked_add(auto_release_window).unwrap();
        require!(clock.unix_timestamp >= deadline, ForgeError::ReviewWindowNotExpired);

        let fee_amount = amount.checked_mul(200).unwrap().checked_div(10_000).unwrap();
        let worker_amount = amount.checked_sub(fee_amount).unwrap();

        **ctx.accounts.escrow_account.to_account_info().try_borrow_mut_lamports()? -= amount;
        **ctx.accounts.worker.to_account_info().try_borrow_mut_lamports()? += worker_amount;
        **ctx.accounts.treasury.to_account_info().try_borrow_mut_lamports()? += fee_amount;

        ctx.accounts.escrow_account.status = EscrowStatus::Completed;

        emit!(AutoReleased { task_id, worker: worker_key, worker_amount, released_at: clock.unix_timestamp });
        Ok(())
    }

    // ─────────────────────────────────────────────
    // 6. RAISE DISPUTE
    // ─────────────────────────────────────────────
    pub fn raise_dispute(ctx: Context<RaiseDispute>, reason_uri: String) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow_account;
        require!(escrow.status == EscrowStatus::Submitted, ForgeError::InvalidStatus);

        let caller = ctx.accounts.caller.key();
        require!(caller == escrow.client || caller == escrow.worker, ForgeError::Unauthorized);
        require!(reason_uri.len() <= 200, ForgeError::MetadataUriTooLong);

        escrow.status = EscrowStatus::Disputed;

        emit!(DisputeRaised { task_id: escrow.task_id, raised_by: caller, reason_uri });
        Ok(())
    }

    // ─────────────────────────────────────────────
    // 7. RESOLVE DISPUTE (Native SOL)
    // ─────────────────────────────────────────────
    pub fn resolve_dispute(ctx: Context<ResolveDispute>, release_to_worker: bool) -> Result<()> {
        let task_id = ctx.accounts.escrow_account.task_id;
        let amount = ctx.accounts.escrow_account.amount;

        require!(ctx.accounts.escrow_account.status == EscrowStatus::Disputed, ForgeError::InvalidStatus);

        if release_to_worker {
            let fee_amount = amount.checked_mul(200).unwrap().checked_div(10_000).unwrap();
            let worker_amount = amount.checked_sub(fee_amount).unwrap();

            **ctx.accounts.escrow_account.to_account_info().try_borrow_mut_lamports()? -= amount;
            **ctx.accounts.recipient.to_account_info().try_borrow_mut_lamports()? += worker_amount;
            **ctx.accounts.treasury.to_account_info().try_borrow_mut_lamports()? += fee_amount;

            ctx.accounts.escrow_account.status = EscrowStatus::Completed;
        } else {
            **ctx.accounts.escrow_account.to_account_info().try_borrow_mut_lamports()? -= amount;
            **ctx.accounts.recipient.to_account_info().try_borrow_mut_lamports()? += amount;
            ctx.accounts.escrow_account.status = EscrowStatus::Cancelled;
        }

        emit!(DisputeResolved { task_id, release_to_worker });
        Ok(())
    }

    // ─────────────────────────────────────────────
    // 8. CANCEL TASK
    // ─────────────────────────────────────────────
    pub fn cancel_task(ctx: Context<CancelTask>) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow_account;
        require!(escrow.status == EscrowStatus::Open, ForgeError::InvalidStatus);
        require!(escrow.client == ctx.accounts.client.key(), ForgeError::Unauthorized);

        escrow.status = EscrowStatus::Cancelled;
        emit!(TaskCancelled { task_id: escrow.task_id, client: escrow.client });
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
    pub task_metadata_uri: String,   
    pub submission_uri: String,      
    pub ai_report_hash: Option<[u8; 32]>, 
    pub submission_timestamp: Option<i64>,
    pub created_at: i64,
    pub bump: u8,
}

impl EscrowAccount {
    pub const LEN: usize = 8 + 8 + 32 + 32 + 8 + 1 + 1 + 1 + 8 + 204 + 204 + 33 + 9 + 8 + 1;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum EscrowStatus {
    Open,       
    Active,     
    Submitted,  
    Completed,  
    Disputed,   
    Cancelled,  
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
    /// CHECK: Worker receives SOL
    #[account(mut)]
    pub worker: UncheckedAccount<'info>,
    /// CHECK: Treasury receives fee. Must match hardcoded protocol treasury.
    #[account(mut, address = crate::forge_escrow::TREASURY_PUBKEY @ ForgeError::InvalidTreasury)]
    pub treasury: UncheckedAccount<'info>,
}

#[derive(Accounts)]
pub struct ClaimCompletion<'info> {
    #[account(
        mut,
        seeds = [b"escrow", escrow_account.client.as_ref(), escrow_account.task_id.to_le_bytes().as_ref()],
        bump = escrow_account.bump,
    )]
    pub escrow_account: Account<'info, EscrowAccount>,
    pub caller: Signer<'info>,
    /// CHECK: Worker receives SOL
    #[account(mut)]
    pub worker: UncheckedAccount<'info>,
    /// CHECK: Treasury receives fee. Must match hardcoded protocol treasury.
    #[account(mut, address = crate::forge_escrow::TREASURY_PUBKEY @ ForgeError::InvalidTreasury)]
    pub treasury: UncheckedAccount<'info>,
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
    pub arbitrator: Signer<'info>,
    /// CHECK: Recipient receives SOL
    #[account(mut)]
    pub recipient: UncheckedAccount<'info>,
    /// CHECK: Treasury receives fee. Must match hardcoded protocol treasury.
    #[account(mut, address = crate::forge_escrow::TREASURY_PUBKEY @ ForgeError::InvalidTreasury)]
    pub treasury: UncheckedAccount<'info>,
}

#[derive(Accounts)]
pub struct CancelTask<'info> {
    #[account(
        mut,
        seeds = [b"escrow", client.key().as_ref(), escrow_account.task_id.to_le_bytes().as_ref()],
        bump = escrow_account.bump,
        has_one = client,
        close = client,
    )]
    pub escrow_account: Account<'info, EscrowAccount>,
    pub client: Signer<'info>,
}

// Events and Errors remain the same
#[event]
pub struct TaskCreated { pub task_id: u64, pub client: Pubkey, pub amount: u64, pub difficulty: u8, pub review_window_days: u8 }
#[event]
pub struct WorkerAccepted { pub task_id: u64, pub client: Pubkey, pub worker: Pubkey }
#[event]
pub struct WorkSubmitted { pub task_id: u64, pub worker: Pubkey, pub submission_timestamp: i64, pub auto_release_at: i64 }
#[event]
pub struct WorkApproved { pub task_id: u64, pub client: Pubkey, pub worker: Pubkey, pub worker_amount: u64, pub fee_amount: u64 }
#[event]
pub struct AutoReleased { pub task_id: u64, pub worker: Pubkey, pub worker_amount: u64, pub released_at: i64 }
#[event]
pub struct DisputeRaised { pub task_id: u64, pub raised_by: Pubkey, pub reason_uri: String }
#[event]
pub struct DisputeResolved { pub task_id: u64, pub release_to_worker: bool }
#[event]
pub struct TaskCancelled { pub task_id: u64, pub client: Pubkey }

#[error_code]
pub enum ForgeError {
    #[msg("Amount must be greater than zero")] InvalidAmount,
    #[msg("Review window must be between 1 and 7 days")] InvalidReviewWindow,
    #[msg("Difficulty must be between 1 (Apprentice) and 4 (Grandmaster)")] InvalidDifficulty,
    #[msg("Metadata URI exceeds maximum length of 200 characters")] MetadataUriTooLong,
    #[msg("Invalid escrow status for this instruction")] InvalidStatus,
    #[msg("You are not authorized to perform this action")] Unauthorized,
    #[msg("Invalid worker address")] InvalidWorker,
    #[msg("No submission found on this escrow")] NoSubmissionFound,
    #[msg("Review window has not expired yet")] ReviewWindowNotExpired,
    #[msg("The provided treasury address does not match the protocol treasury")] InvalidTreasury,
}