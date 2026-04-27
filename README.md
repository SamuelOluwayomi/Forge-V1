# Forge

A trustless freelance marketplace on Solana where every participant is a verified unique human, every reputation is permanently on-chain, and every payment is governed by smart contract escrow — creating the infrastructure layer for professional identity on Solana.

## The Problem

- **No trust between strangers**: Clients and workers cannot verify each other before committing money.
- **Platform-locked reputation**: Your ratings disappear if the platform shuts down. You own nothing.
- **Payment fraud**: Workers get ghosted. Clients get bad work. No trustless recourse exists.
- **Fake accounts and bots**: Multi-wallet gaming inflates fake reputation. No proof of unique humanity.

## The Solution — 4 Core Pillars

### 01. Identity Pass (Coming Soon)

Every user will eventually be verified as a unique human via Civic or World ID before interacting with Forge. This ensures one device, one identity — no bots, no sockpuppets, and no one gaming the system with multiple wallets. We are currently researching the best decentralized identity solution for Forge.

### 02. On-Chain Escrow (Payment Layer)

When a task owner selects a worker, USDC locks into a PDA (Program Derived Address) in the `forge_escrow` Anchor program. Funds release automatically when the owner approves completion. If disputed, funds freeze until resolution. No middleman, no chargebacks, no "trust me". The smart contract is the arbiter.

### 03. Dual Soulbound Tokens (Reputation Layer)

Every completed task mints a non-transferable SBT to both the worker and the client wallet via the `forge_sbt` program.

- **Worker SBTs record**: skill category, tasks completed, average rating, on-time delivery rate.
- **Client SBTs record**: tasks posted, successful payments, payment speed, dispute rate.
  These tokens are permanent, portable, and owned by the individual, not the platform.

### 04. Task and Bounty Marketplace (Application Layer)

The front-end application built on top of the three programs. Post a task with title, description, price in USDC, deadline, and required SBT level. Workers browse and apply with a proposal. Owner reviews applicants — their SBT history is visible before selection. Bounties work the same way but are open to multiple completions. Everything flows through the on-chain programs — the frontend is just the interface.

## End-to-End User Flow

1. **Connect wallet + One-time Profile Setup**: User connects Phantom/Backpack. On first launch, a Reputation account is initialized on-chain. In future versions, a Proof of Humanity pass will be required here. Gate opens.
2. **Client posts a task**: Title, description, USDC price, deadline, skill tags, minimum SBT level required to apply. Transaction goes on-chain.
3. **Workers browse and apply**: Workers see the task on the marketplace. Their SBT history is visible on their profile. They submit a proposal with a message and timeline.
4. **Client selects worker -> Funds lock**: Client picks a worker. USDC immediately locks into the escrow PDA on-chain. Worker is notified. Work begins.
5. **Worker submits deliverable**: Worker marks task complete and submits their work link/proof. Client receives notification to review.
6. **Client approves -> Escrow releases**: Client clicks approve. Escrow program releases USDC to worker wallet minus Forge protocol fee. Transaction confirmed on-chain.
7. **SBTs mint to both wallets**: `forge_sbt` mints a badge to the worker (skill + rating + completion count) and a badge to the client (payment confirmed + reliability score). Both wallets now carry permanent, verifiable proof of this interaction.

## The Bigger Picture — Onchain Professional Identity

Forge is not just a marketplace. The SBT system creates something the web3 space has never had cleanly: a portable, human-verified, tamper-proof professional identity that lives in your wallet.

- **For developers**: Share your wallet address in a job application. Employer verifies your entire work history on-chain in seconds.
- **For DAOs**: Filter contributors by SBT credentials (e.g., "only wallets with 5+ Rust tasks can apply to this grant").
- **For other protocols**: DeFi platforms, lending protocols, and other dApps can read Forge SBTs as trust signals.
- **For Africa and emerging markets**: A freelancer in Lagos with 50 on-chain completions has equal credibility to anyone globally. No LinkedIn needed.

## Architecture: 3 Anchor Programs

1. **`forge_identity` (Planned)**: Identity gate. Marks wallets as human-verified on-chain.
   - Status: *In Research*
2. **`forge_escrow`**: Locks USDC into PDAs, handles task lifecycle, releases on approval.
   - Instructions: `create`, `accept`, `approve`, `dispute`
3. **`forge_sbt`**: Mints non-transferable badges to both wallets on task completion.
   - Instructions: `mint_worker`, `mint_client`

## Hybrid Storage Architecture & Security

To maintain a fast, Web2-like experience while preserving Web3 trustlessness, Forge utilizes a **Hybrid State Architecture**:

- **On-Chain (Solana)**: Core state (Escrow PDA, task ID, client/worker wallets, USDC amount, deadlines).
- **Off-Chain (Supabase DB)**: Heavy metadata (Task title, description, skills, AI-generated briefs, applicant proposals).
- **The Bridge (Integrity Hash)**: The off-chain data is hashed using SHA-256 (`content_hash`). This hash is passed into the `createTask` instruction and stored on-chain inside the `task_metadata_uri` field. Anyone can re-hash the database content and compare it to the on-chain hash to mathematically prove the task details haven't been tampered with.

### Input Security & Sanitization
All inputs passing between the client and the off-chain database go through a strict validation pipeline:
- **Sanitization**: Deep HTML tag stripping to prevent XSS vulnerabilities without relying on heavy DOM parsers.
- **Strict Typing**: Strict character limits (e.g., 5000 chars for descriptions) and constraint enforcement (e.g., review windows limited to 1-7 days to perfectly match smart contract bounds).
- **PDA Verification**: The backend strictly validates Solana base58 wallet formats and PDA structures before allocating database storage.

## Monetization

- **Protocol fee**: ~2% cut on every completed escrow. Baked into the smart contract. Automatic.
- **Featured listings**: Task posters pay USDC to boost their task to the top of the marketplace.
- **SBT verification API**: Other dApps and employers pay to query Forge SBT trust scores programmatically.
- **Premium profiles**: Workers pay for enhanced profile visibility and priority in applicant lists.
