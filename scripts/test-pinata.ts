import { PinataSDK } from "pinata";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const pinata = new PinataSDK({
  pinataJwt: process.env.PINATA_JWT!,
});

console.log("Pinata Instance:", !!pinata);
console.log("Pinata Upload object:", !!pinata.upload);
if (pinata.upload) {
  console.log("Upload keys:", Object.keys(pinata.upload));
  console.log("Upload prototype keys:", Object.getOwnPropertyNames(Object.getPrototypeOf(pinata.upload)));
}
