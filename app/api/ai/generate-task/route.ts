import Groq from "groq-sdk";
import { NextRequest, NextResponse } from "next/server";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: NextRequest) {
  const { prompt } = await req.json();

  if (!prompt) {
    return NextResponse.json({ error: "Prompt required" }, { status: 400 });
  }

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are a task creation assistant for Forge, a trustless freelance marketplace on Solana."
        },
        {
          role: "user",
          content: `A client described their task as: "${prompt}"

Generate a structured task brief. The description MUST be written as direct instructions to the developer, NOT from the client's perspective. 
Do NOT say "the client wants" or "the client requires". Instead write it as if you are directly telling the developer what to build.
Example good style: "Create a GitHub repository named 'task 3' with a well-structured README file. The README should cover any topic of your choice..."
Example bad style: "The client requires a GitHub repository to be created..."

Respond ONLY with valid JSON, no markdown formatting blocks, no explanation:

{
  "title": "clear concise task title under 60 characters",
  "description": "detailed task description written as direct instructions to the developer, 2-3 paragraphs. Use imperative voice: Build, Create, Implement, Design, etc.",
  "skills": ["skill1", "skill2"],
  "difficulty": 2,
  "difficulty_label": "Journeyman",
  "estimated_hours": 20,
  "suggested_price_usdc": 300,
  "deliverables": ["deliverable1", "deliverable2"],
  "acceptance_criteria": ["criterion1", "criterion2"]
}

Difficulty: 1=Apprentice(<10hrs) 2=Journeyman(10-30hrs) 3=Master(30-80hrs) 4=Grandmaster(80hrs+)`
        }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.5,
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

    return NextResponse.json({ task: parsed });
  } catch (error: any) {
    console.error("generate-task error:", error.message, error);
    return NextResponse.json(
      { error: error.message ?? "Failed to generate task" },
      { status: 500 }
    );
  }
}
