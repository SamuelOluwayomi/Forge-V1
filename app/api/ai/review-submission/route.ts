import Groq from "groq-sdk";
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: NextRequest) {
  const { task, submission } = await req.json();

  if (!task || !submission) {
    return NextResponse.json(
      { error: "Task and submission required" },
      { status: 400 }
    );
  }

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are a submission reviewer for Forge, a trustless freelance marketplace."
        },
        {
          role: "user",
          content: `ORIGINAL TASK:
Title: ${task.title}
Description: ${task.description}
Deliverables: ${task.deliverables?.join(", ")}
Acceptance Criteria: ${task.acceptance_criteria?.join(", ")}

WORKER SUBMISSION:
${submission}

Review the submission against the original task. Respond ONLY with valid JSON, no markdown formatting blocks, no explanation:

{
  "coverage_percent": 85,
  "overall_score": 8,
  "recommendation": "approve",
  "summary": "one sentence summary",
  "issues": [
    { "severity": "major", "description": "what is missing" }
  ],
  "strengths": ["what was done well"]
}

recommendation: "approve" | "request_changes" | "reject"`
        }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.2,
    });

    const text = completion.choices[0]?.message?.content ?? "";

    // Extract JSON from the response more robustly
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in response");
    }

    let clean = jsonMatch[0];
    // Strip markdown code blocks if present
    clean = clean.replace(/```json\n?/g, "").replace(/```\n?/g, "");
    
    // Escape control characters ONLY inside string literals to avoid breaking JSON structure
    clean = clean.replace(/"([^"\\]*(\\.[^"\\]*)*)"/g, (match) => {
      return match
        .replace(/\n/g, "\\n")
        .replace(/\r/g, "\\r")
        .replace(/\t/g, "\\t");
    });

    const parsed = JSON.parse(clean);

    const reportHash = crypto
      .createHash("sha256")
      .update(JSON.stringify(parsed))
      .digest("hex");

    return NextResponse.json({ report: parsed, report_hash: reportHash });
  } catch (error: any) {
    console.error("review-submission error:", error.message, error);
    return NextResponse.json(
      { error: error.message ?? "Failed to review submission" },
      { status: 500 }
    );
  }
}
