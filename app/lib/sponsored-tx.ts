import { Transaction, Connection, clusterApiUrl } from "@solana/web3.js";

const connection = new Connection(
  process.env.NEXT_PUBLIC_RPC_URL ?? clusterApiUrl("devnet"),
  "confirmed"
);

/**
 * Sends a transaction through Forge's relay server so that Forge's fee payer
 * wallet covers the network fees. The user only needs to sign — they pay nothing.
 *
 * Flow:
 *   1. Serialize the unsigned/partially-signed tx
 *   2. POST to /api/transactions/relay → Forge co-signs as fee payer
 *   3. User's wallet signs the returned tx
 *   4. Broadcast to Solana
 *
 * @param tx          - The built (but unsigned) Transaction
 * @param signFn      - The wallet's signTransaction function from useWallet
 * @returns           - The confirmed transaction signature
 */
export async function sendSponsoredTransaction(
  tx: Transaction,
  signFn: (tx: Transaction) => Promise<Transaction>
): Promise<string> {
  // Step 1 — serialize without requiring all signatures yet
  const serialized = tx
    .serialize({ requireAllSignatures: false, verifySignatures: false })
    .toString("base64");

  // Step 2 — relay: Forge adds fee payer signature
  const res = await fetch("/api/transactions/relay", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transaction: serialized }),
  });

  if (!res.ok) {
    const { error } = await res.json();
    throw new Error(`Relay error: ${error}`);
  }

  const { transaction: relayedBase64 } = await res.json();
  const relayedTx = Transaction.from(Buffer.from(relayedBase64, "base64"));

  // Step 3 — user signs (proves identity, pays nothing)
  const signedTx = await signFn(relayedTx);

  // Step 4 — broadcast
  const sig = await connection.sendRawTransaction(signedTx.serialize(), {
    skipPreflight: false,
    preflightCommitment: "confirmed",
  });

  await connection.confirmTransaction(sig, "confirmed");
  return sig;
}

/**
 * Fee payer public key — safe to expose to the browser (it's just an address).
 */
export const FORGE_FEE_PAYER_PUBKEY =
  process.env.NEXT_PUBLIC_FORGE_FEE_PAYER_PUBLIC_KEY ??
  "CbvHcL7TX5AME8Bdm3sKQsT9cvur2Xzov8HinABgt7or";
