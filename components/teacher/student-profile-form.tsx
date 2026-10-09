"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateStudentProfile } from "@/app/ucitel/zaci/[id]/actions";

type Profile = {
  firstName: string;
  lastName: string;
  email: string;
  username: string;
};

export function StudentProfileForm({
  studentId,
  initial,
}: {
  studentId: string;
  initial: Profile;
}) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const res = await updateStudentProfile({ studentId, ...form });
    setSaving(false);
    if (!res.ok) {
      toast.error(res.error ?? "Uložení selhalo.");
      return;
    }
    toast.success(res.message ?? "Profil uložen.");
    router.refresh();
  }

  const field = (k: keyof Profile) => ({
    value: form[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm({ ...form, [k]: e.target.value }),
  });

  return (
    <div className="grid max-w-xl gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label>Jméno</Label>
          <Input {...field("firstName")} />
        </div>
        <div className="grid gap-1.5">
          <Label>Příjmení</Label>
          <Input {...field("lastName")} />
        </div>
      </div>
      <div className="grid gap-1.5">
        <Label>E-mail</Label>
        <Input type="email" autoComplete="off" {...field("email")} />
      </div>
      <div className="grid gap-1.5">
        <Label>Uživatelské jméno</Label>
        <Input autoComplete="off" {...field("username")} />
      </div>
      <div className="grid gap-1.5">
        <Label>Role</Label>
        <Input value="Žák" readOnly disabled />
      </div>
      <div>
        <Button onClick={save} disabled={saving}>
          {saving ? "Ukládám..." : "Uložit profil"}
        </Button>
      </div>
    </div>
  );
}
