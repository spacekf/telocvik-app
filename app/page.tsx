import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";

export default async function Home() {
  const user = await getCurrentUser();
  if (!user) redirect("/prihlaseni");
  if (user.role === "TEACHER") redirect("/ucitel");
  redirect("/zak");
}
