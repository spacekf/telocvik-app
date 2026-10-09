"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { ArrowRight, AtSign, Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BrandLogo } from "@/components/brand/brand-logo";
import { loginAction, type LoginState } from "@/lib/actions/auth";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      size="lg"
      disabled={pending}
      className="w-full bg-brand-dark text-white shadow-md hover:bg-brand focus-visible:ring-brand-dark"
    >
      {pending ? "Přihlašuji..." : "Přihlásit se"}
      {!pending && <ArrowRight className="h-4 w-4" />}
    </Button>
  );
}

export function LoginForm() {
  const [state, formAction] = useActionState<LoginState, FormData>(
    loginAction,
    {},
  );
  const [showForgot, setShowForgot] = useState(false);

  return (
    <Card className="overflow-hidden rounded-2xl border-0 shadow-xl">
      {/* Brand panel s logem (bílé logo na tmavém PrimMat podkladu). */}
      <div className="brand-dark flex flex-col items-center gap-2 px-8 py-8 text-center">
        <BrandLogo className="w-[150px]" priority />
        <p className="text-xs font-medium uppercase tracking-wide text-brand-muted">
          Evidence výsledků z tělocviku
        </p>
      </div>

      <div className="px-6 py-7 sm:px-8">
        <div className="mb-6 space-y-1">
          <h1 className="text-xl font-bold tracking-tight">Přihlášení</h1>
          <p className="text-sm text-muted-foreground">
            Zadejte své přihlašovací údaje pro vstup do portálu.
          </p>
        </div>

        <form action={formAction} className="grid gap-4">
          {state.error && (
            <Alert variant="destructive">
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-1.5">
            <Label htmlFor="identifier" className="text-muted-foreground">
              E-mail nebo uživatelské jméno
            </Label>
            <div className="relative">
              <AtSign className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="identifier"
                name="identifier"
                autoComplete="username"
                placeholder="jmeno@primmat.cz"
                className="pl-10"
                required
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-muted-foreground">
                Heslo
              </Label>
              <button
                type="button"
                onClick={() => setShowForgot((v) => !v)}
                className="text-xs font-medium text-brand hover:underline"
              >
                Zapomněli jste heslo?
              </button>
            </div>
            <PasswordInput
              id="password"
              name="password"
              autoComplete="current-password"
              placeholder="••••••••"
              leftIcon={<Lock />}
              required
            />
            {showForgot && (
              <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
                Heslo vám resetuje vyučující nebo správce. Obraťte se prosím na
                svého učitele tělocviku.
              </p>
            )}
          </div>

          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              name="rememberMe"
              className="h-4 w-4 rounded border-input accent-brand"
            />
            Zůstat přihlášen 30 dnů
          </label>

          <SubmitButton />
        </form>
      </div>
    </Card>
  );
}
