import { promises as fs } from "fs";
import path from "path";
import { hasR2Config, uploadToR2, getR2PublicUrl } from "./r2-upload";

const dataPath = path.join(process.cwd(), "data", "starclass.json");
const r2Key = "data/starclass.json";

function normalizeHeroImages(hero) {
  const rawImages = Array.isArray(hero?.images) ? hero.images : [];
  const images = rawImages
    .map((item) => {
      if (typeof item === "string") return item;
      if (item && typeof item === "object") return item.url || item.image || "";
      return "";
    })
    .filter(Boolean);

  return {
    ...(hero || {}),
    images,
  };
}

function normalizeStarclassData(data) {
  return {
    ...data,
    hero: normalizeHeroImages(data?.hero),
  };
}

export async function readStarclassData() {
  if (hasR2Config()) {
    const publicUrl = getR2PublicUrl();
    if (publicUrl) {
      try {
        const res = await fetch(`${publicUrl}/${r2Key}`);
        if (res.ok) {
          const text = await res.text();
          return normalizeStarclassData(JSON.parse(text));
        } else {
          console.warn("R2 GET failed", res.status);
        }
      } catch (err) {
        console.warn("R2 fetch failed, falling back to local FS", err);
      }
    }
  }

  const file = await fs.readFile(dataPath, "utf8");
  return normalizeStarclassData(JSON.parse(file));
}

export async function writeStarclassData(data) {
  const normalized = normalizeStarclassData(data);
  const payload = `${JSON.stringify(normalized, null, 2)}\n`;
  if (hasR2Config()) {
    try {
      const bytes = Buffer.from(payload, "utf8");
      await uploadToR2({ bytes, contentType: "application/json", key: r2Key });
      return;
    } catch (err) {
      console.warn("R2 upload failed, falling back to local FS", err);
    }
  }

  await fs.writeFile(dataPath, payload, "utf8");
}
