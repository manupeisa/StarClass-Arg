#!/usr/bin/env node
import fs from "fs/promises";
import path from "path";

// Load r2-upload in a way that works whether it's treated as CommonJS or ESM
let hasR2Config;
let uploadToR2;
try {
  const mod = await import("../lib/r2-upload.js");
  // ESM named exports
  hasR2Config = mod.hasR2Config || (mod.default && mod.default.hasR2Config);
  uploadToR2 = mod.uploadToR2 || (mod.default && mod.default.uploadToR2);
} catch (e) {
  // Fallback to require via createRequire for CommonJS
  try {
    const { createRequire } = await import("module");
    const require = createRequire(import.meta.url);
    const pkg = require("../lib/r2-upload.js");
    hasR2Config = pkg.hasR2Config;
    uploadToR2 = pkg.uploadToR2;
  } catch (err) {
    console.error("No se pudo cargar lib/r2-upload.js:", err);
    process.exitCode = 1;
    throw err;
  }
}

async function main() {
  try {
    if (!hasR2Config || !hasR2Config()) {
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
