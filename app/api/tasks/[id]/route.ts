import { NextResponse } from "next/server";
import { supabase } from "@/app/lib/supabase";

// GET /api/tasks/[id] — Get task details + applicants
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  try {
    // Get the task
    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .select("*")
      .eq("pda", id)
      .single();
    
    if (taskError || !task) {
      // Return a partial object if not in DB, so frontend can handle on-chain only tasks
      return NextResponse.json({ 
        task: { 
          pda: id, 
          title: "On-Chain Task", 
          description: "This task was created directly on-chain. Full details are not available.",
          amount: 0,
          difficulty: 1,
          client: "Unknown",
          is_on_chain_only: true 
        },
        applicants: [] 
      });
    }

    // Get applicants
    const { data: applicants, error: appError } = await supabase
      .from("task_applicants")
      .select("*")
      .eq("task_pda", id)
      .order("applied_at", { ascending: true });

    // Get applicant profiles (photos, socials, rank)
    const applicantAddresses = (applicants || []).map((a: any) => a.worker_address);
    let profiles: any[] = [];
    if (applicantAddresses.length > 0) {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("wallet_address, avatar_url, twitter, github, discord, telegram, rank, forge_score")
        .in("wallet_address", applicantAddresses);
      profiles = profileData || [];
    }

    // Get client profile
    const { data: clientProfile } = await supabase
      .from("profiles")
      .select("avatar_url, twitter, github")
      .eq("wallet_address", task.client)
      .single();

    // Merge applicants with their profiles
    const enrichedApplicants = (applicants || []).map((a: any) => {
      const profile = profiles.find((p: any) => p.wallet_address === a.worker_address) || {};
      return {
        ...a,
        avatar_url: profile.avatar_url || null,
        twitter: profile.twitter || null,
        github: profile.github || null,
        discord: profile.discord || null,
        telegram: profile.telegram || null,
        rank: profile.rank || 0,
        forge_score: profile.forge_score || 0,
      };
    });

    return NextResponse.json({
      task: {
        ...task,
        client_avatar: clientProfile?.avatar_url || null,
        client_twitter: clientProfile?.twitter || null,
      },
      applicants: enrichedApplicants,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
