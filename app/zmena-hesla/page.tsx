import { requireUser } from "@/lib/auth/session";
import { ChangePasswordForm } from "./change-password-form";

export default async function ChangePasswordPage() {
  // Vyžaduje přihlášení (jinak requireUser přesměruje na /prihlaseni).
  await requireUser();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#f6f7fb] via-[#edeffa] to-[#e6e8f6] px-4 py-10">
      <div className="w-full max-w-md">
        <ChangePasswordForm />
      </div>
    </div>
  );
}
