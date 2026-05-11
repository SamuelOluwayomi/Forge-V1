# Forge — Business Plan

> **Forge** is a decentralized, trustless freelance marketplace on Solana that creates a portable, cryptographically verifiable professional identity for every developer — one that lives in their wallet and can never be taken away.

**Demo:** [forge-frontier.vercel.app](https://forge-frontier.vercel.app) · **Stage:** Hackathon MVP (Solana Frontier 2026)

---

## 1. Executive Summary

The global freelance market is a $1.5 trillion industry plagued by a single unsolved problem: **trust**. Clients cannot verify worker quality before paying. Workers cannot guarantee payment before delivering. And when platforms shut down, years of hard-earned reputation vanish overnight.

Forge solves this at the infrastructure layer. By combining **on-chain escrow**, **Soulbound Token reputation**, and **AI-verified skill attestation**, Forge creates the first truly portable professional identity for developers — one that is owned by the individual, not the platform.

The addressable market includes 26.9 million professional developers worldwide, a growing cohort of Web3 contributors, and any DAO or protocol needing a trusted way to source and pay for technical work.

---

## 2. The Problem

Current hiring and freelance tools fail in four critical ways:

| Problem | Root Cause | Business Cost |
|---|---|---|
| **Unverifiable skill claims** | LinkedIn and resumes are self-reported with no enforcement | Clients waste resources on mismatched hires |
| **Platform-locked reputation** | Ratings live in Upwork's database, not the user's wallet | Developers cannot port their work history |
| **Payment fraud and disputes** | No neutral escrow; platforms act as slow, biased intermediaries | Workers get ghosted; clients receive substandard work |
| **Fake accounts and Sybil attacks** | No proof of unique humanity; wallets are free to create | Reputation can be gamed with multiple wallets |

These are not UX problems — they are **trust architecture problems**. No amount of UI improvement fixes a system that lacks cryptographic accountability.

---

## 3. The Solution

Forge rebuilds the trust layer from the ground up using four composable primitives:

### Primitive 1 — Smart Contract Escrow

When a client selects a developer, funds lock into a non-custodial PDA on Solana. They release automatically on approval, freeze during disputes, and return to the client if work is never delivered. The smart contract is the neutral arbiter — not a support team.

### Primitive 2 — Dual Soulbound Tokens (SBTs)

Every completed task mints a non-transferable badge to both the worker's and the client's wallet. This badge is permanent, public, and verifiable by anyone. A developer's entire work history becomes an on-chain credential portfolio that follows them across every platform forever.

### Primitive 3 — AI-Verified Skill Attestation

Forge's AI (Groq LLaMA-3.3) analyzes a developer's entire GitHub history — up to 500 repositories — to extract languages, frameworks, and ecosystems with precision. Ownership is proven via a deterministic bio challenge. Verified skills are minted on-chain as a "Tech Stack Badge," making it impossible to fake expertise.

### Primitive 4 — Human Verification (Identity Gate)

Integration with Civic Pass / World ID (in research) will ensure each wallet represents a unique human, preventing Sybil attacks and enabling one-person-one-reputation by design.

---

## 4. Product Overview

### Work Modes

- **Challenge Mode (Selective):** Client reviews applicants and selects one developer. Funds release only to the chosen worker. Designed for complex, high-value tasks requiring specific expertise.
- **Bounty Mode (Open Submission):** Multiple developers can submit work simultaneously. Client reviews all submissions and pays the best one. Optimal for creative, design, or content tasks.

### Key Product Features

| Feature | Description |
|---|---|
| **On-Chain Escrow** | Non-custodial SOL locking via Anchor PDAs with full dispute escalation |
| **SBT Reputation** | Permanent, non-transferable badges for workers and clients on every task completion |
| **AI GitHub Verification** | Cryptographic proof of coding skills via AI analysis of GitHub history |
| **Global Leaderboard** | Daily developer ranking based on on-chain performance metrics |
| **Identity Cards** | Downloadable, shareable professional cards showing Forge Score and verified credentials |
| **Zero-Gas UX** | Forge sponsors all infrastructure transactions — users never pay network fees |
| **Privacy-First Contacts** | Sensitive contact info encrypted and revealed only to selected task participants |
| **Dispute Arbitration** | Multi-stage dispute resolution escalating to a designated on-chain arbitrator |

### Zero-Gas Infrastructure

Forge's server-side transaction relay co-signs every non-financial transaction with Forge's treasury wallet as the fee payer. Users experience Web2-level friction for all onboarding and reputation activities. The only time a user pays is when they intentionally lock their own funds into escrow.

---

## 5. Business Model and Revenue Streams

Forge is designed to be a self-sustaining protocol with multiple compounding revenue layers.

### Revenue Stream 1 — Protocol Fee (Immediate / Live)

A **2% fee** is automatically extracted by the smart contract on every successfully released escrow. This is collected at the protocol level — no invoicing, no chasing payments, no fraud. If a task is cancelled or refunded, no fee is collected.

> Example: A $1,000 task generates $20 automatically. At 500 tasks per month, this is $10,000/month with zero marginal cost.

### Revenue Stream 2 — Featured Listings

Task posters, DAOs, and protocols pay to boost their task to the top of the marketplace. This mirrors the proven advertising model of job boards like LinkedIn and Glassdoor, enforced on-chain.

### Revenue Stream 3 — Enterprise Hiring Subscriptions

Companies pay a monthly subscription for premium access to Forge's verified developer network, including advanced filtering by SBT credentials, tech stack, and Forge Score. This directly competes with LinkedIn Recruiter ($10,000+/year).

### Revenue Stream 4 — SBT Verification API

External dApps, DAOs, lending protocols, and traditional employers pay per-query or subscription to programmatically verify Forge credentials. This positions Forge as infrastructure — a trust oracle that any protocol can build on.

### Revenue Stream 5 — Premium Developer Profiles

Developers pay for enhanced profile visibility, priority placement in applicant lists, and exclusive profile card designs.

### Revenue Projection (Illustrative)

| Metric | Month 6 | Month 12 | Month 24 |
|---|---|---|---|
| Active Tasks / Month | 200 | 1,000 | 5,000 |
| Average Task Value | $300 | $400 | $500 |
| Protocol Fee (2%) | $1,200 | $8,000 | $50,000 |
| API + Enterprise Revenue | $0 | $5,000 | $30,000 |
| **Total MRR** | **~$1,200** | **~$13,000** | **~$80,000** |

---

## 6. Go-to-Market Strategy

### Phase 1 — Developer Community (Now)

- **Target:** Web3 developers, Solana ecosystem builders, and hackathon participants.
- **Channel:** X/Twitter, Solana Discord communities, developer newsletters.
- **Hook:** "Get your on-chain Forge Score." Offer free SBT minting to early adopters.

### Phase 2 — Viral Identity Cards

Forge Identity Cards are visually striking, downloadable cards showing a developer's Forge Score, Global Rank, and verified SBTs. Developers are incentivized to share them on X/Twitter and LinkedIn, driving organic viral acquisition at zero cost.

### Phase 3 — Bounty Partnerships

Partner with established Web3 protocols, DAOs, and tech companies to host their developer bounties exclusively on Forge. Each partner naturally onboards their developer community. Target partners: Solana Foundation, Superteam, Helius, and major DeFi protocols.

### Phase 4 — Emerging Market Grassroots

The largest untapped market for verifiable developer credentials is in emerging economies — Nigeria, India, Southeast Asia — where talented developers lack the institutional backing of Western university degrees or company names. Forge's on-chain reputation provides equal credibility regardless of geography, through direct community building via local tech communities, university partnerships, and regional developer events.

### Phase 5 — Enterprise and API Monetization

Once the developer base reaches meaningful scale (~10,000+ verified profiles), begin B2B enterprise outreach. The SBT database becomes increasingly valuable as a hiring signal with each new verified user added.

---

## 7. Competitive Landscape

| Platform | Trust Layer | Reputation Portability | Dispute Resolution | Web3-Native |
|---|---|---|---|---|
| **Upwork** | Centralized review system | Platform-locked | Manual (slow) | No |
| **Gitcoin** | Community-based | Partial | None | Yes |
| **Layer3 / Dework** | Activity tracking | Partial | None | Yes |
| **GitHub** | Code history | Partial | N/A | No |
| **Forge** | On-chain SBTs + AI verification | Wallet-owned | Smart contract | Yes |

**Forge's defensible advantage:** No competitor combines cryptographic skill verification, non-custodial escrow, and non-transferable on-chain reputation in a single, composable system. The SBT graph becomes a moat — as more tasks complete on Forge, the reputation data becomes more valuable and harder to replicate externally.

---

## 8. Technology and Infrastructure

### Smart Contracts (Anchor / Rust)

- `forge_escrow` — Task lifecycle and payment management
  - Program ID: `AkoaVinz9Md94KsC2k6sULNdwvqh2uF16KdKiWdpr6ye`
- `forge_sbt` — Soulbound Token minting and reputation tracking
  - Program ID: `B563uW8guVAhSasPR5S6MgMGHcYwtbaiwVv9kofkwZKZ`
- `forge_identity` — Human verification gate (In Research)

### Application Stack

- **Frontend:** Next.js 15, React, TypeScript — hosted on Vercel Edge Network
- **Database:** Supabase (PostgreSQL) — off-chain metadata, applicant tracking, social profiles
- **AI:** Groq API (LLaMA-3.3-70B) — GitHub analysis and task generation
- **Transaction Relay:** Custom Next.js API route — gasless transaction co-signing

### Scalability Assessment

| Component | Current Limit | Scaling Solution |
|---|---|---|
| Frontend (Vercel Edge) | 100,000+ concurrent users | Scales automatically |
| Database (Supabase) | ~1,000-5,000 active users | Dedicated PostgreSQL instance |
| Blockchain RPC (Public Solana) | ~10-20 TPS | Helius or QuickNode dedicated RPC |
| Gasless Relayer (Single wallet) | ~5-10 TPS | Fleet of 5-10 rotating fee-payer wallets |
| AI Verification (Groq + GitHub) | ~30-60 users/min | GitHub App installation + paid API tiers |

---

## 9. What Was Shipped — Hackathon Phase (Phase 1)

For the Solana Frontier Hackathon 2026, Forge shipped a fully functional, on-chain freelance marketplace demonstrating all core primitives:

- Smart Contracts — Two composable Anchor programs deployed to Solana Devnet
- End-to-End Escrow — Full task lifecycle: post, apply, select, submit, approve/dispute, release
- AI GitHub Verification — Bio-challenge ownership proof plus LLaMA-3.3 deep repository analysis
- Dual SBT Minting — Non-transferable badges minted to both wallets on task completion
- Dispute Arbitration — Multi-stage dispute escalation with a designated on-chain arbitrator
- Global Leaderboard — Daily ranking system based on on-chain Forge Score
- Identity Cards — Downloadable, shareable developer credential cards
- Zero-Gas Infrastructure — Server-side relay sponsoring all infrastructure transactions
- Polished UI — Responsive, neo-brutalist design system with dark mode and micro-animations

---

## 10. Post-Hackathon Roadmap

| Phase | Timeline | Milestone |
|---|---|---|
| **Phase 1** | Shipped | Core contracts, escrow, SBTs, AI verification, gasless relay |
| **Phase 2** | Months 1-2 | AI code grading, skill-tier SBTs (Apprentice to Grandmaster), fork-fraud detection |
| **Phase 3** | Months 3-4 | Public developer profiles, Forge Score algorithm, shareable Profile Cards |
| **Phase 4** | Months 5-6 | Peer endorsements, direct messaging, team formation for larger bounties |
| **Phase 5** | Months 7+ | Enterprise recruiting tools, DAO integrations, public SBT Verification API, Mainnet launch |

---

## 11. The Bigger Picture

Forge is not just a marketplace. It is the **trust infrastructure layer** for the global developer economy.

- **For developers:** Share your wallet address in a job application. Employers verify your entire work history on-chain in seconds.
- **For DAOs:** Filter contributors by SBT credentials — "only wallets with 5+ Rust task completions can apply to this grant" — enforced on-chain, automatically.
- **For other protocols:** DeFi platforms, lending protocols, and dApps can read Forge SBTs as trust signals for undercollateralized lending or permissioned access.
- **For emerging markets:** A freelancer in Lagos with 50 on-chain completions has equal credibility to anyone globally. No LinkedIn required.

The SBT graph Forge is building becomes more valuable with every task completed. It is a network that compounds — and one that, once built, cannot be replicated without rebuilding the trust data from scratch.

---

*Forge — Built for the Solana Frontier Hackathon 2026*
