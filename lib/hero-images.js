import { promises as fs } from "fs";
import path from "path";

const imageExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);
const preferredHeroFolder = path.join("San isidro labrador", "Fotos SIL");

function toMediaUrl(relativePath) {
  return `/media/${relativePath.split(path.sep).map(encodeURIComponent).join("/")}`;
}

export async function collectImages(relativeDir) {
  const root = process.cwd();
  const absoluteDir = path.join(root, relativeDir);
  const images = [];

  try {
    const entries = await fs.readdir(absoluteDir, { withFileTypes: true });

    for (const entry of entries) {
      const absolutePath = path.join(absoluteDir, entry.name);
      const relativePath = path.relative(root, absolutePath);

      if (entry.isDirectory()) {
        images.push(...(await collectImages(relativePath)));
      }

      if (entry.isFile() && imageExtensions.has(path.extname(entry.name).toLowerCase())) {
        const stats = await fs.stat(absolutePath);
        if (stats.size > 450_000) {
          images.push({
            name: path.basename(entry.name, path.extname(entry.name)),
            url: toMediaUrl(relativePath),
            size: stats.size,
          });
        }
      }
    }
  } catch {
    return [];
  }

  return images.sort((a, b) => b.size - a.size);
}

export async function listSanIsidroPhotos() {
  return collectImages(preferredHeroFolder);
}

export async function listPhotosFromFolder(relativeDir) {
  if (!relativeDir) return [];
  return collectImages(relativeDir);
}

export async function listHeroImages() {
  const sanIsidroPhotos = await listSanIsidroPhotos();
  if (sanIsidroPhotos.length) {
    return sanIsidroPhotos.map((photo) => photo.url);
  }

  const fallback = await collectImages("Imagenes");
  return fallback.map((photo) => photo.url);
}
