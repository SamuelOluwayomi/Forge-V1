import { NextResponse } from "next/server";
import { supabase } from "@/app/lib/supabase";

// POST /api/tasks/[id]/apply — Worker applies to a task
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  try {
    const { worker_address, estimated_days } = await req.json();
    
    if (!worker_address) {
      return NextResponse.json({ error: "Worker address is required" }, { status: 400 });
    }

    // Check if task exists and is still open
    const { data: task } = await supabase
      .from("tasks")
      .select("client, listing_deadline, status")
      .eq("pda", id)
      .single();

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Can't apply to your own task
    if (task.client === worker_address) {
      return NextResponse.json({ error: "You cannot apply to your own task" }, { status: 400 });
    }

    // Check if listing has expired
    if (task.listing_deadline && new Date(task.listing_deadline) < new Date()) {
      return NextResponse.json({ error: "This listing has expired. Applications are closed." }, { status: 400 });
    }

    // Insert applicant (unique constraint will prevent duplicates)
    const { data, error } = await supabase
      .from("task_applicants")
      .insert([{
        task_pda: id,
        worker_address,
        estimated_days: estimated_days ? parseInt(estimated_days, 10) : null,
      }])
      .select();

    if (error) {
      if (error.code === "23505") { // unique violation
        return NextResponse.json({ error: "You have already applied to this task" }, { status: 409 });
      }
      throw error;
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
