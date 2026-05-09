"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useWallet } from "@/app/lib/wallet/context";
import { useEscrow } from "@/app/lib/hooks/useEscrow";

interface TechStackVerificationProps {
  isOpen: boolean;
  onClose: () => void;
  currentGithub?: string;
  onSuccess: (stack: string) => void;
}

export function TechStackVerification({ isOpen, onClose, currentGithub, onSuccess }: TechStackVerificationProps) {
  const { wallet } = useWallet();
  const { mintTechStackBadge } = useEscrow();
  const [githubUsername, setGithubUsername] = useState(currentGithub || "");
  const [step, setStep] = useState<"input" | "challenge" | "verifying" | "minting">("input");
  const [challengeCode, setChallengeCode] = useState("");
  const [analyzedStack, setAnalyzedStack] = useState("");
  const [loading, setLoading] = useState(false);

  const startVerification = () => {
    if (!githubUsername) {
      toast.error("Please enter your GitHub username");
      return;
    }
    // Simple deterministic challenge code based on wallet address
    const code = `FORGE-${wallet?.account.address.toString().slice(-4).toUpperCase()}`;
    setChallengeCode(code);
    setStep("challenge");
  };

  const checkAndAnalyze = async () => {
    setStep("verifying");
    setLoading(true);
    const tid = toast.loading("Verifying Bio & Analyzing Stack...");

    try {
      const response = await fetch("/api/ai/verify-stack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          githubUsername,
          walletAddress: wallet?.account.address.toString(),
          challengeCode
        })
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.message || data.error, { id: tid });
        setStep("challenge");
        return;
      }

      toast.success("GitHub Verified! AI suggests: " + data.stack, { id: tid });
      setAnalyzedStack(data.stack);
      setStep("minting");
    } catch (err: any) {
      toast.error("Verification failed: " + err.message, { id: tid });
      setStep("challenge");
    } finally {
      setLoading(false);
    }
  };

  const handleMint = async () => {
    setLoading(true);
    const tid = toast.loading("Minting On-Chain Badge...");

    try {
      // 1. Create a simple metadata JSON for the badge (could be more elaborate)
      const metadata = {
        name: `Forge Tech Stack: ${analyzedStack}`,
        description: `Verified tech stack for GitHub user ${githubUsername}. Analyzed by Forge AI.`,
        image: "https://forge-sbt.vercel.app/badges/tech-stack.png", // Placeholder
        attributes: [
          { trait_type: "GitHub", value: githubUsername },
          { trait_type: "Tech Stack", value: analyzedStack }
        ]
      };
      
      // For this demo, we'll use a fixed URI or upload to Supabase if needed.
      // Let's just use a placeholder for now to speed up the process.
      const metadataUri = "https://gateway.pinata.cloud/ipfs/QmZ..."; 

      const sig = await mintTechStackBadge(analyzedStack, metadataUri);
      toast.success("Badge Minted Successfully!", { id: tid });
      onSuccess(analyzedStack);
      onClose();
    } catch (err: any) {
      toast.error("Minting failed: " + err.message, { id: tid });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="brutalist-card bg-white w-full max-w-md p-8 relative overflow-hidden">
        <button onClick={onClose} className="absolute top-4 right-4 font-black hover:scale-110 transition-transform">X</button>
        
        <div className="relative z-10">
          <h2 className="text-3xl font-black uppercase italic mb-2 tracking-tighter">AI Tech Verification</h2>
          <p className="text-xs font-bold text-black/50 uppercase tracking-widest mb-6">Verify your GitHub skills on-chain</p>

          {step === "input" && (
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase mb-1">GitHub Username</label>
                <input
                  type="text"
                  value={githubUsername}
                  onChange={(e) => setGithubUsername(e.target.value)}
                  placeholder="e.g. satoshinakamoto"
                  className="brutalist-input w-full px-4 py-3 bg-black/5 text-sm font-bold"
                />
              </div>
              <button
                onClick={startVerification}
                className="brutalist-button w-full py-4 bg-primary text-white font-black uppercase tracking-widest"
              >
                Start Verification
              </button>
            </div>
          )}

          {step === "challenge" && (
            <div className="space-y-6">
              <div className="bg-black/5 border-2 border-dashed border-black p-4">
                <p className="text-sm font-bold leading-relaxed">
                  Please add the following code to your **GitHub Bio** so we can verify you own the account:
                </p>
                <div className="mt-4 bg-white border-2 border-black p-3 text-center font-mono font-black text-xl select-all">
                  {challengeCode}
                </div>
              </div>
              
              <div className="flex gap-4">
                <button
                  onClick={() => setStep("input")}
                  className="flex-1 brutalist-button py-3 text-xs bg-white text-black font-black uppercase"
                >
                  Back
                </button>
                <button
                  onClick={checkAndAnalyze}
                  className="flex-2 brutalist-button py-3 text-xs bg-black text-white font-black uppercase tracking-widest"
                >
                  Verify & Analyze
                </button>
              </div>
            </div>
          )}

          {step === "verifying" && (
            <div className="py-12 flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-black border-t-primary animate-spin" />
              <p className="font-black uppercase text-sm animate-pulse">AI is scanning your repos...</p>
            </div>
          )}

          {step === "minting" && (
            <div className="space-y-6 text-center">
              <div className="brutalist-card bg-[#4ADE80] p-6 inline-block w-full">
                <p className="text-[10px] font-black uppercase mb-1">AI Detected Stack</p>
                <h3 className="text-2xl font-black uppercase italic break-words">{analyzedStack}</h3>
              </div>
              
              <p className="text-xs font-bold text-black/60 italic leading-relaxed">
                Verification complete! You can now mint this badge as a permanent Soulbound Token on your profile.
              </p>

              <button
                onClick={handleMint}
                disabled={loading}
                className="brutalist-button w-full py-4 bg-black text-white font-black uppercase tracking-widest disabled:opacity-50"
              >
                {loading ? "Minting..." : "Mint On-Chain Badge"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
