import { NextResponse } from "next/server";
import { supabase } from "@/app/lib/supabase";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  try {
    const { status } = await req.json();
    
    if (!status) {
      return NextResponse.json({ error: "Status is required" }, { status: 400 });
    }

    // Update the task status in DB
    const { error } = await supabase
      .from("tasks")
      .update({ status })
      .eq("pda", id);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
