# Forge

A trustless freelance marketplace on Solana where every participant is a verified unique human, every reputation is permanently on-chain, and every payment is governed by smart contract escrow. Forge creates the infrastructure layer for professional identity on Solana.

Built for the **Solana Frontier Hackathon 2026**.

---

## The Problem

- **No trust between strangers**: Clients and workers cannot verify each other before committing money.
- **Platform-locked reputation**: Your ratings disappear if the platform shuts down. You own nothing.
- **Payment fraud**: Workers get ghosted. Clients get bad work. No trustless recourse exists.
- **Fake accounts and bots**: Multi-wallet gaming inflates fake reputation. No proof of unique humanity.

## The Solution — 4 Core Pillars

### 01. Identity Pass (Coming Soon)

Every user will eventually be verified as a unique human via Civic or World ID before interacting with Forge. This ensures one device, one identity — no bots, no sockpuppets, and no one gaming the system with multiple wallets. We are currently researching the best decentralized identity solution for Forge.

### 02. On-Chain Escrow (Payment Layer)

When a task owner selects a worker, SOL locks into a PDA (Program Derived Address) in the `forge_escrow` Anchor program. Funds release automatically when the owner approves completion. If disputed, funds freeze until resolution. No middleman, no chargebacks, no "trust me". The smart contract is the arbiter.

### 03. Dual Soulbound Tokens (Reputation Layer)

Every completed task mints a non-transferable SBT to both the worker and the client wallet via the `forge_sbt` program.

- **Worker SBTs record**: skill category, tasks completed, average rating, on-time delivery rate.
- **Client SBTs record**: tasks posted, successful payments, payment speed, dispute rate.

These tokens are permanent, portable, and owned by the individual, not the platform.

### 04. Unified Professional Marketplace (Application Layer)

The front-end application built on top of the three programs. Forge offers two distinct work models:
- **Challenge Mode (Selective)**: The client sets a deadline, reviews applicants, and selects exactly **one** developer to work on the task. Funds are released only to the selected developer.
- **Bounty Mode (Open Submission)**: Multiple developers can submit work simultaneously. The client reviews all submissions and selects the best one to receive the payout.

Workers browse and apply with enriched profiles featuring **On-Chain Ranks** and **Social Proof** (X, GitHub, Discord). Everything flows through the on-chain programs — the frontend is just the interface.

---

## End-to-End User Flow

1. **Connect wallet + Profile Setup**: User connects Phantom or Backpack. On first launch, a Reputation account is initialized. Users can link their X, GitHub, Discord, and Telegram to build trust.
2. **Client posts a task**: Selects between Challenge or Bounty mode. Sets a reward in SOL, a listing deadline, difficulty level, and skill tags. Transaction goes on-chain.
3. **Marketplace Discovery**: Tasks appear in the marketplace with live countdown timers. Developers can view full details, including the client's reputation and linked socials.
4. **Accepting Challenges**: 
   - In **Challenge Mode**, developers "Apply" to express interest. They must provide an estimated time to completion, which the client sees alongside their profile. The client reviews the applicant list and picks a worker.
   - In **Bounty Mode**, developers can begin work and submit their proof directly.
5. **Worker completes work -> Funds lock**: Once a worker is selected (Challenge) or work is submitted (Bounty), funds are managed by the `forge_escrow` program.
6. **Client approves -> Escrow releases**: Client clicks approve. Escrow program releases SOL to the worker wallet minus the Forge protocol fee.
7. **SBTs & Rankings**: `forge_sbt` mints a badge to both parties. The worker's Forge Score increases, and their Global Rank is updated on the daily leaderboard.

---

## Features

### AI-Verified Tech Stack (GitHub Attestation)
To combat resume inflation and provide undeniable proof of capability, Forge features an AI-powered GitHub verification system.
1. **Bio Challenge**: Users prove ownership of their GitHub account by temporarily adding a Forge-generated deterministic code to their GitHub bio.
2. **AI Analysis**: Once ownership is verified, Forge's AI (powered by Groq) scans the user's public repositories, languages, and commit history to accurately summarize their core tech stack (e.g., `React | Rust | Solana`).
3. **On-Chain Attestation**: The verified tech stack is then minted as an immutable, Soulbound "Tech Stack Badge" directly to the user's wallet via the `forge_sbt` contract. This allows clients to hire with confidence based on cryptographically verified code history, rather than just self-reported skills.

### Global Ranking & Reputation
Forge implements a daily ranking system that scores developers based on their on-chain performance. Top-ranked developers receive a golden Rank Badge on their profile and an exportable Identity Card, making them more attractive to high-paying clients.

### Privacy-First Communication
While profiles are public, sensitive Direct Contact Info (WhatsApp, Telegram, etc.) is encrypted and only revealed to the specific developer selected for a task, ensuring zero-spam for clients.

### Identity Cards
Users can download or share their Forge Identity Card — a high-fidelity, neo-brutalist social card that showcases their Forge Score, Global Rank, and authenticated wallet status.

### Zero-Gas Infrastructure (Fee Sponsorship)
To ensure a frictionless onboarding experience, Forge operates a server-side transaction relay. Every infrastructure transaction — including account initialization, SBT minting, and profile updates — is co-signed by Forge's treasury wallet as the fee payer. Users only sign to prove identity and never pay network fees for using the platform. The only time a user pays is when locking their own funds into an escrow contract.

---

## The Bigger Picture — Onchain Professional Identity

Forge is not just a marketplace. The SBT system creates something the web3 space has never had cleanly: a portable, human-verified, tamper-proof professional identity that lives in your wallet.

- **For developers**: Share your wallet address in a job application. Employer verifies your entire work history on-chain in seconds.
- **For DAOs**: Filter contributors by SBT credentials (e.g., "only wallets with 5+ Rust tasks can apply to this grant").
- **For other protocols**: DeFi platforms, lending protocols, and other dApps can read Forge SBTs as trust signals.
- **For emerging markets**: A freelancer in Lagos with 50 on-chain completions has equal credibility to anyone globally. No LinkedIn needed.

---

## Monetization & Protocol Fees

Forge is built to be a self-sustaining ecosystem. To support ongoing development and infrastructure costs, the platform implements a small protocol fee on successfully completed transactions.

- **Protocol Fee**: 2% of the total escrow amount.
- **Treasury Wallet**: `EPpNW3G47SAJ4j1DatpjW7mJMLRTH9Z8K7LJtBfhR8Mt`
- **Fee Logic**: When a client approves a task or a worker claims their funds after the review window, the `forge_escrow` program automatically deducts 2% and sends it to the treasury. The remaining 98% is released to the developer.

This fee is only charged upon successful payment release. Posting tasks, applying for work, and minting reputation badges are currently subsidized by Forge (Zero-Gas).

---

## Architecture: Anchor Programs

Forge relies on robust smart contracts built with the Anchor framework on Solana.

1. **`forge_escrow`**: Locks SOL into PDAs, handles task lifecycle, releases on approval.
   - **Program ID**: `AkoaVinz9Md94KsC2k6sULNdwvqh2uF16KdKiWdpr6ye`
   - **Instructions**: `create_task`, `accept_worker`, `submit_work`, `approve_work`, `cancel_task`, `raise_dispute`, `resolve_dispute`, `claim_completion`

2. **`forge_sbt`**: Mints non-transferable badges to both wallets on task completion.
   - **Program ID**: `B563uW8guVAhSasPR5S6MgMGHcYwtbaiwVv9kofkwZKZ`
   - **Instructions**: `initialize_mint_tracker`, `initialize_reputation`, `mint_client_badge`, `mint_founder_nft`, `mint_pioneer_nft`, `mint_profile_sbt`, `mint_worker_badge`

3. **`forge_identity` (Planned)**: Identity gate. Marks wallets as human-verified on-chain.
   - **Status**: *In Research*

---

## Hybrid Storage Architecture & Security

To maintain a fast, Web2-like experience while preserving Web3 trustlessness, Forge utilizes a Hybrid State Architecture:

- **On-Chain (Solana)**: Core state (Escrow PDA, task ID, client/worker wallets, SOL amount, deadlines, difficulty, status).
- **Off-Chain (Supabase DB)**: Heavy metadata (Task title, description, skills, AI-generated briefs, applicant tracking, social profiles, and rankings).
- **The Bridge (Integrity Hash)**: The off-chain data is hashed using SHA-256 (`content_hash`). This hash is stored on-chain inside the `task_metadata_uri` field. Anyone can verify that the marketplace details match the on-chain record.

### Input Security & Sanitization
All inputs passing between the client and the off-chain database go through a strict validation pipeline:
- **Sanitization**: Deep HTML tag stripping to prevent XSS vulnerabilities.
- **Strict Typing**: Character limits and constraint enforcement (e.g., listing deadlines and review windows).
- **Privacy Logic**: Database-level security ensuring private contact info is only accessible to authorized participants.

---

## Setup Instructions

### Prerequisites
- Node.js 18+
- Solana CLI
- Anchor framework
- PostgreSQL database (Supabase recommended)

### Running Locally

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Variables**
   Create a `.env.local` file and add the required variables for your RPC endpoint and Supabase instance.

3. **Deploy Programs**
   ```bash
   cd anchor
   anchor build
   anchor deploy
   ```

4. **Start Development Server**
   ```bash
   npm run dev
   ```

---

## Monetization

- **Protocol fee**: Platform fee on every completed escrow.
- **Featured listings**: Pay to boost tasks to the top of the marketplace.
- **Premium Identity**: Workers pay for enhanced profile cards and priority ranking.
- **SBT API**: External protocols pay to query Forge trust scores.
