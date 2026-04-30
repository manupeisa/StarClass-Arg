import { NextResponse } from "next/server";
import { isAdminSession } from "../../../../lib/admin-auth";
import { readStarclassData, writeStarclassData } from "../../../../lib/starclass-data";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isAdminSession()) {
    return NextResponse.json({ message: "No autorizado." }, { status: 401 });
  }

  return NextResponse.json(await readStarclassData());
}

export async function PUT(request) {
  if (!isAdminSession()) {
    return NextResponse.json({ message: "No autorizado." }, { status: 401 });
  }

  const data = await request.json();
  await writeStarclassData(data);
  return NextResponse.json({ ok: true });
}
