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

### 04. Unified Professional Marketplace (Application Layer)

The front-end application built on top of the three programs. Forge offers two distinct work models:
- **Challenge Mode (Selective)**: The client sets a deadline, reviews applicants, and selects exactly **one** developer to work on the task. Funds are released only to the selected developer.
- **Bounty Mode (Open Submission)**: Multiple developers can submit work simultaneously. The client reviews all submissions and selects the best one to receive the payout.

Workers browse and apply with enriched profiles featuring **On-Chain Ranks** and **Social Proof** (X, GitHub, Discord). Everything flows through the on-chain programs — the frontend is just the interface.

## End-to-End User Flow

1. **Connect wallet + Profile Setup**: User connects Phantom/Backpack. On first launch, a Reputation account is initialized. Users can link their **X, GitHub, Discord, and Telegram** to build trust.
2. **Client posts a task**: Selects between **Challenge** or **Bounty** mode. Sets a reward in SOL, a listing deadline, difficulty level, and skill tags. Transaction goes on-chain.
3. **Marketplace Discovery**: Tasks appear in the marketplace with **live countdown timers**. Developers can view full details, including the client's reputation and linked socials.
4. **Accepting Challenges**: 
   - In **Challenge Mode**, developers "Apply" to express interest. They must provide an **estimated time to completion**, which the client sees alongside their profile. The client reviews the applicant list and picks a worker.
   - In **Bounty Mode**, developers can begin work and submit their proof directly.
5. **Worker completes work -> Funds lock**: Once a worker is selected (Challenge) or work is submitted (Bounty), funds are managed by the `forge_escrow` program.
6. **Client approves -> Escrow releases**: Client clicks approve. Escrow program releases SOL to the worker wallet minus Forge protocol fee.
7. **SBTs & Rankings**: `forge_sbt` mints a badge to both parties. The worker's **Forge Score** increases, and their **Global Rank** is updated on the daily leaderboard.

## Features

### Global Ranking & Reputation
Forge implements a daily ranking system that scores developers based on their on-chain performance. Top-ranked developers receive a golden **Rank Badge** on their profile and exportable **Identity Card**, making them more attractive to high-paying clients.

### Privacy-First Communication
While profiles are public, sensitive **Direct Contact Info** (WhatsApp, Slack, etc.) is encrypted and only revealed to the specific developer selected for a task, ensuring zero-spam for clients.

### Identity Cards
Users can download or share their **Forge Identity Card**—a high-fidelity, neo-brutalist social card that showcases their Forge Score, Global Rank, and authenticated wallet status.

## The Bigger Picture — Onchain Professional Identity

Forge is not just a marketplace. The SBT system creates something the web3 space has never had cleanly: a portable, human-verified, tamper-proof professional identity that lives in your wallet.

- **For developers**: Share your wallet address in a job application. Employer verifies your entire work history on-chain in seconds.
- **For DAOs**: Filter contributors by SBT credentials (e.g., "only wallets with 5+ Rust tasks can apply to this grant").
- **For other protocols**: DeFi platforms, lending protocols, and other dApps can read Forge SBTs as trust signals.
- **For Africa and emerging markets**: A freelancer in Lagos with 50 on-chain completions has equal credibility to anyone globally. No LinkedIn needed.

## Architecture: 3 Anchor Programs

1. **`forge_identity` (Planned)**: Identity gate. Marks wallets as human-verified on-chain.
   - Status: *In Research*
2. **`forge_escrow`**: Locks SOL into PDAs, handles task lifecycle, releases on approval.
   - Instructions: `create`, `accept`, `submit_work`, `approve`, `dispute`, `resolve_dispute`, `claim_completion`
3. **`forge_sbt`**: Mints non-transferable badges to both wallets on task completion.
   - Instructions: `mint_worker`, `mint_client`

## Hybrid Storage Architecture & Security

To maintain a fast, Web2-like experience while preserving Web3 trustlessness, Forge utilizes a **Hybrid State Architecture**:

- **On-Chain (Solana)**: Core state (Escrow PDA, task ID, client/worker wallets, SOL amount, deadlines, difficulty).
- **Off-Chain (Supabase DB)**: Heavy metadata (Task title, description, skills, AI-generated briefs, applicant tracking, social profiles, and rankings).
- **The Bridge (Integrity Hash)**: The off-chain data is hashed using SHA-256 (`content_hash`). This hash is stored on-chain inside the `task_metadata_uri` field. Anyone can verify that the marketplace details match the on-chain record.

### Input Security & Sanitization
All inputs passing between the client and the off-chain database go through a strict validation pipeline:
- **Sanitization**: Deep HTML tag stripping to prevent XSS vulnerabilities.
- **Strict Typing**: Character limits and constraint enforcement (e.g., listing deadlines and review windows).
- **Privacy Logic**: Database-level security ensuring private contact info is only accessible to authorized participants.

## Monetization

- **Protocol fee**: ~2% cut on every completed escrow.
- **Featured listings**: Pay to boost tasks to the top of the marketplace.
- **Premium Identity**: Workers pay for enhanced profile cards and priority ranking.
- **SBT API**: External protocols pay to query Forge trust scores.
