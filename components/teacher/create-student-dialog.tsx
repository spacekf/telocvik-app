"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createStudentAuto } from "@/lib/actions/admin";
import {
  generateStudentEmail,
  generateStudentUsername,
} from "@/lib/students/generate-student-email";

type Group = { id: string; name: string };

function emptyForm(classGroupId: string) {
  return { firstName: "", lastName: "", classGroupId };
}

/**
 * Rychlé založení žáka: jméno, příjmení a skupina. E-mail, uživatelské jméno
 * a výchozí heslo doplní server (createStudentAuto), pohlaví převezme ze skupiny.
 */
export function CreateStudentDialog({
  groups,
  defaultGroupId,
}: {
  groups: Group[];
  /** Předvybraná skupina (např. aktuální filtr na stránce Žáci). */
  defaultGroupId?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(() => emptyForm(defaultGroupId ?? ""));
  const [saving, setSaving] = useState(false);

  const hasName = form.firstName.trim() !== "" && form.lastName.trim() !== "";
  const previewUsername = hasName
    ? generateStudentUsername(form.firstName, form.lastName)
    : "";
  const previewEmail = previewUsername
    ? generateStudentEmail(form.firstName, form.lastName)
    : "";

  function handleOpenChange(next: boolean) {
    // Při otevření předvyplň skupinu podle aktuálního filtru.
    if (next && !form.classGroupId && defaultGroupId) {
      setForm((f) => ({ ...f, classGroupId: defaultGroupId }));
    }
    setOpen(next);
  }

  async function submit() {
    // Seznam žáků vychází ze zařazení do skupiny – bez skupiny by se nový
    // žák na stránce nezobrazil.
    if (!form.classGroupId) {
      toast.error("Vyberte skupinu.");
      return;
    }
    setSaving(true);
    const res = await createStudentAuto(form);
    setSaving(false);
    if (!res.ok) {
      toast.error(res.error ?? "Vytvoření selhalo.");
      return;
    }
    toast.success(`Žák vytvořen: ${res.email}`);
    setOpen(false);
    setForm(emptyForm(defaultGroupId ?? ""));
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="h-4 w-4" />
          Přidat žáka
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nový žák</DialogTitle>
          <DialogDescription>
            Účet dostane výchozí heslo, které si žák po prvním přihlášení změní.
            Pohlaví se převezme ze skupiny.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="cs-first-name">Jméno</Label>
              <Input
                id="cs-first-name"
                value={form.firstName}
                onChange={(e) =>
                  setForm({ ...form, firstName: e.target.value })
                }
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="cs-last-name">Příjmení</Label>
              <Input
                id="cs-last-name"
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>Skupina</Label>
            <Select
              value={form.classGroupId}
              onValueChange={(v) => setForm({ ...form, classGroupId: v })}
            >
              <SelectTrigger aria-label="Skupina">
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
          </div>
          <div
            className="rounded-md border border-dashed bg-muted/40 px-3 py-2 text-sm"
            aria-live="polite"
          >
            <p className="text-xs font-medium text-muted-foreground">
              Návrh přihlašovacích údajů
            </p>
            {previewUsername ? (
              <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
                <dt className="text-muted-foreground">E-mail</dt>
                <dd className="break-all font-medium">{previewEmail}</dd>
                <dt className="text-muted-foreground">Uživatel</dt>
                <dd className="break-all font-medium">{previewUsername}</dd>
              </dl>
            ) : (
              <p className="mt-1 text-muted-foreground">
                {hasName
                  ? "Jméno neobsahuje žádná písmena a–z."
                  : "Vyplňte jméno a příjmení."}
              </p>
            )}
            <p className="mt-1.5 text-xs text-muted-foreground">
              Při shodě jmen může systém přidat číslo (např.{" "}
              {previewUsername || "novakj"}2). Finální tvar určí server.
            </p>
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
