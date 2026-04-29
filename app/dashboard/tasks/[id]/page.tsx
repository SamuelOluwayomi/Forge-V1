"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useEscrow } from "@/app/lib/hooks/useEscrow";
import { useWallet } from "@/app/lib/wallet/context";
import { toast } from "sonner";
import Link from "next/link";
import { ForgeLoader } from "@/app/components/ForgeLoader";
import { PublicKey } from "@solana/web3.js";

interface TaskDetail {
  pda: string;
  client: string;
  title: string;
  description: string;
  amount: number;
  difficulty: number;
  listing_deadline: string | null;
  status: string;
  task_type: string;
  contact_info: string | null;
  skills: string[];
}

interface Applicant {
  id: string;
  worker_address: string;
  applied_at: string;
  avatar_url: string | null;
  twitter: string | null;
  github: string | null;
  discord: string | null;
  telegram: string | null;
  rank: number;
  forge_score: number;
}

const DIFFICULTY_LABELS = ["", "Beginner", "Intermediate", "Advanced", "Expert"];

// ── Applicant Profile Modal ──
function ApplicantModal({ applicant, onClose, onAccept, accepting }: {
  applicant: Applicant;
  onClose: () => void;
  onAccept: (addr: string) => void;
  accepting: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" />
      
      {/* Modal */}
      <div
        className="relative bg-white border-4 border-black w-full max-w-md"
        style={{ boxShadow: "8px 8px 0px 0px rgba(0,0,0,1)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button onClick={onClose} className="absolute top-3 right-3 w-8 h-8 bg-black text-white flex items-center justify-center font-black text-sm hover:bg-primary transition-colors z-10">
          ✕
        </button>

        {/* Header */}
        <div className="bg-primary p-6 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 mix-blend-overlay pointer-events-none"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }} />
          <div className="relative z-10 flex items-center gap-4">
            <div className="w-20 h-20 bg-white border-[3px] border-black shrink-0 overflow-hidden">
              {applicant.avatar_url ? (
                <img src={applicant.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-black text-3xl text-black/10">?</div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-mono text-[10px] text-black/60 truncate">{applicant.worker_address}</p>
              <div className="flex items-center gap-2 mt-2">
                {applicant.rank > 0 && (
                  <span className="bg-[#FFD700] text-black px-2 py-0.5 text-[10px] font-black border border-black">
                    RANK #{applicant.rank}
                  </span>
                )}
                <span className="bg-black text-white px-2 py-0.5 text-[10px] font-black border border-black">
                  SCORE {applicant.forge_score}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Socials */}
          <div>
            <h4 className="font-black text-[10px] uppercase tracking-widest text-black/40 mb-2">Social Accounts</h4>
            <div className="flex flex-wrap gap-2">
              {applicant.twitter && (
                <a href={`https://x.com/${applicant.twitter.replace("@","")}`} target="_blank"
                  className="flex items-center gap-1.5 border-2 border-black px-3 py-1.5 text-xs font-black uppercase hover:bg-black hover:text-white transition-all"
                  style={{ boxShadow: "2px 2px 0px 0px rgba(0,0,0,1)" }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                  {applicant.twitter}
                </a>
              )}
              {applicant.github && (
                <a href={`https://github.com/${applicant.github}`} target="_blank"
                  className="flex items-center gap-1.5 border-2 border-black px-3 py-1.5 text-xs font-black uppercase hover:bg-black hover:text-white transition-all"
                  style={{ boxShadow: "2px 2px 0px 0px rgba(0,0,0,1)" }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.2 11.4.6.1.82-.26.82-.58v-2.03c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.08-.74.08-.73.08-.73 1.2.08 1.84 1.23 1.84 1.23 1.07 1.83 2.8 1.3 3.49 1 .1-.78.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.14-.3-.54-1.52.1-3.18 0 0 1-.32 3.3 1.23a11.5 11.5 0 016.02 0c2.28-1.55 3.29-1.23 3.29-1.23.64 1.66.24 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.8 5.63-5.48 5.92.42.36.81 1.1.81 2.22v3.29c0 .32.22.7.82.58A12.01 12.01 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
                  {applicant.github}
                </a>
              )}
              {applicant.discord && (
                <span className="flex items-center gap-1.5 border-2 border-black px-3 py-1.5 text-xs font-bold bg-black/5">
                  Discord: {applicant.discord}
                </span>
              )}
              {applicant.telegram && (
                <a href={`https://t.me/${applicant.telegram.replace("@","")}`} target="_blank"
                  className="flex items-center gap-1.5 border-2 border-black px-3 py-1.5 text-xs font-black uppercase hover:bg-black hover:text-white transition-all"
                  style={{ boxShadow: "2px 2px 0px 0px rgba(0,0,0,1)" }}>
                  Telegram: {applicant.telegram}
                </a>
              )}
              {!applicant.twitter && !applicant.github && !applicant.discord && !applicant.telegram && (
                <p className="text-xs font-bold text-black/40 italic">No social accounts linked</p>
              )}
            </div>
          </div>

          {/* Applied date */}
          <div className="border-t-2 border-black/10 pt-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-black/40">Applied</p>
              <p className="text-sm font-bold text-black">{new Date(applicant.applied_at).toLocaleDateString()}</p>
            </div>
          </div>

          {/* Accept Button */}
          <button
            onClick={() => onAccept(applicant.worker_address)}
            disabled={accepting}
            className="brutalist-button w-full py-3 text-sm bg-[#4ADE80] text-black border-black disabled:opacity-50"
          >
            {accepting ? "Processing On-Chain..." : "Accept This Developer"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ManageTaskPage() {
  const params = useParams();
  const router = useRouter();
  const pda = params.id as string;
  const { wallet } = useWallet();
  const address = wallet?.account.address;
  const { program, acceptWorker } = useEscrow();

  const [task, setTask] = useState<TaskDetail | null>(null);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(null);
  const [onChainTaskId, setOnChainTaskId] = useState<number | null>(null);

  const fetchTask = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tasks/${pda}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setTask(data.task);
      setApplicants(data.applicants || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load task");
    } finally {
      setLoading(false);
    }
  };

  // Get on-chain task ID for the accept_worker instruction
  useEffect(() => {
    if (!program || !pda) return;
    const fetchOnChain = async () => {
      try {
        const escrowPubkey = new PublicKey(pda);
        const data = await (program.account as any).escrowAccount.fetch(escrowPubkey);
        setOnChainTaskId(Number(data.taskId));
      } catch (err) {
        console.error("Could not fetch on-chain escrow:", err);
      }
    };
    fetchOnChain();
  }, [program, pda]);

  useEffect(() => { fetchTask(); }, [pda]);

  const handleAccept = async (workerAddress: string) => {
    if (!program || !address || onChainTaskId === null) {
      toast.error("Wallet or program not ready");
      return;
    }
    setAccepting(true);
    const tid = toast.loading("Accepting worker on-chain...");
    try {
      const workerPubkey = new PublicKey(workerAddress);
      const sig = await acceptWorker(onChainTaskId, workerPubkey);
      
      if (program?.provider?.connection) {
        await program.provider.connection.confirmTransaction(sig, "confirmed");
      }

      // Update DB status
      try {
        await fetch(`/api/tasks/${pda}/accept`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ worker_address: workerAddress }),
        });
      } catch (_) { /* non-critical */ }

      toast.success("Worker accepted! They can now begin working.", { id: tid });
      setSelectedApplicant(null);
      await fetchTask();
    } catch (err: any) {
      console.error("Accept failed:", err);
      toast.error("Failed: " + (err.message || "Unknown error"), { id: tid });
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full flex items-center justify-center min-h-[60vh]">
        <ForgeLoader />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="w-full max-w-4xl">
        <div className="brutalist-card bg-white p-12 text-center">
          <h2 className="text-3xl font-black uppercase text-black/20">Task Not Found</h2>
          <Link href="/dashboard/tasks" className="brutalist-button mt-4 inline-block px-6 py-2 text-sm">
            Back to My Tasks
          </Link>
        </div>
      </div>
    );
  }

  const isOwner = task.client === address;

  return (
    <div className="w-full max-w-4xl">
      {/* Applicant Profile Modal */}
      {selectedApplicant && (
        <ApplicantModal
          applicant={selectedApplicant}
          onClose={() => setSelectedApplicant(null)}
          onAccept={handleAccept}
          accepting={accepting}
        />
      )}

      {/* Back link */}
      <Link href="/dashboard/tasks" className="inline-flex items-center gap-2 font-black text-xs uppercase tracking-widest text-black/50 hover:text-primary mb-6 transition-colors">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5m0 0l7 7m-7-7l7-7"/></svg>
        Back to My Tasks
      </Link>

      {/* Task Header */}
      <div className="brutalist-card bg-primary p-8 mb-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 mix-blend-overlay pointer-events-none"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }} />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-black text-white px-2 py-0.5 text-[10px] font-black uppercase border border-black">
              {DIFFICULTY_LABELS[task.difficulty]}
            </span>
            <span className="bg-white text-black px-2 py-0.5 text-[10px] font-black uppercase border border-black">
              {task.task_type === "bounty" ? "Bounty" : "Challenge"}
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black uppercase leading-tight text-black italic">
            {task.title}
          </h1>
          <div className="flex items-center gap-4 mt-3">
            <div className="bg-black text-white px-3 py-1 border-2 border-black">
              <span className="font-black text-xl">{task.amount}</span>
              <span className="text-[10px] font-black text-white/60 ml-1">SOL</span>
            </div>
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="brutalist-card bg-white p-6 mb-6">
        <h3 className="font-black text-sm uppercase tracking-widest text-black/40 mb-3">Description</h3>
        <p className="font-bold text-sm text-black/80 whitespace-pre-wrap leading-relaxed">{task.description}</p>
        {task.skills && task.skills.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {task.skills.map((s, i) => (
              <span key={i} className="px-3 py-1 bg-black/5 border-2 border-black text-xs font-black uppercase">{s}</span>
            ))}
          </div>
        )}
      </div>

      {/* Applicants Section */}
      <div className="brutalist-card bg-white p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-black text-xl uppercase tracking-tight">
            Applicants
          </h2>
          <span className="bg-primary text-white px-3 py-1 border-2 border-black text-xs font-black">
            {applicants.length} TOTAL
          </span>
        </div>

        {applicants.length === 0 ? (
          <div className="border-2 border-dashed border-black/20 p-10 text-center">
            <p className="font-black text-black/30 uppercase text-sm">No applicants yet</p>
            <p className="font-bold text-xs text-black/30 mt-2">Share your task to attract developers.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {applicants.map((applicant) => (
              <button
                key={applicant.id}
                onClick={() => setSelectedApplicant(applicant)}
                className="w-full text-left border-2 border-black p-4 flex items-center gap-4 hover:bg-black/5 transition-colors group"
                style={{ boxShadow: "3px 3px 0px 0px rgba(0,0,0,1)" }}
              >
                {/* Avatar */}
                <div className="w-12 h-12 bg-background border-[3px] border-black shrink-0 overflow-hidden">
                  {applicant.avatar_url ? (
                    <img src={applicant.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-black text-xl text-black/10">?</div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-xs text-black/60 truncate">{applicant.worker_address}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {applicant.rank > 0 && (
                      <span className="bg-[#FFD700] text-black px-2 py-0.5 text-[10px] font-black border border-black">
                        RANK #{applicant.rank}
                      </span>
                    )}
                    <span className="text-[10px] font-black text-black/40 uppercase">
                      Score: {applicant.forge_score}
                    </span>
                    {applicant.twitter && (
                      <span className="text-[10px] font-bold text-black/30">{applicant.twitter}</span>
                    )}
                  </div>
                </div>

                {/* View prompt */}
                <div className="shrink-0 flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase text-black/30 group-hover:text-primary transition-colors">
                    View Profile
                  </span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-black/30 group-hover:text-primary transition-colors">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
