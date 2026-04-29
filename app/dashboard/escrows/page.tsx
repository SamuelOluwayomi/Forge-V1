"use client";

import { useState, useEffect } from "react";
import { useEscrow } from "@/app/lib/hooks/useEscrow";
import { useWallet } from "@/app/lib/wallet/context";

type EscrowStatus = "Funded" | "In Progress" | "Submitted" | "Completed" | "Disputed";

interface Escrow {
  id: string;
  role: "Client" | "Worker";
  counterparty: string;
  amount: string;
  status: EscrowStatus;
  taskTitle: string;
  createdAt: string;
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

function EscrowCard({ escrow }: { escrow: Escrow }) {
  return (
    <div className="brutalist-card bg-white p-6 flex flex-col gap-4 relative">
      {/* Role tape */}
      <div
        className={`brutalist-tape absolute -top-3 -left-2 text-[10px] px-2 py-0.5 ${escrow.role === "Client" ? "bg-black text-white" : "bg-primary text-white"}`}
        style={{ transform: "rotate(-3deg)" }}
      >
        {escrow.role}
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

      {/* Amount row */}
      <div className="border-t-2 border-b-2 border-black/10 py-3 flex items-center justify-between">
        <p className="text-xs font-black uppercase tracking-widest text-black/50">Locked Amount</p>
        <p className="font-black text-2xl text-black tabular-nums">
          {escrow.amount}<span className="text-xs font-bold text-black/50 ml-1">SOL</span>
        </p>
      </div>

      {/* Counterparty */}
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-black uppercase tracking-widest text-black/40 mb-1">
            {escrow.role === "Client" ? "Worker" : "Client"}
          </p>
          <p className="font-mono text-xs text-black/70 truncate">{escrow.counterparty}</p>
        </div>
        <CopyButton text={escrow.counterparty} id={`copy-counterparty-${escrow.id}`} />
      </div>

      {/* Date */}
      <p className="text-[10px] font-bold text-black/40 uppercase tracking-widest">
        Created {escrow.createdAt}
      </p>

      {/* Action buttons */}
      <div className="flex gap-2 pt-1">
        {escrow.status === "Submitted" && escrow.role === "Client" && (
          <button
            id={`approve-escrow-${escrow.id}`}
            className="flex-1 brutalist-button py-2 text-xs bg-[#4ADE80] text-black border-black"
          >
            Approve Work
          </button>
        )}
        {(escrow.status === "In Progress" || escrow.status === "Submitted") && (
          <button
            id={`dispute-escrow-${escrow.id}`}
            className="flex-1 brutalist-button py-2 text-xs bg-background text-black border-black"
          >
            Raise Dispute
          </button>
        )}
        {escrow.status === "Completed" && (
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-[#4ADE80] border-2 border-black" />
            <span className="font-black text-xs uppercase text-[#4ADE80]">Funds Released</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function EscrowsPage() {
  const [filter, setFilter] = useState<EscrowStatus | "All">("All");
  const [escrows, setEscrows] = useState<Escrow[]>([]);
  const { program } = useEscrow();
  const { wallet } = useWallet();

  useEffect(() => {
    if (!program || !wallet) return;

    const fetchEscrows = async () => {
      try {
        const address = wallet.account.address;
        const allEscrows = await (program.account as any).escrowAccount.all();
        
        // Filter those where the user is either the client or the worker
        const myEscrows = allEscrows.filter(
          (e: any) => e.account.client.toBase58() === address || (e.account.worker && e.account.worker.toBase58() === address)
        );

        const mapped: Escrow[] = myEscrows.map((e: any) => {
          const stateKeys = Object.keys(e.account.status);
          let status = "Funded";
          if (stateKeys.includes("active")) status = "In Progress";
          if (stateKeys.includes("submitted")) status = "Submitted";
          if (stateKeys.includes("completed")) status = "Completed";
          if (stateKeys.includes("disputed")) status = "Disputed";
          
          const isClient = e.account.client.toBase58() === address;
          const counterparty = isClient 
            ? (e.account.worker ? e.account.worker.toBase58() : "None yet") 
            : e.account.client.toBase58();

          return {
             id: e.account.taskId.toString(),
             role: isClient ? "Client" : "Worker",
             counterparty,
             amount: (Number(e.account.amount) / 1_000_000_000).toString(),
             status: status as EscrowStatus,
             taskTitle: "On-Chain Task",
             createdAt: "Recently"
          }
        });
        
        setEscrows(mapped.reverse());
      } catch (err) {
        console.error("Failed to fetch on-chain escrows:", err);
      }
    };

    fetchEscrows();
  }, [program, wallet]);
  const filtered = filter === "All" ? escrows : escrows.filter((e) => e.status === filter);
  const filters: (EscrowStatus | "All")[] = ["All", "Funded", "In Progress", "Submitted", "Completed", "Disputed"];

  return (
    <div className="w-full">
      <div className="mb-10">
        <div className="brutalist-tape text-xs px-3 py-1 inline-block mb-3" style={{ transform: "rotate(-1deg)" }}>
          On-Chain
        </div>
        <h1 className="text-5xl md:text-6xl font-black uppercase leading-none text-black italic tracking-tighter">
          Active Escrows
        </h1>
        <p className="font-bold text-sm text-black/50 mt-2">
          All escrow vaults you are part of — as client or worker.
        </p>
      </div>

      {/* Info strip */}
      <div className="bg-black text-white border-4 border-black p-4 flex items-center gap-4 mb-8">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="shrink-0 text-primary">
          <circle cx="12" cy="12" r="10" /><path d="M12 8v4m0 4h.01" />
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
          <p className="font-black text-2xl uppercase text-black/30 mb-3">No escrows found</p>
          <p className="font-bold text-sm text-black/40">
            {filter === "All" ? "Post a task or get assigned to create your first escrow vault." : `No escrows with status "${filter}".`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filtered.map((escrow) => <EscrowCard key={escrow.id} escrow={escrow} />)}
        </div>
      )}
    </div>
  );
}
