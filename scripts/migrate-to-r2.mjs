#!/usr/bin/env node
import fs from "fs/promises";
import path from "path";
import { hasR2Config, uploadToR2 } from "../lib/r2-upload.js";

async function main() {
  try {
    if (!hasR2Config()) {
      console.error("Cloudflare R2 no está configurado en las variables de entorno. Abortando.");
      process.exitCode = 2;
      return;
    }

    const dataPath = path.join(process.cwd(), "data", "starclass.json");
    const buf = await fs.readFile(dataPath);
    console.log(`Leyendo ${dataPath} (${buf.length} bytes)`);

    const key = "data/starclass.json";
    console.log(`Subiendo a R2 en clave: ${key} ...`);
    const url = await uploadToR2({ bytes: buf, contentType: "application/json", key });
    console.log("Subida completada:", url);
  } catch (err) {
    console.error("Error durante la migración:", err);
    process.exitCode = 1;
  }
}

main();
