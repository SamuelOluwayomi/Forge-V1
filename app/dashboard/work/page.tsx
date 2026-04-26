"use client";

import { useState } from "react";

type WorkStatus = "In Progress" | "Submitted" | "Approved" | "Disputed";

interface WorkItem {
  id: string;
  title: string;
  client: string;
  amount: string;
  status: WorkStatus;
  submittedAt: string | null;
  deadline: string;
}

const STATUS_STYLES: Record<WorkStatus, string> = {
  "In Progress": "bg-[#FFD700] text-black border-black",
  Submitted: "bg-[#60A5FA] text-black border-black",
  Approved: "bg-[#4ADE80] text-black border-black",
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
            <rect x="9" y="9" width="13" height="13" />
            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
          </svg>
          Copy
        </>
      )}
    </button>
  );
}

function WorkCard({ item }: { item: WorkItem }) {
  return (
    <div className="brutalist-card bg-white p-6 flex flex-col gap-4 relative">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-black text-[10px] uppercase tracking-widest text-black/40 mb-1">Work #{item.id}</p>
          <h3 className="font-black text-lg uppercase leading-tight text-black truncate">{item.title}</h3>
        </div>
        <span className={`shrink-0 border-2 text-[10px] font-black uppercase px-2 py-1 ${STATUS_STYLES[item.status]}`}>
          {item.status}
        </span>
      </div>

      <div className="border-t-2 border-b-2 border-black/10 py-3 flex items-center justify-between">
        <p className="text-xs font-black uppercase tracking-widest text-black/50">Reward</p>
        <p className="font-black text-xl text-black tabular-nums">
          {item.amount}<span className="text-xs font-bold text-black/50 ml-1">USDC</span>
        </p>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-black uppercase tracking-widest text-black/40 mb-1">Client</p>
          <p className="font-mono text-xs text-black/70 truncate">{item.client}</p>
        </div>
        <CopyButton text={item.client} id={`copy-client-${item.id}`} />
      </div>

      <div className="flex gap-6">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-black/40">Deadline</p>
          <p className="font-bold text-xs text-black">{item.deadline}</p>
        </div>
        {item.submittedAt && (
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-black/40">Submitted</p>
            <p className="font-bold text-xs text-black">{item.submittedAt}</p>
          </div>
        )}
      </div>

      {item.status === "In Progress" && (
        <button
          id={`submit-work-${item.id}`}
          className="brutalist-button w-full py-2.5 text-sm bg-primary text-white border-black"
        >
          Submit Work
        </button>
      )}
    </div>
  );
}

export default function WorkPage() {
  const [filter, setFilter] = useState<WorkStatus | "All">("All");
  const jobs: WorkItem[] = [];
  const filtered = filter === "All" ? jobs : jobs.filter((j) => j.status === filter);
  const filters: (WorkStatus | "All")[] = ["All", "In Progress", "Submitted", "Approved", "Disputed"];

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

      {filtered.length === 0 ? (
        <div className="brutalist-card bg-white p-16 text-center">
          <p className="font-black text-2xl uppercase text-black/30 mb-3">No work found</p>
          <p className="font-bold text-sm text-black/40">
            {filter === "All" ? "You have not been assigned any work yet." : `No work with status "${filter}".`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filtered.map((item) => <WorkCard key={item.id} item={item} />)}
        </div>
      )}
    </div>
  );
}
