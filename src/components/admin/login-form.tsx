"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { adminLoginSchema } from "@/lib/validation/forms";
import { issuesToFieldErrors, type FieldErrors } from "./api";
import { InlineAlert } from "./ui";

type ErrorBody = { error?: { code?: string; message?: string; fieldErrors?: FieldErrors } };

export function LoginForm() {
  const router = useRouter();
  const passwordRef = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<{ title: string; message: string } | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    setFormError(null);
    const parsed = adminLoginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setFieldErrors(issuesToFieldErrors(parsed.error.issues));
      return;
    }
    setFieldErrors({});
    setPending(true);

    let res: Response;
    try {
      res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(parsed.data),
      });
    } catch {
      setPending(false);
      setFormError({ title: "Couldn't reach the server", message: "Check your connection and try again." });
      return;
    }

    if (res.ok) {
      // Keep the loading state while the dashboard loads.
      router.replace("/admin");
      router.refresh();
      return;
    }

    const body = (await res.json().catch(() => null)) as ErrorBody | null;
    setPending(false);
    if (res.status === 429) {
      setFormError({
        title: "Too many sign-in attempts",
        message: body?.error?.message ?? "Please wait a few minutes before trying again.",
      });
    } else if (res.status === 422 && body?.error?.fieldErrors) {
      setFieldErrors(body.error.fieldErrors);
    } else if (res.status === 401) {
      setFormError({
        title: "Sign-in failed",
        message: body?.error?.message ?? "That email and password combination isn't right.",
      });
      setPassword("");
      passwordRef.current?.focus();
    } else {
      setFormError({
        title: "Something went wrong",
        message: body?.error?.message ?? "Please try again in a moment.",
      });
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5" aria-describedby={formError ? "login-error" : undefined}>
      <div aria-live="assertive" id="login-error">
        {formError && <InlineAlert title={formError.title}>{formError.message}</InlineAlert>}
      </div>
      <TextField
        label="Email"
        name="email"
        type="email"
        autoComplete="username"
        inputMode="email"
        autoCapitalize="none"
        spellCheck={false}
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={fieldErrors.email}
        disabled={pending}
      />
      <div className="relative">
        <TextField
          ref={passwordRef}
          label="Password"
          name="password"
          type={showPassword ? "text" : "password"}
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={fieldErrors.password}
          disabled={pending}
          className="[&_input]:pr-20"
        />
        <button
          type="button"
          onClick={() => setShowPassword((s) => !s)}
          aria-pressed={showPassword}
          aria-label={showPassword ? "Hide password" : "Show password"}
          className="absolute right-2 top-8 h-9 rounded-lg px-3 text-xs font-medium text-forest hover:bg-forest/[0.06]"
        >
          {showPassword ? "Hide" : "Show"}
        </button>
      </div>
      <Button type="submit" variant="dark" size="md" loading={pending} className="mt-1 w-full">
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
