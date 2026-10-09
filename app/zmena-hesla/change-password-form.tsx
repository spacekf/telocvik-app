"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BrandLogo } from "@/components/brand/brand-logo";
import {
  changePasswordAction,
  type ChangePasswordState,
} from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      size="lg"
      disabled={pending}
      className="w-full bg-brand-dark text-white shadow-md hover:bg-brand focus-visible:ring-brand-dark"
    >
      {pending ? "Ukládám..." : "Uložit nové heslo"}
    </Button>
  );
}

export function ChangePasswordForm() {
  const [state, formAction] = useActionState<ChangePasswordState, FormData>(
    changePasswordAction,
    {},
  );

  return (
    <Card className="overflow-hidden rounded-2xl border-0 shadow-xl">
      <div className="brand-dark flex flex-col items-center gap-2 px-8 py-8 text-center">
        <BrandLogo className="w-[150px]" priority />
      </div>

      <div className="px-6 py-7 sm:px-8">
        <div className="mb-6 space-y-1">
          <h1 className="text-xl font-bold tracking-tight">Změna hesla</h1>
          <p className="text-sm text-muted-foreground">
            Než budete pokračovat, nastavte si vlastní heslo.
          </p>
        </div>

        <form action={formAction} className="grid gap-4">
          {state.error && (
            <Alert variant="destructive">
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-1.5">
            <Label htmlFor="newPassword" className="text-muted-foreground">
              Nové heslo
            </Label>
            <PasswordInput
              id="newPassword"
              name="newPassword"
              autoComplete="new-password"
              placeholder="••••••••"
              leftIcon={<Lock />}
              required
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="confirmPassword" className="text-muted-foreground">
              Potvrzení nového hesla
            </Label>
            <PasswordInput
              id="confirmPassword"
              name="confirmPassword"
              autoComplete="new-password"
              placeholder="••••••••"
              leftIcon={<Lock />}
              required
            />
          </div>

          <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
            Minimálně 8 znaků, malé i velké písmeno a číslice.
          </p>

          <SubmitButton />
        </form>
      </div>
    </Card>
  );
}
