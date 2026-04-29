import { NextResponse } from "next/server";
import { supabase } from "@/app/lib/supabase";

// GET /api/rankings — Get the leaderboard
export async function GET() {
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  try {
    const { data, error } = await supabase
      .from("rankings")
      .select("*")
      .order("rank", { ascending: true })
      .limit(50);

    if (error) throw error;

    // Enrich with profile data
    const addresses = (data || []).map((r: any) => r.wallet_address);
    let profiles: any[] = [];
    if (addresses.length > 0) {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("wallet_address, avatar_url, twitter, github")
        .in("wallet_address", addresses);
      profiles = profileData || [];
    }

    const enriched = (data || []).map((r: any) => {
      const profile = profiles.find((p: any) => p.wallet_address === r.wallet_address) || {};
      return {
        ...r,
        avatar_url: profile.avatar_url || null,
        twitter: profile.twitter || null,
        github: profile.github || null,
      };
    });

    return NextResponse.json({ rankings: enriched });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/rankings — Recalculate rankings (call from cron or manually)
export async function POST() {
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  try {
    // Get all profiles with forge_score
    const { data: profiles, error: pError } = await supabase
      .from("profiles")
      .select("wallet_address, forge_score")
      .order("forge_score", { ascending: false });

    if (pError) throw pError;
    if (!profiles || profiles.length === 0) {
      return NextResponse.json({ message: "No profiles to rank" });
    }

    // Assign ranks
    const ranked = profiles.map((p: any, idx: number) => ({
      wallet_address: p.wallet_address,
      forge_score: p.forge_score || 0,
      tasks_completed: 0,
      rank: idx + 1,
      updated_at: new Date().toISOString(),
    }));

    // Upsert into rankings table
    const { error: uError } = await supabase
      .from("rankings")
      .upsert(ranked, { onConflict: "wallet_address" });

    if (uError) throw uError;

    // Also update the rank column on profiles
    for (const r of ranked) {
      await supabase
        .from("profiles")
        .update({ rank: r.rank })
        .eq("wallet_address", r.wallet_address);
    }

    return NextResponse.json({ message: `Ranked ${ranked.length} developers`, rankings: ranked });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
