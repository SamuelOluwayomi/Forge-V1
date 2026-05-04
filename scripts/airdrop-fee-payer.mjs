import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";

const FEE_PAYER = "CbvHcL7TX5AME8Bdm3sKQsT9cvur2Xzov8HinABgt7or";
const connection = new Connection("https://api.devnet.solana.com", "confirmed");

const pubkey = new PublicKey(FEE_PAYER);
const balance = await connection.getBalance(pubkey);
console.log(`Current balance: ${balance / LAMPORTS_PER_SOL} SOL`);

if (balance < 0.5 * LAMPORTS_PER_SOL) {
  console.log("Requesting airdrop...");
  const sig = await connection.requestAirdrop(pubkey, 2 * LAMPORTS_PER_SOL);
  await connection.confirmTransaction(sig, "confirmed");
  const newBalance = await connection.getBalance(pubkey);
  console.log(`New balance: ${newBalance / LAMPORTS_PER_SOL} SOL`);
} else {
  console.log("Balance sufficient, no airdrop needed.");
}
