"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { createAttendanceLesson } from "@/lib/actions/attendance";

export function NewLessonDialog({
  classGroupId,
  termId,
  onCreated,
}: {
  classGroupId: string;
  termId: string;
  onCreated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState("");
  const [title, setTitle] = useState("");
  const [hours, setHours] = useState("2");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!date) {
      toast.error("Zadejte datum.");
      return;
    }
    const durationUnits = Number(hours);
    if (!Number.isFinite(durationUnits) || durationUnits < 1) {
      toast.error("Zadejte platný počet hodin.");
      return;
    }
    setSaving(true);
    const res = await createAttendanceLesson({
      classGroupId,
      termId,
      date,
      title: title || undefined,
      durationUnits,
    });
    setSaving(false);
    if (!res.ok) {
      toast.error(res.error ?? "Vytvoření selhalo.");
      return;
    }
    toast.success("Hodina přidána");
    setOpen(false);
    setDate("");
    setTitle("");
    setHours("2");
    onCreated();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4" />
          Přidat hodinu
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nová hodina</DialogTitle>
          <DialogDescription>
            Přidá nový sloupec (datum) do docházkové tabulky.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="lesson-date">Datum</Label>
            <Input
              id="lesson-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="lesson-title">Název / poznámka (volitelně)</Label>
            <Input
              id="lesson-title"
              value={title}
              placeholder="např. TV nebo Lysá hora"
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="lesson-hours">Počet hodin</Label>
            <div className="flex items-center gap-2">
              <Input
                id="lesson-hours"
                type="number"
                min={1}
                className="w-24"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
              />
              <div className="flex gap-1">
                {["1", "2", "7"].map((h) => (
                  <Button
                    key={h}
                    type="button"
                    variant={hours === h ? "default" : "outline"}
                    size="sm"
                    onClick={() => setHours(h)}
                  >
                    {h} h
                  </Button>
                ))}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Běžný TV = 2 h, jednodenní akce (Lysá hora) = 7 h.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={saving}>
            {saving ? "Ukládám..." : "Přidat"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
