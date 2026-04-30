"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useWallet } from "@/app/lib/wallet/context";
import { useBalance } from "@/app/lib/hooks/use-balance";
import { lamportsToSolString } from "@/app/lib/lamports";
import { ellipsify } from "@/app/lib/explorer";

const NAV_ITEMS = [
  {
    id: "overview",
    label: "Overview",
    href: "/dashboard",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square">
        <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    id: "browse",
    label: "Browse Tasks",
    href: "/dashboard/browse",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square">
        <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
      </svg>
    ),
  },
  {
    id: "tasks",
    label: "My Tasks",
    href: "/dashboard/tasks",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square">
        <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
      </svg>
    ),
  },
  {
    id: "work",
    label: "Accepted Work",
    href: "/dashboard/work",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square">
        <rect x="2" y="7" width="20" height="14" rx="0" /><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />
      </svg>
    ),
  },
  {
    id: "escrows",
    label: "Active Escrows",
    href: "/dashboard/escrows",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square">
        <rect x="3" y="11" width="18" height="11" /><path d="M7 11V7a5 5 0 0110 0v4" />
      </svg>
    ),
  },
  {
    id: "profile",
    label: "Profile & Badges",
    href: "/dashboard/profile",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square">
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
  {
    id: "leaderboard",
    label: "Leaderboard",
    href: "/dashboard/leaderboard",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    ),
  },
  {
    id: "developers",
    label: "Developers",
    href: "/dashboard/developers",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87" />
        <path d="M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
  },
];

export function DashboardNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { wallet, disconnect } = useWallet();
  const address = wallet?.account.address;
  const balance = useBalance(address);
  const [copied, setCopied] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleCopy = async () => {
    if (!address) return;
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDisconnect = () => {
    disconnect();
    document.cookie = "wallet=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
    router.push("/");
  };

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);

  return (
    <>
      {/* Mobile hamburger */}
      <button
        className="lg:hidden fixed top-4 left-4 z-[200] brutalist-button px-3 py-2 bg-primary text-white border-black"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label="Toggle sidebar"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          {sidebarOpen
            ? <><path d="M18 6L6 18" /><path d="M6 6l12 12" /></>
            : <><path d="M3 12h18" /><path d="M3 6h18" /><path d="M3 18h18" /></>
          }
        </svg>
      </button>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-[150] bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-background border-r-4 border-black z-[160] flex flex-col transition-transform duration-200
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
      >
        {/* Logo */}
        <div className="border-b-4 border-black px-6 py-4 flex items-center justify-between">
          <Link href="/" className="hover:opacity-80 transition-opacity">
            <Image
              src="/forge.png"
              alt="Forge"
              width={160}
              height={48}
              className="h-10 w-auto object-contain"
              draggable={false}
            />
          </Link>
          <div className="brutalist-tape text-[10px] px-2 py-0.5" style={{ transform: "rotate(3deg)" }}>
            BETA
          </div>
        </div>

        {/* Wallet card */}
        <div className="border-b-4 border-black p-4 bg-primary text-white">
          <p className="text-[10px] font-black uppercase tracking-widest text-white/70 mb-2">
            Connected Wallet
          </p>
          <p className="font-mono text-xs break-all text-white mb-3">
            {address ? ellipsify(address, 6) : "—"}
          </p>
          <div className="flex items-center justify-between gap-2 mb-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-white/70">Balance</p>
              <p className="font-black text-lg leading-none text-white tabular-nums">
                {balance.lamports != null
                  ? lamportsToSolString(balance.lamports)
                  : "—"}
                <span className="text-xs font-bold text-white/70 ml-1">SOL</span>
              </p>
            </div>
            {/* Copy button */}
            <button
              id="copy-wallet-address"
              onClick={handleCopy}
              title="Copy wallet address"
              className={`flex items-center gap-1.5 border-2 px-3 py-1.5 text-xs font-black uppercase transition-all duration-150
                ${copied
                  ? "bg-[#4ADE80] border-[#4ADE80] text-black scale-95"
                  : "border-white text-white hover:bg-white hover:text-primary"
                }`}
              style={{
                boxShadow: copied ? "none" : "2px 2px 0px 0px rgba(0,0,0,0.3)",
              }}
            >
              {copied ? (
                <>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                  Copied
                </>
              ) : (
                <>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <rect x="9" y="9" width="13" height="13" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                  </svg>
                  Copy
                </>
              )}
            </button>
          </div>
          {/* Full address row */}
          <div className="bg-black/10 border border-white/20 px-3 py-2">
            <p className="font-mono text-[10px] break-all text-white/80 leading-relaxed">
              {address ?? "Not connected"}
            </p>
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 p-4 flex flex-col gap-1 overflow-y-auto">
          <p className="text-[10px] font-black uppercase tracking-widest text-black/40 px-3 mb-2">
            Navigation
          </p>
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.id}
                href={item.href}
                id={`nav-${item.id}`}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 font-black text-sm uppercase tracking-wide border-2 transition-all duration-100
                  ${active
                    ? "bg-primary text-white border-primary shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
                    : "bg-transparent text-black border-transparent hover:border-primary hover:bg-primary/10 hover:text-primary hover:shadow-[3px_3px_0px_0px_rgba(255,69,0,0.3)]"
                  }`}
              >
                <span className={active ? "text-white" : "text-black/60 group-hover:text-primary"}>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Bottom actions */}
        <div className="border-t-4 border-black p-4 flex flex-col gap-2">
          <Link
            href="/dashboard/tasks/new"
            id="nav-new-task"
            className="brutalist-button text-center px-4 py-2.5 text-sm bg-primary text-white border-black flex items-center justify-center gap-2"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Post New Task
          </Link>
          <button
            id="nav-disconnect"
            onClick={handleDisconnect}
            className="brutalist-button text-center px-4 py-2.5 text-sm bg-background text-black border-black hover:bg-primary hover:text-white hover:border-primary"
          >
            Disconnect
          </button>
        </div>
      </aside>
    </>
  );
}
