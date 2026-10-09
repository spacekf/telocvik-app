"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createClassGroup } from "@/lib/actions/admin";

type Group = {
  id: string;
  name: string;
  gradeYear: number;
  gender: string;
  schoolYear: string;
  students: number;
};
type Year = { id: string; name: string };

export function ClassesClient({
  groups,
  years,
}: {
  groups: Group[];
  years: Year[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    schoolYearId: years[0]?.id ?? "",
    gradeYear: "3",
    gender: "GIRLS" as "GIRLS" | "BOYS",
  });

  async function submit() {
    setSaving(true);
    const res = await createClassGroup({
      name: form.name,
      schoolYearId: form.schoolYearId,
      gradeYear: Number(form.gradeYear),
      gender: form.gender,
    });
    setSaving(false);
    if (!res.ok) {
      toast.error(res.error ?? "Vytvoření selhalo.");
      return;
    }
    toast.success("Skupina vytvořena");
    setOpen(false);
    setForm({ ...form, name: "" });
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4" />
              Nová skupina
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nová třída/skupina</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3">
              <div className="grid gap-1.5">
                <Label>Název</Label>
                <Input
                  value={form.name}
                  placeholder="např. 3. ročník – dívky"
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Školní rok</Label>
                <Select
                  value={form.schoolYearId}
                  onValueChange={(v) => setForm({ ...form, schoolYearId: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((y) => (
                      <SelectItem key={y.id} value={y.id}>
                        {y.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label>Ročník</Label>
                  <Input
                    type="number"
                    value={form.gradeYear}
                    onChange={(e) =>
                      setForm({ ...form, gradeYear: e.target.value })
                    }
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>Pohlaví</Label>
                  <Select
                    value={form.gender}
                    onValueChange={(v) =>
                      setForm({ ...form, gender: v as "GIRLS" | "BOYS" })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GIRLS">Dívky</SelectItem>
                      <SelectItem value="BOYS">Chlapci</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={submit} disabled={saving}>
                {saving ? "Ukládám..." : "Vytvořit"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Název</TableHead>
              <TableHead>Ročník</TableHead>
              <TableHead>Pohlaví</TableHead>
              <TableHead>Školní rok</TableHead>
              <TableHead className="text-right">Žáků</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {groups.map((g) => (
              <TableRow key={g.id}>
                <TableCell className="font-medium">{g.name}</TableCell>
                <TableCell>{g.gradeYear}.</TableCell>
                <TableCell>
                  <Badge variant="secondary">
                    {g.gender === "GIRLS" ? "dívky" : "chlapci"}
                  </Badge>
                </TableCell>
                <TableCell>{g.schoolYear}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {g.students}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
