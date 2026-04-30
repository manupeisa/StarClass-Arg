import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";

const contentTypes = {
  ".gif": "image/gif",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

export async function GET(_request, { params }) {
  const parts = params.path.map((part) => decodeURIComponent(part));

  if (parts.some((part) => part === ".." || part.includes("\\") || part.includes("/"))) {
    return new NextResponse("Ruta no permitida.", { status: 400 });
  }

  const root = process.cwd();
  const filePath = path.join(root, ...parts);
  const relative = path.relative(root, filePath);
  const extension = path.extname(filePath).toLowerCase();

  if (relative.startsWith("..") || path.isAbsolute(relative) || !contentTypes[extension]) {
    return new NextResponse("Archivo no permitido.", { status: 400 });
  }

  try {
    const file = await fs.readFile(filePath);
    return new NextResponse(file, {
      headers: {
        "Cache-Control": "public, max-age=3600",
        "Content-Type": contentTypes[extension],
      },
    });
  } catch {
    return new NextResponse("Archivo no encontrado.", { status: 404 });
  }
}
