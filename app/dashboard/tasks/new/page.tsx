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
  const [contactInfo, setContactInfo] = useState("");
  const [metadataUri, setMetadataUri] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [aiAnalysisCache, setAiAnalysisCache] = useState<any>(null);

  const handleGenerateWithAI = async () => {
    if (!aiPrompt) {
      toast.error("Please describe your task first.");
      return;
    }
    setGenerating(true);
    try {
      const aiResponse = await fetch("/api/ai/generate-task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: aiPrompt }),
      });
      const aiData = await aiResponse.json();
      if (!aiResponse.ok)
        throw new Error(aiData.error || "AI generation failed");

      const task = aiData.task;
      setTitle(task.title || "");

      let fullDesc = task.description || "";
      if (task.deliverables && task.deliverables.length > 0) {
        fullDesc += "\n\nDeliverables:\n- " + task.deliverables.join("\n- ");
      }
      if (task.acceptance_criteria && task.acceptance_criteria.length > 0) {
        fullDesc +=
          "\n\nAcceptance Criteria:\n- " +
          task.acceptance_criteria.join("\n- ");
      }

      setDescription(fullDesc);
      if (task.suggested_price_usdc)
        setAmount(task.suggested_price_usdc.toString());
      if (task.difficulty) setDifficulty(task.difficulty);
      setAiAnalysisCache(task);

      toast.success("Task details generated! Review and post.");
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to generate task details.");
    } finally {
      setGenerating(false);
    }
  };

  const generateHash = async (data: string) => {
    const msgUint8 = new TextEncoder().encode(data);
    const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
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
      // 1. Hash the data for integrity
      const offChainData = {
        title: cleanData.title,
        description: cleanData.description,
        difficulty: cleanData.difficulty,
        contactInfo: contactInfo,
        aiAnalysis: aiAnalysisCache,
      };
      const contentHash = await generateHash(JSON.stringify(offChainData));
      const finalMetadataUri =
        cleanData.metadataUri || `forge://hash/${contentHash.substring(0, 32)}`;

      // 2. Post to Escrow on-chain
      setLoadingStep("Locking SOL in Escrow...");
      const taskId = Date.now(); // unique numeric ID
      // Web3.js lamports conversion (1 SOL = 1_000_000_000 lamports)
      const lamports = BigInt(Math.round(cleanData.amount * 1_000_000_000));
      await createTask(
        taskId,
        lamports,
        cleanData.reviewDays,
        cleanData.difficulty,
        finalMetadataUri
      );

      // 4. Compute the PDA (Unique identifier)
      const { PublicKey } = await import("@solana/web3.js");
      const { BN } = await import("@coral-xyz/anchor");
      const clientPubkey = new PublicKey(wallet.account.address);
      const [escrowPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("escrow"),
          clientPubkey.toBuffer(),
          Buffer.from([...new BN(taskId).toArray("le", 8)]),
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
          contact_info: contactInfo,
          skills: aiAnalysisCache?.skills || [],
          ai_analysis: aiAnalysisCache,
          content_hash: contentHash,
        }),
      });

      if (!dbResponse.ok) {
        console.warn(
          "Failed to save to database, but on-chain task created successfully."
        );
      }

      toast.success("Task posted successfully!");
      router.push("/dashboard/tasks");
    } catch (err: any) {
      console.error(err);
      toast.error(
        err?.message ?? "Failed to post task. Check your wallet connection."
      );
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
          SOL is locked in escrow immediately. Released only when you approve
          the work.
        </p>
      </div>

      {/* AI Generator Box */}
      <div className="brutalist-card bg-[#e0e0e0] p-6 flex flex-col gap-3 border-dashed mb-6">
        <label
          htmlFor="ai-prompt"
          className="font-black text-sm uppercase tracking-widest text-black flex items-center gap-2"
        >
          ✨ Auto-fill with AI
        </label>
        <p className="text-sm font-bold text-black/60 leading-tight">
          Describe what you need in plain English. An AI assistant will
          structure it, suggest a price, and fill the form for you.
        </p>
        <div className="flex flex-col sm:flex-row gap-2 mt-2">
          <input
            id="ai-prompt"
            type="text"
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder="e.g. I need a Rust developer to build an SPL token staking contract..."
            className="border-2 border-black bg-white px-4 py-3 font-bold text-sm text-black outline-none focus:border-primary flex-1 placeholder:text-black/30"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleGenerateWithAI();
              }
            }}
          />
          <button
            type="button"
            onClick={handleGenerateWithAI}
            disabled={generating}
            className="brutalist-button px-6 py-3 bg-black text-white border-black text-sm disabled:opacity-50"
          >
            {generating ? "Generating..." : "Generate"}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 h-0.5 bg-black/10"></div>
        <span className="font-black text-xs text-black/40 uppercase tracking-widest">
          OR EDIT MANUALLY
        </span>
        <div className="flex-1 h-0.5 bg-black/10"></div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* Title */}
        <div className="brutalist-card bg-white p-6 flex flex-col gap-3">
          <label
            htmlFor="task-title"
            className="font-black text-sm uppercase tracking-widest text-black/60"
          >
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
          <label
            htmlFor="task-description"
            className="font-black text-sm uppercase tracking-widest text-black/60"
          >
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

        {/* Contact Info */}
        <div className="brutalist-card bg-white p-6 flex flex-col gap-3">
          <label
            htmlFor="contact-info"
            className="font-black text-sm uppercase tracking-widest text-black/60"
          >
            Direct Contact Info <span className="text-primary">*</span>
          </label>
          <input
            id="contact-info"
            type="text"
            required
            value={contactInfo}
            onChange={(e) => setContactInfo(e.target.value)}
            placeholder="WhatsApp, X (Twitter), Slack, or Email..."
            className="border-2 border-black bg-background px-4 py-3 font-bold text-sm text-black outline-none focus:border-primary transition-colors placeholder:text-black/30"
          />
          <p className="text-xs font-bold text-black/40 leading-tight">
            Workers will use this to contact you directly after seeing your task in the marketplace.
          </p>
        </div>

        {/* Amount + Review Window */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="brutalist-card bg-white p-6 flex flex-col gap-3">
            <label
              htmlFor="task-amount"
              className="font-black text-sm uppercase tracking-widest text-black/60"
            >
              Reward Amount <span className="text-primary">*</span>
            </label>
            <div className="flex items-center border-2 border-black bg-background">
              <span className="px-4 py-3 font-black text-sm bg-black text-white border-r-2 border-black">
                SOL
              </span>
              <input
                id="task-amount"
                type="number"
                required
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.5"
                className="flex-1 px-4 py-3 font-black text-sm text-black bg-transparent outline-none placeholder:text-black/30"
              />
            </div>
          </div>

          <div className="brutalist-card bg-white p-6 flex flex-col gap-3">
            <label
              htmlFor="task-review-days"
              className="font-black text-sm uppercase tracking-widest text-black/60"
            >
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
                  ${
                    difficulty === opt.value
                      ? "bg-black text-white border-black shadow-none translate-x-0.5 translate-y-0.5"
                      : "bg-white text-black border-black hover:bg-black hover:text-white"
                  }`}
                style={{
                  boxShadow:
                    difficulty === opt.value
                      ? "none"
                      : "3px 3px 0px 0px rgba(0,0,0,1)",
                }}
              >
                <span className="font-black text-sm uppercase">
                  {opt.label}
                </span>
                <span
                  className={`text-[10px] font-bold ${difficulty === opt.value ? "text-white/60" : "text-black/50"}`}
                >
                  {opt.desc}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Metadata URI (optional) */}
        <div className="brutalist-card bg-white p-6 flex flex-col gap-3">
          <label
            htmlFor="task-metadata"
            className="font-black text-sm uppercase tracking-widest text-black/60"
          >
            Metadata URI{" "}
            <span className="font-bold text-black/30">(optional)</span>
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
            Link to a JSON file with extended task info (requirements, links,
            assets). Leave blank to auto-generate.
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
                <svg
                  className="animate-spin"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" opacity="0.2" />
                  <path d="M12 3a9 9 0 019 9" />
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
