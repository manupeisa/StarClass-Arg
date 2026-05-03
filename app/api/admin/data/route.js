import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
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
  
  // Invalidate cache for pages that depend on starclass.json
  revalidatePath("/");
  revalidatePath("/campeonatos");
  revalidatePath("/posicionamiento");
  revalidatePath("/sudamericano");

  return NextResponse.json({ ok: true });
}
