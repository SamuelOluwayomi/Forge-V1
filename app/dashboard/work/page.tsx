"use client";

import { useState, useEffect } from "react";
import { useEscrow } from "@/app/lib/hooks/useEscrow";
import { useWallet } from "@/app/lib/wallet/context";
import { supabase } from "@/app/lib/supabase";
import { toast } from "sonner";
import { ForgeLoader } from "@/app/components/ForgeLoader";
import Link from "next/link";

type WorkStatus = "Approved" | "In Progress" | "Submitted" | "Completed" | "Disputed";

interface WorkItem {
  id: string;
  pda: string;
  title: string;
  client: string;
  amount: string;
  status: WorkStatus;
  difficulty: number;
  disputeReason?: string;
  disputeCount?: number;
  escalatedToAdmin?: boolean;
}

const STATUS_STYLES: Record<WorkStatus, string> = {
  Approved: "bg-[#4ADE80] text-black border-black",
  "In Progress": "bg-[#FFD700] text-black border-black",
  Submitted: "bg-[#60A5FA] text-black border-black",
  Completed: "bg-black text-white border-black",
  Disputed: "bg-[#FF4500] text-white border-black",
};

const DIFFICULTY_LABELS = ["", "Beginner", "Intermediate", "Advanced", "Expert"];

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

function WorkCard({ item, onSubmit, submitting }: { item: WorkItem; onSubmit: (id: string, client: string, isEscalate?: boolean) => void; submitting: string | null }) {
  return (
    <div className="brutalist-card bg-white p-6 flex flex-col gap-4 relative">
      {/* Difficulty tape */}
      <div className="brutalist-tape absolute -top-3 -left-2 text-[10px] px-2 py-0.5" style={{ transform: "rotate(-3deg)" }}>
        {DIFFICULTY_LABELS[item.difficulty] ?? "Unknown"}
      </div>

      <div className="flex items-start justify-between gap-3 pt-2">
        <div className="flex-1 min-w-0">
          <p className="font-black text-[10px] uppercase tracking-widest text-black/40 mb-1">Work #{item.id}</p>
          <h3 className="font-black text-lg uppercase leading-tight text-black truncate">{item.title}</h3>
        </div>
        <span className={`shrink-0 border-2 text-[10px] font-black uppercase px-2 py-1 ${STATUS_STYLES[item.status]}`}>
          {item.status}
        </span>
      </div>

      {/* Approved banner */}
      {item.status === "Approved" && (
        <div className="bg-[#4ADE80] border-2 border-black px-4 py-2 text-center">
          <p className="font-black text-xs uppercase">You&apos;ve been approved! Start working and submit when ready.</p>
        </div>
      )}

      <div className="border-t-2 border-b-2 border-black/10 py-3 flex items-center justify-between">
        <p className="text-xs font-black uppercase tracking-widest text-black/50">Reward</p>
        <p className="font-black text-xl text-black tabular-nums">
          {item.amount}<span className="text-xs font-bold text-black/50 ml-1">SOL</span>
        </p>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-black uppercase tracking-widest text-black/40 mb-1">Client</p>
          <p className="font-mono text-xs text-black/70 truncate">{item.client}</p>
        </div>
        <CopyButton text={item.client} id={`copy-client-${item.id}`} />
      </div>

      {(item.status === "Approved" || item.status === "In Progress" || item.status === "Disputed") && (
        <button
          id={`submit-work-${item.id}`}
          onClick={() => onSubmit(item.id, item.client)}
          disabled={submitting === item.id}
          className="brutalist-button w-full py-2.5 text-sm bg-primary text-white border-black disabled:opacity-50"
        >
          {submitting === item.id ? "Submitting..." : item.status === "Disputed" ? "Resubmit Work" : "Submit Work"}
        </button>
      )}

      {item.status === "Disputed" && item.disputeReason && (
        <div className="bg-[#FF4500]/10 border-2 border-[#FF4500] p-3">
          <p className="font-black text-[10px] uppercase text-[#FF4500] mb-1">Dispute Reason</p>
          <p className="text-xs font-bold text-black/70 italic">&quot;{item.disputeReason}&quot;</p>
        </div>
      )}

      {item.status === "Completed" && (
        <div className="bg-black text-white px-4 py-2 text-center border-2 border-black">
          <p className="font-black text-xs uppercase">Completed — Payment Released</p>
        </div>
      )}

      {(item.status === "Submitted" || item.status === "Disputed") && !item.escalatedToAdmin && (
        <div className="mt-2 p-4 border-2 border-dashed border-[#FF4500] bg-[#FF4500]/10 text-center">
          <p className="text-sm font-black uppercase text-[#FF4500] mb-2">Need admin intervention?</p>
          <button
            onClick={() => onSubmit(item.id, item.client, true)}
            disabled={!item.disputeCount || item.disputeCount < 1}
            className="brutalist-button w-full py-2 bg-black text-white border-black text-xs disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Escalate to Admin
          </button>
          {(!item.disputeCount || item.disputeCount < 1) && (
             <p className="text-[10px] font-bold text-black/50 mt-2 leading-tight">
               * Escalation becomes available once a dispute is raised.
             </p>
          )}
        </div>
      )}

      {item.escalatedToAdmin && (
        <div className="mt-2 p-4 border-2 border-dashed border-[#FFD700] bg-[#FFD700]/20 text-center flex flex-col items-center justify-center gap-2">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-black">
            <circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/>
          </svg>
          <p className="text-xs font-black uppercase text-black">Escalated — Admin is reviewing</p>
        </div>
      )}
    </div>
  );
}

export default function WorkPage() {
  const [filter, setFilter] = useState<WorkStatus | "All">("All");
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [submittingClient, setSubmittingClient] = useState<string | null>(null);
  const [isEscalating, setIsEscalating] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submissionUri, setSubmissionUri] = useState("");
  const [escalateMessage, setEscalateMessage] = useState("");
  const [processingEscalate, setProcessingEscalate] = useState(false);

  const { program, submitWork } = useEscrow();
  const { wallet } = useWallet();
  const [jobs, setJobs] = useState<WorkItem[]>([]);

  const fetchWork = async () => {
    if (!program || !wallet) return;
    setLoading(true);
    try {
      const address = wallet.account.address;
      const allEscrows = await (program.account as any).escrowAccount.all();
      
      // Find escrows where this wallet is the worker
      const myWork = allEscrows.filter((e: any) => {
        const worker = e.account.worker;
        return worker && worker.toBase58() !== "11111111111111111111111111111111" && worker.toBase58() === address;
      });

      // Fetch titles from DB
      const pdas = myWork.map((e: any) => e.publicKey.toBase58());
      let dbTasks: any[] = [];
      if (supabase && pdas.length > 0) {
        const { data } = await supabase.from("tasks").select("pda, title, dispute_reason, dispute_count, escalated_to_admin").in("pda", pdas);
        dbTasks = data || [];
      }

      const mapped: WorkItem[] = myWork.map((e: any) => {
        const stateKeys = Object.keys(e.account.status);
        let status: WorkStatus = "Approved";
        if (stateKeys.includes("active")) status = "In Progress";
        if (stateKeys.includes("submitted")) status = "Submitted";
        if (stateKeys.includes("completed")) status = "Completed";
        if (stateKeys.includes("disputed")) status = "Disputed";

        // If status is active and worker is set, that means "Approved"
        if (stateKeys.includes("active")) status = "Approved";

        const pdaStr = e.publicKey.toBase58();
        const dbTask = dbTasks.find((t: any) => t.pda === pdaStr);

        return {
          id: e.account.taskId.toString(),
          pda: pdaStr,
          title: dbTask?.title || "On-Chain Task",
          client: e.account.client.toBase58(),
          amount: (Number(e.account.amount) / 1_000_000_000).toString(),
          status,
          difficulty: e.account.difficulty,
          disputeReason: (e.account.disputeReason || dbTask?.dispute_reason || "").replace(/\0/g, "").trim(),
          disputeCount: dbTask?.dispute_count || 0,
          escalatedToAdmin: dbTask?.escalated_to_admin || false,
        };
      });

      setJobs(mapped.filter(j => j.status !== "Completed" || true).reverse());
    } catch (err) {
      console.error("Failed to fetch work:", err);
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchWork(); }, [program?.programId.toBase58(), wallet?.account.address]);

  const handleSubmitClick = (taskId: string, clientStr: string, isEscalate?: boolean) => {
    setSubmittingId(taskId);
    setSubmittingClient(clientStr);
    setSubmissionUri("");
    setEscalateMessage("");
    setIsEscalating(!!isEscalate);
    setShowSubmitModal(true);
  };

  const handleConfirmSubmit = async () => {
    if (!submittingId || !submittingClient) return;
    if (!submissionUri.trim()) {
      toast.error("Please provide a link or description of your work.");
      return;
    }

    const tid = toast.loading("Submitting work on-chain...");
    try {
      const { PublicKey } = await import("@solana/web3.js");
      const clientPubkey = new PublicKey(submittingClient);
      const sig = await submitWork(parseInt(submittingId), clientPubkey, submissionUri);
      
      if (program?.provider?.connection) {
        await program.provider.connection.confirmTransaction(sig, "confirmed");
      }
      toast.success("Work submitted! Waiting for client review.", { id: tid });
      setShowSubmitModal(false);
      setSubmittingId(null);
      setSubmittingClient(null);
      await fetchWork();
    } catch (err: any) {
      console.error("Submit failed:", err);
      toast.error("Failed: " + (err.message || "Unknown error"), { id: tid });
    }
  };

  const handleEscalateSubmit = async () => {
    if (!submittingId) return;
    setProcessingEscalate(true);
    const tid = toast.loading("Escalating to admin...");
    try {
      const workItem = jobs.find(j => j.id === submittingId);
      const pda = workItem?.pda;
      if (!pda) throw new Error("Task PDA not found");

      const appendedReason = escalateMessage 
        ? `${workItem.disputeReason} | Worker Escalation: ${escalateMessage}`
        : (workItem.disputeReason || "Worker escalated task");

      await fetch(`/api/tasks/${pda}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          escalated_to_admin: true,
          dispute_reason: appendedReason
        }),
      });

      toast.success("Dispute escalated to admin. They will review shortly.", { id: tid });
      setShowSubmitModal(false);
      await fetchWork();
    } catch (err: any) {
      console.error("Escalation failed:", err);
      toast.error("Failed to escalate: " + (err.message || "Unknown error"), { id: tid });
    } finally {
      setProcessingEscalate(false);
    }
  };

  const filtered = filter === "All" ? jobs : jobs.filter((j) => j.status === filter);
  const filters: (WorkStatus | "All")[] = ["All", "Approved", "In Progress", "Submitted", "Disputed", "Completed"];

  return (
    <div className="w-full">
      <div className="mb-10">
        <div className="brutalist-tape text-xs px-3 py-1 inline-block mb-3" style={{ transform: "rotate(-1deg)" }}>
          Worker View
        </div>
        <h1 className="text-5xl md:text-6xl font-black uppercase leading-none text-black italic tracking-tighter">
          Accepted Work
        </h1>
        <p className="font-bold text-sm text-black/50 mt-2">
          Tasks assigned to you. Complete and submit to release escrow.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 mb-8">
        {filters.map((f) => (
          <button
            key={f}
            id={`work-filter-${f.toLowerCase().replace(/ /g, "-")}`}
            onClick={() => setFilter(f)}
            className={`border-2 border-black px-4 py-1.5 text-xs font-black uppercase transition-all duration-100
              ${filter === f ? "bg-black text-white shadow-none translate-x-0.5 translate-y-0.5" : "bg-white text-black hover:bg-black hover:text-white"}`}
            style={{ boxShadow: filter === f ? "none" : "3px 3px 0px 0px rgba(0,0,0,1)" }}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <ForgeLoader />
        </div>
      ) : filtered.length === 0 ? (
        <div className="brutalist-card bg-white p-16 text-center">
          <p className="font-black text-2xl uppercase text-black/30 mb-3">No work found</p>
          <p className="font-bold text-sm text-black/40">
            {filter === "All" ? "You have not been assigned any work yet." : `No work with status "${filter}".`}
          </p>
          <Link
            href="/dashboard/browse"
            className="brutalist-button inline-block mt-6 px-8 py-3 bg-primary text-white border-black text-sm"
          >
            Browse Available Tasks
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filtered.map((item) => <WorkCard key={item.id} item={item} onSubmit={handleSubmitClick} submitting={submittingId} />)}
        </div>
      )}

      {/* Submission Modal */}
      {showSubmitModal && submittingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="brutalist-card bg-white w-full max-w-md p-6 animate-in zoom-in-95 duration-200">
            <h3 className={`text-2xl font-black uppercase italic tracking-tighter mb-2 ${isEscalating ? "text-[#FF4500]" : ""}`}>
              {isEscalating ? "Escalate to Admin" : "Submit Work"}
            </h3>
            <p className="text-xs font-bold text-black/60 mb-6">
              {isEscalating 
                ? "Provide a message to the admin explaining why you are escalating this dispute."
                : "Provide a link to your completed work (e.g., GitHub PR, Google Doc, Figma file) so the client can review it."}
            </p>

            <div className="flex flex-col gap-3 mb-8">
              <label htmlFor="submission-input" className="font-black text-xs uppercase tracking-widest text-black/40">
                {isEscalating ? "Message to Admin" : "Submission Link / Details"} <span className="text-primary">*</span>
              </label>
              <textarea
                id="submission-input"
                rows={isEscalating ? 4 : 3}
                value={isEscalating ? escalateMessage : submissionUri}
                onChange={(e) => isEscalating ? setEscalateMessage(e.target.value) : setSubmissionUri(e.target.value)}
                placeholder={isEscalating ? "The client is rejecting my work unfairly..." : "https://github.com/..."}
                className="border-2 border-black bg-background px-4 py-3 font-bold text-sm text-black outline-none focus:border-primary placeholder:text-black/30 resize-none"
              />
            </div>

            <div className="flex items-center gap-3">
              {isEscalating ? (
                <button
                  onClick={handleEscalateSubmit}
                  disabled={processingEscalate}
                  className="brutalist-button flex-1 py-3 bg-[#FF4500] text-white border-black text-sm disabled:opacity-50"
                >
                  {processingEscalate ? "Escalating..." : "Submit Escalation"}
                </button>
              ) : (
                <button
                  onClick={handleConfirmSubmit}
                  className="brutalist-button flex-1 py-3 bg-black text-white border-black text-sm"
                >
                  Submit Delivery
                </button>
              )}
              <button
                onClick={() => {
                  setShowSubmitModal(false);
                  setSubmittingId(null);
                }}
                className="brutalist-button px-6 py-3 bg-white text-black border-black text-sm hover:bg-black/5"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
