"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toggleStudentActive } from "@/app/ucitel/zaci/[id]/actions";

export function StudentAccountToggle({
  studentId,
  isActive,
}: {
  studentId: string;
  isActive: boolean;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function toggle() {
    setSaving(true);
    const res = await toggleStudentActive({ studentId, isActive: !isActive });
    setSaving(false);
    if (!res.ok) {
      toast.error(res.error ?? "Změna selhala.");
      return;
    }
    toast.success(res.message ?? "Hotovo.");
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-sm text-muted-foreground">Stav účtu:</span>
      {isActive ? (
        <Badge>Aktivní</Badge>
      ) : (
        <Badge variant="destructive">Neaktivní</Badge>
      )}
      <Button variant="outline" size="sm" onClick={toggle} disabled={saving}>
        {saving
          ? "..."
          : isActive
            ? "Deaktivovat účet"
            : "Aktivovat účet"}
      </Button>
    </div>
  );
}
