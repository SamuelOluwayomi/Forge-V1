"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useEscrow } from "@/app/lib/hooks/useEscrow";
import { useWallet } from "@/app/lib/wallet/context";
import { toast } from "sonner";
import Link from "next/link";

interface TaskDetail {
  pda: string;
  client: string;
  task_id: number;
  title: string;
  description: string;
  amount: number;
  difficulty: number;
  listing_deadline: string | null;
  contact_info: string | null;
  skills: string[];
  status: string;
  client_avatar: string | null;
  client_twitter: string | null;
}

interface Applicant {
  id: string;
  worker_address: string;
  applied_at: string;
  avatar_url: string | null;
  twitter: string | null;
  github: string | null;
  discord: string | null;
  rank: number;
  forge_score: number;
}

const DIFFICULTY_LABELS = ["", "Beginner", "Intermediate", "Advanced", "Expert"];
const DIFFICULTY_COLORS = ["", "#4ADE80", "#FFD700", "#FF8C00", "#FF4500"];

function CountdownTimer({ deadline }: { deadline: string }) {
  const [timeLeft, setTimeLeft] = useState("");
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    const update = () => {
      const now = new Date().getTime();
      const target = new Date(deadline).getTime();
      const diff = target - now;

      if (diff <= 0) {
        setExpired(true);
        setTimeLeft("EXPIRED");
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft(`${days}d ${hours}h ${mins}m ${secs}s`);
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [deadline]);

  return (
    <div className={`flex items-center gap-2 ${expired ? "text-red-500" : "text-black"}`}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
      </svg>
      <span className={`font-black text-sm tabular-nums ${expired ? "text-red-500" : ""}`}>
        {timeLeft}
      </span>
    </div>
  );
}

export default function TaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const pda = params.id as string;
  const { wallet } = useWallet();
  const address = wallet?.account.address;

  const [task, setTask] = useState<TaskDetail | null>(null);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [activeTab, setActiveTab] = useState<"details" | "applicants">("details");

  const hasApplied = applicants.some(a => a.worker_address === address);
  const isClient = task?.client === address;
  const isExpired = task?.listing_deadline ? new Date(task.listing_deadline) < new Date() : false;

  const fetchTask = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tasks/${pda}`);
      if (!res.ok) throw new Error("Task not found");
      const data = await res.json();
      setTask(data.task);
      setApplicants(data.applicants || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load task details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTask(); }, [pda]);

  const handleApply = async () => {
    if (!address) return toast.error("Connect your wallet first");
    setApplying(true);
    try {
      const res = await fetch(`/api/tasks/${pda}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ worker_address: address }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("You've accepted the challenge!");
      await fetchTask();
      setActiveTab("applicants");
    } catch (err: any) {
      toast.error(err.message || "Failed to apply");
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-4xl">
        <div className="brutalist-card bg-white p-12 animate-pulse h-96" />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="w-full max-w-4xl">
        <div className="brutalist-card bg-white p-12 text-center">
          <h2 className="text-3xl font-black uppercase text-black/20">Task Not Found</h2>
          <Link href="/dashboard/browse" className="brutalist-button mt-4 inline-block px-6 py-2 text-sm">
            Back to Marketplace
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl">
      {/* Back link */}
      <Link href="/dashboard/browse" className="inline-flex items-center gap-2 font-black text-xs uppercase tracking-widest text-black/50 hover:text-primary mb-6 transition-colors">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5m0 0l7 7m-7-7l7-7"/></svg>
        Back to Marketplace
      </Link>

      {/* Header Card */}
      <div className="brutalist-card bg-primary p-8 mb-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 mix-blend-overlay pointer-events-none" 
             style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} />
        
        <div className="relative z-10 flex items-start gap-6">
          {/* Client Avatar */}
          <div className="w-20 h-20 bg-white border-[3px] border-black shrink-0 overflow-hidden">
            {task.client_avatar ? (
              <img src={task.client_avatar} alt="Client" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center font-black text-3xl text-black/10">?</div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-black text-white px-2 py-0.5 text-[10px] font-black uppercase border border-black">
                {DIFFICULTY_LABELS[task.difficulty]}
              </span>
              {task.listing_deadline && (
                <CountdownTimer deadline={task.listing_deadline} />
              )}
            </div>
            <h1 className="text-3xl md:text-4xl font-black uppercase leading-tight text-black italic">
              {task.title}
            </h1>
            <div className="flex items-center gap-3 mt-3">
              <span className="font-mono text-xs text-black/60 truncate max-w-[200px]">{task.client}</span>
              {task.client_twitter && (
                <a href={`https://x.com/${task.client_twitter.replace("@","")}`} target="_blank" className="text-black/40 hover:text-black transition-colors">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                </a>
              )}
            </div>
          </div>

          {/* Amount Badge */}
          <div className="bg-black text-white px-4 py-3 border-2 border-black flex flex-col items-end shrink-0" style={{ transform: "rotate(2deg)" }}>
            <span className="text-[10px] font-black uppercase tracking-widest text-primary leading-none mb-1">Reward</span>
            <span className="font-black text-3xl leading-none">{task.amount}</span>
            <span className="text-[10px] font-black text-white/60 uppercase">SOL</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab("details")}
          className={`px-5 py-2 text-xs font-black uppercase border-2 border-black transition-all ${
            activeTab === "details" ? "bg-black text-white" : "bg-white text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
          }`}
        >
          Task Details
        </button>
        <button
          onClick={() => setActiveTab("applicants")}
          className={`px-5 py-2 text-xs font-black uppercase border-2 border-black transition-all flex items-center gap-2 ${
            activeTab === "applicants" ? "bg-black text-white" : "bg-white text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
          }`}
        >
          Applicants
          <span className={`px-2 py-0.5 text-[10px] font-black border ${
            activeTab === "applicants" ? "bg-primary text-white border-primary" : "bg-black/10 text-black border-black/20"
          }`}>
            {applicants.length}
          </span>
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "details" ? (
        <div className="space-y-6">
          {/* Description */}
          <div className="brutalist-card bg-white p-6">
            <h3 className="font-black text-sm uppercase tracking-widest text-black/40 mb-4">Description</h3>
            <div className="prose prose-sm max-w-none">
              <p className="font-bold text-sm text-black/80 whitespace-pre-wrap leading-relaxed">{task.description}</p>
            </div>
          </div>

          {/* Skills Tags */}
          {task.skills && task.skills.length > 0 && (
            <div className="brutalist-card bg-white p-6">
              <h3 className="font-black text-sm uppercase tracking-widest text-black/40 mb-4">Required Skills</h3>
              <div className="flex flex-wrap gap-2">
                {task.skills.map((skill, i) => (
                  <span key={i} className="px-3 py-1 bg-black/5 border-2 border-black text-xs font-black uppercase">{skill}</span>
                ))}
              </div>
            </div>
          )}

          {/* Important Notice */}
          <div className="bg-[#FFD700] border-4 border-black p-6">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-black flex items-center justify-center shrink-0 border-2 border-black">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                  <path d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="font-black text-sm uppercase mb-1">This is NOT a bounty</p>
                <p className="text-xs font-bold text-black/70 leading-relaxed">
                  Only <span className="font-black">ONE developer</span> will be selected to work on this task. 
                  Accept the challenge to show the client you are interested. 
                  The client will review all applicants and pick the best fit. 
                  Only the selected developer will build and get paid.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Applicants Tab */
        <div className="space-y-4">
          {applicants.length === 0 ? (
            <div className="brutalist-card bg-white p-12 text-center border-dashed">
              <h3 className="text-2xl font-black uppercase text-black/20">No Applicants Yet</h3>
              <p className="text-sm font-bold text-black/40 mt-2">Be the first to accept this challenge!</p>
            </div>
          ) : (
            applicants.map((applicant) => (
              <div key={applicant.id} className="brutalist-card bg-white p-5 flex items-center gap-4">
                {/* Avatar */}
                <div className="w-14 h-14 bg-background border-[3px] border-black shrink-0 overflow-hidden">
                  {applicant.avatar_url ? (
                    <img src={applicant.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-black text-xl text-black/10">?</div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-xs text-black/60 truncate">{applicant.worker_address}</p>
                  <div className="flex items-center gap-3 mt-1">
                    {applicant.rank > 0 && (
                      <span className="bg-[#FFD700] text-black px-2 py-0.5 text-[10px] font-black border border-black">
                        RANK #{applicant.rank}
                      </span>
                    )}
                    <span className="text-[10px] font-black text-black/40 uppercase">
                      Score: {applicant.forge_score}
                    </span>
                  </div>
                  {/* Socials */}
                  <div className="flex items-center gap-2 mt-2">
                    {applicant.twitter && (
                      <a href={`https://x.com/${applicant.twitter.replace("@","")}`} target="_blank" className="text-black/30 hover:text-black transition-colors" title={applicant.twitter}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                      </a>
                    )}
                    {applicant.github && (
                      <a href={`https://github.com/${applicant.github}`} target="_blank" className="text-black/30 hover:text-black transition-colors" title={applicant.github}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.2 11.4.6.1.82-.26.82-.58v-2.03c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.08-.74.08-.73.08-.73 1.2.08 1.84 1.23 1.84 1.23 1.07 1.83 2.8 1.3 3.49 1 .1-.78.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.14-.3-.54-1.52.1-3.18 0 0 1-.32 3.3 1.23a11.5 11.5 0 016.02 0c2.28-1.55 3.29-1.23 3.29-1.23.64 1.66.24 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.8 5.63-5.48 5.92.42.36.81 1.1.81 2.22v3.29c0 .32.22.7.82.58A12.01 12.01 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
                      </a>
                    )}
                    {applicant.discord && (
                      <span className="text-[10px] font-bold text-black/30" title="Discord">{applicant.discord}</span>
                    )}
                  </div>
                </div>

                {/* Applied timestamp */}
                <div className="text-right shrink-0">
                  <p className="text-[10px] font-black text-black/30 uppercase">Applied</p>
                  <p className="text-xs font-bold text-black/50">
                    {new Date(applicant.applied_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Action Bar (sticky bottom) */}
      <div className="mt-8 brutalist-card bg-white p-6 flex items-center justify-between gap-4">
        <div>
          {isExpired ? (
            <p className="text-xs font-black uppercase text-red-500">Listing Expired — Applications Closed</p>
          ) : (
            <p className="text-xs font-bold text-black/40">
              {applicants.length} developer{applicants.length !== 1 ? "s" : ""} interested
            </p>
          )}
        </div>
        
        {!isClient && !isExpired && (
          <button
            onClick={handleApply}
            disabled={applying || hasApplied}
            className={`brutalist-button px-8 py-3 text-sm ${
              hasApplied 
                ? "bg-[#4ADE80] text-black border-black cursor-default" 
                : "bg-primary text-white border-black disabled:opacity-50"
            }`}
          >
            {applying ? "Submitting..." : hasApplied ? "✓ Challenge Accepted" : "Accept Challenge"}
          </button>
        )}

        {isClient && (
          <Link href="/dashboard/tasks" className="brutalist-button px-8 py-3 text-sm bg-black text-white border-black">
            Manage in My Tasks
          </Link>
        )}
      </div>
    </div>
  );
}
