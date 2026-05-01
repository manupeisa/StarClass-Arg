import { cookies } from "next/headers";

const COOKIE_NAME = "starclass_admin";

export function getAdminCredentials() {
  return {
    user: process.env.ADMIN_USER || "admin",
    password: process.env.ADMIN_PASSWORD || "Poro8285",
  };
}

export function isAdminSession() {
  return cookies().get(COOKIE_NAME)?.value === "ok";
}

export function setAdminSession() {
  cookies().set(COOKIE_NAME, "ok", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
    secure: process.env.NODE_ENV === "production",
  });
}

export function clearAdminSession() {
  cookies().delete(COOKIE_NAME);
}
