import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { AppShell } from "@/components/layout/app-shell";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("STUDENT");
  // Vynucená změna hesla – žák se nedostane na žádnou studentskou stránku.
  if (user.mustChangePassword) redirect("/zmena-hesla");
  return (
    <AppShell role={user.role} username={user.username}>
      {children}
    </AppShell>
  );
}
