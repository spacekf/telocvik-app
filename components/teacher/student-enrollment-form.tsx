"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateStudentEnrollment } from "@/app/ucitel/zaci/[id]/actions";

type Group = { id: string; name: string };

export function StudentEnrollmentForm({
  studentId,
  schoolYearId,
  schoolYearName,
  currentGroupId,
  currentGroupName,
  groups,
}: {
  studentId: string;
  schoolYearId: string;
  schoolYearName: string;
  currentGroupId: string | null;
  currentGroupName: string | null;
  groups: Group[];
}) {
  const router = useRouter();
  const [groupId, setGroupId] = useState(currentGroupId ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!groupId) return toast.error("Vyberte skupinu.");
    setSaving(true);
    const res = await updateStudentEnrollment({
      studentId,
      schoolYearId,
      newClassGroupId: groupId,
    });
    setSaving(false);
    if (!res.ok) {
      toast.error(res.error ?? "Změna selhala.");
      return;
    }
    toast.success(res.message ?? "Skupina změněna.");
    router.refresh();
  }

  return (
    <div className="grid max-w-xl gap-4">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted-foreground">Školní rok:</span>
        <Badge variant="secondary">{schoolYearName}</Badge>
        <span className="ml-2 text-muted-foreground">Aktuální skupina:</span>
        <Badge>{currentGroupName ?? "—"}</Badge>
      </div>

      <div className="grid gap-1.5">
        <Label>Nová skupina</Label>
        <Select value={groupId} onValueChange={setGroupId}>
          <SelectTrigger className="max-w-sm">
            <SelectValue placeholder="Vyberte skupinu" />
          </SelectTrigger>
          <SelectContent>
            {groups.map((g) => (
              <SelectItem key={g.id} value={g.id}>
                {g.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Změna se týká jen roku {schoolYearName}. Historické výsledky a docházka
          z jiných let zůstanou beze změny.
        </p>
      </div>

      <div>
        <Button onClick={save} disabled={saving || groupId === currentGroupId}>
          {saving ? "Měním..." : "Změnit skupinu"}
        </Button>
      </div>
    </div>
  );
}
