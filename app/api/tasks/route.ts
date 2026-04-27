import { NextResponse } from "next/server";
import { supabase } from "@/app/lib/supabase";
import { validateDbTaskEntry } from "@/app/lib/validation";

export async function POST(req: Request) {
  try {
    const rawData = await req.json();

    const validation = validateDbTaskEntry(rawData);
    if (!validation.isValid) {
      return NextResponse.json({ error: "Validation failed", details: validation.errors }, { status: 400 });
    }

    const taskData = validation.data;

    // Insert into Supabase
    // If Supabase is not configured (missing keys), we'll gracefully mock the success
    // so the frontend flow still works during development.
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.warn("Supabase keys not found. Mocking database insert for task:", taskData.pda);
      return NextResponse.json({ success: true, mocked: true, pda: taskData.pda });
    }

    const { data, error } = await supabase
      .from("tasks")
      .insert([
        {
          pda: taskData.pda,
          client: taskData.client,
          task_id: taskData.task_id,
          title: taskData.title,
          description: taskData.description,
          amount: taskData.amount,
          difficulty: taskData.difficulty,
          skills: taskData.skills || [],
          ai_analysis: taskData.ai_analysis || null,
          content_hash: taskData.content_hash,
          status: "Open", // Default status
        }
      ]);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("Database Error:", error);
    return NextResponse.json({ error: error.message || "Failed to save task to database" }, { status: 500 });
  }
}
