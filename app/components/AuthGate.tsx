"use client";

import { useEffect, useState } from "react";
import { useWallet } from "../lib/wallet/context";
import { useRouter } from "next/navigation";
import { SystemProgram, PublicKey } from "@solana/web3.js";
import { toast } from "sonner";
import { useEscrow } from "../lib/hooks/useEscrow";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { wallet, status } = useWallet();
  const { program, sbtProgram } = useEscrow();
  console.log(
    "Available SBT methods:",
    Object.keys((sbtProgram as any)?.methods ?? {})
  );

  const address = wallet?.account?.address ?? null;


  const [repStatus, setRepStatus] = useState<"loading" | "missing" | "ready">(
    "loading"
  );
  const [initPending, setInitPending] = useState(false);
  const [signingPending, setSigningPending] = useState(false);


  useEffect(() => {
    if (!address && status === "disconnected") {
      router.replace("/");
    }
  }, [address, status, router]);

  useEffect(() => {
    if (!address) return;

    if (!program || !sbtProgram) {
      setRepStatus("ready");
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const pubkey = new PublicKey(address);
        const [repPda] = await PublicKey.findProgramAddress(
          [Buffer.from("reputation"), pubkey.toBuffer()],
          sbtProgram.programId
        );
        await (sbtProgram.account as any).reputationAccount.fetch(repPda);
        if (!cancelled) setRepStatus("ready");
      } catch {
        if (!cancelled) setRepStatus("missing");
      }
    })();
    const timeout = setTimeout(() => {
      if (!cancelled) setRepStatus("ready");
    }, 5000);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [program?.programId.toBase58(), sbtProgram?.programId.toBase58(), address]);

  const initializeReputation = async () => {
    if (!program || !sbtProgram || !address) return;
    setInitPending(true);
    try {
      const { sendSponsoredTransaction } = await import("../lib/sponsored-tx");
      const { Transaction } = await import("@solana/web3.js");

      const pubkey = new PublicKey(address);
      const [repPda] = await PublicKey.findProgramAddress(
        [Buffer.from("reputation"), pubkey.toBuffer()],
        sbtProgram.programId
      );

      const tx = await (sbtProgram.methods as any)
        .initializeReputation()
        .accounts({
          reputation: repPda,
          owner: pubkey,
          systemProgram: SystemProgram.programId,
        })
        .transaction();

      const signTx = async (transaction: any) => {
        if (!wallet || !wallet.signTransaction) throw new Error("Wallet not connected");
        setSigningPending(true);
        const serialized = transaction.serialize({ requireAllSignatures: false });
        const signedBytes = await wallet.signTransaction(serialized, "solana:devnet");
        setSigningPending(false);
        return Transaction.from(signedBytes);
      };

      await sendSponsoredTransaction(tx, signTx);
      toast.success("Reputation account created — Forge covered the fees!");
      setRepStatus("ready");
    } catch (err: any) {
      setSigningPending(false);
      toast.error(err?.message ?? "Failed to initialize reputation account.");
    } finally {
      setInitPending(false);
    }
  };


  if (status === "connecting") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <svg className="animate-spin text-primary" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 3a9 9 0 019 9" />
          </svg>
          <p className="font-black text-sm uppercase tracking-widest text-black/40">Reconnecting wallet...</p>
        </div>
      </div>
    );
  }

  if (!address) {
    return null;
  }


  if (repStatus === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <svg
            className="animate-spin"
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path d="M12 3a9 9 0 019 9" className="text-primary" />
            <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" opacity="0.2" />
          </svg>
          <p className="font-black text-sm uppercase tracking-widest text-black/50">
            Loading profile...
          </p>
        </div>
      </div>
    );
  }

  if (repStatus === "missing") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background paper-texture">
        <div className="brutalist-card bg-white p-10 max-w-md text-center">
          <div
            className="brutalist-tape text-xs px-3 py-1 inline-block mb-4"
            style={{ transform: "rotate(-2deg)" }}
          >
            One-time Setup
          </div>
          <h2 className="text-3xl font-black uppercase mb-4">
            Welcome to Forge
          </h2>

          {signingPending ? (
            <>
              <div className="flex items-center justify-center gap-2 mb-4">
                <svg className="animate-pulse" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 3a9 9 0 019 9" className="text-primary" />
                  <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" opacity="0.2" />
                </svg>
                <p className="font-black text-sm uppercase tracking-widest">
                  Waiting for signature...
                </p>
              </div>
              <div className="bg-amber-50 border-2 border-amber-400 rounded p-4 mb-2">
                <p className="font-bold text-sm text-amber-800 leading-snug">
                  Your Solflare extension needs approval.
                  <br />
                  <span className="font-black">Please open it now</span> and confirm the transaction.
                </p>
              </div>
            </>
          ) : (
            <>
              <p className="font-bold text-sm text-black/60 mb-6 leading-snug">
                We need to create a Reputation account on-chain before you can use
                the dashboard. This is a one-time transaction — Forge covers the fees.
              </p>
              <button
                id="auth-init-reputation"
                onClick={initializeReputation}
                disabled={initPending}
                className="brutalist-button px-8 py-3 bg-primary text-white border-black disabled:opacity-50 flex items-center gap-3 mx-auto"
              >
                {initPending ? (
                  <>
                    <svg
                      className="animate-spin"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <path d="M12 3a9 9 0 019 9" />
                      <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" opacity="0.2" />
                    </svg>
                    Preparing transaction...
                  </>
                ) : (
                  "Initialize Reputation Account"
                )}
              </button>
            </>
          )}
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
