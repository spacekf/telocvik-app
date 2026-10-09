"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { resetStudentPassword } from "@/lib/actions/admin";

export function ResetPasswordButton({
  studentId,
  disabled,
}: {
  studentId: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  async function confirm() {
    setSaving(true);
    const res = await resetStudentPassword(studentId);
    setSaving(false);
    if (!res.ok) {
      toast.error(res.error ?? "Reset selhal.");
      return;
    }
    toast.success(res.message ?? "Heslo bylo resetováno.");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled}>
          <KeyRound className="h-4 w-4" />
          Resetovat heslo
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Resetovat heslo žáka?</DialogTitle>
          <DialogDescription>
            Žákovi bude nastaveno výchozí heslo Heslo123. Po dalším přihlášení si
            bude muset nastavit vlastní heslo.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={saving}
          >
            Zrušit
          </Button>
          <Button onClick={confirm} disabled={saving}>
            {saving ? "Resetuji..." : "Resetovat heslo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
