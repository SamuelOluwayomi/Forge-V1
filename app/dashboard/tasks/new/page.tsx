"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@/app/lib/wallet/context";
import { useEscrow } from "@/app/lib/hooks/useEscrow";
import { toast } from "sonner";
import { validateTaskInput } from "@/app/lib/validation";

const DIFFICULTY_OPTIONS = [
  { value: 1, label: "Beginner", desc: "Simple tasks, clear scope" },
  { value: 2, label: "Intermediate", desc: "Requires some experience" },
  { value: 3, label: "Advanced", desc: "Complex, multi-step deliverables" },
  { value: 4, label: "Expert", desc: "Specialized, senior-level work" },
];

export default function NewTaskPage() {
  const router = useRouter();
  const { wallet } = useWallet();
  const { createTask, program } = useEscrow();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [reviewDays, setReviewDays] = useState(3);
  const [difficulty, setDifficulty] = useState(1);
  const [metadataUri, setMetadataUri] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");

  const generateHash = async (data: string) => {
    const msgUint8 = new TextEncoder().encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createTask || !program || !wallet) return;

    // Validate inputs
    const validation = validateTaskInput({
      title,
      description,
      amount,
      reviewDays,
      difficulty,
      metadataUri,
    });

    if (!validation.isValid) {
      validation.errors.forEach((err) => toast.error(err));
      return;
    }

    const cleanData = validation.data;
    setLoading(true);
    try {
      // 1. Generate AI Brief
      setLoadingStep("Generating AI brief...");
      const aiResponse = await fetch("/api/tasks/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: cleanData.title, description: cleanData.description }),
      });
      const aiData = await aiResponse.json();
      if (!aiResponse.ok) throw new Error(aiData.error || "AI generation failed");

      // 2. Hash the data for integrity
      const offChainData = {
        title: cleanData.title,
        description: cleanData.description,
        difficulty: cleanData.difficulty,
        aiAnalysis: aiData.analysis
      };
      const contentHash = await generateHash(JSON.stringify(offChainData));
      const finalMetadataUri = cleanData.metadataUri || `forge://hash/${contentHash.substring(0, 32)}`;

      // 3. Post to Escrow on-chain
      setLoadingStep("Locking USDC in Escrow...");
      const taskId = Date.now(); // unique numeric ID
      const lamports = BigInt(Math.round(cleanData.amount * 1_000_000));
      await createTask(taskId, lamports, cleanData.reviewDays, cleanData.difficulty, finalMetadataUri);

      // 4. Compute the PDA (Unique identifier)
      const { PublicKey } = await import("@solana/web3.js");
      const { BN } = await import("@coral-xyz/anchor");
      const clientPubkey = new PublicKey(wallet.account.address);
      const [escrowPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("escrow"),
          clientPubkey.toBuffer(),
          Buffer.from([...new BN(taskId).toArray('le', 8)]),
        ],
        program.programId
      );

      // 5. Save to Off-Chain Database
      setLoadingStep("Saving task details...");
      const dbResponse = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pda: escrowPda.toString(),
          client: clientPubkey.toString(),
          task_id: taskId,
          title: cleanData.title,
          description: cleanData.description,
          amount: cleanData.amount,
          difficulty: cleanData.difficulty,
          skills: aiData.analysis?.recommendedSkills || [],
          ai_analysis: aiData.analysis,
          content_hash: contentHash
        }),
      });
      
      if (!dbResponse.ok) {
         console.warn("Failed to save to database, but on-chain task created successfully.");
      }

      toast.success("Task posted successfully!");
      router.push("/dashboard/tasks");
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message ?? "Failed to post task. Check your wallet connection.");
    } finally {
      setLoading(false);
      setLoadingStep("");
    }
  };

  return (
    <div className="w-full max-w-2xl">
      {/* Header */}
      <div className="mb-10">
        <div
          className="brutalist-tape text-xs px-3 py-1 inline-block mb-3"
          style={{ transform: "rotate(-1deg)" }}
        >
          New Task
        </div>
        <h1 className="text-5xl md:text-6xl font-black uppercase leading-none text-black italic tracking-tighter">
          Post a Task
        </h1>
        <p className="font-bold text-base text-black/60 mt-3 leading-snug">
          USDC is locked in escrow immediately. Released only when you approve the work.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* Title */}
        <div className="brutalist-card bg-white p-6 flex flex-col gap-3">
          <label htmlFor="task-title" className="font-black text-sm uppercase tracking-widest text-black/60">
            Task Title <span className="text-primary">*</span>
          </label>
          <input
            id="task-title"
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Build a Solana token staking UI"
            className="border-2 border-black bg-background px-4 py-3 font-bold text-sm text-black outline-none focus:border-primary transition-colors placeholder:text-black/30"
          />
        </div>

        {/* Description */}
        <div className="brutalist-card bg-white p-6 flex flex-col gap-3">
          <label htmlFor="task-description" className="font-black text-sm uppercase tracking-widest text-black/60">
            Description <span className="text-primary">*</span>
          </label>
          <textarea
            id="task-description"
            required
            rows={5}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what needs to be built, delivered, or done in detail..."
            className="border-2 border-black bg-background px-4 py-3 font-bold text-sm text-black outline-none focus:border-primary transition-colors resize-none placeholder:text-black/30"
          />
        </div>

        {/* Amount + Review Window */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="brutalist-card bg-white p-6 flex flex-col gap-3">
            <label htmlFor="task-amount" className="font-black text-sm uppercase tracking-widest text-black/60">
              USDC Amount <span className="text-primary">*</span>
            </label>
            <div className="flex items-center border-2 border-black bg-background">
              <span className="px-4 py-3 font-black text-sm bg-black text-white border-r-2 border-black">
                USDC
              </span>
              <input
                id="task-amount"
                type="number"
                required
                min="1"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="100"
                className="flex-1 px-4 py-3 font-black text-sm text-black bg-transparent outline-none placeholder:text-black/30"
              />
            </div>
          </div>

          <div className="brutalist-card bg-white p-6 flex flex-col gap-3">
            <label htmlFor="task-review-days" className="font-black text-sm uppercase tracking-widest text-black/60">
              Review Window
            </label>
            <div className="flex items-center border-2 border-black bg-background">
              <input
                id="task-review-days"
                type="number"
                required
                min="1"
                max="7"
                value={reviewDays}
                onChange={(e) => setReviewDays(Number(e.target.value))}
                className="flex-1 px-4 py-3 font-black text-sm text-black bg-transparent outline-none"
              />
              <span className="px-4 py-3 font-black text-sm bg-black text-white border-l-2 border-black">
                DAYS
              </span>
            </div>
          </div>
        </div>

        {/* Difficulty */}
        <div className="brutalist-card bg-white p-6 flex flex-col gap-3">
          <p className="font-black text-sm uppercase tracking-widest text-black/60">
            Difficulty <span className="text-primary">*</span>
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {DIFFICULTY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                id={`difficulty-${opt.value}`}
                onClick={() => setDifficulty(opt.value)}
                className={`flex flex-col gap-1 p-3 border-2 text-left transition-all duration-100
                  ${difficulty === opt.value
                    ? "bg-black text-white border-black shadow-none translate-x-0.5 translate-y-0.5"
                    : "bg-white text-black border-black hover:bg-black hover:text-white"
                  }`}
                style={{
                  boxShadow: difficulty === opt.value ? "none" : "3px 3px 0px 0px rgba(0,0,0,1)",
                }}
              >
                <span className="font-black text-sm uppercase">{opt.label}</span>
                <span className={`text-[10px] font-bold ${difficulty === opt.value ? "text-white/60" : "text-black/50"}`}>
                  {opt.desc}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Metadata URI (optional) */}
        <div className="brutalist-card bg-white p-6 flex flex-col gap-3">
          <label htmlFor="task-metadata" className="font-black text-sm uppercase tracking-widest text-black/60">
            Metadata URI <span className="font-bold text-black/30">(optional)</span>
          </label>
          <input
            id="task-metadata"
            type="url"
            value={metadataUri}
            onChange={(e) => setMetadataUri(e.target.value)}
            placeholder="https://your-site.com/task-metadata.json"
            className="border-2 border-black bg-background px-4 py-3 font-bold text-sm text-black outline-none focus:border-primary transition-colors placeholder:text-black/30"
          />
          <p className="text-xs font-bold text-black/40">
            Link to a JSON file with extended task info (requirements, links, assets). Leave blank to auto-generate.
          </p>
        </div>

        {/* Submit row */}
        <div className="flex items-center gap-4 pt-2">
          <button
            type="submit"
            id="submit-new-task"
            disabled={loading}
            className="brutalist-button px-10 py-4 bg-primary text-white border-black text-base disabled:opacity-50 disabled:pointer-events-none flex items-center gap-3"
          >
            {loading ? (
              <>
                <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" opacity="0.2" /><path d="M12 3a9 9 0 019 9" />
                </svg>
                {loadingStep || "Posting to Escrow..."}
              </>
            ) : (
              "Lock Funds and Post Task"
            )}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="brutalist-button px-6 py-4 bg-background text-black border-black text-base"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
