import { NextRequest, NextResponse } from "next/server";
import {
  Connection,
  Keypair,
  Transaction,
  VersionedTransaction,
  clusterApiUrl,
} from "@solana/web3.js";

// Load Forge's fee payer from environment — never exposed to the browser
function getFeePayer(): Keypair {
  const raw = process.env.FORGE_FEE_PAYER_PRIVATE_KEY;
  if (!raw) throw new Error("FORGE_FEE_PAYER_PRIVATE_KEY is not set");
  return Keypair.fromSecretKey(new Uint8Array(JSON.parse(raw)));
}

const connection = new Connection(
  process.env.NEXT_PUBLIC_RPC_URL ?? clusterApiUrl("devnet"),
  "confirmed"
);

/**
 * POST /api/transactions/relay
 *
 * Accepts a base64-encoded, partially signed (or unsigned) transaction
 * from the frontend. Sets Forge's fee payer wallet as the fee payer,
 * co-signs it, and returns the transaction for the user to finish signing.
 *
 * Body: { transaction: string }  — base64 encoded serialized transaction
 * Returns: { transaction: string } — base64 encoded, fee-payer-signed transaction
 */
export async function POST(req: NextRequest) {
  try {
    const { transaction: txBase64 } = await req.json();

    if (!txBase64) {
      return NextResponse.json(
        { error: "Missing transaction" },
        { status: 400 }
      );
    }

    const feePayer = getFeePayer();
    const txBuffer = Buffer.from(txBase64, "base64");

    // Detect versioned vs legacy transaction
    let signedTxBase64: string;

    try {
      // Try as versioned transaction first
      const vtx = VersionedTransaction.deserialize(txBuffer);
      vtx.sign([feePayer]);
      signedTxBase64 = Buffer.from(vtx.serialize()).toString("base64");
    } catch {
      // Fall back to legacy transaction
      const tx = Transaction.from(txBuffer);

      // Override fee payer to Forge's wallet
      tx.feePayer = feePayer.publicKey;

      // Fetch fresh blockhash to avoid expiry
      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;

      // Forge co-signs as fee payer
      tx.partialSign(feePayer);

      signedTxBase64 = tx
        .serialize({ requireAllSignatures: false, verifySignatures: false })
        .toString("base64");
    }

    return NextResponse.json({ transaction: signedTxBase64 });
  } catch (err: any) {
    console.error("[relay] Error:", err);
    return NextResponse.json(
      { error: err.message ?? "Internal error" },
      { status: 500 }
    );
  }
}
