import { NextResponse } from "next/server";
import { sanitizeText } from "@/app/lib/validation";

export async function POST(req: Request) {
  try {
    const { title, description } = await req.json();

    const cleanTitle = sanitizeText(title);
    const cleanDesc = sanitizeText(description);

    if (!cleanTitle || !cleanDesc) {
      return NextResponse.json({ error: "Valid title and description are required" }, { status: 400 });
    }

    // In a real implementation, we would call an LLM (e.g., OpenAI or Gemini) here.
    // For now, we mock the AI generation to demonstrate the architecture.
    
    // Simulate AI processing delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const mockAiAnalysis = {
      brief: `AI generated brief based on: ${title}. ${description.substring(0, 50)}...`,
      recommendedSkills: ["Rust", "Solana", "TypeScript"],
      complexityScore: 85,
      estimatedHours: 20,
    };

    return NextResponse.json({
      success: true,
      analysis: mockAiAnalysis,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
