"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useEscrow } from "@/app/lib/hooks/useEscrow";
import { useWallet } from "@/app/lib/wallet/context";
import { toast } from "sonner";
import { ForgeLoader } from "@/app/components/ForgeLoader";

type TaskStatus = "Open" | "In Progress" | "Completed" | "Disputed" | "Cancelled";

interface Task {
  id: string;
  title: string;
  amount: string;
  status: TaskStatus;
  worker: string | null;
  posted: string;
  difficulty: number;
}

const STATUS_STYLES: Record<TaskStatus, string> = {
  Open: "bg-[#4ADE80] text-black border-black",
  "In Progress": "bg-[#FFD700] text-black border-black",
  Completed: "bg-black text-white border-black",
  Disputed: "bg-[#FF4500] text-white border-black",
  Cancelled: "bg-gray-400 text-black border-black",
};

const DIFFICULTY_LABELS = ["", "Beginner", "Intermediate", "Advanced", "Expert"];

function TaskCard({ task, onCancel }: { task: Task; onCancel: (id: string) => void }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!task.worker) return;
    await navigator.clipboard.writeText(task.worker);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="brutalist-card bg-white p-6 flex flex-col gap-4 relative">
      {/* Difficulty tape */}
      <div
        className="brutalist-tape absolute -top-3 -left-2 text-[10px] px-2 py-0.5"
        style={{ transform: "rotate(-3deg)" }}
      >
        {DIFFICULTY_LABELS[task.difficulty] ?? "Unknown"}
      </div>

      {/* Header row */}
      <div className="flex items-start justify-between gap-3 pt-2">
        <div className="flex-1 min-w-0">
          <p className="font-black text-[10px] uppercase tracking-widest text-black/40 mb-1">
            Task #{task.id}
          </p>
          <h3 className="font-black text-lg uppercase leading-tight text-black truncate">
            {task.title}
          </h3>
        </div>
        <span
          className={`shrink-0 border-2 text-[10px] font-black uppercase px-2 py-1 ${STATUS_STYLES[task.status]}`}
        >
          {task.status}
        </span>
      </div>

      {/* Amount */}
      <div className="border-t-2 border-b-2 border-black/10 py-3 flex items-center justify-between">
        <p className="text-xs font-black uppercase tracking-widest text-black/50">Escrow Amount</p>
        <p className="font-black text-xl text-black tabular-nums">
          {task.amount}
          <span className="text-xs font-bold text-black/50 ml-1">SOL</span>
        </p>
      </div>

      {/* Worker */}
      {task.worker && task.worker !== "11111111111111111111111111111111" ? (
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-black/40 mb-1">
              Worker
            </p>
            <p className="font-mono text-xs text-black/70 truncate">{task.worker}</p>
          </div>
          <button
            id={`copy-worker-${task.id}`}
            onClick={handleCopy}
            className={`flex items-center gap-1.5 border-2 border-black px-3 py-1.5 text-xs font-black uppercase transition-all duration-150 shrink-0
              ${copied ? "bg-[#4ADE80] border-[#4ADE80] text-black scale-95" : "bg-white text-black hover:bg-black hover:text-white"}`}
            style={{ boxShadow: copied ? "none" : "2px 2px 0px 0px rgba(0,0,0,1)" }}
          >
            {copied ? (
              <>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                Copied
              </>
            ) : (
              <>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <rect x="9" y="9" width="13" height="13" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                </svg>
                Copy
              </>
            )}
          </button>
        </div>
      ) : (
        <p className="text-xs font-bold text-black/40 italic">No worker assigned yet</p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-2">
        <p className="text-[10px] font-bold text-black/40 uppercase tracking-widest">
          Posted {task.posted}
        </p>
        <div className="flex gap-2">
          {task.status === "Open" && (
            <button
              id={`cancel-task-${task.id}`}
              onClick={() => onCancel(task.id)}
              className="border-2 border-black px-3 py-1 text-xs font-black uppercase hover:bg-black hover:text-white transition-all disabled:opacity-50"
              style={{ boxShadow: "2px 2px 0px 0px rgba(0,0,0,1)" }}
            >
              Cancel
            </button>
          )}
          {task.status === "In Progress" && (
            <button
              id={`approve-task-${task.id}`}
              className="border-2 border-black bg-[#4ADE80] px-3 py-1 text-xs font-black uppercase hover:bg-black hover:text-white transition-all"
              style={{ boxShadow: "2px 2px 0px 0px rgba(0,0,0,1)" }}
            >
              Approve Work
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TasksPage() {
  const [filter, setFilter] = useState<TaskStatus | "All">("All");
  const [loading, setLoading] = useState(true);

  const { program, cancelTask } = useEscrow();
  const { wallet } = useWallet();
  const [tasks, setTasks] = useState<Task[]>([]);

  const fetchTasks = async () => {
    if (!program || !wallet) return;
    setLoading(true);
    try {
      const address = wallet.account.address;
      const allEscrows = await (program.account as any).escrowAccount.all();
      
      const myEscrows = allEscrows.filter(
        (e: any) => e.account.client.toBase58() === address
      );

      const mappedTasks: Task[] = myEscrows.map((e: any) => {
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
             worker: e.account.worker ? e.account.worker.toBase58() : null,
             posted: "Just now",
             difficulty: e.account.difficulty
          }
        });
        
        // Filter out cancelled tasks from the main dashboard view
        setTasks(mappedTasks.filter(t => t.status !== "Cancelled").reverse());
    } catch (err) {
      console.error("Failed to fetch on-chain tasks:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [program, wallet]);

  const handleCancel = async (taskId: string) => {
    const tid = toast.loading("Canceling task on-chain...");
    try {
      const signature = await cancelTask(parseInt(taskId));
      
      if (program?.provider?.connection) {
        // Wait for confirmation so the refresh actually shows the change
        await program.provider.connection.confirmTransaction(signature, "confirmed");
      }
      
      toast.success("Task cancelled successfully!", { id: tid });
      await fetchTasks();
    } catch (err: any) {
      console.error("Failed to cancel task:", err);
      toast.error("Cancel failed: " + (err.message || "Unknown error"), { id: tid });
    }
  };

  const filtered =
    filter === "All" ? tasks : tasks.filter((t) => t.status === filter);

  const filters: (TaskStatus | "All")[] = ["All", "Open", "In Progress", "Completed", "Disputed"];

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
        <div>
          <div
            className="brutalist-tape text-xs px-3 py-1 inline-block mb-3"
            style={{ transform: "rotate(-1deg)" }}
          >
            Client View
          </div>
          <h1 className="text-5xl md:text-6xl font-black uppercase leading-none text-black italic tracking-tighter">
            My Tasks
          </h1>
        </div>
        <Link
          href="/dashboard/tasks/new"
          id="tasks-post-new"
          className="brutalist-button px-8 py-3 bg-primary text-white border-black text-sm self-start"
        >
          Post New Task
        </Link>
      </div>

      {/* Filter strip */}
      <div className="flex flex-wrap gap-2 mb-8">
        {filters.map((f) => (
          <button
            key={f}
            id={`filter-${f.toLowerCase().replace(" ", "-")}`}
            onClick={() => setFilter(f)}
            className={`border-2 border-black px-4 py-1.5 text-xs font-black uppercase transition-all duration-100
              ${filter === f
                ? "bg-black text-white shadow-none translate-x-0.5 translate-y-0.5"
                : "bg-white text-black hover:bg-black hover:text-white"
              }`}
            style={{ boxShadow: filter === f ? "none" : "3px 3px 0px 0px rgba(0,0,0,1)" }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Task grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <ForgeLoader />
        </div>
      ) : filtered.length === 0 ? (
        <div className="brutalist-card bg-white p-16 text-center">
          <p className="font-black text-2xl uppercase text-black/30 mb-3">No tasks found</p>
          <p className="font-bold text-sm text-black/40">
            {filter === "All"
              ? "You haven't posted any tasks yet."
              : `No tasks with status "${filter}".`}
          </p>
          <Link
            href="/dashboard/tasks/new"
            className="brutalist-button inline-block mt-6 px-8 py-3 bg-primary text-white border-black text-sm"
          >
            Post Your First Task
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filtered.map((task) => (
            <TaskCard key={task.id} task={task} onCancel={handleCancel} />
          ))}
        </div>
      )}
    </div>
  );
}
