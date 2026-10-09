"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function StudentSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get("q") ?? "");

  function submit(next: string) {
    const sp = new URLSearchParams(searchParams.toString());
    if (next) sp.set("q", next);
    else sp.delete("q");
    router.push(`/ucitel/zaci?${sp.toString()}`);
  }

  return (
    <div className="flex max-w-sm gap-2">
      <Input
        value={value}
        placeholder="Hledat jméno, příjmení, e-mail…"
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit(value.trim())}
      />
      <Button variant="outline" size="icon" onClick={() => submit(value.trim())}>
        <Search className="h-4 w-4" />
      </Button>
      {searchParams.get("q") && (
        <Button variant="ghost" size="icon" onClick={() => { setValue(""); submit(""); }}>
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
