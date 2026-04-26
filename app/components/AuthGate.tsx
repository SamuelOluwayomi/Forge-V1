"use client";

import { useEffect, useState } from "react";
import { useWallet } from "../lib/wallet/context";
import { useRouter } from "next/navigation";
import { SystemProgram, PublicKey } from "@solana/web3.js";
import { toast } from "sonner";
import { useEscrow } from "../lib/hooks/useEscrow";

/**
 * AuthGate – sequential onboarding guard for protected routes.
 *
 * Step 1 — wallet must be connected (redirect to "/" if not)
 * Step 2 — Civic CAPTCHA pass must be ACTIVE  (placeholder: always passes for now)
 * Step 3 — forge_sbt ReputationAccount must exist (initialize if missing)
 * Step 4 — render children
 *
 * NOTE: All hooks are called unconditionally at the top to satisfy Rules of Hooks.
 * Conditional UI is returned based on the computed state.
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { wallet } = useWallet();
  const { program } = useEscrow();

  const address = wallet?.account?.address ?? null;

  // Rep account state: "loading" | "missing" | "ready"
  const [repStatus, setRepStatus] = useState<"loading" | "missing" | "ready">("loading");
  const [initPending, setInitPending] = useState(false);

  // Step 1 — redirect if no wallet
  useEffect(() => {
    if (!address) {
      router.replace("/");
    }
  }, [address, router]);

  // Step 3 — check reputation account on-chain.
  // If program is unavailable (wallet not connected to Anchor yet), skip to ready.
  useEffect(() => {
    if (!address) return;

    // If Anchor program isn't ready, skip the on-chain check and let the user in.
    // This avoids an infinite loading state when the IDL/program can't initialize.
    if (!program) {
      setRepStatus("ready");
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const pubkey = new PublicKey(address);
        const [repPda] = await PublicKey.findProgramAddress(
          [Buffer.from("reputation"), pubkey.toBuffer()],
          program.programId
        );
        await (program.account as any).reputationAccount.fetch(repPda);
        if (!cancelled) setRepStatus("ready");
      } catch {
        // Account not found = needs initialization; any other error = let them in anyway
        if (!cancelled) setRepStatus("missing");
      }
    })();

    // Safety timeout: if we're still loading after 5s, just let the user in
    const timeout = setTimeout(() => {
      if (!cancelled) setRepStatus("ready");
    }, 5000);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [program, address]);

  const initializeReputation = async () => {
    if (!program || !address) return;
    setInitPending(true);
    try {
      const pubkey = new PublicKey(address);
      const [repPda] = await PublicKey.findProgramAddress(
        [Buffer.from("reputation"), pubkey.toBuffer()],
        program.programId
      );
      await (program.methods as any)
        .initializeReputation()
        .accounts({
          reputationAccount: repPda,
          authority: pubkey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      toast.success("Reputation account created.");
      setRepStatus("ready");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to initialize reputation account.");
    } finally {
      setInitPending(false);
    }
  };

  // ── Guard 1: no wallet ──────────────────────────────────────────────────
  if (!address) {
    return null; // redirect is already triggered in the effect above
  }

  // ── Guard 2: Civic pass ─────────────────────────────────────────────────
  // TODO: wire real Civic GatewayStatus check here when @civic/solana-gateway-react
  // is configured. For now we assume all connected wallets are verified humans.
  // Replace the `true` condition below with `gatewayStatus === GatewayStatus.ACTIVE`
  const civicVerified = true;
  if (!civicVerified) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background paper-texture">
        <div className="brutalist-card bg-white p-10 max-w-md text-center">
          <div className="brutalist-tape text-xs px-3 py-1 inline-block mb-4" style={{ transform: "rotate(-2deg)" }}>
            Required
          </div>
          <h2 className="text-3xl font-black uppercase mb-4">Verify You Are Human</h2>
          <p className="font-bold text-sm text-black/60 mb-6 leading-snug">
            Forge requires a one-time Civic CAPTCHA verification to protect the marketplace from bots.
          </p>
          <button className="brutalist-button px-8 py-3 bg-primary text-white border-black">
            Complete Civic Verification
          </button>
        </div>
      </div>
    );
  }

  // ── Guard 3: reputation account ─────────────────────────────────────────
  if (repStatus === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <svg className="animate-spin" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 3a9 9 0 019 9" className="text-primary" />
            <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" opacity="0.2" />
          </svg>
          <p className="font-black text-sm uppercase tracking-widest text-black/50">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (repStatus === "missing") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background paper-texture">
        <div className="brutalist-card bg-white p-10 max-w-md text-center">
          <div className="brutalist-tape text-xs px-3 py-1 inline-block mb-4" style={{ transform: "rotate(-2deg)" }}>
            One-time Setup
          </div>
          <h2 className="text-3xl font-black uppercase mb-4">Welcome to Forge</h2>
          <p className="font-bold text-sm text-black/60 mb-6 leading-snug">
            We need to create a Reputation account on-chain before you can use the dashboard.
            This is a one-time transaction.
          </p>
          <button
            id="auth-init-reputation"
            onClick={initializeReputation}
            disabled={initPending}
            className="brutalist-button px-8 py-3 bg-primary text-white border-black disabled:opacity-50 flex items-center gap-3 mx-auto"
          >
            {initPending ? (
              <>
                <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 3a9 9 0 019 9" />
                  <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" opacity="0.2" />
                </svg>
                Initializing...
              </>
            ) : (
              "Initialize Reputation Account"
            )}
          </button>
        </div>
      </div>
    );
  }

  // ── All gates passed ─────────────────────────────────────────────────────
  return <>{children}</>;
}
