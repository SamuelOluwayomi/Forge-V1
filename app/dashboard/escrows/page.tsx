"use client";

import { useState, useEffect, useCallback } from "react";
import { useEscrow } from "@/app/lib/hooks/useEscrow";
import { useWallet } from "@/app/lib/wallet/context";
import { supabase } from "@/app/lib/supabase";
import { toast } from "sonner";
import { PublicKey } from "@solana/web3.js";

const ADMIN_WALLET = "HDpuuLudmQeCjm52z1L8SC8eMAX85QEdum6KPu2b6TgW";

type EscrowStatus = "Funded" | "In Progress" | "Submitted" | "Completed" | "Disputed";

interface Escrow {
  id: string;
  role: "Client" | "Worker" | "Admin";
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

const STATUS_STYLES: Record<EscrowStatus, string> = {
  Funded: "bg-[#60A5FA] text-black border-black",
  "In Progress": "bg-[#FFD700] text-black border-black",
  Submitted: "bg-[#FF90E8] text-black border-black",
  Completed: "bg-[#4ADE80] text-black border-black",
  Disputed: "bg-[#FF4500] text-white border-black",
};

function CopyButton({ text, id }: { text: string; id: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      id={id}
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className={`flex items-center gap-1.5 border-2 border-black px-3 py-1.5 text-xs font-black uppercase transition-all duration-150 shrink-0
        ${copied ? "bg-[#4ADE80] text-black scale-95" : "bg-white text-black hover:bg-black hover:text-white"}`}
      style={{ boxShadow: copied ? "none" : "2px 2px 0px 0px rgba(0,0,0,1)" }}
    >
      {copied ? "✓ Copied" : "Copy"}
    </button>
  );
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

function EscrowCard({
  escrow, isAdmin, onResolve, onEscalate, resolving,
}: {
  escrow: Escrow;
  isAdmin: boolean;
  onResolve: (escrow: Escrow, release: boolean) => void;
  onEscalate: (escrow: Escrow) => void;
  resolving: string | null;
}) {
  const [confirmAction, setConfirmAction] = useState<boolean | null>(null);
  const [escalating, setEscalating] = useState(false);
  const isDisputed = escrow.status === "Disputed";
  const isResolvingThis = resolving === escrow.pda;

  const handleEscalate = async () => {
    setEscalating(true);
    await onEscalate(escrow);
    setEscalating(false);
  };

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

      <div className={`brutalist-card bg-white p-6 flex flex-col gap-4 relative ${isDisputed ? "ring-4 ring-[#FF4500]" : ""}`}>
        {/* Role tape */}
        <div
          className={`brutalist-tape absolute -top-3 -left-2 text-[10px] px-2 py-0.5 ${
            escrow.role === "Admin" ? "bg-[#FF4500] text-white" :
            escrow.role === "Client" ? "bg-black text-white" : "bg-primary text-white"
          }`}
          style={{ transform: "rotate(-3deg)" }}
        >
          {escrow.role === "Admin" ? "Arbitrator" : escrow.role}
        </div>

        {/* Header */}
        <div className="flex items-start justify-between gap-3 pt-2">
          <div className="flex-1 min-w-0">
            <p className="font-black text-[10px] uppercase tracking-widest text-black/40 mb-1">Escrow #{escrow.id}</p>
            <h3 className="font-black text-base uppercase leading-tight text-black truncate">{escrow.taskTitle}</h3>
          </div>
          <span className={`shrink-0 border-2 text-[10px] font-black uppercase px-2 py-1 ${STATUS_STYLES[escrow.status]}`}>
            {escrow.status}
          </span>
        </div>

        {/* Amount */}
        <div className="border-t-2 border-b-2 border-black/10 py-3 flex items-center justify-between">
          <p className="text-xs font-black uppercase tracking-widest text-black/50">Locked Amount</p>
          <p className="font-black text-2xl text-black tabular-nums">
            {escrow.amount}<span className="text-xs font-bold text-black/50 ml-1">SOL</span>
          </p>
        </div>

        {/* Addresses */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-black/30 uppercase tracking-widest w-14 shrink-0">Client</span>
            <span className="font-mono text-xs text-black/60 truncate flex-1">{escrow.clientAddress}</span>
            <CopyButton text={escrow.clientAddress} id={`copy-client-${escrow.id}`} />
          </div>
          {escrow.workerAddress && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-black/30 uppercase tracking-widest w-14 shrink-0">Worker</span>
              <span className="font-mono text-xs text-black/60 truncate flex-1">{escrow.workerAddress}</span>
              <CopyButton text={escrow.workerAddress} id={`copy-worker-${escrow.id}`} />
            </div>
          )}
        </div>

        {/* Dispute details */}
        {isDisputed && escrow.disputeReason && (
          <div className="bg-[#FF4500]/10 border-2 border-[#FF4500] p-3">
            <p className="font-black text-[10px] uppercase text-[#FF4500] mb-1">Dispute Reason</p>
            <p className="text-xs font-bold text-black/80 italic">&quot;{escrow.disputeReason}&quot;</p>
          </div>
        )}

        {isDisputed && escrow.submissionUri && (
          <div className="bg-[#60A5FA]/10 border-2 border-[#60A5FA] p-3">
            <p className="font-black text-[10px] uppercase text-[#60A5FA] mb-1">Worker Submission</p>
            <p className="text-xs font-bold text-black/80 break-all">{escrow.submissionUri}</p>
          </div>
        )}

        {/* Escalation flow for non-admin parties */}
        {isDisputed && !isAdmin && (
          <>
            {escrow.escalatedToAdmin ? (
              <div className="bg-[#FFD700]/20 border-2 border-[#FFD700] border-dashed p-3 flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-black shrink-0">
                  <circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/>
                </svg>
                <p className="text-xs font-black text-black/70 uppercase tracking-wider">Escalated — Admin is reviewing</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2 border-2 border-dashed border-black/20 p-3">
                <p className="text-[10px] font-black uppercase text-black/40 tracking-widest">Stuck? Can&apos;t resolve with the other party?</p>
                <button
                  onClick={handleEscalate}
                  disabled={escalating}
                  className="brutalist-button w-full py-2 text-xs bg-black text-white border-black disabled:opacity-50"
                >
                  {escalating ? "Escalating..." : "🚨 Escalate to Admin"}
                </button>
                <p className="text-[9px] font-bold text-black/30 leading-tight">
                  Only do this if you&apos;ve already tried to resolve directly. The admin will review the submission and dispute reason.
                </p>
              </div>
            )}
          </>
        )}

        {/* Admin arbitrator controls — only shown when escalated */}
        {isAdmin && isDisputed && (
          <div className="flex flex-col gap-2 mt-1">
            {escrow.escalatedToAdmin ? (
              <>
                <div className="bg-black text-white text-[10px] font-black uppercase tracking-widest py-1.5 text-center flex items-center justify-center gap-2">
                  <span className="w-2 h-2 bg-[#FF4500] rounded-full animate-pulse inline-block" />
                  Arbitrator Controls
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setConfirmAction(false)}
                    disabled={isResolvingThis}
                    className="flex-1 brutalist-button py-2.5 text-xs bg-[#FF4500] text-white border-black disabled:opacity-50"
                  >
                    Refund Client
                  </button>
                  <button
                    onClick={() => setConfirmAction(true)}
                    disabled={isResolvingThis}
                    className="flex-1 brutalist-button py-2.5 text-xs bg-[#4ADE80] text-black border-black disabled:opacity-50"
                  >
                    Pay Worker
                  </button>
                </div>
              </>
            ) : (
              <div className="bg-black/5 border-2 border-dashed border-black/20 p-3 text-center">
                <p className="text-[10px] font-black uppercase text-black/40 tracking-widest">Waiting for escalation</p>
                <p className="text-[9px] font-bold text-black/30 mt-1 leading-tight">
                  The client or worker must escalate this dispute before you can intervene.
                </p>
              </div>
            )}
          </div>
        )}

        <p className="text-[10px] font-bold text-black/40 uppercase tracking-widest">
          Created {escrow.createdAt}
        </p>
      </div>
    </>
  );
}

export default function EscrowsPage() {
  const [filter, setFilter] = useState<EscrowStatus | "All">("All");
  const [loading, setLoading] = useState(true);
  const [escrows, setEscrows] = useState<Escrow[]>([]);
  const [resolving, setResolving] = useState<string | null>(null);

  const { program, resolveDispute } = useEscrow();
  const { wallet } = useWallet();

  // Use toString() to ensure branded Address type is converted to a plain string
  const walletAddress = wallet?.account.address?.toString() ?? "";
  const isAdmin = walletAddress.toLowerCase() === ADMIN_WALLET.toLowerCase();

  const fetchEscrows = useCallback(async () => {
    if (!program || !walletAddress) return;
    setLoading(true);
    try {
      const allEscrows = await (program.account as any).escrowAccount.all();

      const relevant = isAdmin
        ? allEscrows.filter((e: any) => !Object.keys(e.account.status).includes("cancelled"))
        : allEscrows.filter(
            (e: any) =>
              (e.account.client.toBase58() === walletAddress ||
               (e.account.worker && e.account.worker.toBase58() === walletAddress)) &&
              !Object.keys(e.account.status).includes("cancelled")
          );

      const pdas = relevant.map((e: any) => e.publicKey.toBase58());
      let dbTasks: any[] = [];
      if (supabase && pdas.length > 0) {
        const { data } = await supabase.from("tasks").select("*").in("pda", pdas);
        dbTasks = data || [];
      }

      const mapped: Escrow[] = relevant.map((e: any) => {
        const stateKeys = Object.keys(e.account.status);
        let status: EscrowStatus = "Funded";
        if (stateKeys.includes("active")) status = "In Progress";
        if (stateKeys.includes("submitted")) status = "Submitted";
        if (stateKeys.includes("completed")) status = "Completed";
        if (stateKeys.includes("disputed")) status = "Disputed";

        const pdaStr = e.publicKey.toBase58();
        const dbTask = dbTasks.find((t: any) => t.pda === pdaStr);
        const clientAddr = e.account.client.toBase58();
        const workerAddr = e.account.worker?.toBase58() ?? "";

        const role: "Client" | "Worker" | "Admin" = isAdmin
          ? "Admin"
          : clientAddr === walletAddress
          ? "Client"
          : "Worker";

        return {
          id: e.account.taskId.toString(),
          pda: pdaStr,
          role,
          clientAddress: clientAddr,
          workerAddress: workerAddr,
          amount: (Number(e.account.amount) / 1_000_000_000).toString(),
          status,
          taskTitle: dbTask?.title || `Task #${e.account.taskId}`,
          createdAt: e.account.createdAt
            ? new Date(Number(e.account.createdAt) * 1000).toLocaleDateString()
            : "Recently",
          disputeReason: (e.account.disputeReason || dbTask?.dispute_reason || "").replace(/\0/g, "").trim(),
          submissionUri: (e.account.submissionUri || "").replace(/\0/g, "").trim(),
          escalatedToAdmin: dbTask?.escalated_to_admin ?? false,
        };
      });

      // Sort: disputed + escalated first, then disputed, then rest
      setEscrows(
        mapped.sort((a, b) => {
          if (a.status === "Disputed" && a.escalatedToAdmin) return -1;
          if (b.status === "Disputed" && b.escalatedToAdmin) return 1;
          if (a.status === "Disputed") return -1;
          if (b.status === "Disputed") return 1;
          return 0;
        })
      );
    } catch (err) {
      console.error("Failed to fetch escrows:", err);
      toast.error("Failed to load escrows.");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [program?.programId.toBase58(), walletAddress, isAdmin]);

  useEffect(() => { fetchEscrows(); }, [fetchEscrows]);

  const handleEscalate = async (escrow: Escrow) => {
    try {
      await fetch(`/api/tasks/${escrow.pda}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ escalated_to_admin: true }),
      });
      toast.success("Dispute escalated to admin. They will review shortly.");
      await fetchEscrows();
    } catch {
      toast.error("Failed to escalate. Please try again.");
    }
  };

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

      await fetchEscrows();
    } catch (err: any) {
      toast.error("Failed: " + (err.message || "Unknown error"), { id: tid });
    } finally {
      setResolving(null);
    }
  };

  const filters: (EscrowStatus | "All")[] = ["All", "Funded", "In Progress", "Submitted", "Disputed", "Completed"];
  const escalatedCount = escrows.filter(e => e.status === "Disputed" && e.escalatedToAdmin).length;

  return (
    <div className="w-full">
      <div className="mb-10">
        <h1 className="text-5xl md:text-6xl font-black uppercase leading-none text-black italic tracking-tighter">
          Active Escrows
        </h1>
        <p className="font-bold text-sm text-black/50 mt-2">
          All escrow vaults you are part of — as client or worker.
        </p>
      </div>

      {/* Admin banner */}
      {isAdmin && (
        <div className="bg-[#FF4500] text-white border-4 border-black p-4 flex items-center gap-4 mb-6">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="shrink-0">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
          </svg>
          <div>
            <p className="font-black text-sm uppercase tracking-widest">Arbitrator Mode Active</p>
            <p className="font-bold text-xs text-white/80 mt-0.5">
              You are viewing all platform escrows. Escalated disputes are pinned to the top.
            </p>
          </div>
          {escalatedCount > 0 && (
            <div className="ml-auto bg-black text-white px-3 py-1 text-xs font-black uppercase border-2 border-white animate-pulse">
              {escalatedCount} Needs Review
            </div>
          )}
        </div>
      )}

      {/* Info strip */}
      <div className="bg-black text-white border-4 border-black p-4 flex items-center gap-4 mb-8">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="shrink-0 text-primary">
          <circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/>
        </svg>
        <p className="font-bold text-sm text-white/80">
          Funds are locked in Solana PDAs and can only be released by mutual approval or arbitration. No intermediaries.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-8">
        {filters.map((f) => (
          <button
            key={f}
            id={`escrow-filter-${f.toLowerCase().replace(/ /g, "-")}`}
            onClick={() => setFilter(f)}
            className={`border-2 border-black px-4 py-1.5 text-xs font-black uppercase transition-all duration-100 relative
              ${filter === f ? "bg-black text-white shadow-none translate-x-0.5 translate-y-0.5" : "bg-white text-black hover:bg-black hover:text-white"}`}
            style={{ boxShadow: filter === f ? "none" : "3px 3px 0px 0px rgba(0,0,0,1)" }}
          >
            {f}
            {f === "Disputed" && escalatedCount > 0 && isAdmin && (
              <span className="absolute -top-2 -right-2 bg-[#FF4500] text-white text-[9px] font-black w-4 h-4 flex items-center justify-center border border-black">
                {escalatedCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-20 gap-4">
          <div className="w-12 h-12 border-4 border-black border-t-primary animate-spin" />
          <p className="font-black uppercase tracking-widest text-black/50 animate-pulse">Scanning the ledger...</p>
        </div>
      ) : escrows.filter(e => filter === "All" || e.status === filter).length === 0 ? (
        <div className="brutalist-card bg-white p-16 text-center">
          <p className="font-black text-2xl uppercase text-black/30 mb-3">No escrows found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {escrows.filter(e => filter === "All" || e.status === filter).map(e => (
            <EscrowCard
              key={e.pda}
              escrow={e}
              isAdmin={isAdmin}
              onResolve={handleResolve}
              onEscalate={handleEscalate}
              resolving={resolving}
            />
          ))}
        </div>
      )}
    </div>
  );
}
