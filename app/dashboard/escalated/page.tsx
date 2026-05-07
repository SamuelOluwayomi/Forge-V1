"use client";

import { useState, useEffect, useCallback } from "react";
import { useEscrow } from "@/app/lib/hooks/useEscrow";
import { useWallet } from "@/app/lib/wallet/context";
import { supabase } from "@/app/lib/supabase";
import { toast } from "sonner";
import { PublicKey } from "@solana/web3.js";
import Link from "next/link";
import { ADMIN_WALLET } from "@/app/components/dashboard/nav";

type EscrowStatus = "Funded" | "In Progress" | "Submitted" | "Completed" | "Disputed";

interface Escrow {
  id: string;
  clientAddress: string;
  workerAddress: string;
  amount: string;
  status: EscrowStatus;
  taskTitle: string;
  createdAt: string;
  pda: string;
  disputeReason?: string;
  submissionUri?: string;
  escalatedToAdmin?: boolean;
}

function ConfirmModal({
  escrow, release, onConfirm, onCancel, resolving,
}: {
  escrow: Escrow; release: boolean; onConfirm: () => void; onCancel: () => void; resolving: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="brutalist-card bg-white w-full max-w-md p-6">
        <div className={`w-12 h-12 border-4 border-black flex items-center justify-center mb-4 ${release ? "bg-[#4ADE80]" : "bg-[#FF4500]"}`}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>
        <h3 className="text-2xl font-black uppercase italic tracking-tighter mb-1">
          {release ? "Pay Worker?" : "Refund Client?"}
        </h3>
        <p className="text-xs font-bold text-black/60 mb-6">
          This action is <span className="text-[#FF4500] font-black">irreversible</span>. The funds will be transferred on-chain immediately.
        </p>
        <div className="bg-black/5 border-2 border-black p-4 mb-6 flex flex-col gap-2">
          <div className="flex justify-between text-xs font-bold">
            <span className="text-black/50 uppercase">Task</span>
            <span className="text-black">{escrow.taskTitle}</span>
          </div>
          <div className="flex justify-between text-xs font-bold">
            <span className="text-black/50 uppercase">Amount</span>
            <span className="text-black font-black">{escrow.amount} SOL</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onConfirm}
            disabled={resolving}
            className={`brutalist-button flex-1 py-3 text-sm border-black disabled:opacity-50 ${release ? "bg-[#4ADE80] text-black" : "bg-[#FF4500] text-white"}`}
          >
            {resolving ? "Processing..." : "Confirm"}
          </button>
          <button onClick={onCancel} disabled={resolving} className="brutalist-button px-5 py-3 bg-white text-black border-black text-sm">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function EscalatedCard({
  escrow, onResolve, resolving,
}: {
  escrow: Escrow;
  onResolve: (escrow: Escrow, release: boolean) => void;
  resolving: string | null;
}) {
  const [confirmAction, setConfirmAction] = useState<boolean | null>(null);
  const isResolvingThis = resolving === escrow.pda;

  return (
    <>
      {confirmAction !== null && (
        <ConfirmModal
          escrow={escrow}
          release={confirmAction}
          resolving={isResolvingThis}
          onConfirm={() => { onResolve(escrow, confirmAction); setConfirmAction(null); }}
          onCancel={() => setConfirmAction(null)}
        />
      )}

      <div className="brutalist-card bg-white p-6 flex flex-col gap-4 relative ring-4 ring-[#FF4500]">
        <div className="brutalist-tape absolute -top-3 -left-2 text-[10px] px-2 py-0.5 bg-[#FF4500] text-white" style={{ transform: "rotate(-3deg)" }}>
          Needs Arbitration
        </div>

        <div className="flex items-start justify-between gap-3 pt-2">
          <div className="flex-1 min-w-0">
            <p className="font-black text-[10px] uppercase tracking-widest text-black/40 mb-1">Escrow #{escrow.id}</p>
            <h3 className="font-black text-base uppercase leading-tight text-black truncate">{escrow.taskTitle}</h3>
          </div>
          <span className="shrink-0 border-2 text-[10px] font-black uppercase px-2 py-1 bg-[#FF4500] text-white border-black">
            ESCALATED
          </span>
        </div>

        <div className="border-t-2 border-b-2 border-black/10 py-3 flex items-center justify-between">
          <p className="text-xs font-black uppercase tracking-widest text-black/50">Locked Amount</p>
          <p className="font-black text-2xl text-black tabular-nums">
            {escrow.amount}<span className="text-xs font-bold text-black/50 ml-1">SOL</span>
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-black/30 uppercase tracking-widest w-14 shrink-0">Client</span>
            <span className="font-mono text-xs text-black/60 truncate flex-1">{escrow.clientAddress}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-black/30 uppercase tracking-widest w-14 shrink-0">Worker</span>
            <span className="font-mono text-xs text-black/60 truncate flex-1">{escrow.workerAddress}</span>
          </div>
        </div>

        {escrow.disputeReason && (
          <div className="bg-[#FF4500]/10 border-2 border-[#FF4500] p-3 flex flex-col gap-2">
            <p className="font-black text-[10px] uppercase text-[#FF4500]">Dispute Details & Escalation Message</p>
            {escrow.disputeReason.split(" | ").map((msg, idx) => (
              <p key={idx} className="text-xs font-bold text-black/80 italic border-l-2 border-[#FF4500] pl-2 py-0.5">
                {msg}
              </p>
            ))}
          </div>
        )}

        {escrow.submissionUri && (
          <div className="bg-[#60A5FA]/10 border-2 border-[#60A5FA] p-3">
            <p className="font-black text-[10px] uppercase text-[#60A5FA] mb-1">Worker Submission Link</p>
            <a href={escrow.submissionUri.startsWith("http") ? escrow.submissionUri : `https://${escrow.submissionUri}`} target="_blank" rel="noreferrer" className="text-xs font-bold text-black/80 break-all underline hover:text-[#60A5FA]">
              {escrow.submissionUri}
            </a>
          </div>
        )}

        <div className="flex flex-col gap-2 mt-2 pt-4 border-t-2 border-black/10">
          <div className="bg-black text-white text-[10px] font-black uppercase tracking-widest py-1.5 text-center flex items-center justify-center gap-2">
            <span className="w-2 h-2 bg-[#FF4500] rounded-full animate-pulse inline-block" />
            Arbitrator Actions
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setConfirmAction(false)}
              disabled={isResolvingThis}
              className="flex-1 brutalist-button py-2.5 text-xs bg-[#FF4500] text-white border-black disabled:opacity-50"
            >
              Refund Client & Cancel
            </button>
            <button
              onClick={() => setConfirmAction(true)}
              disabled={isResolvingThis}
              className="flex-1 brutalist-button py-2.5 text-xs bg-[#4ADE80] text-black border-black disabled:opacity-50"
            >
              Pay Worker & Complete
            </button>
          </div>
          <Link
            href={`/dashboard/browse/${escrow.pda}`}
            className="brutalist-button py-2 text-xs bg-white text-black border-black text-center mt-1"
          >
            View Original Task Info
          </Link>
        </div>

        <p className="text-[10px] font-bold text-black/40 uppercase tracking-widest mt-2">
          Created {escrow.createdAt}
        </p>
      </div>
    </>
  );
}

export default function EscalatedPage() {
  const [loading, setLoading] = useState(true);
  const [escrows, setEscrows] = useState<Escrow[]>([]);
  const [resolving, setResolving] = useState<string | null>(null);

  const { program, resolveDispute } = useEscrow();
  const { wallet } = useWallet();

  const walletAddress = wallet?.account.address?.toString() ?? "";
  const isAdmin = walletAddress.toLowerCase() === ADMIN_WALLET.toLowerCase();

  const fetchEscalated = useCallback(async () => {
    if (!program || !isAdmin) return;
    setLoading(true);
    try {
      const allEscrows = await (program.account as any).escrowAccount.all();

      const pdas = allEscrows.map((e: any) => e.publicKey.toBase58());
      let dbTasks: any[] = [];
      if (supabase && pdas.length > 0) {
        const { data } = await supabase.from("tasks").select("*").in("pda", pdas).eq("escalated_to_admin", true);
        dbTasks = data || [];
      }

      // Filter only escrows that are in dbTasks (which means escalated_to_admin is true) and status is Disputed
      const escalatedPdas = new Set(dbTasks.map((t: any) => t.pda));
      const relevant = allEscrows.filter((e: any) => {
        const pdaStr = e.publicKey.toBase58();
        const stateKeys = Object.keys(e.account.status);
        return escalatedPdas.has(pdaStr) && stateKeys.includes("disputed");
      });

      const mapped: Escrow[] = relevant.map((e: any) => {
        const pdaStr = e.publicKey.toBase58();
        const dbTask = dbTasks.find((t: any) => t.pda === pdaStr);
        
        return {
          id: e.account.taskId.toString(),
          pda: pdaStr,
          clientAddress: e.account.client.toBase58(),
          workerAddress: e.account.worker?.toBase58() ?? "",
          amount: (Number(e.account.amount) / 1_000_000_000).toString(),
          status: "Disputed",
          taskTitle: dbTask?.title || `Task #${e.account.taskId}`,
          createdAt: e.account.createdAt
            ? new Date(Number(e.account.createdAt) * 1000).toLocaleDateString()
            : "Recently",
          disputeReason: (e.account.disputeReason || dbTask?.dispute_reason || "").replace(/\0/g, "").trim(),
          submissionUri: (e.account.submissionUri || "").replace(/\0/g, "").trim(),
          escalatedToAdmin: true,
        };
      });

      setEscrows(mapped);
    } catch (err) {
      console.error("Failed to fetch escalated escrows:", err);
      toast.error("Failed to load escalated tasks.");
    } finally {
      setLoading(false);
    }
  }, [program, isAdmin]);

  useEffect(() => { fetchEscalated(); }, [fetchEscalated]);

  const handleResolve = async (escrow: Escrow, release: boolean) => {
    if (!program || !wallet) return;
    setResolving(escrow.pda);
    const tid = toast.loading(release ? "Releasing funds to worker..." : "Refunding client...");
    try {
      const clientPubkey = new PublicKey(escrow.clientAddress);
      const recipient = new PublicKey(release ? escrow.workerAddress : escrow.clientAddress);
      const sig = await resolveDispute(parseInt(escrow.id), clientPubkey, recipient, release);
      if (program?.provider?.connection) {
        await program.provider.connection.confirmTransaction(sig, "confirmed");
      }
      toast.success(release ? "✓ Worker paid." : "✓ Client refunded.", { id: tid });

      // Update DB
      await fetch(`/api/tasks/${escrow.pda}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: release ? "completed" : "cancelled" }),
      });

      await fetchEscalated();
    } catch (err: any) {
      toast.error("Failed: " + (err.message || "Unknown error"), { id: tid });
    } finally {
      setResolving(null);
    }
  };

  if (!isAdmin) {
    return (
      <div className="w-full h-[60vh] flex items-center justify-center flex-col gap-4 text-center">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#FF4500]">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
        <h1 className="text-3xl font-black uppercase">Access Denied</h1>
        <p className="font-bold text-black/50">This area is restricted to the platform arbitrator.</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-10">
        <div className="brutalist-tape text-xs px-3 py-1 inline-block mb-3 bg-[#FF4500] text-white" style={{ transform: "rotate(-1deg)" }}>
          Admin View
        </div>
        <h1 className="text-5xl md:text-6xl font-black uppercase leading-none text-[#FF4500] italic tracking-tighter">
          Escalated Tasks
        </h1>
        <p className="font-bold text-sm text-black/50 mt-2">
          Disputes that require your arbitration. Review the details and settle the escrow.
        </p>
      </div>

      <div className="bg-[#FF4500] text-white border-4 border-black p-4 flex items-center gap-4 mb-8">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="shrink-0">
          <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
        </svg>
        <div>
          <p className="font-black text-sm uppercase tracking-widest">Arbitration Queue</p>
          <p className="font-bold text-xs text-white/80 mt-0.5">
            You hold the authority to route locked funds to either party. Once a decision is made, the action is irreversible.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-20 gap-4">
          <div className="w-12 h-12 border-4 border-black border-t-[#FF4500] animate-spin" />
          <p className="font-black uppercase tracking-widest text-black/50 animate-pulse">Loading escalations...</p>
        </div>
      ) : escrows.length === 0 ? (
        <div className="brutalist-card bg-white p-16 text-center">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="mx-auto mb-4 text-[#4ADE80]">
            <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
            <path d="M22 4L12 14.01l-3-3" />
          </svg>
          <p className="font-black text-2xl uppercase text-black/30 mb-3">No Pending Escalations</p>
          <p className="font-bold text-sm text-black/40">
            The platform is running smoothly. Take a break!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {escrows.map(e => (
            <EscalatedCard
              key={e.pda}
              escrow={e}
              onResolve={handleResolve}
              resolving={resolving}
            />
          ))}
        </div>
      )}
    </div>
  );
}
