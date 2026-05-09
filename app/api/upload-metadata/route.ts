import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  // Initialize inside the handler to prevent Next.js build-time errors
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials in environment");
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

  try {
    const { metadata, fileName } = await req.json();

    if (!metadata || !fileName) {
      return NextResponse.json({ error: "Missing metadata or fileName" }, { status: 400 });
    }

    const fileContent = JSON.stringify(metadata);

    const { error: uploadError } = await supabaseAdmin.storage
      .from("nft-metadata")
      .upload(fileName, fileContent, {
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
