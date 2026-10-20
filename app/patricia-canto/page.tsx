import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import PatriciaCantoBoard from "@/components/patricia-canto/PatriciaCantoBoard";
import { PC_SESSION_COOKIE, verifySessionToken } from "@/lib/patricia-canto/auth";
import PatriciaCantoLoginPage from "./login/page";

export const dynamic = process.env.STATIC_EXPORT === "1" ? "auto" : "force-dynamic";

export default function PatriciaCantoPage() {
  // GitHub Pages não tem cookie de sessão. next.config fixa
  // NEXT_PUBLIC_STATIC_DATA=0 no build SSR, então a checagem abaixo permanece na Vercel.
  if (process.env.NEXT_PUBLIC_STATIC_DATA === "1") {
    return <PatriciaCantoLoginPage />;
  }

  const role = verifySessionToken(cookies().get(PC_SESSION_COOKIE)?.value);
  if (!role) redirect("/patricia-canto/login");

  return <PatriciaCantoBoard role={role} />;
}
