"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ListChecks, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { ResponsiveTableWrapper } from "@/components/tables/responsive-table-wrapper";
import { createStudentsBulk } from "@/lib/actions/admin";
import {
  generateStudentEmail,
  generateStudentUsername,
} from "@/lib/students/generate-student-email";
import {
  parseStudentList,
  type NameOrder,
  type ParsedStudentLine,
} from "@/lib/students/parse-student-list";

type Group = { id: string; name: string };

type PreviewRow = ParsedStudentLine & {
  email: string;
  username: string;
  /** Kolikátý žák se stejným návrhem handle v tomto vložení (1 = první). */
  duplicateIndex: number;
};

type Summary = {
  created: { name: string; email: string; username: string }[];
  failed: { name: string; reason: string }[];
};

function buildPreview(text: string, order: NameOrder): PreviewRow[] {
  const seen = new Map<string, number>();
  return parseStudentList(text, order).map((line) => {
    if (!line.valid) {
      return { ...line, email: "", username: "", duplicateIndex: 0 };
    }
    const username = generateStudentUsername(line.firstName, line.lastName);
    const duplicateIndex = (seen.get(username) ?? 0) + 1;
    seen.set(username, duplicateIndex);
    return {
      ...line,
      username,
      // Bez použitelného handle nemá smysl ukazovat holou doménu.
      email: username
        ? generateStudentEmail(line.firstName, line.lastName)
        : "",
      duplicateIndex,
    };
  });
}

/** Hromadné přidání žáků do jedné skupiny: vložení seznamu, náhled, potvrzení. */
export function BulkCreateStudents({ groups }: { groups: Group[] }) {
  const router = useRouter();
  const [classGroupId, setClassGroupId] = useState("");
  const [order, setOrder] = useState<NameOrder>("FIRST_LAST");
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<PreviewRow[] | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [saving, setSaving] = useState(false);

  // Odeslat lze jen řádek se jménem i příjmením, ze kterého vznikne handle.
  const validRows = preview?.filter((r) => r.valid && r.username !== "") ?? [];
  const invalidCount = (preview?.length ?? 0) - validRows.length;

  function check() {
    const rows = buildPreview(text, order);
    if (rows.length === 0) {
      toast.error("Vložte alespoň jednoho žáka.");
      setPreview(null);
      return;
    }
    setPreview(rows);
    setSummary(null);
  }

  async function submit() {
    if (!classGroupId) {
      toast.error("Vyberte skupinu.");
      return;
    }
    if (validRows.length === 0) return;
    setSaving(true);
    const res = await createStudentsBulk({
      classGroupId,
      students: validRows.map((r) => ({
        firstName: r.firstName,
        lastName: r.lastName,
      })),
    });
    setSaving(false);
    if (!res.ok) {
      toast.error(res.error ?? "Hromadné přidání selhalo.");
      return;
    }
    setSummary({ created: res.created, failed: res.failed });
    setPreview(null);
    setText("");
    toast.success(
      res.failed.length === 0
        ? `Vytvořeno žáků: ${res.created.length}`
        : `Vytvořeno ${res.created.length}, selhalo ${res.failed.length}`,
    );
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="grid gap-4 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label>Skupina</Label>
              <Select value={classGroupId} onValueChange={setClassGroupId}>
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
            <div className="grid gap-1.5">
              <Label>Pořadí ve vloženém seznamu</Label>
              <Select
                value={order}
                onValueChange={(v) => {
                  setOrder(v as NameOrder);
                  setPreview(null);
                }}
              >
                <SelectTrigger aria-label="Pořadí jmen">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FIRST_LAST">Jméno Příjmení</SelectItem>
                  <SelectItem value="LAST_FIRST">Příjmení Jméno</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="bulk-list">Seznam žáků – jeden na řádek</Label>
            <textarea
              id="bulk-list"
              rows={10}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setPreview(null);
              }}
              placeholder={"Jan Novák\nEva Černá\nAnna Marie Dvořáková"}
              className="w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
            <p className="text-xs text-muted-foreground">
              Pohlaví se převezme ze skupiny. E-mail, uživatelské jméno i
              výchozí heslo doplní systém.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={check} disabled={saving}>
              <ListChecks className="h-4 w-4" />
              Zkontrolovat
            </Button>
            {preview && (
              <Button
                onClick={submit}
                disabled={saving || validRows.length === 0 || !classGroupId}
              >
                <UserPlus className="h-4 w-4" />
                {saving ? "Zakládám..." : `Vytvořit (${validRows.length})`}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {preview && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Náhled – {validRows.length} ke vložení
              {invalidCount > 0 ? `, ${invalidCount} nepoužitelných` : ""}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveTableWrapper>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Jméno</TableHead>
                    <TableHead>Příjmení</TableHead>
                    <TableHead>Návrh e-mailu</TableHead>
                    <TableHead>Návrh uživatele</TableHead>
                    <TableHead>Poznámka</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.map((r, i) => (
                    <TableRow
                      key={`${r.raw}-${i}`}
                      className={r.valid ? "" : "bg-destructive/5"}
                    >
                      <TableCell className="font-medium">
                        {r.valid ? r.firstName : r.raw}
                      </TableCell>
                      <TableCell>{r.valid ? r.lastName : "–"}</TableCell>
                      <TableCell className="break-all">
                        {r.email || "–"}
                      </TableCell>
                      <TableCell className="break-all">
                        {r.username || "–"}
                      </TableCell>
                      <TableCell>
                        {!r.valid ? (
                          <Badge variant="destructive">
                            Neplatný řádek – chybí příjmení
                          </Badge>
                        ) : !r.username ? (
                          <Badge variant="destructive">
                            Jméno neobsahuje písmena a–z
                          </Badge>
                        ) : r.duplicateIndex > 1 ? (
                          <Badge variant="warning">
                            Vznikne jmenovec – číslo doplní systém
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">–</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ResponsiveTableWrapper>
            {invalidCount > 0 && (
              <p className="mt-3 text-sm text-muted-foreground">
                Nepoužitelné řádky se nezakládají. Opravte je v seznamu a
                klikněte znovu na Zkontrolovat.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {summary && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Hotovo – vytvořeno {summary.created.length}
              {summary.failed.length > 0
                ? `, selhalo ${summary.failed.length}`
                : ""}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {summary.created.length > 0 && (
              <ResponsiveTableWrapper>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Žák</TableHead>
                      <TableHead>E-mail</TableHead>
                      <TableHead>Uživatel</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summary.created.map((c) => (
                      <TableRow key={c.username}>
                        <TableCell className="font-medium">{c.name}</TableCell>
                        <TableCell className="break-all">{c.email}</TableCell>
                        <TableCell className="break-all">
                          {c.username}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ResponsiveTableWrapper>
            )}
            {summary.failed.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-medium">
                  Nepodařilo se založit
                </p>
                <ul className="divide-y rounded-md border text-sm">
                  {summary.failed.map((f, i) => (
                    <li
                      key={`${f.name}-${i}`}
                      className="flex flex-wrap items-center justify-between gap-2 px-3 py-2"
                    >
                      <span className="font-medium">{f.name}</span>
                      <span className="text-muted-foreground">{f.reason}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <Button asChild variant="outline">
              <Link href="/ucitel/zaci">Zpět na žáky</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
