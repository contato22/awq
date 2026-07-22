import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import PatriciaCantoBoard from "@/components/patricia-canto/PatriciaCantoBoard";
import { PC_SESSION_COOKIE, verifySessionToken } from "@/lib/patricia-canto/auth";

export default function PatriciaCantoPage() {
  const role = verifySessionToken(cookies().get(PC_SESSION_COOKIE)?.value);
  if (!role) redirect("/patricia-canto/login");

  return <PatriciaCantoBoard role={role} />;
}
