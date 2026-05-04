"use client";

import { useEffect, useRef, useState } from "react";
import { useWallet } from "../lib/wallet/context";
import { useRouter } from "next/navigation";
import Image from "next/image";

interface ConnectModalProps {
  open: boolean;
  onClose: () => void;
}

export function ConnectModal({ open, onClose }: ConnectModalProps) {
  const { connectors, connect, status, error, wallet } = useWallet();
  const router = useRouter();
  const overlayRef = useRef<HTMLDivElement>(null);
  const [connecting, setConnecting] = useState<string | null>(null);
  // Tracks how long we've been waiting — drives the staged hint UI
  const [waitSeconds, setWaitSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close on overlay click
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  // If wallet connected after modal opens, redirect to dashboard
  useEffect(() => {
    if (status === "connected" && wallet) {
      onClose();
      router.push("/dashboard");
    }
  }, [status, wallet, onClose, router]);

  // Prevent body scroll when modal open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  // Start/stop the wait-timer whenever `connecting` changes
  useEffect(() => {
    if (connecting) {
      setWaitSeconds(0);
      timerRef.current = setInterval(() => {
        setWaitSeconds((s) => s + 1);
      }, 1000);
      // Hard timeout at 30s — clear stuck state so user is not stranded
      timeoutRef.current = setTimeout(() => {
        setConnecting(null);
        setWaitSeconds(0);
      }, 30_000);
    } else {
      setWaitSeconds(0);
      if (timerRef.current) clearInterval(timerRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [connecting]);

  if (!open) return null;

  const handleConnect = (connectorId: string) => {
    // Fire connect() immediately — before any React state — to stay within
    // Chrome's user-gesture context window as long as possible.
    const promise = connect(connectorId);
    setConnecting(connectorId);

    promise.catch(() => {
      // error surfaced via context state
    }).finally(() => {
      setConnecting(null);
    });
  };

  const steps = [
    { num: "01", label: "Connect your Solana wallet" },
    { num: "02", label: "Initialize your on-chain reputation account" },
    { num: "03", label: "Dashboard unlocked — start forging" },
  ];

  const pendingConnector = connectors.find((c) => c.id === connecting);

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80"
      style={{ backdropFilter: "blur(4px)" }}
    >
      <div
        className="relative w-full max-w-lg mx-4 bg-background border-4 border-black flex flex-col max-h-[90vh]"
        style={{ boxShadow: "10px 10px 0px 0px rgba(0,0,0,1)" }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Header bar */}
        <div className="bg-primary text-white px-8 py-5 flex items-center justify-between border-b-4 border-black shrink-0">
          <div className="flex items-center gap-3">
            <Image
              src="/forge.png"
              alt="Forge"
              width={120}
              height={36}
              className="h-8 w-auto object-contain"
              draggable={false}
            />
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 border-2 border-black bg-white flex items-center justify-center font-black text-black hover:bg-black hover:text-white transition-all text-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-0.5 active:translate-y-0.5"
          >
            X
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto flex-1 custom-scrollbar">
          <div className="px-8 py-6">

            {/* Tape label */}
            <div className="flex items-center gap-3 mb-5">
              <div className="brutalist-tape text-xs px-3 py-1" style={{ transform: "rotate(-2deg)" }}>
                {status === "connected" ? "Connected" : "Get Started"}
              </div>
              {status === "connected" && (
                <div className="brutalist-tape bg-[#4ADE80] text-black text-xs px-3 py-1" style={{ transform: "rotate(1deg)" }}>
                  Wallet Active
                </div>
              )}
            </div>

            {/* Heading */}
            <h2 id="modal-title" className="text-3xl font-black uppercase leading-none mb-2 text-black">
              {status === "connected" ? "Already Connected" : "Connect Your Wallet"}
            </h2>
            <p className="font-bold text-base text-black/70 mb-6 leading-snug">
              {status === "connected"
                ? "Your wallet is active. Heading to your dashboard."
                : "Forge uses your Solana wallet as your identity — no username or password required. New here? Your account is created automatically."}
            </p>

            {/* Steps */}
            <div className="border-t-2 border-black pt-5 mb-6">
              <p className="font-black text-xs uppercase tracking-widest mb-3 text-black/50">What happens next</p>
              <ol className="flex flex-col gap-3">
                {steps.map((s) => (
                  <li key={s.num} className="flex items-center gap-4">
                    <span className="shrink-0 w-10 h-10 border-2 border-black flex items-center justify-center font-black text-sm bg-primary text-white" aria-hidden="true">
                      {s.num}
                    </span>
                    <span className="font-bold text-sm leading-snug">{s.label}</span>
                  </li>
                ))}
              </ol>
            </div>

            {/* Error */}
            {error != null && (
              <div className="mb-4 border-2 border-destructive bg-destructive/10 px-4 py-3">
                <p className="font-bold text-sm text-destructive">
                  {error instanceof Error ? error.message : String(error)}
                </p>
              </div>
            )}

            {/* Staged hint — only appears after 3 seconds of waiting */}
            {connecting && waitSeconds >= 3 && (
              <div className="mb-4 border-4 border-black bg-[#FFD700] px-5 py-4 flex flex-col gap-2">
                <p className="font-black text-sm uppercase tracking-wide">
                  Wallet did not open automatically
                </p>
                <p className="font-bold text-sm leading-snug text-black/80">
                  Chrome blocked the popup. To finish connecting:
                </p>
                <ol className="list-decimal list-inside flex flex-col gap-1.5 pl-1">
                  <li className="font-bold text-sm">
                    Look at the <span className="font-black">top-right of your browser</span> — find the extensions toolbar
                  </li>
                  <li className="font-bold text-sm">
                    Click the <span className="font-black">{pendingConnector?.name ?? "wallet"}</span> icon to open it
                  </li>
                  <li className="font-bold text-sm">
                    Approve the connection inside the extension
                  </li>
                </ol>
                {waitSeconds >= 20 && (
                  <div className="mt-1 flex items-center justify-between">
                    <p className="font-black text-xs text-black/60 uppercase tracking-widest">
                      Auto-cancels in {30 - waitSeconds}s
                    </p>
                    <button
                      onClick={() => setConnecting(null)}
                      className="font-black text-xs uppercase underline hover:no-underline"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Wallet buttons */}
            {status !== "connected" && (
              <div className="flex flex-col gap-3">
                <p className="font-black text-xs uppercase tracking-widest text-black/50 mb-1">
                  Choose a wallet
                </p>
                {connectors.length === 0 && (
                  <p className="font-bold text-sm text-black/60">
                    No wallet extensions detected. Install Phantom, Backpack, or Solflare to continue.
                  </p>
                )}
                {connectors.map((connector) => (
                  <button
                    key={connector.id}
                    id={`wallet-connector-${connector.id}`}
                    onClick={() => handleConnect(connector.id)}
                    disabled={!!connecting}
                    className={`flex items-center gap-4 border-2 border-black px-5 py-3 font-black text-sm uppercase tracking-wide transition-all disabled:cursor-not-allowed group
                      ${connecting === connector.id
                        ? "bg-black text-white translate-x-1 translate-y-1 shadow-none"
                        : "bg-white hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:bg-[#FFD700] hover:text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-none disabled:opacity-40"
                      }`}
                  >
                    {connector.icon && (
                      <img
                        src={connector.icon}
                        alt=""
                        className={`h-6 w-6 rounded border border-black/10 ${connecting === connector.id ? "invert" : ""}`}
                      />
                    )}
                    <span className="flex-1 text-left">{connector.name}</span>
                    {connecting === connector.id && (
                      <span className="flex items-center gap-2 text-xs font-black">
                        <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <path d="M12 3a9 9 0 019 9" />
                        </svg>
                        Waiting...
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-black/5 border-t-2 border-black px-8 py-4 shrink-0">
          <p className="font-bold text-xs text-black/50 text-center">
            Already have an account? Connecting your wallet automatically logs you in.
          </p>
        </div>
      </div>
    </div>
  );
}
