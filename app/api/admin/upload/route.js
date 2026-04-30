import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { isAdminSession } from "../../../../lib/admin-auth";

export const dynamic = "force-dynamic";
const maxFileSize = 25 * 1024 * 1024;

function safeFileName(name) {
  const extension = path.extname(name).toLowerCase();
  const base = path
    .basename(name, extension)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  return `${base || "foto"}-${Date.now()}${extension}`;
}

export async function POST(request) {
  if (!isAdminSession()) {
    return NextResponse.json({ message: "No autorizado." }, { status: 401 });
  }

  const form = await request.formData();
  const files = [...form.getAll("files"), form.get("file")].filter(Boolean);

  if (!files.length || files.every((file) => typeof file === "string")) {
    return NextResponse.json({ message: "No se recibió una imagen." }, { status: 400 });
  }

  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  await fs.mkdir(uploadsDir, { recursive: true });

  const uploaded = [];
  const rejected = [];

  for (const file of files) {
    if (typeof file === "string") continue;

    if (!file.type.startsWith("image/")) {
      rejected.push({ name: file.name, reason: "No es imagen" });
      continue;
    }

    if (file.size > maxFileSize) {
      rejected.push({ name: file.name, reason: "Archivo mayor a 25 MB" });
      continue;
    }

    const filename = safeFileName(file.name);
    const bytes = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(path.join(uploadsDir, filename), bytes);
    uploaded.push(`/uploads/${filename}`);
  }

  if (!uploaded.length) {
    return NextResponse.json({ message: "No se pudo subir ninguna imagen.", rejected }, { status: 400 });
  }

  return NextResponse.json({ url: uploaded[0], urls: uploaded, rejected });
}
