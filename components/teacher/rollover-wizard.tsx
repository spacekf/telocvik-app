"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, GraduationCap, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { StatCard } from "@/components/dashboard/stat-card";
import {
  createSchoolYear,
  getRolloverPreview,
  executeRollover,
  type RolloverPreview,
} from "@/lib/actions/school-year";

type Year = { id: string; name: string; isActive: boolean };
const NEW = "__new__";

export function RolloverWizard({ years }: { years: Year[] }) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);

  const [sourceId, setSourceId] = useState(
    years.find((y) => y.isActive)?.id ?? years[0]?.id ?? "",
  );
  const [targetSel, setTargetSel] = useState("");
  const [newName, setNewName] = useState("");
  const [newStarts, setNewStarts] = useState("");
  const [newEnds, setNewEnds] = useState("");

  const [targetId, setTargetId] = useState("");
  const [preview, setPreview] = useState<RolloverPreview | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  async function goToPreview() {
    if (!sourceId) return toast.error("Vyberte zdrojový rok.");
    let resolvedTargetId = targetSel;

    if (targetSel === NEW) {
      if (!newName.trim()) return toast.error("Zadejte název nového roku.");
      setLoading(true);
      const created = await createSchoolYear({
        name: newName.trim(),
        startsAt: newStarts || undefined,
        endsAt: newEnds || undefined,
      });
      if (!created.ok || !created.data) {
        setLoading(false);
        return toast.error(created.error ?? "Vytvoření roku selhalo.");
      }
      resolvedTargetId = created.data.id;
    }

    if (!resolvedTargetId) {
      return toast.error("Vyberte nebo vytvořte cílový rok.");
    }
    if (resolvedTargetId === sourceId) {
      return toast.error("Zdrojový a cílový rok musí být různé.");
    }

    setLoading(true);
    const res = await getRolloverPreview(sourceId, resolvedTargetId);
    setLoading(false);
    if (!res.ok || !res.data) {
      return toast.error(res.error ?? "Náhled se nepodařilo načíst.");
    }
    setTargetId(resolvedTargetId);
    setPreview(res.data);
    setStep(2);
  }

  async function confirmRollover() {
    if (!confirmed) return;
    setLoading(true);
    const res = await executeRollover({
      sourceSchoolYearId: sourceId,
      targetSchoolYearId: targetId,
      confirm: true,
    });
    setLoading(false);
    if (!res.ok || !res.data) {
      return toast.error(res.error ?? "Převod selhal.");
    }
    toast.success(res.data.message);
    router.push("/ucitel/skupiny");
    router.refresh();
  }

  // ----- Krok 1 -----
  if (step === 1) {
    return (
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="text-base">1. Výběr roků</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-1.5">
            <Label>Zdrojový školní rok</Label>
            <Select value={sourceId} onValueChange={setSourceId}>
              <SelectTrigger>
                <SelectValue placeholder="Vyberte rok" />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y.id} value={y.id}>
                    {y.name}
                    {y.isActive ? " (aktivní)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1.5">
            <Label>Cílový školní rok</Label>
            <Select value={targetSel} onValueChange={setTargetSel}>
              <SelectTrigger>
                <SelectValue placeholder="Vyberte nebo vytvořte rok" />
              </SelectTrigger>
              <SelectContent>
                {years
                  .filter((y) => y.id !== sourceId)
                  .map((y) => (
                    <SelectItem key={y.id} value={y.id}>
                      {y.name}
                    </SelectItem>
                  ))}
                <SelectItem value={NEW}>+ Vytvořit nový rok…</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {targetSel === NEW && (
            <div className="grid gap-3 rounded-lg border bg-muted/30 p-3">
              <div className="grid gap-1.5">
                <Label>Název nového roku</Label>
                <Input
                  value={newName}
                  placeholder="např. 2026/2027"
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label className="text-xs text-muted-foreground">
                    Začátek (volitelné)
                  </Label>
                  <Input
                    type="date"
                    value={newStarts}
                    onChange={(e) => setNewStarts(e.target.value)}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs text-muted-foreground">
                    Konec (volitelné)
                  </Label>
                  <Input
                    type="date"
                    value={newEnds}
                    onChange={(e) => setNewEnds(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <Button onClick={goToPreview} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Zobrazit náhled
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ----- Krok 2 -----
  if (step === 2 && preview) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Vytvoří se skupin" value={preview.totals.createdGroups} />
          <StatCard label="Převede žáků" value={preview.totals.studentsToTransfer} />
          <StatCard label="Do archivu / absolventi" value={preview.totals.studentsToGraduate} />
          <StatCard label="Přeskočeno (existuje)" value={preview.totals.skippedExisting} />
        </div>

        {preview.warnings.length > 0 && (
          <Alert variant="warning">
            <AlertDescription>
              <ul className="list-disc pl-4">
                {preview.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              Náhled převodu: {preview.sourceYearName} → {preview.targetYearName}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Původní skupina</TableHead>
                    <TableHead>Nová skupina</TableHead>
                    <TableHead className="text-right">Počet žáků</TableHead>
                    <TableHead>Stav</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.rows.map((r) => (
                    <TableRow key={r.sourceGroupId}>
                      <TableCell className="font-medium">
                        {r.sourceGroupName}
                      </TableCell>
                      <TableCell>
                        {r.isGraduation ? (
                          <span className="inline-flex items-center gap-1 text-muted-foreground">
                            <GraduationCap className="h-4 w-4" /> Absolventi / archiv
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1">
                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                            {r.targetGroupName}
                            {!r.targetGroupExists && (
                              <Badge variant="secondary">nová</Badge>
                            )}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {r.studentCount}
                        {r.alreadyDone > 0 ? (
                          <span className="ml-1 text-xs text-muted-foreground">
                            (+{r.alreadyDone} hotovo)
                          </span>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        {r.isGraduation ? (
                          <Badge variant="secondary">Absolvuje</Badge>
                        ) : (
                          <Badge>Převod</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-between">
          <Button variant="outline" onClick={() => setStep(1)} disabled={loading}>
            Zpět
          </Button>
          <Button onClick={() => setStep(3)} disabled={loading}>
            Pokračovat
          </Button>
        </div>
      </div>
    );
  }

  // ----- Krok 3 -----
  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle className="text-base">3. Potvrzení převodu</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {preview?.sourceYearName} → {preview?.targetYearName}. Historická data
          (výsledky, docházka, hodnocení) zůstanou ve starém roce beze změny.
        </p>
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 rounded border-input"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
          />
          Rozumím, že historická data zůstanou ve starém školním roce a žáci budou
          zařazeni do nového roku.
        </label>
        <div className="flex justify-between">
          <Button variant="outline" onClick={() => setStep(2)} disabled={loading}>
            Zpět
          </Button>
          <Button onClick={confirmRollover} disabled={!confirmed || loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Potvrdit převod školního roku
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
