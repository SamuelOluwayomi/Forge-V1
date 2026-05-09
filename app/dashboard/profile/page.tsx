"use client";

import { useState, useRef, useEffect } from "react";
import { useWallet } from "@/app/lib/wallet/context";
import { useEscrow } from "@/app/lib/hooks/useEscrow";
import { useBalance } from "@/app/lib/hooks/use-balance";
import { toast } from "sonner";
import { supabase } from "@/app/lib/supabase";
import { ForgeLoader } from "@/app/components/ForgeLoader";
import { 
  PublicKey, 
  SystemProgram, 
  SYSVAR_RENT_PUBKEY 
} from "@solana/web3.js";
import { 
  TOKEN_PROGRAM_ID, 
  ASSOCIATED_TOKEN_PROGRAM_ID 
} from "@solana/spl-token";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { XLogo, GithubLogo, DiscordLogo, TelegramLogo } from "@phosphor-icons/react";
import { TechStackVerification } from "@/app/components/TechStackVerification";
import { TechStackInline } from "@/app/components/TechStackBadges";

function BadgeCard({ badge, index, onMint }: { badge: any; index: number; onMint?: () => void }) {
  const colors = ["#FF4500", "#FFD700", "#4ADE80", "#60A5FA", "#FF90E8"];
  const color = colors[index % colors.length];
  
  const typeLabel = badge.badgeType?.workerCompletion ? "Worker" : 
                    badge.badgeType?.clientPayment ? "Client" : 
                    badge.badgeType?.techStackVerification ? "Stack" : "SBT";
  
  const isOnChain = badge.onChain !== false;

  return (
    <div
      className={`brutalist-card bg-white p-4 flex flex-col items-center gap-2 relative min-w-[110px] transition-transform hover:-translate-y-1 ${!isOnChain ? 'opacity-90 border-dashed' : ''}`}
      style={{ borderColor: "black" }}
    >
      <div
        className="w-14 h-14 border-4 border-black flex items-center justify-center font-black text-xl"
        style={{ background: color }}
      >
        {typeLabel === "Worker" && "🛠️"}
        {typeLabel === "Client" && "💰"}
        {typeLabel === "Stack" && "💻"}
        {typeLabel === "SBT" && "✨"}
      </div>
      <div className="text-center">
        <p className="font-black text-[9px] uppercase tracking-tighter">{typeLabel} Badge</p>
        <p className="text-[7px] font-bold text-black/60 uppercase tracking-widest truncate max-w-[90px]">
          {badge.skillCategory || `Task #${badge.taskId}`}
        </p>
      </div>
      
      {!isOnChain ? (
        <button 
          onClick={(e) => { e.stopPropagation(); onMint?.(); }}
          className="bg-primary text-white text-[8px] font-black px-3 py-1 uppercase tracking-widest border-2 border-black hover:bg-black hover:text-primary transition-all mt-1"
        >
          Mint
        </button>
      ) : (
        <div className="bg-black text-white text-[6px] font-black px-2 py-0.5 uppercase tracking-widest">
          On-Chain
        </div>
      )}
    </div>
  );
}

export default function ProfilePage() {
  const { wallet } = useWallet();
  const router = useRouter();
  const address = wallet?.account.address ?? "";

  const [displayPhoto, setDisplayPhoto] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const balance = useBalance(address || undefined);

  // Profile details
  const [profileData, setProfileData] = useState({
    name: "",
    title: "",
    bio: "",
  });
  const [socials, setSocials] = useState({
    twitter: "",
    github: "",
    discord: "",
    telegram: "",
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [rank, setRank] = useState<number>(0);
  const [totalDevs, setTotalDevs] = useState<number>(0);
  const [rankCountdown, setRankCountdown] = useState("");
  const [sbtMint, setSbtMint] = useState<string | null>(null);
  const [sbtMinting, setSbtMinting] = useState(false);
  const [hasPioneer, setHasPioneer] = useState(false);
  const [hasFounder, setHasFounder] = useState(false);
  const [selectedNft, setSelectedNft] = useState<{ type: 'founder' | 'pioneer' | 'sbt', uri?: string } | null>(null);
  
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareImage, setShareImage] = useState<string | null>(null);
  const [generatingShare, setGeneratingShare] = useState(false);
  const [pioneerPdaAddr, setPioneerPdaAddr] = useState<string | null>(null);
  const [founderPdaAddr, setFounderPdaAddr] = useState<string | null>(null);
  const [showStackModal, setShowStackModal] = useState(false);
  const [techStack, setTechStack] = useState<string | null>(null);
  const [techStackPdaAddr, setTechStackPdaAddr] = useState<string | null>(null);

  const [stats, setStats] = useState([
    { label: "Tasks Completed", value: 0 },
    { label: "Tasks Posted", value: 0 },
    { label: "SOL Earned", value: "0.00" },
    { label: "Forge Score", value: 0 },
  ]);

  const { program, sbtProgram } = useEscrow();

  const [badges, setBadges] = useState<any[]>([]);
  const achievements: string[] = [];

  // Fetch profile on load
  useEffect(() => {
    if (!address || !supabase) return;

    const fetchProfile = async () => {
      setLoading(true);
      const { data, error } = await supabase!
        .from("profiles")
        .select(
          "avatar_url, twitter, github, discord, telegram, rank, name, title, bio, profile_sbt_mint, tech_stack"
        )
        .eq("wallet_address", address)
        .single();

      if (data) {
        if (data.avatar_url) setDisplayPhoto(data.avatar_url);
        setSbtMint(data.profile_sbt_mint || null);
        setProfileData({
          name: data.name || "",
          title: data.title || "",
          bio: data.bio || "",
        });
        if (!data.name) setIsEditing(true);
        setSocials({
          twitter: data.twitter || "",
          github: data.github || "",
          discord: data.discord || "",
          telegram: data.telegram || "",
        });
        if (data.rank) setRank(data.rank);
        if (data.tech_stack) setTechStack(data.tech_stack);
      }
      setLoading(false);
    };

    fetchProfile();

    // Fetch total dev count for ranking context
    const fetchTotalDevs = async () => {
      if (!supabase) return;
      const { count } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });
      if (count) setTotalDevs(count);
    };

    const fetchRewards = async () => {
      if (!sbtProgram || !address) return;
      try {
        const userPubkey = new PublicKey(address);
        
        const [pioneerPda] = await PublicKey.findProgramAddress(
          [Buffer.from("pioneer_v2"), userPubkey.toBuffer()],
          sbtProgram.programId
        );
        setPioneerPdaAddr(pioneerPda.toBase58());
        try {
          await (sbtProgram.account as any).specialNft.fetch(pioneerPda);
          setHasPioneer(true);
        } catch {}

        const [founderPda] = await PublicKey.findProgramAddress(
          [Buffer.from("founder_v2"), userPubkey.toBuffer()],
          sbtProgram.programId
        );
        setFounderPdaAddr(founderPda.toBase58());
        try {
          await (sbtProgram.account as any).specialNft.fetch(founderPda);
          setHasFounder(true);
        } catch {}
        
        const [techStackPda] = await PublicKey.findProgramAddress(
          [Buffer.from("stack_mint_v2"), userPubkey.toBuffer()],
          sbtProgram.programId
        );
        
        // Only set the address if the token mint account actually exists on-chain
        try {
          const accountInfo = await sbtProgram.provider.connection.getAccountInfo(techStackPda);
          if (accountInfo !== null) {
            setTechStackPdaAddr(techStackPda.toBase58());
          }
        } catch (e) {
          console.error("Failed to fetch tech stack mint account info", e);
        }
        
      } catch (error) {
        console.error("Error fetching rewards:", error);
      }
    };

    fetchRewards();
    fetchProfile();
    fetchTotalDevs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, sbtProgram?.programId.toBase58()]);

  // Countdown to midnight UTC (ranking refresh)
  useEffect(() => {
    const update = () => {
      const now = new Date();
      const midnight = new Date(now);
      midnight.setUTCHours(24, 0, 0, 0);
      const diff = midnight.getTime() - now.getTime();
      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);
      setRankCountdown(`${h}h ${m}m ${s}s`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch real on-chain stats
  useEffect(() => {
    if (!program || !address) return;

    const fetchOnChainStats = async () => {
      try {
        const allEscrows = await (program.account as any).escrowAccount.all();
        const activeEscrows = allEscrows.filter(
          (e: any) => !Object.keys(e.account.status).includes("cancelled")
        );

        const posted = activeEscrows.filter(
          (e: any) => e.account.client.toBase58() === address
        ).length;

        const completedEscrows = activeEscrows.filter(
          (e: any) =>
            e.account.worker &&
            e.account.worker.toBase58() === address &&
            Object.keys(e.account.status).includes("completed")
        );

        const earned =
          completedEscrows.reduce(
            (acc: number, e: any) => acc + Number(e.account.amount),
            0
          ) / 1_000_000_000;

        // Simple Forge Score formula for now: 100 points per completed task
        const forgeScore = completedEscrows.length * 100;

        setStats([
          { label: "Tasks Completed", value: completedEscrows.length },
          { label: "Tasks Posted", value: posted },
          { label: "SOL Earned", value: earned.toFixed(2) },
          { label: "Forge Score", value: forgeScore },
        ]);
        
        let onChainBadges: any[] = [];
        if (sbtProgram) {
          try {
            const allBadges = await (sbtProgram.account as any).badgeRecord.all();
            const userBadges = allBadges.filter((b: any) => b.account.owner.toBase58() === address);
            onChainBadges = userBadges.map((b: any) => ({ ...b.account, onChain: true }));
          } catch (err) {
            console.error("Failed to fetch SBT badges:", err);
          }
        }

        // 2. Generate "Verified" (off-chain) badges from database if on-chain doesn't exist yet
        const offChainBadges = completedEscrows.map((e: any) => {
          const taskId = Number(e.account.taskId);
          // Check if we already have an on-chain badge for this task
          const hasOnChain = onChainBadges.some(b => Number(b.taskId) === taskId && b.badgeType?.workerCompletion);
          
          if (!hasOnChain) {
            return {
              owner: address,
              badgeType: { workerCompletion: {} },
              taskId: taskId,
              skillCategory: "Verified Task",
              rating: 5,
              onChain: false,
              amount: e.account.amount,
            };
          }
          return null;
        }).filter(Boolean);

        setBadges([...onChainBadges, ...offChainBadges]);

        // Sync forge_score to Supabase for rankings
        if (supabase && forgeScore > 0) {
          await supabase.from("profiles").upsert({
            wallet_address: address,
            forge_score: forgeScore,
            updated_at: new Date().toISOString(),
          });

          // Calculate dynamic rank: count of users with higher score + 1
          const { count } = await supabase
            .from("profiles")
            .select("*", { count: "exact", head: true })
            .gt("forge_score", forgeScore);

          setRank((count || 0) + 1);
        }
      } catch (err) {
        console.error("Failed to fetch profile stats:", err);
      }
    };

    fetchOnChainStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [program?.programId.toBase58(), sbtProgram?.programId.toBase58(), address]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !address || !supabase) return;
    setAvatarFile(file);

    try {
      toast.loading("Uploading photo...", { id: "upload" });

      // 1. Upload image to Supabase Storage
      const fileExt = file.name.split(".").pop();
      const fileName = `${address}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase!.storage
        .from("avatars")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. Get public URL
      const {
        data: { publicUrl },
      } = supabase!.storage.from("avatars").getPublicUrl(filePath);

      // 3. Update Profile Table
      const { error: dbError } = await supabase!.from("profiles").upsert({
        wallet_address: address,
        avatar_url: publicUrl,
        updated_at: new Date().toISOString(),
      });

      if (dbError) throw dbError;

      setDisplayPhoto(publicUrl);
      toast.success("Profile photo updated successfully!", { id: "upload" });
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to upload photo: " + err.message, { id: "upload" });
    }
  };

  const handleDownloadCard = async () => {
    try {
      // @ts-ignore
      const { toPng } = await import("html-to-image");
      const card = document.getElementById("profile-card");
      if (!card) return;

      toast.loading("Rendering card...", { id: "download" });

      const dataUrl = await toPng(card, {
        pixelRatio: 2,
        filter: (node: HTMLElement) => {
          if (node instanceof HTMLElement && node.getAttribute("data-html2canvas-ignore") === "true") {
            return false;
          }
          return true;
        }
      });

      const link = document.createElement("a");
      link.download = `forge-profile-${address.slice(0, 8)}.png`;
      link.href = dataUrl;
      link.click();

      toast.success("Profile card downloaded!", { id: "download" });
    } catch (err) {
      console.error("Download failed:", err);
      toast.error("Failed to render card. Try again.", { id: "download" });
    }
  };

  const shareText = `Check out my Forge Developer Profile! \n\nForge Score: ${stats[3].value}\nWallet: ${address.slice(0, 4)}...${address.slice(-4)}\n\nBuilt on @Solana #ForgeProtocol`;
  const shareUrl = typeof window !== "undefined" ? window.location.href : "https://forge.dev";

  const handleOpenShare = async () => {
    setGeneratingShare(true);
    setShowShareModal(true);
    try {
      // @ts-ignore
      const { toPng } = await import("html-to-image");
      const card = document.getElementById("profile-card");
      if (!card) return;
      
      const dataUrl = await toPng(card, {
        pixelRatio: 2,
        filter: (node: HTMLElement) => {
          if (node instanceof HTMLElement && node.getAttribute("data-html2canvas-ignore") === "true") {
            return false;
          }
          return true;
        }
      });
      setShareImage(dataUrl);
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate share image.");
      setShowShareModal(false);
    } finally {
      setGeneratingShare(false);
    }
  };

  const handleShareTwitter = async () => {
    // Directly open Twitter intent to ensure we actually go to X (bypassing generic OS share dialog)
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(twitterUrl, "_blank");
  };

  const handleCopyImage = async () => {
    if (!shareImage) return;
    try {
      const response = await fetch(shareImage);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);
      toast.success("Image copied to clipboard! You can now paste it directly on your post.");
    } catch (err) {
      console.error(err);
      toast.error("Failed to copy image.");
    }
  };

  const handleShareTelegram = () => {
    const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`;
    window.open(telegramUrl, "_blank");
  };

  const handleSaveProfile = async () => {
    if (!address || !supabase) return;
    setSavingProfile(true);
    try {
      const { error } = await supabase.from("profiles").upsert({
        wallet_address: address,
        name: profileData.name,
        title: profileData.title,
        bio: profileData.bio,
        twitter: socials.twitter,
        github: socials.github,
        discord: socials.discord,
        telegram: socials.telegram,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
      toast.success("Profile updated!");
      setIsEditing(false);
    } catch (err: any) {
      toast.error("Failed to save: " + err.message);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleMintSBT = async () => {
    if (!profileData.name || !profileData.title) {
      toast.error(
        "Please set your Name and Title before minting your identity."
      );
      return;
    }

    if (!sbtProgram || !address) {
      toast.error("Program not loaded or wallet not connected.");
      return;
    }

    setSbtMinting(true);
    const tid = toast.loading(
      "Forging your on-chain identity via Forge SBT Program..."
    );

    try {
      // 1. Upload to Pinata IPFS to get metadata URI
      const formData = new FormData();
      formData.append("type", "metadata");
      formData.append(
        "metadata",
        JSON.stringify({
          name: `${profileData.name} — Forge Identity`,
          description: profileData.bio || "Forge Contributor",
          image: displayPhoto || "",
          attributes: [{ trait_type: "Title", value: profileData.title || "Forge Contributor" }],
        })
      );

      const res = await fetch("/api/upload-to-ipfs", {
        method: "POST",
        body: formData,
      });

      const result = await res.json();
      if (!res.ok)
        throw new Error(result.error || "Failed to upload metadata to IPFS");
      const metadataUri = result.uri;

      // 2. Compute PDAs
      const ownerPubkey = new PublicKey(address);
      const [profileSbtPda] = await PublicKey.findProgramAddress(
        [Buffer.from("profile_v2"), ownerPubkey.toBuffer()],
        sbtProgram.programId
      );
      const [reputationPda] = await PublicKey.findProgramAddress(
        [Buffer.from("reputation"), ownerPubkey.toBuffer()],
        sbtProgram.programId
      );

      const TOKEN_METADATA_PROGRAM_ID = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");

      const [badgeMint] = await PublicKey.findProgramAddress(
        [Buffer.from("profile_mint_v2"), ownerPubkey.toBuffer()],
        sbtProgram.programId
      );

      const [workerBadgeAccount] = await PublicKey.findProgramAddress(
        [ownerPubkey.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), badgeMint.toBuffer()],
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      const [badgeMetadata] = await PublicKey.findProgramAddress(
        [Buffer.from("metadata"), TOKEN_METADATA_PROGRAM_ID.toBuffer(), badgeMint.toBuffer()],
        TOKEN_METADATA_PROGRAM_ID
      );

      const [badgeEdition] = await PublicKey.findProgramAddress(
        [Buffer.from("metadata"), TOKEN_METADATA_PROGRAM_ID.toBuffer(), badgeMint.toBuffer(), Buffer.from("edition")],
        TOKEN_METADATA_PROGRAM_ID
      );

      // 3. Build and send sponsored transaction (Forge pays fees)
      const { sendSponsoredTransaction, FORGE_FEE_PAYER_PUBKEY } = await import("@/app/lib/sponsored-tx");

      const tx = await (sbtProgram.methods as any)
        .mintProfileSbt(
          profileData.name,
          profileData.bio,
          profileData.title,
          metadataUri
        )
        .accounts({
          profileSbt: profileSbtPda,
          reputation: reputationPda,
          owner: ownerPubkey,
          badgeMint,
          workerBadgeAccount,
          badgeMetadata,
          badgeEdition,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .transaction();

      tx.instructions.unshift(
        SystemProgram.transfer({
          fromPubkey: new PublicKey(FORGE_FEE_PAYER_PUBKEY),
          toPubkey: ownerPubkey,
          lamports: 18_000_000, // ~0.018 SOL to cover PDA rents and NFT creation
        })
      );

      // signTransaction shim — matches what useEscrow uses
      const signTx = async (transaction: any) => {
        if (!wallet || !wallet.signTransaction) throw new Error("Wallet not connected");
        const serialized = transaction.serialize({ requireAllSignatures: false });
        const signedBytes = await wallet.signTransaction(serialized, "solana:devnet");
        const { Transaction } = await import("@solana/web3.js");
        return Transaction.from(signedBytes);
      };

      await sendSponsoredTransaction(tx, signTx);

      // 4. Save to Supabase
      await supabase!
        .from("profiles")
        .update({ profile_sbt_mint: profileSbtPda.toString() })
        .eq("wallet_address", address);

      setSbtMint(profileSbtPda.toString());
      toast.success("Your on-chain identity has been forged!", { id: tid });
    } catch (err: any) {
      toast.error("Mint failed: " + (err.message || "Unknown error"), {
        id: tid,
      });
    } finally {
      setSbtMinting(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full flex items-center justify-center min-h-[60vh]">
        <ForgeLoader />
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-10">
        <div
          className="brutalist-tape text-xs px-3 py-1 inline-block mb-3"
          style={{ transform: "rotate(-1deg)" }}
        >
          Identity
        </div>
        <h1 className="text-5xl md:text-6xl font-black uppercase leading-none text-black italic tracking-tighter">
          Profile
        </h1>
      </div>

      <div className="flex flex-col gap-8">
        {/* Onboarding Call-to-Action for new users */}
        {!sbtMint && !loading && (
          <div className="brutalist-card bg-primary p-6 border-[3px] border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden group animate-in slide-in-from-top duration-500">
             {/* Decorative tape */}
             <div className="absolute top-0 right-10 w-16 h-6 bg-black rotate-3 opacity-20 group-hover:rotate-6 transition-transform"></div>
             
             <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-black text-white flex items-center justify-center shrink-0 shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
                   <span className="font-black text-3xl">★</span>
                </div>
                <div>
                   <h3 className="font-black text-2xl uppercase tracking-tight leading-none mb-2">Your Identity is Off-Chain</h3>
                   <p className="font-bold text-xs text-black/70 max-w-md">Forge your on-chain identity to permanently anchor your skills, reputation, and achievements on the Solana blockchain.</p>
                </div>
             </div>
             
             <button 
               onClick={handleMintSBT}
               disabled={sbtMinting}
               className="brutalist-button px-8 py-4 bg-black text-white border-black font-black uppercase text-sm hover:bg-white hover:text-black transition-all shadow-[6px_6px_0px_0px_rgba(255,255,255,0.3)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 active:translate-y-0 disabled:opacity-50 min-w-[200px]"
             >
                {sbtMinting ? "Forging Identity..." : "Forge Identity Now"}
             </button>
          </div>
        )}

        {/* Top — Interactive Profile Card */}
        <div className="w-full flex flex-col gap-6">
          <div
            id="profile-card"
            className="brutalist-card bg-[#fdf3e3] p-8 border-[3px] border-black relative overflow-hidden"
          >
            {/* Edge Tapes */}
            <div
              className="absolute -top-3 -left-6 w-24 h-8 bg-primary border-2 border-black z-20 pointer-events-none"
              style={{ transform: "rotate(-8deg)" }}
            />
            <div
              className="absolute -top-3 -right-6 w-24 h-8 bg-black border-2 border-black z-20 pointer-events-none"
              style={{ transform: "rotate(6deg)" }}
            />

            {/* Background texture/noise */}
            <div
              className="absolute inset-0 opacity-10 mix-blend-overlay pointer-events-none z-0"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
              }}
            ></div>

            {/* Forge Logo Watermark */}
            <div className="absolute -bottom-16 -right-16 opacity-[0.03] pointer-events-none z-0">
              <img src="/forge.png" alt="" className="w-[450px] h-auto rotate-[-5deg] grayscale" />
            </div>

            <div className="relative z-10 flex flex-col md:flex-row gap-8 items-start justify-between">
              {/* Left Side: Photo & Actions */}
              <div className="flex flex-col gap-4 items-center shrink-0 w-full md:w-auto">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-32 h-32 bg-white border-[3px] border-black flex flex-col items-center justify-center relative cursor-pointer hover:bg-gray-100 transition-colors overflow-hidden group"
                >
                  {displayPhoto ? (
                    <>
                      <img src={displayPhoto} alt="Profile" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-white font-black text-[10px] uppercase tracking-widest">Change</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="font-black text-4xl text-black/20 group-hover:text-black/50 transition-colors">+</span>
                      <span className="text-[10px] font-black uppercase text-black/40 mt-1">Photo</span>
                    </>
                  )}
                </div>
                <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} accept="image/*" className="hidden" />

                {/* Action Buttons */}
                <div className="flex flex-row md:flex-col w-full md:w-32 gap-2 mt-2" data-html2canvas-ignore="true">
                  <button onClick={handleDownloadCard} className="flex-1 bg-white border-2 border-black py-2 font-black text-[10px] uppercase tracking-widest hover:bg-black hover:text-white transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5">
                    Download
                  </button>
                  <button onClick={handleOpenShare} disabled={generatingShare} className="flex-1 bg-black text-white border-2 border-black py-2 font-black text-[10px] uppercase tracking-widest hover:bg-primary hover:text-black transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 disabled:opacity-50">
                    {generatingShare ? "..." : "Share"}
                  </button>
                </div>
              </div>

              {/* Middle Side: Identity & Achievements */}
              <div className="flex-1 flex flex-col w-full">
                <h2 className="font-black text-4xl uppercase italic text-black leading-none mb-1">
                  {profileData.name || "Anonymous Dev"}
                </h2>
                <p className="font-bold text-sm uppercase text-black/60 mb-6">
                  {profileData.title || "Forge Contributor"}
                </p>

                {/* Achievements Section */}
                <div className="mb-8">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-black/40 mb-3">Achievements</p>
                  {(!sbtMint && !hasPioneer && !hasFounder) ? (
                    <div className="border-2 border-dashed border-black/10 p-3 text-center w-full md:w-64">
                      <p className="font-bold text-[10px] text-black/30 uppercase tracking-widest">None</p>
                    </div>
                  ) : (
                    <div className="flex gap-3 flex-wrap">
                      {hasFounder && (
                        <div onClick={() => setSelectedNft({ type: 'founder' })} className="border-2 border-black bg-white p-1.5 flex flex-col gap-1 shadow-[2px_2px_0px_0px_rgba(255,69,0,1)] hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_0px_rgba(255,69,0,1)] transition-all cursor-pointer" style={{ width: 80 }} title="Forge Founder (1 of 1)">
                          <div className="relative w-full border border-black overflow-hidden" style={{ height: 50 }}>
                            <Image src="https://amber-important-primate-357.mypinata.cloud/ipfs/bafybeiaaxfuvglz5is7pmn5m2lthoyyit7rjzlt6irabyrgd5byy3esg5i" alt="Founder" fill className="object-cover" unoptimized />
                            <div className="absolute top-0 right-0 bg-black text-white text-[6px] font-black px-1 border-l border-b border-black">1/1</div>
                          </div>
                          <p className="font-black text-[7px] uppercase text-center leading-tight whitespace-nowrap overflow-hidden text-ellipsis">Genesis</p>
                        </div>
                      )}
                      
                      {hasPioneer && (
                        <div onClick={() => setSelectedNft({ type: 'pioneer' })} className="border-2 border-black bg-white p-1.5 flex flex-col gap-1 shadow-[2px_2px_0px_0px_rgba(255,215,0,1)] hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_0px_rgba(255,215,0,1)] transition-all cursor-pointer" style={{ width: 80 }} title="Forge Pioneer (Early Adopter)">
                          <div className="relative w-full border border-black overflow-hidden" style={{ height: 50 }}>
                            <Image src="https://amber-important-primate-357.mypinata.cloud/ipfs/bafybeigjn3cdrocvxavacumjnz6ic6mdzghuxvzvzojkrxilijsnzzlqyi" alt="Pioneer" fill className="object-cover" unoptimized />
                            <div className="absolute top-0 right-0 bg-[#FFD700] text-black text-[6px] font-black px-1 border-l border-b border-black">RARE</div>
                          </div>
                          <p className="font-black text-[7px] uppercase text-center leading-tight whitespace-nowrap overflow-hidden text-ellipsis">Pioneer</p>
                        </div>
                      )}

                      {sbtMint && (
                        <div onClick={() => setSelectedNft({ type: 'sbt', uri: sbtMint })} className="border-2 border-black bg-white px-3 py-2 flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] h-[81px] cursor-pointer hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all">
                          <span className="font-black text-[10px] uppercase tracking-widest text-black flex items-center gap-2">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                              <path d="M22 11.08V12a10 10 0 11-5.93-9.14M22 4L12 14.01l-3-3" />
                            </svg>
                            Soulbound
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Verified Tech Stack */}
                {techStack && (
                  <TechStackInline stack={techStack} />
                )}

                {/* Wallet Details */}
                <div className="border-t-2 border-dashed border-black/10 pt-5 mt-5">
                  <div className="flex flex-col md:flex-row md:items-end gap-4">
                    <div className="flex-1">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-black/40 mb-1">Authenticated Wallet</p>
                      <div className="bg-white border-2 border-black/10 px-3 py-2 font-mono text-[10px] break-all">
                        {address || "Not Connected"}
                      </div>
                    </div>

                    <div className="flex flex-row gap-2 h-fit">
                      {address && (
                        <>
                          <a href={`https://solscan.io/account/${address}?cluster=devnet`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-[8px] font-black uppercase border-2 border-black px-2 py-1.5 hover:bg-black hover:text-white transition-colors">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
                            </svg>
                            Solscan
                          </a>
                          <a href={`https://explorer.solana.com/address/${address}?cluster=devnet`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-[8px] font-black uppercase border-2 border-black px-2 py-1.5 hover:bg-black hover:text-white transition-colors">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
                            </svg>
                            Explorer
                          </a>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 flex-wrap items-center mt-4">
                    {sbtMint ? (
                      <div className="flex items-center gap-2">
                        <a href={`https://explorer.solana.com/address/${sbtMint}?cluster=devnet`} target="_blank" className="flex items-center gap-2 text-[9px] font-black uppercase text-black hover:underline">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
                          </svg>
                          Forge Identity
                        </a>
                        <button onClick={handleMintSBT} disabled={sbtMinting} className="text-[7px] font-black uppercase text-black/40 hover:text-black transition-colors underline">
                          Refresh
                        </button>
                      </div>
                    ) : (
                      <button onClick={handleMintSBT} disabled={sbtMinting} className="flex items-center gap-2 text-[9px] font-black uppercase text-white bg-black px-4 py-2 border-2 border-black hover:bg-primary hover:text-black transition-colors disabled:opacity-50 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                        {sbtMinting ? "Forging..." : "★ Forge Identity"}
                      </button>
                    )}
                  </div>

                  {/* NFT PDA on-chain links */}
                  {(hasPioneer || hasFounder || techStack) && (
                    <div className="mt-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-black/40 mb-2">On-Chain NFT Accounts</p>
                      <div className="flex flex-row flex-wrap gap-2">
                        {techStack && techStackPdaAddr && (
                          <a
                            href={`https://explorer.solana.com/address/${techStackPdaAddr}?cluster=devnet`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-[9px] font-black uppercase border-2 border-black bg-black/5 px-2 py-1.5 hover:bg-black hover:text-white transition-colors"
                          >
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
                            </svg>
                            Tech Stack — {techStackPdaAddr.slice(0, 4)}...{techStackPdaAddr.slice(-4)}
                          </a>
                        )}

                        {hasPioneer && pioneerPdaAddr && (
                          <a
                            href={`https://explorer.solana.com/address/${pioneerPdaAddr}?cluster=devnet`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-[9px] font-black uppercase border-2 border-[#FFD700] bg-[#FFD700]/10 px-2 py-1.5 hover:bg-[#FFD700] transition-colors"
                          >
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
                            </svg>
                            Pioneer — {pioneerPdaAddr.slice(0, 4)}...{pioneerPdaAddr.slice(-4)}
                          </a>
                        )}
                        {hasFounder && founderPdaAddr && (
                          <a
                            href={`https://explorer.solana.com/address/${founderPdaAddr}?cluster=devnet`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-[9px] font-black uppercase border-2 border-[#FF4500] bg-[#FF4500]/10 px-2 py-1.5 hover:bg-[#FF4500] hover:text-white transition-colors"
                          >
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
                            </svg>
                            Founder — {founderPdaAddr.slice(0, 4)}...{founderPdaAddr.slice(-4)}
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Side: Score/Rank Badges */}
              <div className="flex flex-row md:flex-col gap-3 shrink-0 mt-6 md:mt-0 items-end h-full justify-between">
                <div className="flex flex-row md:flex-col gap-3 items-end">
                  {rank > 0 && (
                    <div className="bg-[#FFD700] text-black px-4 py-3 border-[3px] border-black flex flex-col items-center" style={{ transform: "rotate(-2deg)" }}>
                      <span className="text-[10px] font-black uppercase tracking-widest leading-none mb-1">Rank</span>
                      <span className="font-black text-3xl leading-none">#{rank}</span>
                    </div>
                  )}
                  <div className="bg-black text-white px-4 py-3 border-[3px] border-black flex flex-col items-center" style={{ transform: "rotate(2deg)" }}>
                    <span className="text-[10px] font-black uppercase tracking-widest text-primary leading-none mb-1">Score</span>
                    <span className="font-black text-3xl leading-none">{stats[3].value}</span>
                  </div>
                </div>

                {/* Powered by Forge Logo */}
                <div className="hidden md:flex flex-col items-end mt-auto pt-10 opacity-60 pointer-events-none">
                  <span className="text-[8px] font-black uppercase tracking-widest text-black/50 mb-1">Powered by</span>
                  <img src="/forge.png" alt="Forge Protocol" className="w-24 h-auto grayscale" />
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom — stats + badges */}
        <div className="w-full flex flex-col gap-6">
          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-4">
            {stats.map((s) => (
              <div
                key={s.label}
                className="brutalist-card bg-white p-5 flex flex-col gap-1"
              >
                <p className="text-[10px] font-black uppercase tracking-widest text-black/50">
                  {s.label}
                </p>
                <p className="font-black text-4xl text-black tabular-nums leading-none">
                  {s.value}
                </p>
              </div>
            ))}
          </div>

          {/* Ranking Standing */}
          <div className="brutalist-card bg-[#FFD700] p-6 border-4 border-black relative overflow-hidden">
            <div
              className="absolute inset-0 opacity-10 mix-blend-overlay pointer-events-none"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
              }}
            />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-black text-xl uppercase tracking-tight text-black">
                  Your Ranking
                </h2>
                <div className="bg-black text-white px-2 py-0.5 text-[10px] font-black uppercase border border-black">
                  Global
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div
                  className="bg-black text-white px-5 py-4 border-2 border-black flex flex-col items-center"
                  style={{ transform: "rotate(-2deg)" }}
                >
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#FFD700] leading-none mb-1">
                    Rank
                  </span>
                  <span className="font-black text-4xl leading-none">
                    {rank > 0 ? `#${rank}` : "—"}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="font-black text-sm text-black/80">
                    {rank > 0
                      ? `You are ranked #${rank} out of ${totalDevs || "?"} developers`
                      : "Complete tasks to earn your ranking"}
                  </p>
                  <div className="flex items-center gap-2 mt-3">
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 6v6l4 2" />
                    </svg>
                    <span className="text-[10px] font-black uppercase tracking-widest text-black/60">
                      Next refresh in {rankCountdown}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Profile Details (Read or Edit Mode) */}
          <div className="brutalist-card bg-white p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-black text-xl uppercase tracking-tight">
                {isEditing ? "Edit Profile" : "Profile Details"}
              </h2>
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="bg-black text-white px-3 py-1 font-black text-[10px] uppercase tracking-widest border-2 border-black hover:bg-primary hover:text-black transition-colors"
                >
                  Edit Profile
                </button>
              )}
            </div>

            {isEditing ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-black/50">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={profileData.name}
                      onChange={(e) =>
                        setProfileData({ ...profileData, name: e.target.value })
                      }
                      placeholder="John Doe"
                      className="border-2 border-black bg-background px-3 py-2 font-bold text-sm text-black outline-none focus:border-primary placeholder:text-black/30"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-black/50">
                      Title / Role
                    </label>
                    <input
                      type="text"
                      value={profileData.title}
                      onChange={(e) =>
                        setProfileData({
                          ...profileData,
                          title: e.target.value,
                        })
                      }
                      placeholder="Full Stack Engineer"
                      className="border-2 border-black bg-background px-3 py-2 font-bold text-sm text-black outline-none focus:border-primary placeholder:text-black/30"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1 mb-4">
                  <label className="text-[10px] font-black uppercase tracking-widest text-black/50">
                    Bio / About
                  </label>
                  <textarea
                    value={profileData.bio}
                    onChange={(e) =>
                      setProfileData({ ...profileData, bio: e.target.value })
                    }
                    placeholder="Tell the world about yourself..."
                    rows={4}
                    className="border-2 border-black bg-background px-3 py-2 font-bold text-sm text-black outline-none focus:border-primary placeholder:text-black/30 resize-none"
                  />
                </div>

                <h2 className="font-black text-xl uppercase tracking-tight mb-4 mt-8">
                  Social Accounts
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-black/50">
                      X (Twitter)
                    </label>
                    <input
                      type="text"
                      value={socials.twitter}
                      onChange={(e) =>
                        setSocials({ ...socials, twitter: e.target.value })
                      }
                      placeholder="@username"
                      className="border-2 border-black bg-background px-3 py-2 font-bold text-sm text-black outline-none focus:border-primary placeholder:text-black/30"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-black/50">
                      GitHub
                    </label>
                    <input
                      type="text"
                      value={socials.github}
                      onChange={(e) =>
                        setSocials({ ...socials, github: e.target.value })
                      }
                      placeholder="username"
                      className="border-2 border-black bg-background px-3 py-2 font-bold text-sm text-black outline-none focus:border-primary placeholder:text-black/30"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-black/50">
                      Discord
                    </label>
                    <input
                      type="text"
                      value={socials.discord}
                      onChange={(e) =>
                        setSocials({ ...socials, discord: e.target.value })
                      }
                      placeholder="username#1234"
                      className="border-2 border-black bg-background px-3 py-2 font-bold text-sm text-black outline-none focus:border-primary placeholder:text-black/30"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-black/50">
                      Telegram
                    </label>
                    <input
                      type="text"
                      value={socials.telegram}
                      onChange={(e) =>
                        setSocials({ ...socials, telegram: e.target.value })
                      }
                      placeholder="@username"
                      className="border-2 border-black bg-background px-3 py-2 font-bold text-sm text-black outline-none focus:border-primary placeholder:text-black/30"
                    />
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleSaveProfile}
                    disabled={savingProfile}
                    className="brutalist-button px-8 py-3 bg-black text-white border-black text-sm disabled:opacity-50 flex-1"
                  >
                    {savingProfile ? "Saving..." : "Save Profile Details"}
                  </button>
                  {profileData.name && (
                    <button
                      onClick={() => setIsEditing(false)}
                      className="brutalist-button px-6 py-3 bg-white text-black border-2 border-black text-sm"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </>
            ) : (
              <div className="space-y-6">
                <div>
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-black/40 mb-2">
                    Bio / About
                  </h3>
                  <p className="font-bold text-sm leading-relaxed whitespace-pre-wrap text-black/80">
                    {profileData.bio || "No bio added yet."}
                  </p>
                </div>

                <div className="border-t-2 border-black/10 pt-6">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-black/40 mb-3">
                    Social Accounts
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    {socials.twitter && (
                      <a
                        href={`https://x.com/${socials.twitter.replace("@", "")}`}
                        target="_blank"
                        className="flex items-center gap-3 p-3 border-2 border-black/10 hover:border-black hover:bg-black/5 transition-all group"
                      >
                        <XLogo className="w-5 h-5 group-hover:text-[#1DA1F2]" weight="bold" />
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-black/40 mb-0.5">
                            X (Twitter)
                          </p>
                          <p className="font-mono text-xs font-bold truncate block group-hover:underline">
                            {socials.twitter}
                          </p>
                        </div>
                      </a>
                    )}
                    {socials.github && (
                      <div className="flex flex-col gap-2">
                        <a
                          href={`https://github.com/${socials.github.replace("@", "")}`}
                          target="_blank"
                          className="flex items-center gap-3 p-3 border-2 border-black/10 hover:border-black hover:bg-black/5 transition-all group"
                        >
                          <GithubLogo className="w-5 h-5 group-hover:text-[#333]" weight="bold" />
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-widest text-black/40 mb-0.5">
                              GitHub
                            </p>
                            <p className="font-mono text-xs font-bold truncate block group-hover:underline">
                              {socials.github}
                            </p>
                          </div>
                        </a>
                        <button 
                          onClick={() => setShowStackModal(true)}
                          className="brutalist-button py-2 bg-black text-white text-[10px] uppercase font-black tracking-widest border-black"
                        >
                          {techStack ? "Update Tech Stack" : "Verify Tech Stack"}
                        </button>
                      </div>
                    )}
                    {socials.discord && (
                      <div
                        className="flex items-center gap-3 p-3 border-2 border-black/10 hover:border-black hover:bg-black/5 transition-all group cursor-pointer"
                        onClick={() => {
                          navigator.clipboard.writeText(socials.discord);
                          toast.success("Discord copied!");
                        }}
                      >
                        <DiscordLogo className="w-5 h-5 group-hover:text-[#5865F2]" weight="bold" />
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-black/40 mb-0.5">
                            Discord
                          </p>
                          <p className="font-mono text-xs font-bold truncate block group-hover:underline">
                            {socials.discord}
                          </p>
                        </div>
                      </div>
                    )}
                    {socials.telegram && (
                      <a
                        href={`https://t.me/${socials.telegram.replace("@", "")}`}
                        target="_blank"
                        className="flex items-center gap-3 p-3 border-2 border-black/10 hover:border-black hover:bg-black/5 transition-all group"
                      >
                        <TelegramLogo className="w-5 h-5 group-hover:text-[#0088cc]" weight="bold" />
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-black/40 mb-0.5">
                            Telegram
                          </p>
                          <p className="font-mono text-xs font-bold truncate block group-hover:underline">
                            {socials.telegram}
                          </p>
                        </div>
                      </a>
                    )}
                    {!socials.twitter &&
                      !socials.github &&
                      !socials.discord &&
                      !socials.telegram && (
                        <p className="text-xs font-bold text-black/40 italic col-span-2">
                          No social accounts linked.
                        </p>
                      )}
                  </div>
                </div>

              </div>
            )}
          </div>


          {/* SBT Badges */}
          <div className="bg-[#e0e0e0] border-4 border-black p-8 relative overflow-hidden">
            {Number(balance) < 0.005 && (
              <div className="bg-primary text-white border-2 border-black px-4 py-2 mb-6 font-black uppercase text-xs animate-pulse">
                ⚠️ Insufficient Funds: You need at least 0.01 SOL to initialize
                your on-chain reputation.
              </div>
            )}
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-black text-xl uppercase tracking-tight">
                Soulbound Badges
              </h2>
              <div
                className="brutalist-tape text-[10px] px-2 py-0.5"
                style={{ transform: "rotate(2deg)" }}
              >
                Non-transferable
              </div>
            </div>

            {badges.length === 0 ? (
              <div className="border-2 border-dashed border-black/20 p-10 text-center">
                <p className="font-black text-black/30 uppercase text-sm">
                  No badges yet
                </p>
                <p className="font-bold text-xs text-black/30 mt-2">
                  Complete tasks to earn permanent on-chain SBT badges.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                {badges.map((badge, i) => (
                  <BadgeCard 
                    key={i} 
                    index={i} 
                    badge={badge} 
                    onMint={() => {
                      if (badge.badgeType?.workerCompletion) {
                        router.push(`/dashboard/tasks/${badge.taskId}`);
                      } else if (badge.badgeType?.techStackVerification) {
                        // Show verification modal or similar
                        toast.info("Please use the 'Verified Tech Stack' section to mint.");
                      }
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* NFT details modal */}
      {selectedNft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedNft(null)}>
          <div className="bg-white border-4 border-black p-6 w-full max-w-md shadow-[8px_8px_0px_0px_rgba(255,69,0,1)] animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-black text-2xl uppercase italic">Achievement</h3>
              <button onClick={() => setSelectedNft(null)} className="font-black text-2xl hover:text-[#FF4500]">×</button>
            </div>
            
            {selectedNft.type === 'founder' && (
              <div className="flex flex-col gap-4">
                <div className="w-full aspect-square relative border-4 border-black">
                  <Image src="https://amber-important-primate-357.mypinata.cloud/ipfs/bafybeiaaxfuvglz5is7pmn5m2lthoyyit7rjzlt6irabyrgd5byy3esg5i" alt="Founder" fill className="object-cover" unoptimized />
                </div>
                <div>
                  <h4 className="font-black text-2xl uppercase text-[#FF4500]">Forge Founder</h4>
                  <p className="font-bold text-sm text-black/60 uppercase tracking-widest">1 of 1 — Genesis</p>
                  <p className="mt-4 font-bold text-sm text-black/80 border-l-4 border-black pl-3 py-1">The original builder of Forge — the trustless freelance marketplace on Solana. Permanent, non-transferable, held by exactly one wallet.</p>
                </div>
              </div>
            )}

            {selectedNft.type === 'pioneer' && (
              <div className="flex flex-col gap-4">
                <div className="w-full aspect-square relative border-4 border-black">
                  <Image src="https://amber-important-primate-357.mypinata.cloud/ipfs/bafybeigjn3cdrocvxavacumjnz6ic6mdzghuxvzvzojkrxilijsnzzlqyi" alt="Pioneer" fill className="object-cover" unoptimized />
                </div>
                <div>
                  <h4 className="font-black text-2xl uppercase text-[#FFD700] drop-shadow-[1px_1px_0px_rgba(0,0,0,1)]">Forge Pioneer</h4>
                  <p className="font-bold text-sm text-black/60 uppercase tracking-widest">Early Adopter</p>
                  <p className="mt-4 font-bold text-sm text-black/80 border-l-4 border-black pl-3 py-1">Awarded to the first 100 developers who forged their identity on the platform. A symbol of early belief and commitment to trustless work.</p>
                </div>
              </div>
            )}

            {selectedNft.type === 'sbt' && (
              <div className="flex flex-col gap-4 items-center text-center py-8">
                <div className="w-24 h-24 bg-black text-white flex items-center justify-center rounded-full mb-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)]">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 11-5.93-9.14M22 4L12 14.01l-3-3" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-black text-2xl uppercase">Soulbound Identity</h4>
                  <p className="font-bold text-sm text-black/60 uppercase tracking-widest mb-4">On-Chain Profile</p>
                  <p className="font-bold text-sm text-black/80 max-w-sm mx-auto">This developer has minted their core identity to the Solana blockchain. Their reputation, completed tasks, and score are permanently anchored on-chain.</p>
                  <a href={`https://explorer.solana.com/address/${selectedNft.uri}?cluster=devnet`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 mt-6 px-6 py-3 bg-black text-white font-black text-xs uppercase hover:bg-primary transition-colors border-2 border-black hover:text-black">
                    View on Explorer
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" /></svg>
                  </a>
                </div>
              </div>
            )}
            
            <button onClick={() => setSelectedNft(null)} className="w-full mt-6 py-3 border-2 border-black font-black uppercase text-xs hover:bg-black hover:text-white transition-colors">
              Close
            </button>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowShareModal(false)}>
          <div className="brutalist-card bg-white w-full max-w-4xl p-6 relative max-h-[90vh] overflow-y-auto shadow-[8px_8px_0px_0px_rgba(255,69,0,1)]" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => {
                setShowShareModal(false);
                setShareImage(null);
              }}
              className="absolute top-4 right-4 w-8 h-8 bg-black text-white flex items-center justify-center font-black text-sm hover:bg-primary transition-colors z-10"
            >
              ✕
            </button>

            <h3 className="text-3xl font-black uppercase italic tracking-tighter mb-6 text-black">
              Share Your Profile
            </h3>

            <div className="flex flex-col md:flex-row gap-8">
              {/* Preview Image */}
              <div className="flex-1 border-4 border-black bg-[#e0e0e0] p-4 flex flex-col items-center justify-center min-h-[300px]">
                {shareImage ? (
                  <img src={shareImage} alt="Profile Preview" className="w-full shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] border-2 border-black" />
                ) : (
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-black border-t-primary animate-spin" />
                    <p className="font-black uppercase text-xs text-black/50">Generating Card...</p>
                  </div>
                )}
              </div>

              {/* Share Options */}
              <div className="flex-1 flex flex-col gap-6">
                <div className="bg-[#60A5FA]/10 border-2 border-[#60A5FA] p-4 relative">
                  <div className="brutalist-tape absolute -top-3 -right-2 text-[10px] px-2 py-0.5 bg-[#60A5FA] text-white" style={{ transform: "rotate(3deg)" }}>
                    Share Content
                  </div>
                  <p className="font-bold text-sm text-black/80 whitespace-pre-wrap">{shareText}</p>
                  <p className="font-bold text-xs text-blue-600 underline mt-3 break-all">{shareUrl}</p>
                </div>

                <div className="flex flex-col gap-3 mt-auto">
                  <button onClick={handleShareTwitter} className="brutalist-button w-full py-4 bg-black text-white border-black text-sm flex items-center justify-center gap-3 hover:bg-[#1DA1F2] transition-colors shadow-[4px_4px_0px_0px_rgba(255,69,0,1)]">
                    <XLogo weight="fill" size={24} /> Share on X
                  </button>
                  <button onClick={handleCopyImage} className="brutalist-button w-full py-4 bg-white text-black border-black text-sm flex items-center justify-center gap-3 hover:bg-primary hover:text-white transition-colors">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>
                    Copy Card Image
                  </button>
                  <button onClick={handleShareTelegram} className="brutalist-button w-full py-4 bg-white text-black border-black text-sm flex items-center justify-center gap-3 hover:bg-[#0088cc] hover:text-white transition-colors">
                    <TelegramLogo weight="fill" size={24} /> Share on Telegram
                  </button>
                  <button onClick={() => {
                    navigator.clipboard.writeText(`${shareText}\n\n${shareUrl}`);
                    toast.success("Copied to clipboard!");
                  }} className="brutalist-button w-full py-4 bg-[#FFD700] text-black border-black text-sm flex items-center justify-center gap-3 hover:bg-black hover:text-white transition-colors">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                    Copy Link & Text
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      <TechStackVerification
        isOpen={showStackModal}
        onClose={() => setShowStackModal(false)}
        currentGithub={socials.github}
        onSuccess={async (stack) => {
          setTechStack(stack);
          if (supabase && address) {
            await supabase.from("profiles").upsert({
              wallet_address: address,
              tech_stack: stack,
              updated_at: new Date().toISOString(),
            });
          }
        }}
      />
    </div>
  );
}
