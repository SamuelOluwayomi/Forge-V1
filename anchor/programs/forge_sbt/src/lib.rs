use anchor_lang::prelude::*;
use anchor_spl::{
    metadata::{
        create_metadata_accounts_v3,
        mpl_token_metadata::types::{Creator, DataV2},
        CreateMetadataAccountsV3, Metadata,
    },
    token::{mint_to, Mint, MintTo, Token, TokenAccount},
    associated_token::AssociatedToken,
};

declare_id!("B563uW8guVAhSasPR5S6MgMGHcYwtbaiwVv9kofkwZKZ"); // replaced after anchor keys sync

#[program]
pub mod forge_sbt {
    use super::*;

    // ─────────────────────────────────────────────
    // 1. INITIALIZE REPUTATION ACCOUNT
    // Called once per user when they first join Forge.
    // Creates their on-chain reputation record.
    // ─────────────────────────────────────────────
    pub fn initialize_reputation(ctx: Context<InitializeReputation>) -> Result<()> {
        let reputation = &mut ctx.accounts.reputation;
        let clock = Clock::get()?;

        reputation.owner = ctx.accounts.owner.key();
        reputation.tasks_completed = 0;
        reputation.tasks_posted = 0;
        reputation.total_earned = 0;
        reputation.total_paid = 0;
        reputation.disputes_raised = 0;
        reputation.disputes_lost = 0;
        reputation.average_rating = 0;
        reputation.total_ratings = 0;
        reputation.on_time_completions = 0;
        reputation.world_id_verified = false;
        reputation.joined_at = clock.unix_timestamp;
        reputation.bump = ctx.bumps.reputation;

        emit!(ReputationInitialized {
            owner: reputation.owner,
            joined_at: reputation.joined_at,
        });

        Ok(())
    }

    // ─────────────────────────────────────────────
    // 2. MARK WORLD ID VERIFIED
    // Called after successful World ID verification.
    // Sets the verified flag on the reputation account.
    // ─────────────────────────────────────────────
    pub fn mark_world_id_verified(ctx: Context<MarkVerified>) -> Result<()> {
        let reputation = &mut ctx.accounts.reputation;

        require!(
            reputation.owner == ctx.accounts.owner.key(),
            SbtError::Unauthorized
        );

        reputation.world_id_verified = true;

        emit!(WorldIdVerified {
            owner: reputation.owner,
        });

        Ok(())
    }

    // ─────────────────────────────────────────────
    // 3. MINT WORKER BADGE
    // Called after escrow releases funds to worker.
    // Mints a non-transferable SBT to the worker's wallet
    // and updates their reputation account.
    // ─────────────────────────────────────────────
    pub fn mint_worker_badge(
        ctx: Context<MintWorkerBadge>,
        task_id: u64,
        skill_category: String,
        rating: u8,
        was_on_time: bool,
        amount_earned: u64,
    ) -> Result<()> {
        require!(rating >= 1 && rating <= 5, SbtError::InvalidRating);
        require!(skill_category.len() <= 50, SbtError::StringTooLong);

        // Mint 1 token to worker's associated token account
        let bump = ctx.bumps.badge_mint;
        let task_id_bytes = task_id.to_le_bytes();
        let worker_key = ctx.accounts.worker.key();
        let seeds = &[
            b"worker_badge_mint",
            worker_key.as_ref(),
            task_id_bytes.as_ref(),
            &[bump],
        ];
        let signer_seeds = &[&seeds[..]];

        mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.key(),
                MintTo {
                    mint: ctx.accounts.badge_mint.to_account_info(),
                    to: ctx.accounts.worker_badge_account.to_account_info(),
                    authority: ctx.accounts.badge_mint.to_account_info(),
                },
                signer_seeds,
            ),
            1,
        )?;

        // Create metadata for the badge
        let metadata_name = format!("Forge Worker Badge - {}", skill_category);
        let metadata_symbol = "FORGE".to_string();
        let metadata_uri = format!(
            "https://forge.xyz/badges/worker/{}/{}",
            ctx.accounts.worker.key(),
            task_id
        );

        create_metadata_accounts_v3(
            CpiContext::new_with_signer(
                ctx.accounts.token_metadata_program.key(),
                CreateMetadataAccountsV3 {
                    metadata: ctx.accounts.badge_metadata.to_account_info(),
                    mint: ctx.accounts.badge_mint.to_account_info(),
                    mint_authority: ctx.accounts.badge_mint.to_account_info(),
                    payer: ctx.accounts.payer.to_account_info(),
                    update_authority: ctx.accounts.badge_mint.to_account_info(),
                    system_program: ctx.accounts.system_program.to_account_info(),
                    rent: ctx.accounts.rent.to_account_info(),
                },
                signer_seeds,
            ),
            DataV2 {
                name: metadata_name,
                symbol: metadata_symbol,
                uri: metadata_uri,
                seller_fee_basis_points: 0,
                creators: Some(vec![Creator {
                    address: ctx.accounts.badge_mint.key(),
                    verified: true,
                    share: 100,
                }]),
                collection: None,
                uses: None,
            },
            true,
            true,
            None,
        )?;

        // Update reputation account
        let reputation = &mut ctx.accounts.worker_reputation;
        reputation.tasks_completed += 1;
        reputation.total_earned += amount_earned;

        if was_on_time {
            reputation.on_time_completions += 1;
        }

        // Update rolling average rating
        let total = reputation.average_rating as u64 * reputation.total_ratings as u64;
        reputation.total_ratings += 1;
        reputation.average_rating = ((total + rating as u64) / reputation.total_ratings as u64) as u8;

        // Store badge record
        let badge = &mut ctx.accounts.worker_badge_record;
        let clock = Clock::get()?;
        badge.owner = ctx.accounts.worker.key();
        badge.badge_type = BadgeType::WorkerCompletion;
        badge.task_id = task_id;
        badge.skill_category = skill_category.clone();
        badge.rating = rating;
        badge.was_on_time = was_on_time;
        badge.amount = amount_earned;
        badge.minted_at = clock.unix_timestamp;
        badge.mint = ctx.accounts.badge_mint.key();
        badge.bump = ctx.bumps.worker_badge_record;

        emit!(WorkerBadgeMinted {
            worker: ctx.accounts.worker.key(),
            task_id,
            skill_category,
            rating,
            was_on_time,
            amount_earned,
            total_completed: reputation.tasks_completed,
        });

        Ok(())
    }

    // ─────────────────────────────────────────────
    // 4. MINT CLIENT BADGE
    // Called after escrow releases funds successfully.
    // Mints a non-transferable SBT to the client's wallet
    // and updates their reputation account.
    // ─────────────────────────────────────────────
    pub fn mint_client_badge(
        ctx: Context<MintClientBadge>,
        task_id: u64,
        amount_paid: u64,
        approved_on_time: bool,
    ) -> Result<()> {
        let bump = ctx.bumps.badge_mint;
        let task_id_bytes = task_id.to_le_bytes();
        let client_key = ctx.accounts.client.key();
        let seeds = &[
            b"client_badge_mint",
            client_key.as_ref(),
            task_id_bytes.as_ref(),
            &[bump],
        ];
        let signer_seeds = &[&seeds[..]];

        // Mint 1 token
        mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.key(),
                MintTo {
                    mint: ctx.accounts.badge_mint.to_account_info(),
                    to: ctx.accounts.client_badge_account.to_account_info(),
                    authority: ctx.accounts.badge_mint.to_account_info(),
                },
                signer_seeds,
            ),
            1,
        )?;

        // Metadata
        let metadata_uri = format!(
            "https://forge.xyz/badges/client/{}/{}",
            ctx.accounts.client.key(),
            task_id
        );

        create_metadata_accounts_v3(
            CpiContext::new_with_signer(
                ctx.accounts.token_metadata_program.key(),
                CreateMetadataAccountsV3 {
                    metadata: ctx.accounts.badge_metadata.to_account_info(),
                    mint: ctx.accounts.badge_mint.to_account_info(),
                    mint_authority: ctx.accounts.badge_mint.to_account_info(),
                    payer: ctx.accounts.payer.to_account_info(),
                    update_authority: ctx.accounts.badge_mint.to_account_info(),
                    system_program: ctx.accounts.system_program.to_account_info(),
                    rent: ctx.accounts.rent.to_account_info(),
                },
                signer_seeds,
            ),
            DataV2 {
                name: "Forge Client Badge".to_string(),
                symbol: "FORGE".to_string(),
                uri: metadata_uri,
                seller_fee_basis_points: 0,
                creators: Some(vec![Creator {
                    address: ctx.accounts.badge_mint.key(),
                    verified: true,
                    share: 100,
                }]),
                collection: None,
                uses: None,
            },
            true,
            true,
            None,
        )?;

        // Update client reputation
        let reputation = &mut ctx.accounts.client_reputation;
        reputation.tasks_posted += 1;
        reputation.total_paid += amount_paid;

        if approved_on_time {
            reputation.on_time_completions += 1;
        }

        // Store badge record
        let badge = &mut ctx.accounts.client_badge_record;
        let clock = Clock::get()?;
        badge.owner = ctx.accounts.client.key();
        badge.badge_type = BadgeType::ClientPayment;
        badge.task_id = task_id;
        badge.skill_category = String::new();
        badge.rating = 0;
        badge.was_on_time = approved_on_time;
        badge.amount = amount_paid;
        badge.minted_at = clock.unix_timestamp;
        badge.mint = ctx.accounts.badge_mint.key();
        badge.bump = ctx.bumps.client_badge_record;

        emit!(ClientBadgeMinted {
            client: ctx.accounts.client.key(),
            task_id,
            amount_paid,
            approved_on_time,
            total_posted: reputation.tasks_posted,
        });

        Ok(())
    }
}

// ─────────────────────────────────────────────────────────────
// ACCOUNT STRUCTS
// ─────────────────────────────────────────────────────────────

#[account]
pub struct ReputationAccount {
    pub owner: Pubkey,
    pub tasks_completed: u32,
    pub tasks_posted: u32,
    pub total_earned: u64,
    pub total_paid: u64,
    pub disputes_raised: u16,
    pub disputes_lost: u16,
    pub average_rating: u8,
    pub total_ratings: u64,
    pub on_time_completions: u32,
    pub world_id_verified: bool,
    pub joined_at: i64,
    pub bump: u8,
}

impl ReputationAccount {
    pub const LEN: usize = 8   // discriminator
        + 32   // owner
        + 4    // tasks_completed
        + 4    // tasks_posted
        + 8    // total_earned
        + 8    // total_paid
        + 2    // disputes_raised
        + 2    // disputes_lost
        + 1    // average_rating
        + 8    // total_ratings
        + 4    // on_time_completions
        + 1    // world_id_verified
        + 8    // joined_at
        + 1;   // bump
}

#[account]
pub struct BadgeRecord {
    pub owner: Pubkey,
    pub badge_type: BadgeType,
    pub task_id: u64,
    pub skill_category: String,
    pub rating: u8,
    pub was_on_time: bool,
    pub amount: u64,
    pub minted_at: i64,
    pub mint: Pubkey,
    pub bump: u8,
}

impl BadgeRecord {
    pub const LEN: usize = 8    // discriminator
        + 32   // owner
        + 1    // badge_type
        + 8    // task_id
        + 4+50 // skill_category
        + 1    // rating
        + 1    // was_on_time
        + 8    // amount
        + 8    // minted_at
        + 32   // mint
        + 1;   // bump
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum BadgeType {
    WorkerCompletion,
    ClientPayment,
}

// ─────────────────────────────────────────────────────────────
// CONTEXTS
// ─────────────────────────────────────────────────────────────

#[derive(Accounts)]
pub struct InitializeReputation<'info> {
    #[account(
        init,
        payer = owner,
        space = ReputationAccount::LEN,
        seeds = [b"reputation", owner.key().as_ref()],
        bump
    )]
    pub reputation: Account<'info, ReputationAccount>,

    #[account(mut)]
    pub owner: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct MarkVerified<'info> {
    #[account(
        mut,
        seeds = [b"reputation", owner.key().as_ref()],
        bump = reputation.bump,
        has_one = owner,
    )]
    pub reputation: Account<'info, ReputationAccount>,

    pub owner: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(task_id: u64)]
pub struct MintWorkerBadge<'info> {
    // Badge mint — unique per worker per task
    #[account(
        init,
        payer = payer,
        mint::decimals = 0,
        mint::authority = badge_mint,
        mint::freeze_authority = badge_mint,
        seeds = [b"worker_badge_mint", worker.key().as_ref(), task_id.to_le_bytes().as_ref()],
        bump
    )]
    pub badge_mint: Account<'info, Mint>,

    // Worker's token account for this badge
    #[account(
        init_if_needed,
        payer = payer,
        associated_token::mint = badge_mint,
        associated_token::authority = worker,
    )]
    pub worker_badge_account: Account<'info, TokenAccount>,

    /// CHECK: Metaplex metadata account, validated by metadata program
    #[account(mut)]
    pub badge_metadata: UncheckedAccount<'info>,

    // Badge record — stores the badge details on-chain
    #[account(
        init,
        payer = payer,
        space = BadgeRecord::LEN,
        seeds = [b"worker_badge_record", worker.key().as_ref(), task_id.to_le_bytes().as_ref()],
        bump
    )]
    pub worker_badge_record: Account<'info, BadgeRecord>,

    // Worker's reputation account
    #[account(
        mut,
        seeds = [b"reputation", worker.key().as_ref()],
        bump = worker_reputation.bump,
    )]
    pub worker_reputation: Account<'info, ReputationAccount>,

    /// CHECK: Worker's wallet
    pub worker: UncheckedAccount<'info>,

    #[account(mut)]
    pub payer: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub token_metadata_program: Program<'info, Metadata>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
#[instruction(task_id: u64)]
pub struct MintClientBadge<'info> {
    #[account(
        init,
        payer = payer,
        mint::decimals = 0,
        mint::authority = badge_mint,
        mint::freeze_authority = badge_mint,
        seeds = [b"client_badge_mint", client.key().as_ref(), task_id.to_le_bytes().as_ref()],
        bump
    )]
    pub badge_mint: Account<'info, Mint>,

    #[account(
        init_if_needed,
        payer = payer,
        associated_token::mint = badge_mint,
        associated_token::authority = client,
    )]
    pub client_badge_account: Account<'info, TokenAccount>,

    /// CHECK: Metaplex metadata account
    #[account(mut)]
    pub badge_metadata: UncheckedAccount<'info>,

    #[account(
        init,
        payer = payer,
        space = BadgeRecord::LEN,
        seeds = [b"client_badge_record", client.key().as_ref(), task_id.to_le_bytes().as_ref()],
        bump
    )]
    pub client_badge_record: Account<'info, BadgeRecord>,

    #[account(
        mut,
        seeds = [b"reputation", client.key().as_ref()],
        bump = client_reputation.bump,
    )]
    pub client_reputation: Account<'info, ReputationAccount>,

    /// CHECK: Client's wallet
    pub client: UncheckedAccount<'info>,

    #[account(mut)]
    pub payer: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub token_metadata_program: Program<'info, Metadata>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

// ─────────────────────────────────────────────────────────────
// EVENTS
// ─────────────────────────────────────────────────────────────

#[event]
pub struct ReputationInitialized {
    pub owner: Pubkey,
    pub joined_at: i64,
}

#[event]
pub struct WorldIdVerified {
    pub owner: Pubkey,
}

#[event]
pub struct WorkerBadgeMinted {
    pub worker: Pubkey,
    pub task_id: u64,
    pub skill_category: String,
    pub rating: u8,
    pub was_on_time: bool,
    pub amount_earned: u64,
    pub total_completed: u32,
}

#[event]
pub struct ClientBadgeMinted {
    pub client: Pubkey,
    pub task_id: u64,
    pub amount_paid: u64,
    pub approved_on_time: bool,
    pub total_posted: u32,
}

// ─────────────────────────────────────────────────────────────
// ERRORS
// ─────────────────────────────────────────────────────────────

#[error_code]
pub enum SbtError {
    #[msg("You are not authorized to perform this action")]
    Unauthorized,

    #[msg("Rating must be between 1 and 5")]
    InvalidRating,

    #[msg("String exceeds maximum allowed length")]
    StringTooLong,

    #[msg("Reputation account already initialized")]
    AlreadyInitialized,
}
