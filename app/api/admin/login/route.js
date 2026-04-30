import { NextResponse } from "next/server";
import { getAdminCredentials, setAdminSession } from "../../../../lib/admin-auth";

export async function POST(request) {
  const body = await request.json();
  const credentials = getAdminCredentials();

  if (body.user === credentials.user && body.password === credentials.password) {
    setAdminSession();
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: false, message: "Usuario o contraseña incorrectos." }, { status: 401 });
}
