"use client";

import { useState } from "react";
import { Upload, Loader2, Search } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { StatCard } from "@/components/dashboard/stat-card";
import { runImport, type ImportActionResult } from "@/lib/actions/import";

export function ImportClient() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<ImportActionResult | null>(null);

  async function run(dryRun: boolean) {
    setRunning(true);
    const res = await runImport(dryRun);
    setRunning(false);
    setResult(res);
    if (res.ok) toast.success(dryRun ? "Náhled (dry-run) hotový" : "Import dokončen");
    else toast.error(res.error ?? "Import selhal");
  }

  const report = result?.report;

  return (
    <div className="space-y-4">
      <Alert>
        <AlertDescription>
          Import načte všechny <strong>.xlsx</strong> ze složky <code>/imports</code>.
          Žákům vytvoří účty (e-mail <code>příjmení+iniciála@primmat.cz</code>,
          výchozí heslo <strong>Heslo123.</strong> s vynucenou změnou), zařadí je do
          skupin a naimportuje výkony i docházku. Body se přepočítají podle pravidel
          v DB. Opakovaný import nevytváří duplicity. Nejdřív si spusťte{" "}
          <strong>Náhled (dry-run)</strong>.
        </AlertDescription>
      </Alert>

      <div className="flex flex-wrap gap-3">
        <Button variant="outline" onClick={() => run(true)} disabled={running}>
          {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          Náhled (dry-run)
        </Button>
        <Button onClick={() => run(false)} disabled={running}>
          {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          Spustit ostrý import
        </Button>
      </div>

      {report && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Režim: <strong>{report.mode}</strong> · souborů:{" "}
            {report.importedFiles.length}
          </p>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Noví uživatelé" value={report.createdUsers} />
            <StatCard label="Noví žáci" value={report.createdStudents} />
            <StatCard label="Enrollmenty" value={report.createdEnrollments} />
            <StatCard label="Výsledky atletika" value={report.importedAthleticsResults} />
            <StatCard label="Výsledky fyz. zdatnost" value={report.importedFitnessResults} />
            <StatCard label="Hodiny docházky" value={report.importedAttendanceLessons} />
            <StatCard label="Záznamy docházky" value={report.importedAttendanceRecords} />
            <StatCard label="Přeskočeno" value={report.skippedRows} />
          </div>

          {report.duplicateEmails.length > 0 && (
            <Alert variant="warning">
              <AlertDescription>
                <p className="font-medium">Kolize e-mailů (vyřešte ručně):</p>
                <ul className="mt-1 list-disc pl-4">
                  {report.duplicateEmails.map((d, i) => (
                    <li key={i}>
                      {d.email}: ponechán „{d.keptStudent}“, přeskočen „
                      {d.conflictingStudent}“
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {report.errors.length > 0 && (
            <Alert variant="destructive">
              <AlertDescription>
                <ul className="list-disc pl-4">
                  {report.errors.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            {report.files.map((f) => (
              <Card key={f.file}>
                <CardContent className="pt-4 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{f.file}</span>
                    <span className="text-muted-foreground">
                      {f.kind}
                      {f.termOrder ? ` · ${f.termOrder}. pololetí` : ""}
                    </span>
                  </div>
                  {f.error ? (
                    <p className="mt-1 text-destructive">{f.error}</p>
                  ) : (
                    <ul className="mt-2 space-y-1 text-muted-foreground">
                      {f.sheets.map((s, i) => (
                        <li key={i}>
                          List <strong>{s.sheet}</strong>
                          {s.gradeYear ? ` (${s.gradeYear}. ročník)` : " (ročník nerozpoznán)"}{" "}
                          – žáci: {s.students}, výsledky: {s.results}, hodiny:{" "}
                          {s.lessons}, docházka: {s.records}, přeskočeno: {s.skipped}
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
