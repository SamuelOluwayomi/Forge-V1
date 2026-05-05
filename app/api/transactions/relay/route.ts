import { NextRequest, NextResponse } from "next/server";
import {
  Connection,
  Keypair,
  Transaction,
  VersionedTransaction,
  LAMPORTS_PER_SOL,
  clusterApiUrl,
} from "@solana/web3.js";

function getFeePayer(): Keypair {
  const raw = process.env.FORGE_FEE_PAYER_PRIVATE_KEY;
  if (!raw) throw new Error("FORGE_FEE_PAYER_PRIVATE_KEY is not set");
  return Keypair.fromSecretKey(new Uint8Array(JSON.parse(raw)));
}

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL ?? clusterApiUrl("devnet");
const IS_DEVNET = RPC_URL.includes("devnet");

const connection = new Connection(RPC_URL, "confirmed");

async function ensureFunds(feePayer: Keypair) {
  if (!IS_DEVNET) return;
  const balance = await connection.getBalance(feePayer.publicKey);
  if (balance < 0.1 * LAMPORTS_PER_SOL) {
    const sig = await connection.requestAirdrop(feePayer.publicKey, 2 * LAMPORTS_PER_SOL);
    await connection.confirmTransaction(sig, "confirmed");
  }
}

export async function POST(req: NextRequest) {
  try {
    const { transaction: txBase64 } = await req.json();

    if (!txBase64) {
      return NextResponse.json({ error: "Missing transaction" }, { status: 400 });
    }

    const feePayer = getFeePayer();
    await ensureFunds(feePayer);
    const txBuffer = Buffer.from(txBase64, "base64");
    let signedTxBase64: string;

    try {
      const vtx = VersionedTransaction.deserialize(txBuffer);
      vtx.sign([feePayer]);
      signedTxBase64 = Buffer.from(vtx.serialize()).toString("base64");
    } catch {
      const tx = Transaction.from(txBuffer);
      tx.feePayer = feePayer.publicKey;
      const { blockhash } = await connection.getLatestBlockhash("confirmed");
      tx.recentBlockhash = blockhash;
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