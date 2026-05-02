import fs from "fs";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const PINATA_JWT = process.env.PINATA_JWT!;

async function uploadJson(jsonData: any, name: string) {
  const response = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${PINATA_JWT}`,
    },
    body: JSON.stringify({
      pinataOptions: {
        cidVersion: 1,
      },
      pinataMetadata: {
        name: name,
      },
      pinataContent: jsonData,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Pinata error: ${error}`);
  }

  const data = (await response.json()) as any;
  return data.IpfsHash;
}

async function upload() {
  try {
    console.log("Reading metadata files...");
    const founderMetadata = JSON.parse(fs.readFileSync("founder_metadata.json", "utf-8"));
    const pioneerMetadata = JSON.parse(fs.readFileSync("pioneer_metadata.json", "utf-8"));

    console.log("Uploading Founder Metadata...");
    const founderCid = await uploadJson(founderMetadata, "Forge Founder Metadata");
    console.log("Founder Metadata CID:", founderCid);

    console.log("Uploading Pioneer Metadata...");
    const pioneerCid = await uploadJson(pioneerMetadata, "Forge Pioneer Metadata");
    console.log("Pioneer Metadata CID:", pioneerCid);

    console.log("\nSuccess! Copy these CIDs and update your profile/page.tsx");
  } catch (error) {
    console.error("Error uploading to Pinata:", error);
  }
}

upload();
