"use client";

import { useCallback, useMemo } from "react";
import { AnchorProvider, Program, web3, Idl, BN } from "@coral-xyz/anchor";
import { useSolanaClient } from "../solana-client-context"; // provides connection
import { useWallet } from "../wallet/context"; // provides wallet adapter
import { PublicKey } from "@solana/web3.js";
import forgeEscrowIdl from "@/app/lib/idl/forge_escrow.json";
import forgeSbtIdl from "@/app/lib/idl/forge_sbt.json";

export type ForgeEscrowProgram = Program<any>;

const TREASURY_PUBKEY = new web3.PublicKey("EPpNW3G47SAJ4j1DatpjW7mJMLRTH9Z8K7LJtBfhR8Mt"); // Forge Protocol Treasury
export function useEscrow() {
  const { connection } = useSolanaClient(); // Solana RPC connection
  const { wallet } = useWallet();
  const walletPublicKey = useMemo(() => wallet ? new PublicKey(wallet.account.address) : null, [wallet]);

  // Shim for Anchor's expected signTransaction
  const signTransaction = useCallback(async (transaction: web3.Transaction) => {
    if (!wallet || !wallet.signTransaction) {
      throw new Error("Wallet does not support signing or is not connected");
    }
    // The custom wallet interface accepts/returns raw Uint8Array (Solana Kit standard).
    // Anchor passes a Transaction object, so we must serialize it first, then
    // deserialize the signed bytes back into a Transaction for Anchor to use.
    const serialized = transaction.serialize({ requireAllSignatures: false });
    const signedBytes = await wallet.signTransaction(serialized, "solana:devnet");
    return web3.Transaction.from(signedBytes);
  }, [wallet]);

  // Provider – combines connection, wallet, and options
  const provider = useMemo(() => {
    if (!walletPublicKey) return null;
    const wallet = {
      publicKey: walletPublicKey,
      signTransaction,
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
    // Anchor 1.0.0+ resolves the programId automatically from the IDL root
    return new Program(forgeEscrowIdl as Idl, provider) as ForgeEscrowProgram;
  }, [provider]);

  const sbtProgram = useMemo(() => {
    if (!provider) return null;
    return new Program(forgeSbtIdl as Idl, provider);
  }, [provider]);


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
        Buffer.from([...(new BN(taskId).toArray('le', 8))]),
      ], program.programId);

      return await (program.methods as any)
        .createTask(new BN(taskId), new BN(amount.toString()), reviewWindowDays, difficulty, taskMetadataUri)
        .accounts({
          escrowAccount: escrowPda,
          client: walletPublicKey,
          systemProgram: web3.SystemProgram.programId,
        })
        .rpc();
    },
    [program, walletPublicKey]
  );

  const TREASURY_PUBKEY = new web3.PublicKey("EPpNW3G47SAJ4j1DatpjW7mJMLRTH9Z8K7LJtBfhR8Mt"); // Forge Protocol Treasury

  /** Accept a worker and lock SOL into the PDA */
  const acceptWorker = useCallback(
    async (taskId: number, workerPubkey: web3.PublicKey) => {
      if (!program || !walletPublicKey) throw new Error("Wallet not connected");
      const [escrowPda] = await web3.PublicKey.findProgramAddress([
        Buffer.from("escrow"),
        walletPublicKey.toBuffer(),
        Buffer.from([...(new BN(taskId).toArray('le', 8))]),
      ], program.programId);

      return await (program.methods as any)
        .acceptWorker(workerPubkey)
        .accounts({
          escrowAccount: escrowPda,
          client: walletPublicKey,
          systemProgram: web3.SystemProgram.programId,
        })
        .rpc();
    },
    [program, walletPublicKey]
  );

  /** Worker submits work */
  const submitWork = useCallback(
    async (taskId: number, clientPubkey: web3.PublicKey, submissionUri: string, aiReportHash?: Uint8Array) => {
      if (!program || !walletPublicKey) throw new Error("Wallet not connected");
      const [escrowPda] = await web3.PublicKey.findProgramAddress([
        Buffer.from("escrow"),
        clientPubkey.toBuffer(),
        Buffer.from([...(new BN(taskId).toArray('le', 8))]),
      ], program.programId);

      return await (program.methods as any)
        .submitWork(submissionUri, aiReportHash ?? null)
        .accounts({
          escrowAccount: escrowPda,
          worker: walletPublicKey,
        })
        .rpc();
    },
    [program, walletPublicKey]
  );

  /** Client approves the worker's work and releases SOL */
  const approveWork = useCallback(
    async (taskId: number) => {
      if (!program || !walletPublicKey) throw new Error("Wallet not connected");
      const [escrowPda] = await web3.PublicKey.findProgramAddress([
        Buffer.from("escrow"),
        walletPublicKey.toBuffer(),
        Buffer.from([...(new BN(taskId).toArray('le', 8))]),
      ], program.programId);

      const escrowData = await (program.account as any).escrowAccount.fetch(escrowPda);

      return await (program.methods as any)
        .approveWork()
        .accounts({
          escrowAccount: escrowPda,
          client: walletPublicKey,
          worker: escrowData.worker,
          treasury: TREASURY_PUBKEY,
        })
        .rpc();
    },
    [program, walletPublicKey]
  );

  const cancelTask = useCallback(
    async (taskId: number) => {
      if (!program || !walletPublicKey) throw new Error("Wallet not connected");
      const [escrowPda] = await web3.PublicKey.findProgramAddress([
        Buffer.from("escrow"),
        walletPublicKey.toBuffer(),
        Buffer.from([...(new BN(taskId).toArray('le', 8))]),
      ], program.programId);

      return await (program.methods as any)
        .cancelTask()
        .accounts({
          escrowAccount: escrowPda,
          client: walletPublicKey,
        })
        .rpc();
    },
    [program, walletPublicKey]
  );

  /** Worker claims funds after review window expires */
  const claimCompletion = useCallback(
    async (taskId: number, clientPubkey: web3.PublicKey) => {
      if (!program || !walletPublicKey) throw new Error("Wallet not connected");
      const [escrowPda] = await web3.PublicKey.findProgramAddress([
        Buffer.from("escrow"),
        clientPubkey.toBuffer(),
        Buffer.from([...(new BN(taskId).toArray('le', 8))]),
      ], program.programId);

      const escrowData = await (program.account as any).escrowAccount.fetch(escrowPda);

      return await (program.methods as any)
        .claimCompletion()
        .accounts({
          escrowAccount: escrowPda,
          caller: walletPublicKey,
          worker: escrowData.worker,
          treasury: TREASURY_PUBKEY,
        })
        .rpc();
    },
    [program, walletPublicKey]
  );

  /** Raise a dispute on a submitted task */
  const raiseDispute = useCallback(
    async (taskId: number, clientPubkey: web3.PublicKey, reasonUri: string) => {
      if (!program || !walletPublicKey) throw new Error("Wallet not connected");
      const [escrowPda] = await web3.PublicKey.findProgramAddress([
        Buffer.from("escrow"),
        clientPubkey.toBuffer(),
        Buffer.from([...(new BN(taskId).toArray('le', 8))]),
      ], program.programId);

      return await (program.methods as any)
        .raiseDispute(reasonUri)
        .accounts({
          escrowAccount: escrowPda,
          caller: walletPublicKey,
        })
        .rpc();
    },
    [program, walletPublicKey]
  );

  /** Arbitrator resolves a dispute */
  const resolveDispute = useCallback(
    async (taskId: number, clientPubkey: web3.PublicKey, recipientPubkey: web3.PublicKey, releaseToWorker: boolean) => {
      if (!program || !walletPublicKey) throw new Error("Wallet not connected");
      const [escrowPda] = await web3.PublicKey.findProgramAddress([
        Buffer.from("escrow"),
        clientPubkey.toBuffer(),
        Buffer.from([...(new BN(taskId).toArray('le', 8))]),
      ], program.programId);

      return await (program.methods as any)
        .resolveDispute(releaseToWorker)
        .accounts({
          escrowAccount: escrowPda,
          arbitrator: walletPublicKey,
          recipient: recipientPubkey,
          treasury: TREASURY_PUBKEY,
        })
        .rpc();
    },
    [program, walletPublicKey]
  );

  // Return the program and helpers so components can import the hook.
  return {
    program,
    sbtProgram,
    createTask,
    acceptWorker,
    submitWork,
    approveWork,
    cancelTask,
    claimCompletion,
    raiseDispute,
    resolveDispute,
    provider,
  } as const;
}
