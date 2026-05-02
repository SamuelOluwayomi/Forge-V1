"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@/app/lib/wallet/context";
import { useEscrow } from "@/app/lib/hooks/useEscrow";
import { PublicKey } from "@solana/web3.js";
import { NFT_METADATA } from "@/app/lib/nft-metadata";
import { toast } from "sonner";
import Image from "next/image";

const FORGE_FOUNDER = "HDpuuLudmQeCjm52z1L8SC8eMAX85QEdum6KPu2b6TgW";

interface RewardStatus {
  hasPioneer: boolean;
  hasFounder: boolean;
  pioneerMinted: number;
  trackerInitialized: boolean;
  loading: boolean;
}

interface NFTCard {
  id: "pioneer" | "founder";
  name: string;
  subtitle: string;
  rarity: string;
  rarityColor: string;
  edition: string;
  description: string;
  image: string;
  attributes: { label: string; value: string }[];
}

const CARDS: NFTCard[] = [
  {
    id: "pioneer",
    name: "Forge Pioneer",
    subtitle: "1 of 100 — Early Adopter",
    rarity: "Rare",
    rarityColor: "#FFD700",
    edition: "1 of 100",
    description:
      "One of the first 100 builders to forge their onchain identity. A permanent credential marking early adoption of the Forge protocol.",
    image:
      "https://amber-important-primate-357.mypinata.cloud/ipfs/bafybeigjn3cdrocvxavacumjnz6ic6mdzghuxvzvzojkrxilijsnzzlqyi",
    attributes: [
      { label: "Type", value: "Pioneer" },
      { label: "Platform", value: "Forge" },
      { label: "Edition", value: "1 of 100" },
      { label: "Rarity", value: "Rare" },
    ],
  },
  {
    id: "founder",
    name: "Forge Founder",
    subtitle: "1 of 1 — Genesis",
    rarity: "Unique",
    rarityColor: "#FF4500",
    edition: "1 of 1",
    description:
      "The original builder of Forge — the trustless freelance marketplace on Solana. Permanent, non-transferable, held by exactly one wallet.",
    image:
      "https://amber-important-primate-357.mypinata.cloud/ipfs/bafybeiaaxfuvglz5is7pmn5m2lthoyyit7rjzlt6irabyrgd5byy3esg5i",
    attributes: [
      { label: "Type", value: "Founder" },
      { label: "Platform", value: "Forge" },
      { label: "Edition", value: "1 of 1" },
      { label: "Rarity", value: "Unique" },
    ],
  },
];

export default function RewardsPage() {
  const { wallet } = useWallet();
  const address = String(wallet?.account?.address ?? "").trim();
  const {
    sbtProgram,
    mintFounderNft,
    mintPioneerNft,
    initializeMintTracker,
  } = useEscrow();

  const [status, setStatus] = useState<RewardStatus>({
    hasPioneer: false,
    hasFounder: false,
    pioneerMinted: 0,
    trackerInitialized: false,
    loading: true,
  });
  const [claiming, setClaiming] = useState<
    "pioneer" | "founder" | "tracker" | null
  >(null);
  const [selected, setSelected] = useState<NFTCard | null>(null);

  // Debug: log the wallet address to help troubleshoot founder matching
  useEffect(() => {
    if (address) {
      console.log("[Rewards] Connected wallet:", address);
      console.log("[Rewards] FORGE_FOUNDER:", FORGE_FOUNDER);
      console.log("[Rewards] isFounder:", address === FORGE_FOUNDER);
    }
  }, [address]);

  const isFounder = address === FORGE_FOUNDER;
  const pioneerSlotsLeft = 100 - status.pioneerMinted;

  useEffect(() => {
    if (!sbtProgram || !address) {
      setStatus((s) => ({ ...s, loading: false }));
      return;
    }
    const fetchStatus = async () => {
      try {
        const userPubkey = new PublicKey(address);
        const [trackerPda] = await PublicKey.findProgramAddress(
          [Buffer.from("mint_tracker")],
          sbtProgram.programId
        );
        let pioneerMinted = 0,
          trackerInitialized = false;
        try {
          const d = await (sbtProgram.account as any).mintTracker.fetch(
            trackerPda
          );
          pioneerMinted = d.pioneerMinted;
          trackerInitialized = true;
        } catch {
          trackerInitialized = false;
        }

        const [pioneerPda] = await PublicKey.findProgramAddress(
          [Buffer.from("pioneer_nft"), userPubkey.toBuffer()],
          sbtProgram.programId
        );
        let hasPioneer = false;
        try {
          await (sbtProgram.account as any).specialNft.fetch(pioneerPda);
          hasPioneer = true;
        } catch {}

        const [founderPda] = await PublicKey.findProgramAddress(
          [Buffer.from("founder_nft"), userPubkey.toBuffer()],
          sbtProgram.programId
        );
        let hasFounder = false;
        try {
          await (sbtProgram.account as any).specialNft.fetch(founderPda);
          hasFounder = true;
        } catch {}

        setStatus({
          hasPioneer,
          hasFounder,
          pioneerMinted,
          trackerInitialized,
          loading: false,
        });
      } catch (err) {
        console.error("Error fetching reward status:", err);
        setStatus((s) => ({ ...s, loading: false }));
      }
    };
    fetchStatus();
  }, [sbtProgram, address]);

  const handleInitTracker = async () => {
    setClaiming("tracker");
    try {
      await initializeMintTracker();
      toast.success("Mint tracker initialized!");
      setStatus((s) => ({ ...s, trackerInitialized: true }));
    } catch (err: any) {
      toast.error("Failed to initialize tracker: " + err.message);
    } finally {
      setClaiming(null);
    }
  };

  const handleClaim = async (type: "pioneer" | "founder") => {
    if (!address) return;
    setClaiming(type);
    const userPubkey = new PublicKey(address);
    try {
      if (type === "pioneer") {
        await mintPioneerNft(userPubkey, NFT_METADATA.pioneer.uri);
        toast.success("🎉 Pioneer NFT claimed!");
        setStatus((s) => ({
          ...s,
          hasPioneer: true,
          pioneerMinted: s.pioneerMinted + 1,
        }));
      } else {
        await mintFounderNft(userPubkey, NFT_METADATA.founder.uri);
        toast.success("🔥 Founder NFT claimed!");
        setStatus((s) => ({ ...s, hasFounder: true }));
      }
      setSelected(null);
    } catch (err: any) {
      const msg = err.message?.includes("SupplyExhausted")
        ? "All 100 Pioneer NFTs have been claimed."
        : err.message?.includes("Unauthorized")
          ? "Not authorized to claim this NFT."
          : "Failed to claim. Please try again.";
      toast.error(msg);
    } finally {
      setClaiming(null);
    }
  };

  const isOwned = (id: "pioneer" | "founder") =>
    id === "pioneer" ? status.hasPioneer : status.hasFounder;

  const canClaim = (id: "pioneer" | "founder") => {
    if (id === "founder") return isFounder && !status.hasFounder;
    return (
      status.trackerInitialized && pioneerSlotsLeft > 0 && !status.hasPioneer
    );
  };

  const getStatusLabel = (id: "pioneer" | "founder") => {
    if (isOwned(id)) return "✓ Claimed";
    if (id === "founder" && !isFounder) return "Founder Only";
    if (id === "pioneer" && !status.trackerInitialized) return "Coming Soon";
    if (id === "pioneer" && pioneerSlotsLeft <= 0) return "Sold Out";
    return "Available";
  };

  return (
    <div className="h-full flex flex-col max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="font-black text-3xl uppercase tracking-tight">
            Exclusive Rewards
          </h1>
          <p className="font-bold text-black/40 text-xs uppercase tracking-widest mt-1">
            Soulbound — permanently locked to your wallet
          </p>
        </div>
        <span
          className="brutalist-tape text-[10px] px-3 py-1 font-black uppercase"
          style={{
            background: "#FF4500",
            color: "white",
            transform: "rotate(-1deg)",
          }}
        >
          Limited
        </span>
      </div>

      {/* Init tracker banner — only visible to founder when tracker is uninitialized */}
      {isFounder && !status.trackerInitialized && !status.loading && (
        <div className="mb-4 border-4 border-black bg-yellow-100 p-3 flex items-center justify-between shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex-shrink-0">
          <div>
            <p className="font-black text-sm uppercase">
              Initialize Mint Tracker
            </p>
            <p className="text-xs text-black/60 font-bold">
              Required before Pioneer NFTs can be claimed.
            </p>
          </div>
          <button
            id="init-tracker-btn"
            onClick={handleInitTracker}
            disabled={claiming === "tracker"}
            className="brutalist-button px-4 py-2 text-xs bg-black text-white border-black hover:bg-primary hover:border-primary disabled:opacity-50"
          >
            {claiming === "tracker" ? "Initializing…" : "Init Tracker"}
          </button>
        </div>
      )}

      {/* Cards Grid */}
      {status.loading ? (
        <>
          <div className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-black/50 flex-shrink-0">
            <svg
              className="animate-spin"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
            >
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
            Fetching on-chain data…
          </div>
          <div className="grid grid-cols-2 gap-6 flex-1">
            {[0, 1].map((i) => (
              <div
                key={i}
                className="border-4 border-black flex flex-col overflow-hidden shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
                style={{
                  background:
                    "repeating-linear-gradient(45deg, #e5e5e5, #e5e5e5 10px, #f0f0f0 10px, #f0f0f0 20px)",
                }}
              >
                <div
                  className="border-b-4 border-black bg-black/10 animate-pulse"
                  style={{ height: "70%" }}
                />
                <div className="p-4 flex flex-col gap-3 flex-1 bg-white">
                  <div className="h-4 bg-black/10 animate-pulse w-3/4" />
                  <div className="h-3 bg-black/10 animate-pulse w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="grid grid-cols-2 gap-6 flex-1 min-h-0">
          {CARDS.map((card) => {
            const owned = isOwned(card.id);
            const statusLabel = getStatusLabel(card.id);
            return (
              <div
                key={card.id}
                id={`${card.id}-nft-card`}
                onClick={() => setSelected(card)}
                className="border-4 border-black bg-black flex flex-col overflow-hidden cursor-pointer group relative"
                style={{
                  boxShadow: "6px 6px 0px 0px rgba(0,0,0,1)",
                  transition: "all 0.25s cubic-bezier(0.34,1.56,0.64,1)",
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLDivElement;
                  el.style.transform = "translate(-4px,-4px)";
                  el.style.boxShadow =
                    card.id === "founder"
                      ? "12px 12px 0px 0px rgba(255,69,0,0.8)"
                      : "12px 12px 0px 0px rgba(255,215,0,0.8)";
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLDivElement;
                  el.style.transform = "translate(0,0)";
                  el.style.boxShadow = "6px 6px 0px 0px rgba(0,0,0,1)";
                }}
              >
                {/* Full image — takes most of the card */}
                <div className="relative w-full flex-1 min-h-[320px] overflow-hidden">
                  <Image
                    src={card.image}
                    alt={card.name}
                    fill
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                    unoptimized
                  />

                  {/* Permanent badges */}
                  <div
                    className="absolute top-4 left-4 px-3 py-1 font-black text-[10px] uppercase border-2 border-black z-10 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                    style={{
                      background: card.rarityColor,
                      color: card.id === "founder" ? "white" : "black",
                    }}
                  >
                    {card.rarity}
                  </div>
                  <div className="absolute top-4 right-4 bg-black/90 text-white px-3 py-1 font-black text-[10px] uppercase border-2 border-white/20 z-10 backdrop-blur-md shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    {owned
                      ? "✓ OWNED"
                      : card.id === "pioneer"
                        ? `${status.pioneerMinted}/100`
                        : "GENESIS"}
                  </div>

                  {/* Status chip at bottom of image */}
                  {statusLabel !== "Available" && (
                    <div
                      className="absolute bottom-4 left-4 px-3 py-1 font-black text-[10px] uppercase z-10 border-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                      style={{
                        background: owned ? "#4ADE80" : "rgba(0,0,0,0.8)",
                        color: owned ? "black" : "white",
                        borderColor: owned ? "#16A34A" : "rgba(255,255,255,0.2)",
                        backdropFilter: "blur(8px)",
                      }}
                    >
                      {statusLabel}
                    </div>
                  )}

                  {/* Hover overlay — sleek dark gradient with centered CTA */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col items-center justify-center z-20 backdrop-blur-[2px]">
                    <div className="flex flex-col items-center gap-2 translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                      <div className="bg-white text-black border-4 border-black px-6 py-2.5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center gap-2">
                        <span className="font-black text-sm uppercase tracking-widest">
                          View Details
                        </span>
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="4"
                        >
                          <path d="M5 12h14M12 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Minimal text bar at bottom */}
                <div className="bg-white px-5 py-3.5 border-t-4 border-black flex-shrink-0">
                  <div className="flex justify-between items-center">
                    <div>
                      <h2 className="font-black text-base uppercase tracking-tight leading-tight">
                        {card.name}
                      </h2>
                      <p className="text-[10px] font-bold text-black/50 uppercase tracking-widest">
                        {card.subtitle}
                      </p>
                    </div>
                    <div className="text-black/20 group-hover:text-primary transition-colors">
                       <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                         <path d="M12 5v14M5 12h14" />
                       </svg>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Modal */}
      {selected && (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center p-4"
          onClick={() => setSelected(null)}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div
            className="relative bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] w-full max-w-lg flex flex-col overflow-hidden animate-in"
            onClick={(e) => e.stopPropagation()}
            style={{
              animation: "modalIn 0.2s ease-out",
            }}
          >
            {/* Modal Image */}
            <div
              className="relative w-full border-b-4 border-black"
              style={{ height: 260 }}
            >
              <Image
                src={selected.image}
                alt={selected.name}
                fill
                className="object-cover object-center"
                unoptimized
              />
              <div
                className="absolute top-3 left-3 px-3 py-1 font-black text-xs uppercase border-2 border-black"
                style={{
                  background: selected.rarityColor,
                  color:
                    selected.id === "founder" ? "white" : "black",
                }}
              >
                {selected.rarity}
              </div>
              <div className="absolute top-3 right-3 bg-black text-white px-3 py-1 font-black text-xs uppercase border-2 border-white">
                {isOwned(selected.id) ? "✓ OWNED" : selected.edition}
              </div>
              <button
                onClick={() => setSelected(null)}
                className="absolute bottom-3 right-3 bg-black text-white border-2 border-white w-8 h-8 flex items-center justify-center font-black hover:bg-primary transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 flex flex-col gap-4">
              <div>
                <h2 className="font-black text-2xl uppercase tracking-tight">
                  {selected.name}
                </h2>
                <p className="text-xs font-bold text-black/50 uppercase tracking-widest">
                  {selected.subtitle}
                </p>
              </div>
              <p className="text-sm font-bold text-black/70 leading-relaxed">
                {selected.description}
              </p>

              {/* Attributes */}
              <div className="grid grid-cols-4 gap-2">
                {selected.attributes.map((a) => (
                  <div
                    key={a.label}
                    className="border-2 border-black px-2 py-1.5 bg-black/5"
                  >
                    <p className="text-[9px] font-black uppercase tracking-widest text-black/40">
                      {a.label}
                    </p>
                    <p className="text-xs font-black uppercase">{a.value}</p>
                  </div>
                ))}
              </div>

              {/* Pioneer supply bar */}
              {selected.id === "pioneer" && (
                <div>
                  <div className="flex justify-between text-[10px] font-black uppercase mb-1">
                    <span>{status.pioneerMinted} Claimed</span>
                    <span>{pioneerSlotsLeft} Remaining</span>
                  </div>
                  <div className="h-2 border-2 border-black bg-white">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{
                        width: `${(status.pioneerMinted / 100) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Init tracker inside modal for founder */}
              {selected.id === "pioneer" &&
                isFounder &&
                !status.trackerInitialized && (
                  <button
                    onClick={handleInitTracker}
                    disabled={claiming === "tracker"}
                    className="brutalist-button w-full py-3 font-black text-sm uppercase tracking-widest border-black bg-yellow-400 text-black hover:bg-yellow-300 disabled:opacity-50"
                  >
                    {claiming === "tracker"
                      ? "Initializing…"
                      : "⚡ Initialize Mint Tracker First"}
                  </button>
                )}

              {/* Claim button */}
              <button
                id={`modal-claim-${selected.id}-btn`}
                onClick={() =>
                  canClaim(selected.id) && handleClaim(selected.id)
                }
                disabled={!canClaim(selected.id) || !!claiming}
                className="brutalist-button w-full py-3 font-black text-sm uppercase tracking-widest border-black transition-all"
                style={{
                  background: isOwned(selected.id)
                    ? "#4ADE80"
                    : canClaim(selected.id)
                      ? selected.id === "founder"
                        ? "#000"
                        : "#FF4500"
                      : "#bbb",
                  color: isOwned(selected.id) ? "black" : "white",
                  cursor:
                    canClaim(selected.id) && !claiming
                      ? "pointer"
                      : "not-allowed",
                }}
              >
                {isOwned(selected.id)
                  ? "✓ Already Claimed"
                  : claiming === selected.id
                    ? "Claiming…"
                    : selected.id === "founder" && !isFounder
                      ? "Founder Access Only"
                      : !status.trackerInitialized &&
                          selected.id === "pioneer"
                        ? "Tracker Not Initialized"
                        : pioneerSlotsLeft <= 0 &&
                            selected.id === "pioneer"
                          ? "Sold Out"
                          : `Claim ${selected.name}`}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes modalIn {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
