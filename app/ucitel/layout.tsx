import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { AppShell } from "@/components/layout/app-shell";

export default async function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Učitel je správcovská role s plným přístupem.
  const user = await requireRole("TEACHER");
  // Pokud má učitel explicitně vynucenou změnu hesla, projde stejným flow.
  if (user.mustChangePassword) redirect("/zmena-hesla");
  return (
    <AppShell role={user.role} username={user.username}>
      {children}
    </AppShell>
  );
}
