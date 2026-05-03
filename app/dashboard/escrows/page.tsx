"use client";

import { useState, useEffect, useCallback } from "react";
import { useEscrow } from "@/app/lib/hooks/useEscrow";
import { useWallet } from "@/app/lib/wallet/context";
import { supabase } from "@/app/lib/supabase";
import { toast } from "sonner";
import { PublicKey } from "@solana/web3.js";

const ADMIN_WALLET = "HDpuuLudmQcCm52z1L8SC8eMAX8SQedum6KPu2b6TgW";

type EscrowStatus = "Funded" | "In Progress" | "Submitted" | "Completed" | "Disputed";

interface Escrow {
  id: string;
  role: "Client" | "Worker" | "Admin";
  counterparty: string;
  clientAddress: string;
  workerAddress: string;
  amount: string;
  status: EscrowStatus;
  taskTitle: string;
  createdAt: string;
  contactInfo?: string;
  pda: string;
  disputeReason?: string;
  submissionUri?: string;
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
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      id={id}
      onClick={handleCopy}
      className={`flex items-center gap-1.5 border-2 border-black px-3 py-1.5 text-xs font-black uppercase transition-all duration-150 shrink-0
        ${copied ? "bg-[#4ADE80] border-[#4ADE80] text-black scale-95" : "bg-white text-black hover:bg-black hover:text-white"}`}
      style={{ boxShadow: copied ? "none" : "2px 2px 0px 0px rgba(0,0,0,1)" }}
    >
      {copied ? "✓ Copied" : "Copy"}
    </button>
  );
}

function ConfirmModal({
  escrow,
  release,
  onConfirm,
  onCancel,
  resolving,
}: {
  escrow: Escrow;
  release: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  resolving: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="brutalist-card bg-white w-full max-w-md p-6 animate-in zoom-in-95 duration-200">
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
          This action is <span className="text-[#FF4500] font-black">irreversible</span>.
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
            {resolving ? "Processing..." : `Confirm Resolution`}
          </button>
          <button
            onClick={onCancel}
            disabled={resolving}
            className="brutalist-button px-5 py-3 bg-white text-black border-black text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function EscrowCard({
  escrow,
  isAdmin,
  onResolve,
  resolving,
}: {
  escrow: Escrow;
  isAdmin: boolean;
  onResolve: (escrow: Escrow, release: boolean) => void;
  resolving: string | null;
}) {
  const [confirmAction, setConfirmAction] = useState<boolean | null>(null);
  const isDisputed = escrow.status === "Disputed";
  const isResolvingThis = resolving === escrow.pda;

  return (
    <>
      {confirmAction !== null && (
        <ConfirmModal
          escrow={escrow}
          release={confirmAction}
          resolving={isResolvingThis}
          onConfirm={() => {
            onResolve(escrow, confirmAction);
            setConfirmAction(null);
          }}
          onCancel={() => setConfirmAction(null)}
        />
      )}

      <div className={`brutalist-card bg-white p-6 flex flex-col gap-4 relative ${isDisputed ? "ring-4 ring-[#FF4500]" : ""}`}>
        <div
          className={`brutalist-tape absolute -top-3 -left-2 text-[10px] px-2 py-0.5 ${
            escrow.role === "Admin" ? "bg-[#FF4500] text-white" :
            escrow.role === "Client" ? "bg-black text-white" : "bg-primary text-white"
          }`}
          style={{ transform: "rotate(-3deg)" }}
        >
          {escrow.role === "Admin" ? "Arbitrator" : escrow.role}
        </div>

        <div className="flex items-start justify-between gap-3 pt-2">
          <div className="flex-1 min-w-0">
            <p className="font-black text-[10px] uppercase tracking-widest text-black/40 mb-1">Escrow #{escrow.id}</p>
            <h3 className="font-black text-base uppercase leading-tight text-black truncate">{escrow.taskTitle}</h3>
          </div>
          <span className={`shrink-0 border-2 text-[10px] font-black uppercase px-2 py-1 ${STATUS_STYLES[escrow.status]}`}>
            {escrow.status}
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
            <CopyButton text={escrow.clientAddress} id={`copy-client-${escrow.id}`} />
          </div>
          {escrow.workerAddress && escrow.workerAddress !== "11111111111111111111111111111111" && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-black/30 uppercase tracking-widest w-14 shrink-0">Worker</span>
              <span className="font-mono text-xs text-black/60 truncate flex-1">{escrow.workerAddress}</span>
              <CopyButton text={escrow.workerAddress} id={`copy-worker-${escrow.id}`} />
            </div>
          )}
        </div>

        {isDisputed && escrow.disputeReason && (
          <div className="bg-[#FF4500]/10 border-2 border-[#FF4500] p-3">
            <p className="font-black text-[10px] uppercase text-[#FF4500] mb-1">Dispute Reason</p>
            <p className="text-xs font-bold text-black/80 italic">&quot;{escrow.disputeReason}&quot;</p>
          </div>
        )}

        {isDisputed && escrow.submissionUri && (
          <div className="bg-[#60A5FA]/10 border-2 border-[#60A5FA] p-3">
            <p className="font-black text-[10px] uppercase text-[#60A5FA] mb-1">Submission Link</p>
            <p className="text-xs font-bold text-black/80 break-all">{escrow.submissionUri}</p>
          </div>
        )}

        {isAdmin && isDisputed && (
          <div className="flex flex-col gap-2 mt-2">
            <div className="bg-black text-white text-[10px] font-black uppercase tracking-widest py-1.5 text-center">
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

  const isAdmin = wallet?.account.address?.toLowerCase() === ADMIN_WALLET.toLowerCase();

  const fetchEscrows = useCallback(async () => {
    if (!program || !wallet) return;
    setLoading(true);
    try {
      const address = wallet.account.address;
      const allEscrows = await (program.account as any).escrowAccount.all();

      const relevant = isAdmin
        ? allEscrows.filter((e: any) => !Object.keys(e.account.status).includes("cancelled"))
        : allEscrows.filter(
            (e: any) =>
              (e.account.client.toBase58() === address || (e.account.worker && e.account.worker.toBase58() === address)) &&
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

        let role: "Client" | "Worker" | "Admin" = isAdmin ? "Admin" : (clientAddr === address ? "Client" : "Worker");

        return {
          id: e.account.taskId.toString(),
          pda: pdaStr,
          role,
          clientAddress: clientAddr,
          workerAddress: workerAddr,
          counterparty: clientAddr === address ? workerAddr : clientAddr,
          amount: (Number(e.account.amount) / 1_000_000_000).toString(),
          status,
          taskTitle: dbTask?.title || `Task #${e.account.taskId}`,
          createdAt: e.account.createdAt ? new Date(Number(e.account.createdAt) * 1000).toLocaleDateString() : "Recently",
          disputeReason: (e.account.disputeReason || dbTask?.dispute_reason || "").replace(/\0/g, "").trim(),
          submissionUri: (e.account.submissionUri || "").replace(/\0/g, "").trim(),
        };
      });

      setEscrows(mapped.sort((a, b) => (a.status === "Disputed" ? -1 : 1)));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [program, wallet, isAdmin]);

  useEffect(() => { fetchEscrows(); }, [fetchEscrows]);

  const handleResolve = async (escrow: Escrow, release: boolean) => {
    if (!program || !wallet) return;
    setResolving(escrow.pda);
    try {
      const clientPubkey = new PublicKey(escrow.clientAddress);
      const recipient = new PublicKey(release ? escrow.workerAddress : escrow.clientAddress);
      const sig = await resolveDispute(parseInt(escrow.id), clientPubkey, recipient, release);
      if (program?.provider?.connection) await program.provider.connection.confirmTransaction(sig, "confirmed");
      toast.success("Dispute resolved!");
      await fetchEscrows();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setResolving(null);
    }
  };

  return (
    <div className="w-full">
      <div className="mb-10">
        <h1 className="text-5xl md:text-6xl font-black uppercase leading-none text-black italic tracking-tighter">Active Escrows</h1>
      </div>

      {isAdmin && (
        <div className="bg-[#FF4500] text-white border-4 border-black p-4 flex items-center gap-4 mb-6">
          <div className="font-black text-sm uppercase tracking-widest text-white">Arbitrator Mode Active</div>
          <div className="ml-auto bg-black text-white px-3 py-1 text-xs font-black uppercase border-2 border-white">
            {escrows.filter(e => e.status === "Disputed").length} Open Disputes
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center p-20">
          <div className="animate-spin border-4 border-black border-t-primary w-12 h-12" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {escrows.filter(e => filter === "All" || e.status === filter).map(e => (
            <EscrowCard key={e.pda} escrow={e} isAdmin={isAdmin} onResolve={handleResolve} resolving={resolving} />
          ))}
        </div>
      )}
    </div>
  );
}
