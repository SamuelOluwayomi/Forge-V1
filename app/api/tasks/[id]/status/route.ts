import { NextResponse } from "next/server";
import { supabase } from "@/app/lib/supabase";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  try {
    const { status, dispute_reason, escalated_to_admin } = await req.json();
    
    if (!status && escalated_to_admin === undefined) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    // Build update payload
    const updatePayload: Record<string, any> = {};
    if (status) updatePayload.status = status;
    if (dispute_reason) updatePayload.dispute_reason = dispute_reason;
    if (escalated_to_admin !== undefined) updatePayload.escalated_to_admin = escalated_to_admin;

    // Update the task status in DB
    const { error } = await supabase
      .from("tasks")
      .update(updatePayload)
      .eq("pda", id);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
