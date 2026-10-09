"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";
import { Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { auditActionLabels, assessmentTypeLabels } from "@/lib/labels";

type Option = { id: string; name: string };

const ALL = "__all__";

export function AuditFilterBar({
  users,
  groups,
  current,
}: {
  users: Option[];
  groups: Option[];
  current: {
    search?: string;
    action?: string;
    userId?: string;
    classGroupId?: string;
    assessmentType?: string;
    dateFrom?: string;
    dateTo?: string;
  };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [search, setSearch] = useState(current.search ?? "");

  function apply(patch: Record<string, string | undefined>) {
    const merged = { ...current, search, ...patch };
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(merged)) {
      if (v && v !== ALL) sp.set(k, v);
    }
    sp.delete("page");
    router.push(`${pathname}?${sp.toString()}`);
  }

  function reset() {
    setSearch("");
    router.push(pathname);
  }

  return (
    <div className="grid gap-3 rounded-lg border bg-card p-3 sm:grid-cols-2 lg:grid-cols-4">
      <div className="grid gap-1">
        <Label className="text-xs text-muted-foreground">Hledat</Label>
        <div className="flex gap-1">
          <Input
            value={search}
            placeholder="Uživatel, e-mail, ID…"
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && apply({})}
          />
          <Button variant="outline" size="icon" onClick={() => apply({})}>
            <Search className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-1">
        <Label className="text-xs text-muted-foreground">Akce</Label>
        <Select
          value={current.action ?? ALL}
          onValueChange={(v) => apply({ action: v })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Vše" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Vše</SelectItem>
            {Object.entries(auditActionLabels).map(([k, label]) => (
              <SelectItem key={k} value={k}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-1">
        <Label className="text-xs text-muted-foreground">Uživatel</Label>
        <Select
          value={current.userId ?? ALL}
          onValueChange={(v) => apply({ userId: v })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Vše" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Vše</SelectItem>
            {users.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-1">
        <Label className="text-xs text-muted-foreground">Skupina</Label>
        <Select
          value={current.classGroupId ?? ALL}
          onValueChange={(v) => apply({ classGroupId: v })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Vše" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Vše</SelectItem>
            {groups.map((g) => (
              <SelectItem key={g.id} value={g.id}>
                {g.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-1">
        <Label className="text-xs text-muted-foreground">Typ hodnocení</Label>
        <Select
          value={current.assessmentType ?? ALL}
          onValueChange={(v) => apply({ assessmentType: v })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Vše" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Vše</SelectItem>
            {Object.entries(assessmentTypeLabels).map(([k, label]) => (
              <SelectItem key={k} value={k}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-1">
        <Label className="text-xs text-muted-foreground">Datum od</Label>
        <Input
          type="date"
          value={current.dateFrom ?? ""}
          onChange={(e) => apply({ dateFrom: e.target.value })}
        />
      </div>

      <div className="grid gap-1">
        <Label className="text-xs text-muted-foreground">Datum do</Label>
        <Input
          type="date"
          value={current.dateTo ?? ""}
          onChange={(e) => apply({ dateTo: e.target.value })}
        />
      </div>

      <div className="flex items-end">
        <Button variant="ghost" size="sm" onClick={reset}>
          <X className="h-4 w-4" />
          Zrušit filtry
        </Button>
      </div>
    </div>
  );
}
