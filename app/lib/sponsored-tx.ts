import { Transaction, Connection, PublicKey, clusterApiUrl } from "@solana/web3.js";

const connection = new Connection(
  process.env.NEXT_PUBLIC_RPC_URL ?? clusterApiUrl("devnet"),
  "confirmed"
);

export const FORGE_FEE_PAYER_PUBKEY =
  process.env.NEXT_PUBLIC_FORGE_FEE_PAYER_PUBLIC_KEY ??
  "CbvHcL7TX5AME8Bdm3sKQsT9cvur2Xzov8HinABgt7or";

/**
 * @param tx        
 * @param signFn   
 * @returns       
 */
export async function sendSponsoredTransaction(
  tx: Transaction,
  signFn: (tx: Transaction) => Promise<Transaction>
): Promise<string> {
  if (!tx.recentBlockhash) {
    const { blockhash } = await connection.getLatestBlockhash("confirmed");
    tx.recentBlockhash = blockhash;
  }
  if (!tx.feePayer) {
    tx.feePayer = new PublicKey(FORGE_FEE_PAYER_PUBKEY);
  }

  const serialized = tx
    .serialize({ requireAllSignatures: false, verifySignatures: false })
    .toString("base64");

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

  const signedTx = await signFn(relayedTx);

  const sig = await connection.sendRawTransaction(signedTx.serialize(), {
    skipPreflight: true,
    preflightCommitment: "confirmed",
  });

  await connection.confirmTransaction(sig, "confirmed");
  return sig;
}
