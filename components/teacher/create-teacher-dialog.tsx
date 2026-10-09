"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createUser } from "@/lib/actions/admin";

const EMPTY_FORM = {
  email: "",
  username: "",
  password: "",
  firstName: "",
  lastName: "",
};

/** Založení učitele (účet + profil) přes createUser. */
export function CreateTeacherDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSaving(true);
    const res = await createUser({
      ...form,
      role: "TEACHER",
      firstName: form.firstName || undefined,
      lastName: form.lastName || undefined,
    });
    setSaving(false);
    if (!res.ok) {
      toast.error(res.error ?? "Vytvoření selhalo.");
      return;
    }
    toast.success("Učitel vytvořen");
    setOpen(false);
    setForm(EMPTY_FORM);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="h-4 w-4" />
          Přidat učitele
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nový učitel</DialogTitle>
          <DialogDescription>
            Učitel se přihlásí zadaným e-mailem nebo uživatelským jménem a
            heslem.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="ct-first-name">Jméno</Label>
              <Input
                id="ct-first-name"
                value={form.firstName}
                onChange={(e) =>
                  setForm({ ...form, firstName: e.target.value })
                }
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ct-last-name">Příjmení</Label>
              <Input
                id="ct-last-name"
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="ct-email">E-mail</Label>
              <Input
                id="ct-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ct-username">Uživatelské jméno</Label>
              <Input
                id="ct-username"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
              />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="ct-password">Heslo</Label>
            <PasswordInput
              id="ct-password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={saving}>
            {saving ? "Ukládám..." : "Vytvořit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
