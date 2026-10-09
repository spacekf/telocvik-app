"use client";

import { useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/**
 * Editovatelná buňka výkonu. Commit na Enter nebo blur (jen při změně).
 * Body se NEzapisují zde – přijdou ze serveru po výpočtu.
 *
 * Sloupcový zápis: Enter/↓ přesune fokus na stejnou disciplínu o řádek níž,
 * Shift+Enter/↑ o řádek výš. Uložení zajistí blur, který přesun fokusu vyvolá.
 */
export function EditableCell({
  value,
  placeholder,
  onCommit,
  className,
  rowIndex,
  colKey,
}: {
  value: string;
  placeholder?: string;
  onCommit: (next: string) => Promise<void>;
  className?: string;
  rowIndex: number;
  colKey: string;
}) {
  const [draft, setDraft] = useState(value);
  const [syncedValue, setSyncedValue] = useState(value);
  const [lastCommitted, setLastCommitted] = useState(value);
  const [saving, setSaving] = useState(false);
  // Escape → následující blur nesmí ukládat (commit by viděl ještě starý draft
  // ze closure, protože setDraft se do té doby nepřerenderoval).
  const skipCommitRef = useRef(false);

  // Re-sync vstupu, když přijde nová hodnota ze serveru (vzor "adjust state
  // during render" z React docs – neběží přes effect, nezpůsobuje kaskádu).
  if (value !== syncedValue) {
    setSyncedValue(value);
    setDraft(value);
    setLastCommitted(value);
  }

  async function commit() {
    if (skipCommitRef.current) {
      skipCommitRef.current = false;
      return;
    }
    if (draft === lastCommitted) return;
    setSaving(true);
    try {
      await onCommit(draft);
      setLastCommitted(draft);
    } finally {
      setSaving(false);
    }
  }

  /**
   * Přesune fokus na buňku téže disciplíny v řádku o `delta` vedle a označí
   * její obsah. Přesun fokusu vyvolá blur → commit této buňky. Na okraji
   * sloupce (nebo když je cíl právě zablokovaný ukládáním) jen blur = uložení.
   */
  function moveVertical(input: HTMLInputElement, delta: 1 | -1) {
    const target = input
      .closest("table")
      ?.querySelector<HTMLInputElement>(
        `input[data-cell-col="${CSS.escape(colKey)}"][data-cell-row="${rowIndex + delta}"]`,
      );
    if (target && !target.disabled) {
      target.focus();
      target.select();
    } else {
      input.blur();
    }
  }

  return (
    <div className="relative">
      <input
        value={draft}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        data-cell-row={rowIndex}
        data-cell-col={colKey}
        onKeyDown={(e) => {
          if (e.nativeEvent.isComposing) return;
          if (
            e.key === "Enter" ||
            e.key === "ArrowDown" ||
            e.key === "ArrowUp"
          ) {
            e.preventDefault();
            const up = e.key === "ArrowUp" || (e.key === "Enter" && e.shiftKey);
            moveVertical(e.currentTarget, up ? -1 : 1);
          }
          if (e.key === "Escape") {
            skipCommitRef.current = true;
            setDraft(lastCommitted);
            e.currentTarget.blur();
          }
        }}
        disabled={saving}
        className={cn(
          "h-8 w-20 rounded border border-transparent bg-transparent px-2 text-sm tabular-nums hover:border-input focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring",
          className,
        )}
      />
      {saving && (
        <Loader2 className="absolute right-1 top-2 h-3 w-3 animate-spin text-muted-foreground" />
      )}
    </div>
  );
}
