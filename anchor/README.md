# Forge — Smart Contracts (Anchor / Rust)

This directory contains the two on-chain Anchor programs that power the Forge marketplace. All programs are deployed on Solana Devnet.

---

## Programs

### forge_escrow
**Program ID:** `AkoaVinz9Md94KsC2k6sULNdwvqh2uF16KdKiWdpr6ye`

Manages the complete task lifecycle — from posting through payment release, dispute resolution, and cancellation. Funds are held in non-custodial PDAs keyed by `[b"escrow", client_pubkey, task_id]`.

#### Instructions

| Instruction | Description | Required Signer |
|---|---|---|
| `create_task` | Posts a new task and locks SOL into escrow. Sets status to Open. | client |
| `accept_worker` | Client selects a developer. Sets status to Active. | client |
| `submit_work` | Worker submits proof of completion. Sets status to Submitted. | worker |
| `approve_work` | Client approves submission. Releases 98% to worker, 2% to treasury. Sets status to Completed. | client |
| `claim_completion` | Worker claims funds after the review window expires without client action. | Any (permissionless) |
| `raise_dispute` | Either party escalates a submitted task to dispute. | client or worker |
| `resolve_dispute` | Arbitrator (treasury wallet) resolves a dispute. Releases funds to either party. | arbitrator (treasury) |
| `cancel_task` | Client cancels an Open task (no worker assigned). Returns rent and funds to client. | client |

#### Task Lifecycle

```
Open -> Active -> Submitted -> Completed
                           -> Disputed -> Completed / Cancelled
     -> Cancelled (client only, while Open)
```

#### Protocol Fee
- **Rate:** 2% of escrow amount
- **Collection:** Automatic, on `approve_work` or `claim_completion`
- **Treasury:** `EPpNW3G47SAJ4j1DatpjW7mJMLRTH9Z8K7LJtBfhR8Mt`

#### Account Structure (EscrowAccount)
```rust
pub struct EscrowAccount {
    pub task_id: u64,
    pub client: Pubkey,
    pub worker: Pubkey,
    pub amount: u64,
    pub status: EscrowStatus,      // Open | Active | Submitted | Completed | Disputed | Cancelled
    pub difficulty: u8,            // 1-4 (Apprentice to Grandmaster)
    pub review_window_days: u8,    // 1-7 days
    pub auto_release_window: i64,  // Unix timestamp
    pub task_metadata_uri: String, // SHA-256 hash of off-chain task data
    pub submission_uri: String,    // Link to submitted work
    pub ai_report_hash: Option<[u8; 32]>,
    pub submission_timestamp: Option<i64>,
    pub created_at: i64,
    pub dispute_reason: String,
    pub bump: u8,
}
```

---

### forge_sbt
**Program ID:** `B563uW8guVAhSasPR5S6MgMGHcYwtbaiwVv9kofkwZKZ`

Mints non-transferable Soulbound Tokens (SBTs) to wallets for reputation, skill verification, and identity. All minted tokens are immutable once issued.

#### Instructions

| Instruction | Description |
|---|---|
| `initialize_mint_tracker` | Initializes the global mint tracker PDA (one-time setup) |
| `initialize_reputation` | Creates a reputation account for a wallet (called on first login) |
| `mint_profile_sbt` | Mints the base Forge Profile SBT to a new user's wallet |
| `mint_worker_badge` | Mints a task-completion badge to the worker's wallet |
| `mint_client_badge` | Mints a task-completion badge to the client's wallet |
| `mint_founder_nft` | Mints the exclusive Forge Founder NFT (limited supply) |
| `mint_pioneer_nft` | Mints the Pioneer NFT for early adopters |

---

### forge_identity (Planned)
On-chain identity gate to mark wallets as human-verified (via Civic Pass or World ID). Status: In Research.

---

## Local Development

### Prerequisites

- Rust (stable)
- Solana CLI
- Anchor CLI 0.30.1
- A funded Solana wallet on devnet (`solana airdrop 4 --url devnet`)

### Build

```bash
cd anchor
anchor build
```

### Deploy to Devnet

```bash
anchor program deploy --program-name forge_escrow --provider.cluster devnet
anchor program deploy --program-name forge_sbt --provider.cluster devnet
```

After deploying, copy the generated IDLs to the frontend:

```bash
cp target/idl/forge_escrow.json ../app/lib/idl/
cp target/idl/forge_sbt.json ../app/lib/idl/
```

### Run Tests

```bash
anchor test --skip-deploy
```

---

## Key Design Decisions

### Why PDAs for Escrow?
Program Derived Addresses ensure the escrow account's private key is controlled by the program, not a human. This makes the escrow genuinely non-custodial — even Forge's team cannot access locked funds.

### Why Native SOL (not USDC)?
Native SOL simplifies the account model and eliminates the need for Associated Token Accounts (ATAs) for every escrow. This reduces transaction complexity, lowers rent costs, and makes the gasless relay architecture easier to implement.

### Why SHA-256 for Metadata URI?
The `task_metadata_uri` field stores a SHA-256 hash of the task's off-chain content (title, description, skills). This creates a cryptographic link between the on-chain escrow and the off-chain database record, allowing anyone to verify that marketplace details have not been tampered with.

### Why 2% Protocol Fee?
The fee is automatically enforced at the smart contract level — no invoicing, no disputes, no fraud. It only triggers on successful payment release, aligning Forge's revenue directly with genuine value delivery.
