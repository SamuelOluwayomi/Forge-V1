import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Use service role key so we bypass RLS on storage
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { metadata, fileName } = await req.json();

    if (!metadata || !fileName) {
      return NextResponse.json({ error: "Missing metadata or fileName" }, { status: 400 });
    }

    const fileContent = JSON.stringify(metadata);
    const blob = Buffer.from(fileContent, "utf-8");

    const { error: uploadError } = await supabaseAdmin.storage
      .from("nft-metadata")
      .upload(fileName, blob, {
        upsert: true,
        contentType: "application/json",
      });

    if (uploadError) {
      console.error("Supabase storage upload error:", uploadError);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from("nft-metadata")
      .getPublicUrl(fileName);

    return NextResponse.json({ url: publicUrl });
  } catch (err: any) {
    console.error("upload-metadata error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
