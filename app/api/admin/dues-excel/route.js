import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import * as XLSX from "xlsx";
import { isAdminSession } from "../../../../lib/admin-auth";
import { readStarclassData, writeStarclassData } from "../../../../lib/starclass-data";
import { normalizeText } from "../../../../lib/text";

export const dynamic = "force-dynamic";

function findValue(row, names) {
  const entries = Object.entries(row);
  for (const [key, value] of entries) {
    const normalizedKey = normalizeText(key);
    if (names.some((name) => normalizedKey.includes(name))) {
      return value;
    }
  }
  return "";
}

function normalizeStatus(value) {
  const text = normalizeText(value);
  if (["life", "vitalicio"].includes(text)) {
    return "Life";
  }
  if (["si", "sí", "activo", "pago", "pagado", "ok", "true", "1", "abonado"].includes(text)) {
    return "Activo";
  }
  return "Pendiente";
}

function normalizeYesNo(value) {
  const text = normalizeText(value);
  return ["si", "sí", "yes", "true", "1", "ok"].includes(text) ? "Si" : "No";
}

export async function POST(request) {
  if (!isAdminSession()) {
    return NextResponse.json({ message: "No autorizado." }, { status: 401 });
  }

  const form = await request.formData();
  const file = form.get("file");

  if (!file || typeof file === "string") {
    return NextResponse.json({ message: "No se recibió un Excel." }, { status: 400 });
  }

  const workbook = XLSX.read(Buffer.from(await file.arrayBuffer()), { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

  const dues = rows
    .map((row) => ({
      boat: String(findValue(row, ["barco", "vela", "numero", "nro", "arg"]) || "").trim(),
      owner: String(findValue(row, ["dueno", "dueño", "propietario", "owner", "nombre", "socio"]) || "").trim(),
      fleet: String(findValue(row, ["flota", "fleet"]) || "").trim(),
      crew: String(findValue(row, ["tripulante", "crew"]) || "").trim(),
      helmDues: normalizeStatus(findValue(row, ["dues timonel", "timonel", "diu", "pago", "estado", "status", "abonado"])),
      crewDues: normalizeStatus(findValue(row, ["dues tripulante", "dues tripulantes", "tripulantes"])),
      fay: normalizeYesNo(findValue(row, ["fay"])),
    }))
    .filter((row) => row.boat || row.owner);

  if (!dues.length) {
    return NextResponse.json(
      { message: "No pude encontrar filas válidas. Usá columnas como Barco, Propietario, Flota, Tripulante, Dues Timonel, Dues Tripulantes y FAY." },
      { status: 400 },
    );
  }

  const data = await readStarclassData();
  data.dues = dues;
  await writeStarclassData(data);
  revalidatePath("/");
  revalidatePath("/dues");

  return NextResponse.json({ ok: true, count: dues.length, dues });
}
