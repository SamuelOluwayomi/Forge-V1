"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useEscrow } from "@/app/lib/hooks/useEscrow";
import { useWallet } from "@/app/lib/wallet/context";
import { toast } from "sonner";

type TaskStatus = "Open" | "In Progress" | "Completed" | "Disputed";

interface Task {
  id: string;
  title: string;
  amount: string;
  status: TaskStatus;
  worker: string | null;
  posted: string;
  difficulty: number;
  client: string;
}

const STATUS_STYLES: Record<string, string> = {
  Open: "bg-[#4ADE80] text-black border-black",
  "In Progress": "bg-[#FFD700] text-black border-black",
  Completed: "bg-black text-white border-black",
  Disputed: "bg-[#FF4500] text-white border-black",
};

const DIFFICULTY_LABELS = ["", "Beginner", "Intermediate", "Advanced", "Expert"];

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
      
      const mappedTasks: Task[] = allEscrows.map((e: any) => {
        const stateKeys = Object.keys(e.account.status);
        let status = "Open";
        if (stateKeys.includes("active")) status = "In Progress";
        if (stateKeys.includes("submitted")) status = "In Progress";
        if (stateKeys.includes("completed")) status = "Completed";
        if (stateKeys.includes("disputed")) status = "Disputed";
        if (stateKeys.includes("cancelled")) status = "Cancelled";
        
        return {
           id: e.account.taskId.toString(),
           title: "On-Chain Task",
           amount: (Number(e.account.amount) / 1_000_000_000).toString(),
           status: status as TaskStatus,
           worker: e.account.worker && e.account.worker.toBase58() !== "11111111111111111111111111111111" ? e.account.worker.toBase58() : null,
           posted: "Just now",
           difficulty: e.account.difficulty,
           client: e.account.client.toBase58()
        }
      });
      
      // For browsing, we primarily want "Open" tasks that aren't ours
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
            <div key={i} className="brutalist-card bg-white p-6 animate-pulse h-48" />
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
            <div key={task.id} className="brutalist-card bg-white p-6 relative group overflow-hidden">
              {/* Diff tag */}
              <div className="absolute -top-1 -left-1 bg-primary text-white border-2 border-black px-3 py-0.5 text-[10px] font-black uppercase rotate-[-2deg] z-10">
                {DIFFICULTY_LABELS[task.difficulty] || "General"}
              </div>

              <div className="flex justify-between items-start mb-4 mt-2">
                <div>
                  <p className="text-[10px] font-black text-black/30 uppercase tracking-widest">Task #{task.id}</p>
                  <h3 className="text-2xl font-black uppercase leading-tight text-black group-hover:text-primary transition-colors italic">
                    {task.title}
                  </h3>
                </div>
                <div className={`px-2 py-0.5 text-[10px] font-black uppercase border-2 ${STATUS_STYLES[task.status]}`}>
                  {task.status}
                </div>
              </div>

              <div className="space-y-4 mb-6">
                <div className="flex justify-between items-end border-b-2 border-black/5 pb-2">
                  <span className="text-xs font-black uppercase text-black/40">Escrow Amount</span>
                  <span className="text-xl font-black text-black">{task.amount} <span className="text-xs">SOL</span></span>
                </div>
                
                <div className="flex justify-between items-center text-xs">
                  <span className="font-black uppercase text-black/40">Posted By</span>
                  <span className="font-mono text-black/60 truncate max-w-[120px]">{task.client}</span>
                </div>
              </div>

              <div className="flex gap-3">
                {task.status === "Open" && task.client !== address ? (
                  <button 
                    onClick={() => toast.info("Application system coming soon! For now, contact the client directly.")}
                    className="flex-1 bg-black text-white border-2 border-black py-2 font-black text-xs uppercase tracking-widest hover:bg-primary hover:text-black transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1"
                  >
                    View Details
                  </button>
                ) : (
                  <button 
                    disabled
                    className="flex-1 bg-white border-2 border-black/20 text-black/30 py-2 font-black text-xs uppercase tracking-widest cursor-not-allowed"
                  >
                    {task.client === address ? "Your Task" : "In Progress"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
