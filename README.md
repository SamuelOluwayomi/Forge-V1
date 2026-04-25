# Forge

A trustless freelance marketplace on Solana where every participant is a verified unique human, every reputation is permanently on-chain, and every payment is governed by smart contract escrow — creating the infrastructure layer for professional identity on Solana.

## The Problem

- **No trust between strangers**: Clients and workers cannot verify each other before committing money.
- **Platform-locked reputation**: Your ratings disappear if the platform shuts down. You own nothing.
- **Payment fraud**: Workers get ghosted. Clients get bad work. No trustless recourse exists.
- **Fake accounts and bots**: Multi-wallet gaming inflates fake reputation. No proof of unique humanity.

## The Solution — 4 Core Pillars

### 01. Civic Captcha (Identity Layer)

Every user must verify as a unique human via World ID before interacting with Forge. One device, one identity. Iris-verified or phone-verified. No bots, no sockpuppets, no one gaming the system with multiple wallets. The verification proof is stored on-chain in the `forge_identity` program — every other program checks this gate before executing.

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

1. **Connect wallet + Verify with World ID**: User connects Phantom/Backpack. World ID prompt appears. After iris/phone verification, wallet is marked human-verified on-chain. Gate opens.
2. **Client posts a task**: Title, description, USDC price, deadline, skill tags, minimum SBT level required to apply. Transaction goes on-chain.
3. **Workers browse and apply**: Workers see the task on the marketplace. Their SBT history and World ID badge are visible on their profile. They submit a proposal with a message and timeline.
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

1. **`forge_identity`**: Civic Captcha gate. Marks wallets as human-verified on-chain.
   - Instructions: `verify_human`
2. **`forge_escrow`**: Locks USDC into PDAs, handles task lifecycle, releases on approval.
   - Instructions: `create`, `accept`, `approve`, `dispute`
3. **`forge_sbt`**: Mints non-transferable badges to both wallets on task completion.
   - Instructions: `mint_worker`, `mint_client`

## Monetization

- **Protocol fee**: ~2% cut on every completed escrow. Baked into the smart contract. Automatic.
- **Featured listings**: Task posters pay USDC to boost their task to the top of the marketplace.
- **SBT verification API**: Other dApps and employers pay to query Forge SBT trust scores programmatically.
- **Premium profiles**: Workers pay for enhanced profile visibility and priority in applicant lists.
