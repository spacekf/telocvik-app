import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";

import { getCurrentUser } from "@/lib/auth/session";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) {
    if (user.role === "TEACHER") redirect("/ucitel");
    redirect("/zak");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#f6f7fb] via-[#edeffa] to-[#e6e8f6] px-4 py-10">
      <div className="w-full max-w-md">
        <LoginForm />
        <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5" />
          Zabezpečené přihlášení · PrimMat
        </p>
      </div>
    </div>
  );
}
