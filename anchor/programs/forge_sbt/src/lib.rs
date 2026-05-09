use anchor_lang::prelude::*;
use anchor_spl::{
    metadata::{
        create_master_edition_v3, create_metadata_accounts_v3,
        mpl_token_metadata::types::{Creator, DataV2},
        CreateMasterEditionV3, CreateMetadataAccountsV3, Metadata,
    },
    token::{mint_to, Mint, MintTo, Token, TokenAccount},
    associated_token::AssociatedToken,
};

declare_id!("B563uW8guVAhSasPR5S6MgMGHcYwtbaiwVv9kofkwZKZ");

const FORGE_FOUNDER: &str = "HDpuuLudmQeCjm52z1L8SC8eMAX85QEdum6KPu2b6TgW";

// Pioneer NFT supply cap
const PIONEER_MAX_SUPPLY: u32 = 100;

#[program]
pub mod forge_sbt {
    use super::*;

    // 1. INITIALIZE REPUTATION ACCOUNT
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
    // Called after successful Civic Captcha.
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
        metadata_uri: String,
    ) -> Result<()> {
        require!(rating >= 1 && rating <= 5, SbtError::InvalidRating);
        require!(skill_category.len() <= 50, SbtError::StringTooLong);

        // Mint 1 token to worker's associated token account
        let seeds = &[
            b"worker_badge_v2",
            ctx.accounts.worker.key().as_ref(),
            task_id.to_le_bytes().as_ref(),
            &[ctx.bumps.badge_mint],
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
            false, // is_mutable = false (Immutable SBT)
            false,
            None,
        )?;

        // 3. Create Master Edition to verify and finalize the NFT
        create_master_edition_v3(
            CpiContext::new_with_signer(
                ctx.accounts.token_metadata_program.key(),
                CreateMasterEditionV3 {
                    edition: ctx.accounts.badge_edition.to_account_info(),
                    mint: ctx.accounts.badge_mint.to_account_info(),
                    update_authority: ctx.accounts.badge_mint.to_account_info(),
                    mint_authority: ctx.accounts.badge_mint.to_account_info(),
                    payer: ctx.accounts.payer.to_account_info(),
                    metadata: ctx.accounts.badge_metadata.to_account_info(),
                    token_program: ctx.accounts.token_program.to_account_info(),
                    system_program: ctx.accounts.system_program.to_account_info(),
                    rent: ctx.accounts.rent.to_account_info(),
                },
                signer_seeds,
            ),
            Some(0), // Max supply 0 (Only 1 exists)
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
        metadata_uri: String,
    ) -> Result<()> {
        let seeds = &[
            b"client_badge_v2",
            ctx.accounts.client.key().as_ref(),
            task_id.to_le_bytes().as_ref(),
            &[ctx.bumps.badge_mint],
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
            false, // is_mutable = false (Immutable SBT)
            false,
            None,
        )?;

        // Create Master Edition
        create_master_edition_v3(
            CpiContext::new_with_signer(
                ctx.accounts.token_metadata_program.key(),
                CreateMasterEditionV3 {
                    edition: ctx.accounts.badge_edition.to_account_info(),
                    mint: ctx.accounts.badge_mint.to_account_info(),
                    update_authority: ctx.accounts.badge_mint.to_account_info(),
                    mint_authority: ctx.accounts.badge_mint.to_account_info(),
                    payer: ctx.accounts.payer.to_account_info(),
                    metadata: ctx.accounts.badge_metadata.to_account_info(),
                    token_program: ctx.accounts.token_program.to_account_info(),
                    system_program: ctx.accounts.system_program.to_account_info(),
                    rent: ctx.accounts.rent.to_account_info(),
                },
                signer_seeds,
            ),
            Some(0),
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

    // ─────────────────────────────────────────────
    // 5. MINT PROFILE SBT
    // Called once when user creates their profile.
    // Mints a non-transferable identity badge to their wallet.
    // ─────────────────────────────────────────────
    pub fn mint_profile_sbt(
        ctx: Context<MintProfileSbt>,
        name: String,
        bio: String,
        title: String,
        metadata_uri: String,  // IPFS or Supabase URL
    ) -> Result<()> {
        require!(name.len() <= 50, SbtError::StringTooLong);
        require!(bio.len() <= 200, SbtError::StringTooLong);
        require!(title.len() <= 100, SbtError::StringTooLong);
        require!(metadata_uri.len() <= 200, SbtError::StringTooLong);

        let profile = &mut ctx.accounts.profile_sbt;
        let clock = Clock::get()?;

        profile.owner = ctx.accounts.owner.key();
        profile.name = name.clone();
        profile.bio = bio.clone();
        profile.title = title.clone();
        profile.metadata_uri = metadata_uri.clone();
        profile.minted_at = clock.unix_timestamp;
        profile.bump = ctx.bumps.profile_sbt;

        // 1. Mint 1 token for the profile identity
        let owner_key = ctx.accounts.owner.key();
        let seeds = &[
            b"profile_mint_v2",
            owner_key.as_ref(),
            &[ctx.bumps.badge_mint],
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

        // 2. Create Metadata
        create_metadata_accounts_v3(
            CpiContext::new_with_signer(
                ctx.accounts.token_metadata_program.key(),
                CreateMetadataAccountsV3 {
                    metadata: ctx.accounts.badge_metadata.to_account_info(),
                    mint: ctx.accounts.badge_mint.to_account_info(),
                    mint_authority: ctx.accounts.badge_mint.to_account_info(),
                    payer: ctx.accounts.owner.to_account_info(),
                    update_authority: ctx.accounts.badge_mint.to_account_info(),
                    system_program: ctx.accounts.system_program.to_account_info(),
                    rent: ctx.accounts.rent.to_account_info(),
                },
                signer_seeds,
            ),
            DataV2 {
                name: format!("Forge Identity: {}", name),
                symbol: "FORGE".to_string(),
                uri: metadata_uri.clone(),
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
            false, // Immutable
            None,
        )?;

        // 3. Create Master Edition
        create_master_edition_v3(
            CpiContext::new_with_signer(
                ctx.accounts.token_metadata_program.key(),
                CreateMasterEditionV3 {
                    edition: ctx.accounts.badge_edition.to_account_info(),
                    mint: ctx.accounts.badge_mint.to_account_info(),
                    update_authority: ctx.accounts.badge_mint.to_account_info(),
                    mint_authority: ctx.accounts.badge_mint.to_account_info(),
                    payer: ctx.accounts.owner.to_account_info(),
                    metadata: ctx.accounts.badge_metadata.to_account_info(),
                    token_program: ctx.accounts.token_program.to_account_info(),
                    system_program: ctx.accounts.system_program.to_account_info(),
                    rent: ctx.accounts.rent.to_account_info(),
                },
                signer_seeds,
            ),
            Some(0),
        )?;

        // Update reputation account
        let reputation = &mut ctx.accounts.reputation;
        reputation.world_id_verified = true; // profile creation = verified human

        emit!(ProfileSbtMinted {
            owner: ctx.accounts.owner.key(),
            name,
            bio,
            minted_at: clock.unix_timestamp,
        });

        Ok(())
    }

    // ─────────────────────────────────────────────
    // 6. INITIALIZE MINT TRACKER
    // Call this once to set up the tracker account for reward NFTs.
    // ─────────────────────────────────────────────
    pub fn initialize_mint_tracker(ctx: Context<InitializeMintTracker>) -> Result<()> {
        let tracker = &mut ctx.accounts.tracker;
        tracker.pioneer_minted = 0;
        tracker.bump = ctx.bumps.tracker;
        Ok(())
    }

    // ─────────────────────────────────────────────
    // 7. MINT FOUNDER NFT
    // Callable only by the hardcoded founder wallet.
    // ─────────────────────────────────────────────
    pub fn mint_founder_nft(ctx: Context<MintFounderNft>, metadata_uri: String) -> Result<()> {
        // Only your wallet can mint this
        let founder_key = FORGE_FOUNDER.parse::<Pubkey>().unwrap();
        require!(
            ctx.accounts.authority.key() == founder_key,
            SbtError::Unauthorized
        );

        let nft = &mut ctx.accounts.founder_nft;
        let clock = Clock::get()?;

        nft.owner = ctx.accounts.recipient.key();
        nft.nft_type = NftType::Founder;
        nft.edition = 1;
        nft.uri = metadata_uri.clone();
        nft.minted_at = clock.unix_timestamp;
        nft.bump = ctx.bumps.founder_nft;

        // 1. Mint 1 token
        let recipient_key = ctx.accounts.recipient.key();
        let seeds = &[
            b"founder_mint_v2",
            recipient_key.as_ref(),
            &[ctx.bumps.badge_mint],
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

        // 2. Metadata
        create_metadata_accounts_v3(
            CpiContext::new_with_signer(
                ctx.accounts.token_metadata_program.key(),
                CreateMetadataAccountsV3 {
                    metadata: ctx.accounts.badge_metadata.to_account_info(),
                    mint: ctx.accounts.badge_mint.to_account_info(),
                    mint_authority: ctx.accounts.badge_mint.to_account_info(),
                    payer: ctx.accounts.authority.to_account_info(),
                    update_authority: ctx.accounts.badge_mint.to_account_info(),
                    system_program: ctx.accounts.system_program.to_account_info(),
                    rent: ctx.accounts.rent.to_account_info(),
                },
                signer_seeds,
            ),
            DataV2 {
                name: "Forge Founder NFT".to_string(),
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
            false, // Immutable
            None,
        )?;

        // 3. Master Edition
        create_master_edition_v3(
            CpiContext::new_with_signer(
                ctx.accounts.token_metadata_program.key(),
                CreateMasterEditionV3 {
                    edition: ctx.accounts.badge_edition.to_account_info(),
                    mint: ctx.accounts.badge_mint.to_account_info(),
                    update_authority: ctx.accounts.badge_mint.to_account_info(),
                    mint_authority: ctx.accounts.badge_mint.to_account_info(),
                    payer: ctx.accounts.authority.to_account_info(),
                    metadata: ctx.accounts.badge_metadata.to_account_info(),
                    token_program: ctx.accounts.token_program.to_account_info(),
                    system_program: ctx.accounts.system_program.to_account_info(),
                    rent: ctx.accounts.rent.to_account_info(),
                },
                signer_seeds,
            ),
            Some(0),
        )?;

        emit!(SpecialNftMinted {
            owner: nft.owner,
            nft_type: NftType::Founder,
            minted_at: nft.minted_at,
        });

        Ok(())
    }

    // ─────────────────────────────────────────────
    // 8. MINT PIONEER NFT
    // Capped at 100 total mints.
    // ─────────────────────────────────────────────
    pub fn mint_pioneer_nft(ctx: Context<MintPioneerNft>, metadata_uri: String) -> Result<()> {
        let tracker = &mut ctx.accounts.tracker;

        // Check supply cap
        require!(
            tracker.pioneer_minted < PIONEER_MAX_SUPPLY,
            SbtError::SupplyExhausted
        );

        let nft = &mut ctx.accounts.pioneer_nft;
        let clock = Clock::get()?;

        nft.owner = ctx.accounts.recipient.key();
        nft.nft_type = NftType::Pioneer;
        nft.edition = tracker.pioneer_minted + 1; // e.g. Pioneer #47
        nft.uri = metadata_uri.clone();
        nft.minted_at = clock.unix_timestamp;
        nft.bump = ctx.bumps.pioneer_nft;

        tracker.pioneer_minted += 1;

        // 1. Mint 1 token
        let recipient_key = ctx.accounts.recipient.key();
        let seeds = &[
            b"pioneer_mint_v2",
            recipient_key.as_ref(),
            &[ctx.bumps.badge_mint],
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

        // 2. Metadata
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
                name: format!("Forge Pioneer #{}", nft.edition),
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
            false, // Immutable
            None,
        )?;

        // 3. Master Edition
        create_master_edition_v3(
            CpiContext::new_with_signer(
                ctx.accounts.token_metadata_program.key(),
                CreateMasterEditionV3 {
                    edition: ctx.accounts.badge_edition.to_account_info(),
                    mint: ctx.accounts.badge_mint.to_account_info(),
                    update_authority: ctx.accounts.badge_mint.to_account_info(),
                    mint_authority: ctx.accounts.badge_mint.to_account_info(),
                    payer: ctx.accounts.payer.to_account_info(),
                    metadata: ctx.accounts.badge_metadata.to_account_info(),
                    token_program: ctx.accounts.token_program.to_account_info(),
                    system_program: ctx.accounts.system_program.to_account_info(),
                    rent: ctx.accounts.rent.to_account_info(),
                },
                signer_seeds,
            ),
            Some(0),
        )?;

        emit!(SpecialNftMinted {
            owner: nft.owner,
            nft_type: NftType::Pioneer,
            minted_at: nft.minted_at,
        });

        Ok(())
    }

    // ─────────────────────────────────────────────
    // 9. MINT TECH STACK BADGE
    // Called after AI analyzes the user's GitHub stack.
    // ─────────────────────────────────────────────
    pub fn mint_tech_stack_badge(
        ctx: Context<MintTechStackBadge>,
        stack: String,
        metadata_uri: String,
    ) -> Result<()> {
        require!(stack.len() <= 100, SbtError::StringTooLong);

        // 1. Mint 1 token
        let owner_key = ctx.accounts.owner.key();
        let seeds = &[
            b"stack_mint_v2",
            owner_key.as_ref(),
            &[ctx.bumps.badge_mint],
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

        // 2. Metadata
        create_metadata_accounts_v3(
            CpiContext::new_with_signer(
                ctx.accounts.token_metadata_program.key(),
                CreateMetadataAccountsV3 {
                    metadata: ctx.accounts.badge_metadata.to_account_info(),
                    mint: ctx.accounts.badge_mint.to_account_info(),
                    mint_authority: ctx.accounts.badge_mint.to_account_info(),
                    payer: ctx.accounts.owner.to_account_info(),
                    update_authority: ctx.accounts.badge_mint.to_account_info(),
                    system_program: ctx.accounts.system_program.to_account_info(),
                    rent: ctx.accounts.rent.to_account_info(),
                },
                signer_seeds,
            ),
            DataV2 {
                name: "Forge Tech Stack".to_string(),
                symbol: "STACK".to_string(),
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
            false, // is_mutable = false (Immutable SBT)
            false,
            None,
        )?;

        // 3. Master Edition
        create_master_edition_v3(
            CpiContext::new_with_signer(
                ctx.accounts.token_metadata_program.key(),
                CreateMasterEditionV3 {
                    edition: ctx.accounts.badge_edition.to_account_info(),
                    mint: ctx.accounts.badge_mint.to_account_info(),
                    update_authority: ctx.accounts.badge_mint.to_account_info(),
                    mint_authority: ctx.accounts.badge_mint.to_account_info(),
                    payer: ctx.accounts.owner.to_account_info(),
                    metadata: ctx.accounts.badge_metadata.to_account_info(),
                    token_program: ctx.accounts.token_program.to_account_info(),
                    system_program: ctx.accounts.system_program.to_account_info(),
                    rent: ctx.accounts.rent.to_account_info(),
                },
                signer_seeds,
            ),
            Some(0),
        )?;

        // Store badge record
        let badge = &mut ctx.accounts.badge_record;
        let clock = Clock::get()?;
        badge.owner = owner_key;
        badge.badge_type = BadgeType::TechStackVerification;
        badge.skill_category = stack;
        badge.minted_at = clock.unix_timestamp;
        badge.mint = ctx.accounts.badge_mint.key();
        badge.bump = ctx.bumps.badge_record;

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
        + 4+100 // skill_category
        + 1    // rating
        + 1    // was_on_time
        + 8    // amount
        + 8    // minted_at
        + 32   // mint
        + 1;   // bump
}

#[account]
pub struct ProfileSbt {
    pub owner: Pubkey,
    pub name: String,       // max 50
    pub bio: String,        // max 200
    pub title: String,      // max 100
    pub metadata_uri: String, // max 200
    pub minted_at: i64,
    pub bump: u8,
}

impl ProfileSbt {
    pub const LEN: usize = 8   // discriminator
        + 32   // owner
        + 4+50 // name
        + 4+200 // bio
        + 4+100 // title
        + 4+200 // metadata_uri
        + 8    // minted_at
        + 1;   // bump
}

#[account]
pub struct MintTracker {
    pub pioneer_minted: u32, // tracks how many pioneers minted
    pub bump: u8,
}

impl MintTracker {
    pub const LEN: usize = 8 + 4 + 1;
}

#[account]
pub struct SpecialNft {
    pub owner: Pubkey,
    pub nft_type: NftType,
    pub edition: u32,   // for Pioneer: #1 to #100. Founder: always 1
    pub uri: String,    // max 200
    pub minted_at: i64,
    pub bump: u8,
}

impl SpecialNft {
    pub const LEN: usize = 8 + 32 + 1 + 4 + (4 + 200) + 8 + 1;
}


#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum BadgeType {
    WorkerCompletion,
    ClientPayment,
    TechStackVerification,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum NftType {
    Founder,
    Pioneer,
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
        seeds = [b"worker_badge_v2", worker.key().as_ref(), task_id.to_le_bytes().as_ref()],
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

    /// CHECK: Metaplex metadata account
    #[account(mut)]
    pub badge_metadata: UncheckedAccount<'info>,

    /// CHECK: Metaplex edition account
    #[account(mut)]
    pub badge_edition: UncheckedAccount<'info>,

    // Badge record — stores the badge details on-chain
    #[account(
        init,
        payer = payer,
        space = BadgeRecord::LEN,
        seeds = [b"worker_record_v2", worker.key().as_ref(), task_id.to_le_bytes().as_ref()],
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
        seeds = [b"client_badge_v2", client.key().as_ref(), task_id.to_le_bytes().as_ref()],
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

    /// CHECK: Metaplex edition account
    #[account(mut)]
    pub badge_edition: UncheckedAccount<'info>,

    #[account(
        init,
        payer = payer,
        space = BadgeRecord::LEN,
        seeds = [b"client_record_v2", client.key().as_ref(), task_id.to_le_bytes().as_ref()],
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

#[derive(Accounts)]
pub struct MintProfileSbt<'info> {
    #[account(
        init,
        payer = owner,
        space = ProfileSbt::LEN,
        seeds = [b"profile_v2", owner.key().as_ref()],
        bump
    )]
    pub profile_sbt: Account<'info, ProfileSbt>,

    #[account(
        mut,
        seeds = [b"reputation", owner.key().as_ref()],
        bump = reputation.bump,
        has_one = owner,
    )]
    pub reputation: Account<'info, ReputationAccount>,

    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        init,
        payer = owner,
        mint::decimals = 0,
        mint::authority = badge_mint,
        mint::freeze_authority = badge_mint,
        seeds = [b"profile_mint_v2", owner.key().as_ref()],
        bump
    )]
    pub badge_mint: Account<'info, Mint>,

    #[account(
        init_if_needed,
        payer = owner,
        associated_token::mint = badge_mint,
        associated_token::authority = owner,
    )]
    pub worker_badge_account: Account<'info, TokenAccount>,

    /// CHECK: Metaplex metadata
    #[account(mut)]
    pub badge_metadata: UncheckedAccount<'info>,

    /// CHECK: Metaplex edition
    #[account(mut)]
    pub badge_edition: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub token_metadata_program: Program<'info, Metadata>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct InitializeMintTracker<'info> {
    #[account(
        init,
        payer = authority,
        space = MintTracker::LEN,
        seeds = [b"mint_tracker"],
        bump
    )]
    pub tracker: Account<'info, MintTracker>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct MintFounderNft<'info> {
    #[account(
        init,
        payer = authority,
        space = SpecialNft::LEN,
        seeds = [b"founder_v2", recipient.key().as_ref()],
        bump
    )]
    pub founder_nft: Account<'info, SpecialNft>,

    /// CHECK: recipient wallet
    pub recipient: UncheckedAccount<'info>,

    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        mint::decimals = 0,
        mint::authority = badge_mint,
        mint::freeze_authority = badge_mint,
        seeds = [b"founder_mint_v2", recipient.key().as_ref()],
        bump
    )]
    pub badge_mint: Account<'info, Mint>,

    #[account(
        init_if_needed,
        payer = authority,
        associated_token::mint = badge_mint,
        associated_token::authority = recipient,
    )]
    pub worker_badge_account: Account<'info, TokenAccount>,

    /// CHECK: Metaplex metadata
    #[account(mut)]
    pub badge_metadata: UncheckedAccount<'info>,

    /// CHECK: Metaplex edition
    #[account(mut)]
    pub badge_edition: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub token_metadata_program: Program<'info, Metadata>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct MintPioneerNft<'info> {
    #[account(
        init,
        payer = payer,
        space = SpecialNft::LEN,
        seeds = [b"pioneer_v2", recipient.key().as_ref()],
        bump
    )]
    pub pioneer_nft: Account<'info, SpecialNft>,

    #[account(
        mut,
        seeds = [b"mint_tracker"],
        bump = tracker.bump,
    )]
    pub tracker: Account<'info, MintTracker>,

    /// CHECK: recipient wallet
    pub recipient: UncheckedAccount<'info>,

    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        init,
        payer = payer,
        mint::decimals = 0,
        mint::authority = badge_mint,
        mint::freeze_authority = badge_mint,
        seeds = [b"pioneer_mint_v2", recipient.key().as_ref()],
        bump
    )]
    pub badge_mint: Account<'info, Mint>,

    #[account(
        init_if_needed,
        payer = payer,
        associated_token::mint = badge_mint,
        associated_token::authority = recipient,
    )]
    pub worker_badge_account: Account<'info, TokenAccount>,

    /// CHECK: Metaplex metadata
    #[account(mut)]
    pub badge_metadata: UncheckedAccount<'info>,

    /// CHECK: Metaplex edition
    #[account(mut)]
    pub badge_edition: UncheckedAccount<'info>,

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

#[event]
pub struct ProfileSbtMinted {
    pub owner: Pubkey,
    pub name: String,
    pub bio: String,
    pub minted_at: i64,
}

#[event]
pub struct SpecialNftMinted {
    pub owner: Pubkey,
    pub nft_type: NftType,
    pub minted_at: i64,
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

    #[msg("Pioneer NFT supply of 100 has been exhausted")]
    SupplyExhausted,
}
#[derive(Accounts)]
pub struct MintTechStackBadge<'info> {
    #[account(
        init,
        payer = owner,
        mint::decimals = 0,
        mint::authority = badge_mint,
        mint::freeze_authority = badge_mint,
        seeds = [b"stack_mint_v2", owner.key().as_ref()],
        bump
    )]
    pub badge_mint: Account<'info, Mint>,

    #[account(
        init_if_needed,
        payer = owner,
        associated_token::mint = badge_mint,
        associated_token::authority = owner,
    )]
    pub worker_badge_account: Account<'info, TokenAccount>,

    /// CHECK: Metaplex metadata
    #[account(mut)]
    pub badge_metadata: UncheckedAccount<'info>,

    /// CHECK: Metaplex edition
    #[account(mut)]
    pub badge_edition: UncheckedAccount<'info>,

    #[account(
        init,
        payer = owner,
        space = BadgeRecord::LEN,
        seeds = [b"stack_record_v2", owner.key().as_ref()],
        bump
    )]
    pub badge_record: Account<'info, BadgeRecord>,

    #[account(mut)]
    pub owner: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub token_metadata_program: Program<'info, Metadata>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}
