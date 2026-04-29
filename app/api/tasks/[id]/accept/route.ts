import { NextResponse } from "next/server";
import { supabase } from "@/app/lib/supabase";

// POST /api/tasks/[id]/accept — Record worker acceptance in DB
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  try {
    const { worker_address } = await req.json();
    
    if (!worker_address) {
      return NextResponse.json({ error: "Worker address is required" }, { status: 400 });
    }

    // Update the task status in DB
    await supabase
      .from("tasks")
      .update({ status: "active", worker: worker_address })
      .eq("pda", id);

    // Mark the accepted applicant
    await supabase
      .from("task_applicants")
      .update({ status: "accepted" })
      .eq("task_pda", id)
      .eq("worker_address", worker_address);

    // Mark others as rejected
    await supabase
      .from("task_applicants")
      .update({ status: "rejected" })
      .eq("task_pda", id)
      .neq("worker_address", worker_address);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
