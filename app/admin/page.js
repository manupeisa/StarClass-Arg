import { redirect } from "next/navigation";
import { isAdminSession } from "../../lib/admin-auth";
import { readStarclassData } from "../../lib/starclass-data";
import AdminPanel from "./panel";
import LoginForm from "./login-form";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const logged = isAdminSession();

  if (!logged) {
    return <LoginForm />;
  }

  const data = await readStarclassData();
  return <AdminPanel initialData={data} />;
}
