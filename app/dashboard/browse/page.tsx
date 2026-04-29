"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useEscrow } from "@/app/lib/hooks/useEscrow";
import { useWallet } from "@/app/lib/wallet/context";
import { supabase } from "@/app/lib/supabase";
import { SkeletonLoader } from "@/app/components/ForgeLoader";

type TaskStatus = "Open" | "In Progress" | "Completed" | "Disputed";

interface Task {
  id: string;
  title: string;
  description: string;
  amount: string;
  status: TaskStatus;
  worker: string | null;
  posted: string;
  difficulty: number;
  client: string;
  client_avatar: string | null;
  pda: string;
  listing_deadline: string | null;
  applicant_count: number;
  task_type: "challenge" | "bounty";
}

const STATUS_STYLES: Record<string, string> = {
  Open: "bg-[#4ADE80] text-black border-black",
  "In Progress": "bg-[#FFD700] text-black border-black",
  Completed: "bg-black text-white border-black",
  Disputed: "bg-[#FF4500] text-white border-black",
};

const DIFFICULTY_LABELS = ["", "Beginner", "Intermediate", "Advanced", "Expert"];

function CountdownBadge({ deadline }: { deadline: string }) {
  const [label, setLabel] = useState("");
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    const update = () => {
      const diff = new Date(deadline).getTime() - Date.now();
      if (diff <= 0) { setExpired(true); setLabel("EXPIRED"); return; }
      const d = Math.floor(diff / (1000*60*60*24));
      const h = Math.floor((diff % (1000*60*60*24)) / (1000*60*60));
      if (d > 0) setLabel(`${d}d ${h}h left`);
      else setLabel(`${h}h left`);
    };
    update();
    const i = setInterval(update, 60000);
    return () => clearInterval(i);
  }, [deadline]);

  return (
    <span className={`text-[10px] font-black uppercase flex items-center gap-1 ${expired ? "text-red-500" : "text-black/40"}`}>
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
      </svg>
      {label}
    </span>
  );
}

export default function BrowseTasksPage() {
  const { program } = useEscrow();
  const { wallet } = useWallet();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<TaskStatus | "All">("All");

  const address = wallet?.account.address;

  const fetchAllTasks = async () => {
    if (!program) return;
    setLoading(true);
    try {
      const allEscrows = await (program.account as any).escrowAccount.all();
      
      // Get enriched data from Supabase
      const pdas = allEscrows.map((e: any) => e.publicKey.toBase58());
      let dbTasks: any[] = [];
      let applicantCounts: Record<string, number> = {};

      if (supabase && pdas.length > 0) {
        const { data: taskData } = await supabase
          .from("tasks")
          .select("pda, title, description, listing_deadline, client, task_type")
          .in("pda", pdas);
        dbTasks = taskData || [];

        // Get applicant counts
        const { data: appData } = await supabase
          .from("task_applicants")
          .select("task_pda")
          .in("task_pda", pdas);
        
        (appData || []).forEach((a: any) => {
          applicantCounts[a.task_pda] = (applicantCounts[a.task_pda] || 0) + 1;
        });

        // Get client avatars
        const clientAddresses = [...new Set(allEscrows.map((e: any) => e.account.client.toBase58()))];
        var clientAvatars: Record<string, string> = {};
        if (clientAddresses.length > 0) {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("wallet_address, avatar_url")
            .in("wallet_address", clientAddresses);
          (profileData || []).forEach((p: any) => {
            if (p.avatar_url) clientAvatars[p.wallet_address] = p.avatar_url;
          });
        }
      }

      const mappedTasks: Task[] = allEscrows.map((e: any) => {
        const stateKeys = Object.keys(e.account.status);
        let status = "Open";
        if (stateKeys.includes("active")) status = "In Progress";
        if (stateKeys.includes("submitted")) status = "In Progress";
        if (stateKeys.includes("completed")) status = "Completed";
        if (stateKeys.includes("disputed")) status = "Disputed";
        if (stateKeys.includes("cancelled")) status = "Cancelled";

        const pdaStr = e.publicKey.toBase58();
        const dbTask = dbTasks.find((t: any) => t.pda === pdaStr);
        const clientAddr = e.account.client.toBase58();
        
        return {
          id: e.account.taskId.toString(),
          pda: pdaStr,
          title: dbTask?.title || "On-Chain Task",
          description: dbTask?.description || "",
          amount: (Number(e.account.amount) / 1_000_000_000).toString(),
          status: status as TaskStatus,
          worker: e.account.worker && e.account.worker.toBase58() !== "11111111111111111111111111111111" ? e.account.worker.toBase58() : null,
          posted: "Just now",
          difficulty: e.account.difficulty,
          client: clientAddr,
          client_avatar: clientAvatars?.[clientAddr] || null,
          listing_deadline: dbTask?.listing_deadline || null,
          applicant_count: applicantCounts[pdaStr] || 0,
          task_type: dbTask?.task_type || "challenge",
        };
      });
      
      setTasks(mappedTasks.filter(t => (t.status as any) !== "Cancelled").reverse());
    } catch (err) {
      console.error("Failed to fetch tasks:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllTasks();
  }, [program]);

  const filtered = filter === "All" ? tasks : tasks.filter((t) => t.status === filter);

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="brutalist-tape text-xs px-3 py-1 inline-block mb-3" style={{ transform: "rotate(-1deg)" }}>
            Marketplace
          </div>
          <h1 className="text-5xl md:text-6xl font-black uppercase leading-none text-black italic tracking-tighter">
            Browse Tasks
          </h1>
          <p className="font-bold text-sm text-black/50 mt-2">
            Accept challenges. Only the selected developer gets paid.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-8">
        {["All", "Open", "In Progress", "Completed"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f as any)}
            className={`px-4 py-1 text-xs font-black uppercase border-2 border-black transition-all ${
              filter === f ? "bg-black text-white translate-x-1 translate-y-1 shadow-none" : "bg-white text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <SkeletonLoader key={i} className="h-56" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="brutalist-card bg-white p-12 text-center border-dashed">
          <h2 className="text-2xl font-black uppercase text-black/20">No Tasks Found</h2>
          <p className="text-sm font-bold text-black/40 mt-2">Try changing your filters or check back later.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filtered.map((task) => (
            <div key={task.id} className="brutalist-card bg-white p-6 relative group overflow-hidden flex flex-col">
              {/* Diff tag */}
              <div className="absolute -top-1 -left-1 bg-primary text-white border-2 border-black px-3 py-0.5 text-[10px] font-black uppercase rotate-[-2deg] z-10">
                {DIFFICULTY_LABELS[task.difficulty] || "General"}
              </div>
              {/* Task type badge */}
              <div className={`absolute -top-1 -right-1 border-2 border-black px-3 py-0.5 text-[10px] font-black uppercase rotate-[2deg] z-10 ${
                task.task_type === "bounty" ? "bg-[#FFD700] text-black" : "bg-black text-white"
              }`}>
                {task.task_type === "bounty" ? "★ Bounty" : "Challenge"}
              </div>

              <div className="flex justify-between items-start mb-4 mt-2">
                <div className="flex items-start gap-3">
                  {/* Client avatar */}
                  <div className="w-10 h-10 bg-background border-2 border-black shrink-0 overflow-hidden">
                    {task.client_avatar ? (
                      <img src={task.client_avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-black text-sm text-black/10">?</div>
                    )}
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-black/30 uppercase tracking-widest">Task #{task.id}</p>
                    <h3 className="text-xl font-black uppercase leading-tight text-black group-hover:text-primary transition-colors italic">
                      {task.title}
                    </h3>
                  </div>
                </div>
                <div className={`px-2 py-0.5 text-[10px] font-black uppercase border-2 ${STATUS_STYLES[task.status]}`}>
                  {task.status}
                </div>
              </div>

              {task.description && (
                <p className="text-xs font-bold text-black/50 mb-4 line-clamp-2 leading-relaxed">{task.description}</p>
              )}

              <div className="space-y-3 mb-6 flex-1">
                <div className="flex justify-between items-end border-b-2 border-black/5 pb-2">
                  <span className="text-xs font-black uppercase text-black/40">Escrow Amount</span>
                  <span className="text-xl font-black text-black">{task.amount} <span className="text-xs">SOL</span></span>
                </div>
                
                <div className="flex justify-between items-center text-xs">
                  <span className="font-black uppercase text-black/40">
                    {task.applicant_count} Applicant{task.applicant_count !== 1 ? "s" : ""}
                  </span>
                  {task.listing_deadline && (
                    <CountdownBadge deadline={task.listing_deadline} />
                  )}
                </div>
              </div>

              <Link
                href={`/dashboard/browse/${task.pda}`}
                className={`w-full text-center py-2.5 font-black text-xs uppercase tracking-widest border-2 border-black transition-all block ${
                  task.client === address
                    ? "bg-white text-black/30 cursor-default"
                    : "bg-black text-white hover:bg-primary hover:text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1"
                }`}
              >
                {task.client === address ? "Your Task" : "View Details"}
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
