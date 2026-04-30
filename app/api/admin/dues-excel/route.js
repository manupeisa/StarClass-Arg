import { NextResponse } from "next/server";
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
  if (["si", "sí", "pago", "pagado", "ok", "true", "1", "abonado"].includes(text)) {
    return "Pago";
  }
  return "Pendiente";
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
      status: normalizeStatus(findValue(row, ["diu", "pago", "estado", "status", "abonado"])),
    }))
    .filter((row) => row.boat || row.owner);

  if (!dues.length) {
    return NextResponse.json(
      { message: "No pude encontrar filas válidas. Usá columnas como Barco, Propietario y Dues/Pago." },
      { status: 400 },
    );
  }

  const data = await readStarclassData();
  data.dues = dues;
  await writeStarclassData(data);

  return NextResponse.json({ ok: true, count: dues.length, dues });
}
