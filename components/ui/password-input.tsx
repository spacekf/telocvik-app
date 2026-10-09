"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils/cn";

/**
 * Heslový input se show/hide ikonou. Každá instance má vlastní stav,
 * takže nové heslo i potvrzení se přepínají nezávisle.
 *
 * Kontrast ikony je řešen přes theme tokeny `foreground` (které se v `.brand-dark`
 * překlápí na bílou): na světlém inputu je ikona tmavá, na brand-dark světlá –
 * vždy jasně viditelná i bez hoveru, hover ji dotáhne na plný kontrast.
 * Focus ring zůstává v PrimMat accentu (#D7E600).
 */
const PasswordInput = React.forwardRef<
  HTMLInputElement,
  Omit<React.ComponentProps<"input">, "type"> & {
    /** Volitelná ikona vlevo uvnitř inputu (např. zámek na loginu). */
    leftIcon?: React.ReactNode;
  }
>(({ className, leftIcon, ...props }, ref) => {
  const [showPassword, setShowPassword] = React.useState(false);

  return (
    <div className="relative">
      {leftIcon && (
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground [&_svg]:h-4 [&_svg]:w-4">
          {leftIcon}
        </span>
      )}
      <Input
        ref={ref}
        type={showPassword ? "text" : "password"}
        className={cn("pr-10", leftIcon && "pl-10", className)}
        {...props}
      />
      <button
        type="button"
        // Zabraň ztrátě focusu inputu při kliknutí na ikonu.
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => setShowPassword((value) => !value)}
        disabled={props.disabled}
        aria-label={showPassword ? "Skrýt heslo" : "Zobrazit heslo"}
        tabIndex={-1}
        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-foreground/70 transition hover:bg-foreground/10 hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D7E600] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {showPassword ? (
          <EyeOff className="h-4 w-4" />
        ) : (
          <Eye className="h-4 w-4" />
        )}
      </button>
    </div>
  );
});
PasswordInput.displayName = "PasswordInput";

export { PasswordInput };
