# Forge

**The Trustless Developer Marketplace on Solana**

Where on-chain reputation replaces resumes, and smart contracts replace trust.

- Live Demo: https://forge-frontier.vercel.app
- Built with: Anchor 0.30.1, Next.js 15, Solana Devnet
- Built for: Solana Frontier Hackathon 2026

---

## Overview

Forge is a decentralized, trustless freelance marketplace built on Solana. Every payment is governed by a smart contract escrow, every reputation is permanently minted on-chain as a Soulbound Token, and every developer's skills are verified through AI-powered GitHub attestation — not self-reported claims.

---

## The Problem

| Problem | Status Quo | Forge's Answer |
|---|---|---|
| No trust between strangers | Clients and workers cannot verify each other before committing money | On-chain reputation history, AI-verified skills |
| Platform-locked reputation | Your ratings disappear if the platform shuts down | Soulbound Tokens live in your wallet, forever |
| Payment fraud | Workers get ghosted; clients receive bad work with no recourse | Non-custodial escrow with dispute escalation |
| Fake accounts and bots | Multi-wallet gaming inflates fake reputation | Civic / World ID integration (in research) |

---

## Core Architecture — 4 Pillars

### 01 — Identity Pass (Coming Soon)
Every user will be verified as a unique human via Civic or World ID. One device, one identity. No bots, no sockpuppets, no reputation gaming.

### 02 — On-Chain Escrow (Payment Layer)
When a client selects a worker, SOL locks into a PDA in the `forge_escrow` Anchor program. Funds release automatically on approval. If disputed, funds freeze until an arbitrator resolves the case. No middleman. The smart contract is the arbiter.

### 03 — Dual Soulbound Tokens (Reputation Layer)
Every completed task mints a non-transferable SBT to both the worker and the client wallet via the `forge_sbt` program.
- Worker SBTs record: skill category, tasks completed, average rating, on-time delivery.
- Client SBTs record: tasks posted, successful payments, payment speed, dispute rate.

These tokens are permanent, portable, and owned by the individual — not the platform.

### 04 — Unified Professional Marketplace (Application Layer)
Two distinct work models:
- **Challenge Mode (Selective):** Client sets a deadline, reviews applicants, and selects exactly one developer. Funds release only to the chosen worker.
- **Bounty Mode (Open Submission):** Multiple developers can submit work simultaneously. Client picks the best submission to receive the payout.

---

## Features

### AI-Verified Tech Stack (GitHub Attestation)
Forge's AI verification system eliminates resume inflation with cryptographic proof of capability.

1. **Bio Challenge** — Users prove GitHub ownership by temporarily adding a Forge-generated code to their bio.
2. **Deep AI Analysis** — Forge's AI (Groq LLaMA-3.3) paginates through up to 500 repositories, aggregates language frequencies, and extracts repository topics.
3. **Interactive Selection** — Users choose which detected skills to highlight on their profile.
4. **On-Chain Attestation** — The selected tech stack is minted as an immutable "Tech Stack Badge" SBT to the user's wallet.

Clients hire based on cryptographically verified code history, not self-reported keywords.

### Global Ranking and Reputation
A daily ranking system scores developers on on-chain performance. Top-ranked developers receive a Rank Badge and a downloadable Identity Card — shareable on X/Twitter or LinkedIn.

### Privacy-First Communication
Public profiles keep sensitive contact info (WhatsApp, Telegram, etc.) encrypted, revealed only to the developer selected for a task. Zero spam for clients.

### Identity Cards
Downloadable, shareable Forge Identity Cards — high-fidelity, neo-brutalist social cards showcasing Forge Score, Global Rank, and authenticated wallet status.

### Zero-Gas Infrastructure (Fee Sponsorship)
Forge operates a server-side transaction relay. Every infrastructure transaction — account initialization, SBT minting, profile updates — is co-signed by Forge's treasury wallet as the fee payer.

- Users never pay network fees for platform interactions.
- The only time a user pays is when locking their own funds into an escrow contract.

---

## End-to-End User Flow

```
1. Connect Wallet        ->  Phantom or Backpack. Reputation account initialized on first launch.
2. Build Profile         ->  Link X, GitHub, Discord, Telegram. Run AI GitHub verification.
3. Post a Task (Client)  ->  Select Challenge or Bounty mode. Set SOL reward, deadline, skill tags.
4. Browse & Apply (Dev)  ->  Filter marketplace by skill, difficulty, reward. Review client reputation.
5. Work Selection        ->  Challenge: Client selects one dev. Bounty: Devs submit; client picks best.
6. Funds Lock            ->  SOL locks in forge_escrow PDA. Both parties sign.
7. Work & Submit         ->  Dev submits proof. AI agent reviews against original requirements.
8. Approve & Release     ->  Client approves -> escrow releases 98% to dev, 2% to protocol treasury.
9. Badges Minted         ->  forge_sbt mints SBTs to both wallets. Forge Score and rank updated.
```

---

## Smart Contracts

### forge_escrow
Manages the full task lifecycle — from posting to payment release.

| | |
|---|---|
| **Program ID** | `AkoaVinz9Md94KsC2k6sULNdwvqh2uF16KdKiWdpr6ye` |
| **Instructions** | `create_task`, `accept_worker`, `submit_work`, `approve_work`, `cancel_task`, `raise_dispute`, `resolve_dispute`, `claim_completion` |

Task lifecycle state machine:

```
Open -> Active -> Submitted -> Completed
                           -> Disputed -> Completed / Cancelled
     -> Cancelled (by client, Open status only)
```

Protocol fee: 2% of escrow amount, sent to treasury on completion.
Treasury: `EPpNW3G47SAJ4j1DatpjW7mJMLRTH9Z8K7LJtBfhR8Mt`

### forge_sbt
Mints non-transferable Soulbound Tokens for reputation, skills, and identity.

| | |
|---|---|
| **Program ID** | `B563uW8guVAhSasPR5S6MgMGHcYwtbaiwVv9kofkwZKZ` |
| **Instructions** | `initialize_mint_tracker`, `initialize_reputation`, `mint_profile_sbt`, `mint_worker_badge`, `mint_client_badge`, `mint_founder_nft`, `mint_pioneer_nft` |

### forge_identity (Planned)
On-chain identity gate. Marks wallets as human-verified. Status: In Research.

---

## Hybrid Storage Architecture

| Layer | Technology | What's Stored |
|---|---|---|
| On-Chain | Solana / Anchor PDAs | Escrow state, task ID, client/worker wallets, SOL amount, deadlines, difficulty, status |
| Off-Chain | Supabase (PostgreSQL) | Task titles, descriptions, skill tags, AI briefs, applicant tracking, social profiles, rankings |
| Integrity Bridge | SHA-256 content hash | Hash of off-chain metadata stored on-chain in `task_metadata_uri` for trustless verification |

### Security and Input Validation
- **XSS Prevention:** Deep HTML tag stripping on all user inputs.
- **Strict Typing:** Character limits and constraint enforcement across all fields.
- **Privacy Logic:** Database-level row security — private contact info is only accessible to authorized task participants.

---

## Scalability and Infrastructure

| Component | Current Capacity | Scaling Path |
|---|---|---|
| Frontend (Vercel Edge) | 100,000+ concurrent users | Scales automatically |
| Database (Supabase) | ~1,000-5,000 active users | Upgrade to dedicated PostgreSQL instance |
| Blockchain RPC (Public Solana) | ~10-20 TPS | Migrate to Helius or QuickNode for dedicated RPC |
| Gasless Relayer (Single treasury wallet) | ~5-10 TPS | Rotate fleet of 5-10 fee-payer wallets |
| AI Verification (Groq + GitHub API) | ~30-60 users/min | GitHub App installation + paid Groq tier |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Blockchain | Solana (Devnet) |
| Smart Contracts | Anchor 0.30.1 (Rust) |
| Frontend | Next.js 15, React, TypeScript |
| Styling | Vanilla CSS (Neo-Brutalist design system) |
| Database | Supabase (PostgreSQL) |
| Wallet | Phantom, Backpack (via @solana/wallet-adapter) |
| AI | Groq API (LLaMA-3.3-70B) |
| Hosting | Vercel Edge Network |
| Transaction Relay | Custom Next.js API route (/api/transactions/relay) |

---

## Getting Started

### Prerequisites

- Node.js 18+
- Rust (stable)
- Solana CLI
- Anchor CLI 0.30.1
- Supabase project (for the database)

### 1. Clone and Install

```bash
git clone https://github.com/your-org/forge-v1.git
cd forge-v1
npm install
```

### 2. Configure Environment Variables

Create a `.env.local` file in the project root:

```env
# Solana
NEXT_PUBLIC_RPC_URL=https://api.devnet.solana.com

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Transaction Relay (Forge Treasury)
NEXT_PUBLIC_FORGE_FEE_PAYER_PUBLIC_KEY=your_fee_payer_pubkey
FORGE_FEE_PAYER_SECRET_KEY=your_fee_payer_secret_key_array

# AI
GROQ_API_KEY=your_groq_api_key
GITHUB_TOKEN=your_github_personal_access_token
```

### 3. Build and Deploy Smart Contracts

```bash
cd anchor

# Build both programs
anchor build

# Deploy to devnet (requires ~4-5 SOL in your wallet)
anchor program deploy --program-name forge_escrow --provider.cluster devnet
anchor program deploy --program-name forge_sbt --provider.cluster devnet

# Copy generated IDLs to the frontend
cp target/idl/forge_escrow.json ../app/lib/idl/
cp target/idl/forge_sbt.json ../app/lib/idl/
```

### 4. Run the Development Server

```bash
cd ..
npm run dev
```

Open http://localhost:3000 in your browser.

---

## Project Structure

```
forge-v1/
├── anchor/                      # Solana smart contracts (Anchor/Rust)
│   ├── programs/
│   │   ├── forge_escrow/        # Task lifecycle & payment escrow
│   │   └── forge_sbt/           # Soulbound Token minting & reputation
│   ├── target/
│   │   ├── deploy/              # Compiled .so binaries & keypairs
│   │   └── idl/                 # Auto-generated IDL JSON files
│   └── Anchor.toml
│
└── app/                         # Next.js frontend application
    ├── lib/
    │   ├── hooks/
    │   │   ├── useEscrow.ts     # Escrow interaction hook
    │   │   └── useSbt.ts        # SBT minting hook
    │   ├── idl/                 # Anchor IDL files for frontend
    │   └── sponsored-tx.ts      # Gasless transaction relay helper
    ├── api/
    │   └── transactions/
    │       └── relay/           # Server-side fee-payer relay endpoint
    ├── marketplace/             # Task browsing & discovery
    ├── dashboard/               # Client task management
    └── profile/                 # Developer identity & SBT display
```

---

## The Bigger Picture — On-Chain Professional Identity

Forge is not just a marketplace. The SBT system creates a portable, human-verified, tamper-proof professional identity that lives in your wallet.

- **For developers:** Share your wallet address in a job application. Employers verify your entire work history on-chain in seconds.
- **For DAOs:** Filter contributors by SBT credentials (e.g., only wallets with 5+ Rust task completions can apply to this grant).
- **For other protocols:** DeFi platforms, lending protocols, and dApps can read Forge SBTs as trust signals.
- **For emerging markets:** A freelancer in Lagos with 50 on-chain completions has equal credibility to anyone globally. No LinkedIn required.

---

## Roadmap

| Phase | Timeline | Milestone |
|---|---|---|
| Phase 1 | Shipped | Core smart contracts live on devnet, full escrow lifecycle, dual SBT minting, AI GitHub verification, gasless relay |
| Phase 2 | Months 1-2 | AI GitHub grading (originality + complexity), skill-tier SBTs (Apprentice to Grandmaster), fork-fraud prevention |
| Phase 3 | Months 3-4 | Public developer profiles, Forge Score algorithm, shareable Profile Cards |
| Phase 4 | Months 5-6 | Social layer, peer endorsements, direct messaging, team bounties |
| Phase 5 | Months 7+ | Enterprise recruiting tools, DAO integrations, public SBT Verification API, Mainnet launch |

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes (`git commit -m 'feat: add my feature'`)
4. Push to the branch (`git push origin feature/my-feature`)
5. Open a Pull Request

---

## License

MIT License. See LICENSE for details.

---

Built for the Solana Frontier Hackathon 2026
