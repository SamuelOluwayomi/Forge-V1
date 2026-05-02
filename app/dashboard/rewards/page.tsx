"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@/app/lib/wallet/context";
import { useEscrow } from "@/app/lib/hooks/useEscrow";
import { PublicKey } from "@solana/web3.js";
import { NFT_METADATA } from "@/app/lib/nft-metadata";
import { toast } from "sonner";
import Image from "next/image";

const FORGE_FOUNDER = "HDpuuLudmQoCjm52z1L8SC8eMAX85QEdum6KPu2b6TgW";

interface RewardStatus {
  hasPioneer: boolean;
  hasFounder: boolean;
  pioneerMinted: number;
  trackerInitialized: boolean;
  loading: boolean;
}

export default function RewardsPage() {
  const { wallet } = useWallet();
  const address = wallet?.account.address ?? "";
  const { sbtProgram, mintFounderNft, mintPioneerNft, initializeMintTracker } =
    useEscrow();

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
  const [hoveredCard, setHoveredCard] = useState<"pioneer" | "founder" | null>(
    null
  );

  const isFounder = address === FORGE_FOUNDER;

  useEffect(() => {
    if (!sbtProgram || !address) {
      setStatus((s) => ({ ...s, loading: false }));
      return;
    }

    const fetchStatus = async () => {
      try {
        const userPubkey = new PublicKey(address);

        // Check MintTracker
        const [trackerPda] = await PublicKey.findProgramAddress(
          [Buffer.from("mint_tracker")],
          sbtProgram.programId
        );
        let pioneerMinted = 0;
        let trackerInitialized = false;
        try {
          const trackerData = await (
            sbtProgram.account as any
          ).mintTracker.fetch(trackerPda);
          pioneerMinted = trackerData.pioneerMinted;
          trackerInitialized = true;
        } catch {
          trackerInitialized = false;
        }

        // Check Pioneer NFT
        const [pioneerPda] = await PublicKey.findProgramAddress(
          [Buffer.from("pioneer_nft"), userPubkey.toBuffer()],
          sbtProgram.programId
        );
        let hasPioneer = false;
        try {
          await (sbtProgram.account as any).specialNft.fetch(pioneerPda);
          hasPioneer = true;
        } catch {
          hasPioneer = false;
        }

        // Check Founder NFT
        const [founderPda] = await PublicKey.findProgramAddress(
          [Buffer.from("founder_nft"), userPubkey.toBuffer()],
          sbtProgram.programId
        );
        let hasFounder = false;
        try {
          await (sbtProgram.account as any).specialNft.fetch(founderPda);
          hasFounder = true;
        } catch {
          hasFounder = false;
        }

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
        toast.success("🎉 Pioneer NFT claimed! Welcome to the first 100.");
        setStatus((s) => ({
          ...s,
          hasPioneer: true,
          pioneerMinted: s.pioneerMinted + 1,
        }));
      } else {
        await mintFounderNft(userPubkey, NFT_METADATA.founder.uri);
        toast.success("🔥 Founder NFT claimed! Genesis badge secured.");
        setStatus((s) => ({ ...s, hasFounder: true }));
      }
    } catch (err: any) {
      const msg = err.message?.includes("SupplyExhausted")
        ? "All 100 Pioneer NFTs have been claimed."
        : err.message?.includes("Unauthorized")
          ? "You are not authorized to claim this NFT."
          : "Failed to claim NFT. Please try again.";
      toast.error(msg);
    } finally {
      setClaiming(null);
    }
  };

  const pioneerSlotsLeft = 100 - status.pioneerMinted;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="font-black text-4xl uppercase tracking-tight text-black">
            Exclusive Rewards
          </h1>
          <span
            className="brutalist-tape text-[10px] px-3 py-1 font-black uppercase tracking-widest"
            style={{
              background: "#FF4500",
              color: "white",
              transform: "rotate(-1deg)",
            }}
          >
            Limited
          </span>
        </div>
        <p className="font-bold text-black/50 text-sm uppercase tracking-widest">
          Permanent, on-chain identity credentials — soulbound to your wallet
          forever
        </p>
      </div>

      {/* Tracker Init (founder only, if not initialized) */}
      {isFounder && !status.trackerInitialized && !status.loading && (
        <div className="mb-6 border-4 border-black bg-yellow-100 p-4 flex items-center justify-between shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div>
            <p className="font-black text-sm uppercase">
              Tracker Not Initialized
            </p>
            <p className="text-xs text-black/60 font-bold">
              Initialize the on-chain mint tracker before anyone can claim.
            </p>
          </div>
          <button
            id="init-tracker-btn"
            onClick={handleInitTracker}
            disabled={claiming === "tracker"}
            className="brutalist-button px-4 py-2 text-sm bg-black text-white border-black hover:bg-primary hover:border-primary disabled:opacity-50"
          >
            {claiming === "tracker" ? "Initializing…" : "Init Tracker"}
          </button>
        </div>
      )}

      {/* NFT Cards Grid */}
      {status.loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="border-4 border-black h-[480px] bg-white/50 animate-pulse shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Pioneer NFT Card */}
          <div
            id="pioneer-nft-card"
            onMouseEnter={() => setHoveredCard("pioneer")}
            onMouseLeave={() => setHoveredCard(null)}
            className="border-4 border-black bg-white flex flex-col overflow-hidden"
            style={{
              boxShadow:
                hoveredCard === "pioneer"
                  ? "10px 10px 0px 0px rgba(0,0,0,1)"
                  : "6px 6px 0px 0px rgba(0,0,0,1)",
              transform:
                hoveredCard === "pioneer"
                  ? "translate(-3px, -3px)"
                  : "translate(0,0)",
              transition: "all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)",
            }}
          >
            {/* NFT Image */}
            <div className="relative w-full aspect-square overflow-hidden border-b-4 border-black bg-black">
              <Image
                src="https://amber-important-primate-357.mypinata.cloud/ipfs/bafybeigjn3cdrocvxavacumjnz6ic6mdzghuxvzvzojkrxilijsnzzlqyi"
                alt="Forge Pioneer NFT"
                fill
                className="object-cover"
                style={{
                  transform:
                    hoveredCard === "pioneer" ? "scale(1.04)" : "scale(1)",
                  transition: "transform 0.4s ease",
                }}
                unoptimized
              />
              {/* Supply badge */}
              <div className="absolute top-3 right-3 bg-black text-white px-3 py-1 font-black text-xs uppercase tracking-widest border-2 border-white">
                {status.hasPioneer
                  ? "✓ OWNED"
                  : `${status.pioneerMinted}/100 CLAIMED`}
              </div>
              {/* Rarity ribbon */}
              <div
                className="absolute top-3 left-3 px-3 py-1 font-black text-xs uppercase tracking-widest"
                style={{
                  background: "#FFD700",
                  color: "black",
                  border: "2px solid black",
                }}
              >
                Rare
              </div>
            </div>

            {/* Card Info */}
            <div className="p-5 flex flex-col gap-3 flex-1">
              <div>
                <h2 className="font-black text-xl uppercase tracking-tight">
                  Forge Pioneer
                </h2>
                <p className="text-xs font-bold text-black/50 uppercase tracking-widest mt-0.5">
                  1 of 100 — Early Adopter
                </p>
              </div>
              <p className="text-sm font-bold text-black/70 leading-relaxed flex-1">
                One of the first 100 builders to forge their onchain identity. A
                permanent credential marking early adoption of the Forge
                protocol.
              </p>

              {/* Attributes */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Type", value: "Pioneer" },
                  { label: "Platform", value: "Forge" },
                  { label: "Edition", value: "1 of 100" },
                  { label: "Rarity", value: "Rare" },
                ].map((attr) => (
                  <div
                    key={attr.label}
                    className="border-2 border-black px-2 py-1.5 bg-black/5"
                  >
                    <p className="text-[9px] font-black uppercase tracking-widest text-black/40">
                      {attr.label}
                    </p>
                    <p className="text-xs font-black uppercase">{attr.value}</p>
                  </div>
                ))}
              </div>

              {/* Claim button */}
              <button
                id="claim-pioneer-btn"
                onClick={() => handleClaim("pioneer")}
                disabled={
                  status.hasPioneer ||
                  !status.trackerInitialized ||
                  pioneerSlotsLeft <= 0 ||
                  claiming === "pioneer"
                }
                className="brutalist-button w-full py-3 font-black text-sm uppercase tracking-widest border-black transition-all duration-150"
                style={{
                  background: status.hasPioneer
                    ? "#4ADE80"
                    : claiming === "pioneer"
                      ? "#ccc"
                      : "#FF4500",
                  color: status.hasPioneer ? "black" : "white",
                  cursor:
                    status.hasPioneer ||
                    !status.trackerInitialized ||
                    pioneerSlotsLeft <= 0
                      ? "not-allowed"
                      : "pointer",
                  opacity:
                    !status.trackerInitialized && !status.hasPioneer ? 0.5 : 1,
                }}
              >
                {status.hasPioneer
                  ? "✓ Pioneer Claimed"
                  : claiming === "pioneer"
                    ? "Claiming…"
                    : !status.trackerInitialized
                      ? "Tracker Not Ready"
                      : pioneerSlotsLeft <= 0
                        ? "Sold Out"
                        : `Claim Pioneer NFT — ${pioneerSlotsLeft} left`}
              </button>
            </div>
          </div>

          {/* Founder NFT Card */}
          <div
            id="founder-nft-card"
            onMouseEnter={() => setHoveredCard("founder")}
            onMouseLeave={() => setHoveredCard(null)}
            className="border-4 border-black bg-white flex flex-col overflow-hidden"
            style={{
              boxShadow:
                hoveredCard === "founder"
                  ? "10px 10px 0px 0px rgba(255,69,0,0.8)"
                  : "6px 6px 0px 0px rgba(0,0,0,1)",
              transform:
                hoveredCard === "founder"
                  ? "translate(-3px, -3px)"
                  : "translate(0,0)",
              transition: "all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)",
              opacity: !isFounder && !status.hasFounder ? 0.7 : 1,
            }}
          >
            {/* NFT Image */}
            <div className="relative w-full aspect-square overflow-hidden border-b-4 border-black bg-black">
              <Image
                src="https://amber-important-primate-357.mypinata.cloud/ipfs/bafybeiaaxfuvglz5is7pmn5m2lthoyyit7rjzlt6irabyrgd5byy3esg5i"
                alt="Forge Founder NFT"
                fill
                className="object-cover"
                style={{
                  transform:
                    hoveredCard === "founder" ? "scale(1.04)" : "scale(1)",
                  transition: "transform 0.4s ease",
                }}
                unoptimized
              />
              {/* Status badge */}
              <div className="absolute top-3 right-3 bg-black text-white px-3 py-1 font-black text-xs uppercase tracking-widest border-2 border-white">
                {status.hasFounder ? "✓ OWNED" : "1 of 1"}
              </div>
              {/* Rarity ribbon */}
              <div
                className="absolute top-3 left-3 px-3 py-1 font-black text-xs uppercase tracking-widest"
                style={{
                  background: "#FF4500",
                  color: "white",
                  border: "2px solid black",
                }}
              >
                Unique
              </div>
              {/* Lock overlay for non-founders */}
              {!isFounder && !status.hasFounder && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-4xl mb-2">🔒</div>
                    <p className="font-black text-white text-sm uppercase tracking-widest">
                      Founder Only
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Card Info */}
            <div className="p-5 flex flex-col gap-3 flex-1">
              <div>
                <h2 className="font-black text-xl uppercase tracking-tight">
                  Forge Founder
                </h2>
                <p className="text-xs font-bold text-black/50 uppercase tracking-widest mt-0.5">
                  1 of 1 — Genesis
                </p>
              </div>
              <p className="text-sm font-bold text-black/70 leading-relaxed flex-1">
                The original builder of Forge — the trustless freelance
                marketplace on Solana. Permanent, non-transferable, held by
                exactly one wallet.
              </p>

              {/* Attributes */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Type", value: "Founder" },
                  { label: "Platform", value: "Forge" },
                  { label: "Edition", value: "1 of 1" },
                  { label: "Rarity", value: "Unique" },
                ].map((attr) => (
                  <div
                    key={attr.label}
                    className="border-2 border-black px-2 py-1.5 bg-black/5"
                  >
                    <p className="text-[9px] font-black uppercase tracking-widest text-black/40">
                      {attr.label}
                    </p>
                    <p className="text-xs font-black uppercase">{attr.value}</p>
                  </div>
                ))}
              </div>

              {/* Claim button */}
              <button
                id="claim-founder-btn"
                onClick={() => isFounder && handleClaim("founder")}
                disabled={
                  !isFounder || status.hasFounder || claiming === "founder"
                }
                className="brutalist-button w-full py-3 font-black text-sm uppercase tracking-widest border-black transition-all duration-150"
                style={{
                  background: status.hasFounder
                    ? "#4ADE80"
                    : !isFounder
                      ? "#888"
                      : claiming === "founder"
                        ? "#ccc"
                        : "#000",
                  color: "white",
                  cursor:
                    !isFounder || status.hasFounder ? "not-allowed" : "pointer",
                }}
              >
                {status.hasFounder
                  ? "✓ Founder Claimed"
                  : claiming === "founder"
                    ? "Claiming…"
                    : !isFounder
                      ? "Founder Access Only"
                      : "Claim Founder NFT"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Claimed cards display */}
      {(status.hasPioneer || status.hasFounder) && (
        <div className="mt-12">
          <h2 className="font-black text-xl uppercase tracking-tight mb-6">
            Your Collection
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {status.hasFounder && (
              <div className="border-4 border-black bg-white p-3 flex flex-col gap-2 shadow-[4px_4px_0px_0px_rgba(255,69,0,1)]">
                <div className="relative aspect-square w-full overflow-hidden border-2 border-black">
                  <Image
                    src="https://amber-important-primate-357.mypinata.cloud/ipfs/bafybeiaaxfuvglz5is7pmn5m2lthoyyit7rjzlt6irabyrgd5byy3esg5i"
                    alt="Founder NFT"
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
                <p className="font-black text-xs uppercase text-center">
                  Forge Founder
                </p>
                <p className="text-[9px] font-bold text-black/40 uppercase tracking-widest text-center">
                  1 of 1
                </p>
              </div>
            )}
            {status.hasPioneer && (
              <div className="border-4 border-black bg-white p-3 flex flex-col gap-2 shadow-[4px_4px_0px_0px_rgba(255,215,0,1)]">
                <div className="relative aspect-square w-full overflow-hidden border-2 border-black">
                  <Image
                    src="https://amber-important-primate-357.mypinata.cloud/ipfs/bafybeigjn3cdrocvxavacumjnz6ic6mdzghuxvzvzojkrxilijsnzzlqyi"
                    alt="Pioneer NFT"
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
                <p className="font-black text-xs uppercase text-center">
                  Forge Pioneer
                </p>
                <p className="text-[9px] font-bold text-black/40 uppercase tracking-widest text-center">
                  #{status.pioneerMinted} of 100
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
