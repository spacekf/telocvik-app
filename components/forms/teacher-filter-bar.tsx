"use client";

import { useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

type Option = { id: string; name: string };

/**
 * Filtr: školní rok → pololetí → skupina. Mění URL query parametry,
 * server stránka pak načte odpovídající data (TeacherGroupSelector).
 */
export function TeacherFilterBar({
  schoolYears,
  terms,
  groups,
  schoolYearId,
  termId,
  classGroupId,
}: {
  schoolYears: Option[];
  terms: Option[];
  groups: Option[];
  schoolYearId?: string;
  termId?: string;
  classGroupId?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  function navigate(params: Record<string, string | undefined>) {
    const sp = new URLSearchParams();
    if (params.schoolYearId) sp.set("schoolYearId", params.schoolYearId);
    if (params.termId) sp.set("termId", params.termId);
    if (params.classGroupId) sp.set("classGroupId", params.classGroupId);
    // replace + refresh: vynutí čerstvé načtení server komponenty (žádný
    // zastaralý Router Cache, žádná nutnost CTRL+R).
    startTransition(() => {
      router.replace(`${pathname}?${sp.toString()}`);
      router.refresh();
    });
  }

  return (
    <div
      className="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-3"
      data-pending={isPending ? "" : undefined}
    >
      <div className="grid gap-1">
        <Label className="text-xs text-muted-foreground">Školní rok</Label>
        <Select
          value={schoolYearId}
          onValueChange={(v) => navigate({ schoolYearId: v })}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Vyberte rok" />
          </SelectTrigger>
          <SelectContent>
            {schoolYears.map((y) => (
              <SelectItem key={y.id} value={y.id}>
                {y.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-1">
        <Label className="text-xs text-muted-foreground">Pololetí</Label>
        <Select
          value={termId}
          onValueChange={(v) =>
            navigate({ schoolYearId, termId: v, classGroupId })
          }
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Vyberte pololetí" />
          </SelectTrigger>
          <SelectContent>
            {terms.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-1">
        <Label className="text-xs text-muted-foreground">Skupina</Label>
        <Select
          value={classGroupId}
          onValueChange={(v) =>
            navigate({ schoolYearId, termId, classGroupId: v })
          }
        >
          <SelectTrigger className="w-56">
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
    </div>
  );
}
