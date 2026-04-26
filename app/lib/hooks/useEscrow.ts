// useEscrow.ts – React hook for the Forge escrow program
// ----------------------------------------------------------
// This hook pulls in the generated IDL, builds an Anchor Program instance,
// and wraps the core escrow instructions in easy‑to‑use async functions.
// It is built on top of the existing Solana client & wallet contexts
// (SolanaClientProvider & WalletProvider) already used throughout the app.

"use client";

import { useCallback, useMemo } from "react";
import { AnchorProvider, Program, web3, Idl } from "@coral-xyz/anchor";
import { useSolanaClient } from "../solana-client-context"; // provides connection
import { useWallet } from "../wallet/context"; // provides wallet adapter
import { PublicKey } from "@solana/web3.js";

// Load the IDL – we copy it into the frontend for type safety
// (make sure the file exists at this path after build)
import forgeEscrowIdl from "@/app/lib/idl/forge_escrow.json";

// Types generated from the IDL (optional but nice for autocomplete)
// Using the generic "any" for simplicity – you can run `anchor idl parse`
// to generate a dedicated TypeScript type if desired.
export type ForgeEscrowProgram = Program<any>;

/**
 * Hook that returns an initialized Anchor Program for the forge escrow contract
 * and a set of helper methods to call its instructions.
 */
export function useEscrow() {
  const { connection } = useSolanaClient(); // Solana RPC connection
  const { wallet } = useWallet();
  const walletPublicKey = useMemo(() => wallet ? new PublicKey(wallet.account.address) : null, [wallet]);

  // Shim for Anchor's expected signTransaction
  const signTransaction = useCallback(async (transaction: web3.Transaction) => {
    if (!wallet || !wallet.signTransaction) {
      throw new Error("Wallet does not support signing or is not connected");
    }
    // We assume the cluster-context/solana-client-context handled the chain ID.
    // Anchor uses legacy web3.js transactions.
    const serialized = transaction.serialize({ requireAllSignatures: false });
    const signed = await wallet.signTransaction(serialized, "solana:devnet"); // fallback to devnet if unknown
    return web3.Transaction.from(signed);
  }, [wallet]);

  // Provider – combines connection, wallet, and options
  const provider = useMemo(() => {
    if (!walletPublicKey) return null;
    const wallet = {
      publicKey: walletPublicKey,
      signTransaction,
      // The AnchorProvider expects a `signAllTransactions` method; we can reuse the
      // same signTransaction for simplicity.
      signAllTransactions: async (txs: web3.Transaction[]) => {
        const signed: web3.Transaction[] = [];
        for (const tx of txs) {
          signed.push(await signTransaction(tx));
        }
        return signed;
      },
    } as any;
    return new AnchorProvider(connection, wallet, {
      preflightCommitment: "processed",
      commitment: "processed",
    });
  }, [connection, walletPublicKey, signTransaction]);

  // Program instance – memoised so we only load once per provider change
  const program = useMemo(() => {
    if (!provider) return null;
    // The program ID is defined in the IDL (metadata.address)
    const programId = new web3.PublicKey((forgeEscrowIdl as Idl).metadata.address);
    return new Program(forgeEscrowIdl as Idl, programId, provider) as ForgeEscrowProgram;
  }, [provider]);

  // ------- Helper functions for each instruction -------
  // All helpers are `useCallback` so they have stable references.

  /** Create a new escrow task */
  const createTask = useCallback(
    async (
      taskId: number,
      amount: bigint,
      reviewWindowDays: number,
      difficulty: number,
      taskMetadataUri: string
    ) => {
      if (!program || !walletPublicKey) throw new Error("Wallet not connected");
      // PDA derivation (same seeds used in the program)
      const [escrowPda] = await web3.PublicKey.findProgramAddress([
        Buffer.from("escrow"),
        walletPublicKey.toBuffer(),
        Buffer.from([...(new web3.BN(taskId).toArray('le', 8))]),
      ], program.programId);

      return await program.methods
        .createTask(taskId, amount, reviewWindowDays, difficulty, taskMetadataUri)
        .accounts({
          escrowAccount: escrowPda,
          client: walletPublicKey,
          systemProgram: web3.SystemProgram.programId,
        })
        .rpc();
    },
    [program, walletPublicKey]
  );

  /** Accept a worker and lock USDC into the vault */
  const acceptWorker = useCallback(
    async (taskId: number, workerPubkey: web3.PublicKey) => {
      if (!program || !walletPublicKey) throw new Error("Wallet not connected");
      const [escrowPda] = await web3.PublicKey.findProgramAddress([
        Buffer.from("escrow"),
        walletPublicKey.toBuffer(),
        Buffer.from([...(new web3.BN(taskId).toArray('le', 8))]),
      ], program.programId);

      return await program.methods
        .acceptWorker(workerPubkey)
        .accounts({
          escrowAccount: escrowPda,
          client: walletPublicKey,
          clientTokenAccount: await findAssociatedTokenAddress(walletPublicKey, USDC_MINT),
          vault: await findVaultPda(escrowPda, program.programId),
          tokenProgram: new web3.PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
          systemProgram: web3.SystemProgram.programId,
        })
        .rpc();
    },
    [program, walletPublicKey]
  );

  /** Worker submits work */
  const submitWork = useCallback(
    async (taskId: number, submissionUri: string, aiReportHash?: Uint8Array) => {
      if (!program || !walletPublicKey) throw new Error("Wallet not connected");
      const [escrowPda] = await web3.PublicKey.findProgramAddress([
        Buffer.from("escrow"),
        walletPublicKey.toBuffer(),
        Buffer.from([...(new web3.BN(taskId).toArray('le', 8))]),
      ], program.programId);

      return await program.methods
        .submitWork(submissionUri, aiReportHash ?? null)
        .accounts({
          escrowAccount: escrowPda,
          worker: walletPublicKey,
        })
        .rpc();
    },
    [program, walletPublicKey]
  );

  /** Client approves the worker's work and releases funds */
  const approveWork = useCallback(
    async (taskId: number) => {
      if (!program || !walletPublicKey) throw new Error("Wallet not connected");
      const [escrowPda] = await web3.PublicKey.findProgramAddress([
        Buffer.from("escrow"),
        walletPublicKey.toBuffer(),
        Buffer.from([...(new web3.BN(taskId).toArray('le', 8))]),
      ], program.programId);

      return await program.methods
        .approveWork()
        .accounts({
          escrowAccount: escrowPda,
          client: walletPublicKey,
          vault: await findVaultPda(escrowPda, program.programId),
          workerTokenAccount: await findAssociatedTokenAddress(
            await program.account.escrowAccount.fetch(escrowPda).then((a: any) => a.worker),
            USDC_MINT
          ),
          tokenProgram: new web3.PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
        })
        .rpc();
    },
    [program, walletPublicKey]
  );

  // Additional helper utilities -------------------------------------------------
  const USDC_MINT = new web3.PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"); // SPL USDC

  // Derive the associated token account for a given owner & mint
  const findAssociatedTokenAddress = async (owner: web3.PublicKey, mint: web3.PublicKey) => {
    return (
      await web3.PublicKey.findProgramAddress(
        [owner.toBuffer(), new web3.PublicKey("ATokenGPvH1J9p8R4A2M6F9p3z3yF2cE6v3jG9P8jT5hD").toBuffer(), mint.toBuffer()],
        new web3.PublicKey("ATokenGPvH1J9p8R4A2M6F9p3z3yF2cE6v3jG9P8jT5hD")
      )
    )[0];
  };

  // Vault PDA lives under the escrow account – matches the program logic.
  const findVaultPda = async (escrow: web3.PublicKey, programId: web3.PublicKey) => {
    return (
      await web3.PublicKey.findProgramAddress([
        Buffer.from("vault"),
        escrow.toBuffer(),
      ], programId)
    )[0];
  };

  // Return the program and helpers so components can import the hook.
  return {
    program,
    createTask,
    acceptWorker,
    submitWork,
    approveWork,
    // expose raw provider for advanced usage if needed
    provider,
  } as const;
}
