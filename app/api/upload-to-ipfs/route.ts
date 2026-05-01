import { NextRequest, NextResponse } from "next/server";
import { PinataSDK } from "pinata";

const pinata = new PinataSDK({
  pinataJwt: process.env.PINATA_JWT!,
});

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const type = formData.get("type") as string;

    if (type === "image") {
      // Upload profile image
      const file = formData.get("file") as File;
      const upload = await pinata.upload.public.file(file);
      return NextResponse.json({
        uri: `https://gateway.pinata.cloud/ipfs/${upload.cid}`,
        cid: upload.cid,
      });
    }

    if (type === "metadata") {
      // Upload metadata JSON
      const metadataStr = formData.get("metadata") as string;
      const metadata = JSON.parse(metadataStr);
      const upload = await pinata.upload.public.json(metadata);
      return NextResponse.json({
        uri: `https://gateway.pinata.cloud/ipfs/${upload.cid}`,
        cid: upload.cid,
      });
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (error: any) {
    console.error("IPFS upload error:", error);
    return NextResponse.json(
      { error: error.message ?? "Upload failed" },
      { status: 500 }
    );
  }
}
