"use client";

import { useCallback, useMemo } from "react";
import { AnchorProvider, Program, web3, Idl, BN } from "@coral-xyz/anchor";
import { useSolanaClient } from "../solana-client-context"; // provides connection
import { useWallet } from "../wallet/context"; // provides wallet adapter
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from "@solana/spl-token";
import forgeEscrowIdl from "@/app/lib/idl/forge_escrow.json";
import forgeSbtIdl from "@/app/lib/idl/forge_sbt.json";
import { sendSponsoredTransaction } from "@/app/lib/sponsored-tx";
import { useCluster } from "../../components/cluster-context";

const TOKEN_METADATA_PROGRAM_ID = new web3.PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");

export type ForgeEscrowProgram = Program<any>;

export interface UseEscrowReturn {
  program: ForgeEscrowProgram | null;
  sbtProgram: Program<Idl> | null;
  createTask: (taskId: number, amount: bigint, reviewWindowDays: number, difficulty: number, taskMetadataUri: string) => Promise<string>;
  acceptWorker: (taskId: number, workerPubkey: web3.PublicKey) => Promise<string>;
  submitWork: (taskId: number, clientPubkey: web3.PublicKey, submissionUri: string, aiReportHash?: Uint8Array) => Promise<string>;
  approveWork: (taskId: number) => Promise<string>;
  cancelTask: (taskId: number) => Promise<string>;
  claimCompletion: (taskId: number, clientPubkey: web3.PublicKey) => Promise<string>;
  raiseDispute: (taskId: number, clientPubkey: web3.PublicKey, reasonUri: string) => Promise<string>;
  resolveDispute: (taskId: number, clientPubkey: web3.PublicKey, recipientPubkey: web3.PublicKey, releaseToWorker: boolean) => Promise<string>;
  provider: AnchorProvider | null;
  initializeMintTracker: () => Promise<string>;
  mintFounderNft: (recipient: web3.PublicKey, metadataUri: string) => Promise<string>;
  mintPioneerNft: (recipient: web3.PublicKey, metadataUri: string) => Promise<string>;
  mintWorkerBadge: (taskId: number, workerPubkey: web3.PublicKey, skillCategory: string, rating: number, wasOnTime: boolean, amountEarned: bigint) => Promise<string>;
}

const TREASURY_PUBKEY = new web3.PublicKey("EPpNW3G47SAJ4j1DatpjW7mJMLRTH9Z8K7LJtBfhR8Mt"); // Forge Protocol Treasury
export function useEscrow(): UseEscrowReturn {
  const { connection } = useSolanaClient(); // Solana RPC connection
  const { wallet } = useWallet();
  const { cluster } = useCluster();
  const chain = `solana:${cluster}`;
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
    const signedBytes = await wallet.signTransaction(serialized, chain);
    return web3.Transaction.from(signedBytes);
  }, [wallet, chain]);

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


  /**
   * Create a new escrow task
   * NOTE: This is the ONE transaction the user pays for themselves,
   * because they are locking their own SOL into the escrow PDA.
   */
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

      // User pays for task creation since they're locking their own SOL
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

  /** Accept a worker and lock SOL into the PDA — SPONSORED */
  const acceptWorker = useCallback(
    async (taskId: number, workerPubkey: web3.PublicKey) => {
      if (!program || !walletPublicKey) throw new Error("Wallet not connected");
      const [escrowPda] = await web3.PublicKey.findProgramAddress([
        Buffer.from("escrow"),
        walletPublicKey.toBuffer(),
        Buffer.from([...(new BN(taskId).toArray('le', 8))]),
      ], program.programId);

      const tx = await (program.methods as any)
        .acceptWorker(workerPubkey)
        .accounts({
          escrowAccount: escrowPda,
          client: walletPublicKey,
          systemProgram: web3.SystemProgram.programId,
        })
        .transaction();

      return await sendSponsoredTransaction(tx, signTransaction);
    },
    [program, walletPublicKey, signTransaction]
  );

  /** Worker submits work — SPONSORED */
  const submitWork = useCallback(
    async (taskId: number, clientPubkey: web3.PublicKey, submissionUri: string, aiReportHash?: Uint8Array) => {
      if (!program || !walletPublicKey) throw new Error("Wallet not connected");
      const [escrowPda] = await web3.PublicKey.findProgramAddress([
        Buffer.from("escrow"),
        clientPubkey.toBuffer(),
        Buffer.from([...(new BN(taskId).toArray('le', 8))]),
      ], program.programId);

      const tx = await (program.methods as any)
        .submitWork(submissionUri, aiReportHash ?? null)
        .accounts({
          escrowAccount: escrowPda,
          worker: walletPublicKey,
        })
        .transaction();

      return await sendSponsoredTransaction(tx, signTransaction);
    },
    [program, walletPublicKey, signTransaction]
  );

  /** Client approves the worker's work and releases SOL — SPONSORED */
  const approveWork = useCallback(
    async (taskId: number) => {
      if (!program || !walletPublicKey) throw new Error("Wallet not connected");
      const [escrowPda] = await web3.PublicKey.findProgramAddress([
        Buffer.from("escrow"),
        walletPublicKey.toBuffer(),
        Buffer.from([...(new BN(taskId).toArray('le', 8))]),
      ], program.programId);

      const escrowData = await (program.account as any).escrowAccount.fetch(escrowPda);

      const tx = await (program.methods as any)
        .approveWork()
        .accounts({
          escrowAccount: escrowPda,
          client: walletPublicKey,
          worker: escrowData.worker,
          treasury: TREASURY_PUBKEY,
        })
        .transaction();

      return await sendSponsoredTransaction(tx, signTransaction);
    },
    [program, walletPublicKey, signTransaction]
  );

  /** Cancel task — SPONSORED */
  const cancelTask = useCallback(
    async (taskId: number) => {
      if (!program || !walletPublicKey) throw new Error("Wallet not connected");
      const [escrowPda] = await web3.PublicKey.findProgramAddress([
        Buffer.from("escrow"),
        walletPublicKey.toBuffer(),
        Buffer.from([...(new BN(taskId).toArray('le', 8))]),
      ], program.programId);

      const tx = await (program.methods as any)
        .cancelTask()
        .accounts({
          escrowAccount: escrowPda,
          client: walletPublicKey,
        })
        .transaction();

      return await sendSponsoredTransaction(tx, signTransaction);
    },
    [program, walletPublicKey, signTransaction]
  );

  /** Worker claims funds after review window expires — SPONSORED */
  const claimCompletion = useCallback(
    async (taskId: number, clientPubkey: web3.PublicKey) => {
      if (!program || !walletPublicKey) throw new Error("Wallet not connected");
      const [escrowPda] = await web3.PublicKey.findProgramAddress([
        Buffer.from("escrow"),
        clientPubkey.toBuffer(),
        Buffer.from([...(new BN(taskId).toArray('le', 8))]),
      ], program.programId);

      const escrowData = await (program.account as any).escrowAccount.fetch(escrowPda);

      const tx = await (program.methods as any)
        .claimCompletion()
        .accounts({
          escrowAccount: escrowPda,
          caller: walletPublicKey,
          worker: escrowData.worker,
          treasury: TREASURY_PUBKEY,
        })
        .transaction();

      return await sendSponsoredTransaction(tx, signTransaction);
    },
    [program, walletPublicKey, signTransaction]
  );

  /** Raise a dispute on a submitted task — SPONSORED */
  const raiseDispute = useCallback(
    async (taskId: number, clientPubkey: web3.PublicKey, reasonUri: string) => {
      if (!program || !walletPublicKey) throw new Error("Wallet not connected");
      const [escrowPda] = await web3.PublicKey.findProgramAddress([
        Buffer.from("escrow"),
        clientPubkey.toBuffer(),
        Buffer.from([...(new BN(taskId).toArray('le', 8))]),
      ], program.programId);

      const tx = await (program.methods as any)
        .raiseDispute(reasonUri)
        .accounts({
          escrowAccount: escrowPda,
          caller: walletPublicKey,
        })
        .transaction();

      return await sendSponsoredTransaction(tx, signTransaction);
    },
    [program, walletPublicKey, signTransaction]
  );

  /** Arbitrator resolves a dispute — SPONSORED */
  const resolveDispute = useCallback(
    async (taskId: number, clientPubkey: web3.PublicKey, recipientPubkey: web3.PublicKey, releaseToWorker: boolean) => {
      if (!program || !walletPublicKey) throw new Error("Wallet not connected");
      const [escrowPda] = await web3.PublicKey.findProgramAddress([
        Buffer.from("escrow"),
        clientPubkey.toBuffer(),
        Buffer.from([...(new BN(taskId).toArray('le', 8))]),
      ], program.programId);

      const tx = await (program.methods as any)
        .resolveDispute(releaseToWorker)
        .accounts({
          escrowAccount: escrowPda,
          arbitrator: walletPublicKey,
          recipient: recipientPubkey,
          treasury: TREASURY_PUBKEY,
        })
        .transaction();

      return await sendSponsoredTransaction(tx, signTransaction);
    },
    [program, walletPublicKey, signTransaction]
  );

  /** Initialize mint tracker — SPONSORED */
  const initializeMintTracker = useCallback(async () => {
    if (!sbtProgram || !walletPublicKey) throw new Error("Wallet not connected");
    const [trackerPda] = await web3.PublicKey.findProgramAddress(
      [Buffer.from("mint_tracker")],
      sbtProgram.programId
    );

    const tx = await (sbtProgram.methods as any)
      .initializeMintTracker()
      .accounts({
        tracker: trackerPda,
        authority: walletPublicKey,
        systemProgram: web3.SystemProgram.programId,
      })
      .transaction();

    return await sendSponsoredTransaction(tx, signTransaction);
  }, [sbtProgram, walletPublicKey, signTransaction]);

  /** Mint founder NFT — SPONSORED */
  const mintFounderNft = useCallback(async (recipient: web3.PublicKey, metadataUri: string) => {
    if (!sbtProgram || !walletPublicKey) throw new Error("Wallet not connected");
    const [founderNftPda] = await web3.PublicKey.findProgramAddress(
      [Buffer.from("founder_nft"), recipient.toBuffer()],
      sbtProgram.programId
    );

    const tx = await (sbtProgram.methods as any)
      .mintFounderNft(metadataUri)
      .accounts({
        founderNft: founderNftPda,
        recipient: recipient,
        authority: walletPublicKey,
        systemProgram: web3.SystemProgram.programId,
      })
      .transaction();

    return await sendSponsoredTransaction(tx, signTransaction);
  }, [sbtProgram, walletPublicKey, signTransaction]);

  /** Mint pioneer NFT — SPONSORED */
  const mintPioneerNft = useCallback(async (recipient: web3.PublicKey, metadataUri: string) => {
    if (!sbtProgram || !walletPublicKey) throw new Error("Wallet not connected");
    const [pioneerNftPda] = await web3.PublicKey.findProgramAddress(
      [Buffer.from("pioneer_nft"), recipient.toBuffer()],
      sbtProgram.programId
    );
    const [trackerPda] = await web3.PublicKey.findProgramAddress(
      [Buffer.from("mint_tracker")],
      sbtProgram.programId
    );

    const tx = await (sbtProgram.methods as any)
      .mintPioneerNft(metadataUri)
      .accounts({
        tracker: trackerPda,
        pioneerNft: pioneerNftPda,
        authority: walletPublicKey,
        recipient: recipient,
        systemProgram: web3.SystemProgram.programId,
      })
      .transaction();

    return await sendSponsoredTransaction(tx, signTransaction);
  }, [sbtProgram, walletPublicKey, signTransaction]);

  /** Mint worker badge — SPONSORED */
  const mintWorkerBadge = useCallback(
    async (taskId: number, workerPubkey: web3.PublicKey, skillCategory: string, rating: number, wasOnTime: boolean, amountEarned: bigint) => {
      if (!sbtProgram || !walletPublicKey) throw new Error("Wallet not connected");

      const [badgeMint] = await web3.PublicKey.findProgramAddress([
        Buffer.from("worker_badge_mint"),
        workerPubkey.toBuffer(),
        Buffer.from([...new BN(taskId).toArray('le', 8)]),
      ], sbtProgram.programId);

      const [workerBadgeAccount] = await web3.PublicKey.findProgramAddress([
        workerPubkey.toBuffer(),
        TOKEN_PROGRAM_ID.toBuffer(),
        badgeMint.toBuffer(),
      ], ASSOCIATED_TOKEN_PROGRAM_ID);

      const [badgeMetadata] = await web3.PublicKey.findProgramAddress([
        Buffer.from("metadata"),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        badgeMint.toBuffer(),
      ], TOKEN_METADATA_PROGRAM_ID);

      const [workerBadgeRecord] = await web3.PublicKey.findProgramAddress([
        Buffer.from("worker_badge_record"),
        workerPubkey.toBuffer(),
        Buffer.from([...new BN(taskId).toArray('le', 8)]),
      ], sbtProgram.programId);

      const [workerReputation] = await web3.PublicKey.findProgramAddress([
        Buffer.from("reputation"),
        workerPubkey.toBuffer(),
      ], sbtProgram.programId);

      const tx = await (sbtProgram.methods as any)
        .mintWorkerBadge(new BN(taskId), skillCategory, rating, wasOnTime, new BN(amountEarned.toString()))
        .accounts({
          badgeMint,
          workerBadgeAccount,
          badgeMetadata,
          workerBadgeRecord,
          workerReputation,
          worker: workerPubkey,
          payer: walletPublicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .transaction();

      return await sendSponsoredTransaction(tx, signTransaction);
    },
    [sbtProgram, walletPublicKey, signTransaction]
  );

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
    initializeMintTracker,
    mintFounderNft,
    mintPioneerNft,
    mintWorkerBadge,
  };
}
