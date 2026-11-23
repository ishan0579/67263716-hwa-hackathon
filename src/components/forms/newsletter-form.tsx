"use client";

import { useId, useState } from "react";
import { cn } from "@/lib/utils";
import { ArrowRight, Check } from "../ui/icons";
import { Spinner } from "../ui/spinner";

type State = { kind: "idle" } | { kind: "loading" } | { kind: "done"; already: boolean } | { kind: "error"; message: string };

export function NewsletterForm({ source = "footer", tone = "dark" }: { source?: "footer" | "final-cta" | "about"; tone?: "dark" | "light" }) {
  const id = useId();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<State>({ kind: "idle" });

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (state.kind === "loading") return;
    const company = (new FormData(e.currentTarget).get("company") as string) ?? "";
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setState({ kind: "error", message: "Enter a valid email address." });
      return;
    }
    setState({ kind: "loading" });
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, source, company }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error?.fieldErrors?.email ?? body?.error?.message ?? "Couldn't subscribe right now.");
      setState({ kind: "done", already: body.alreadySubscribed });
    } catch (err) {
      setState({ kind: "error", message: (err as Error).message });
    }
  }

  if (state.kind === "done") {
    return (
      <p role="status" className="flex items-center gap-3 text-lg">
        <span className="grid size-9 place-items-center rounded-full bg-mint text-forest">
          <Check size={18} />
        </span>
        {state.already ? "You're already on the list — thank you!" : "You're on the list. Studio notes coming your way."}
      </p>
    );
  }

  const dark = tone === "dark";
  return (
    <form onSubmit={submit} noValidate className="w-full max-w-md">
      <label htmlFor={id} className="sr-only">
        Email address
      </label>
      <div
        className={cn(
          "flex items-center gap-2 rounded-full border p-1.5 pl-5 transition-colors focus-within:border-current",
          dark ? "border-ivory/25" : "border-graphite/20 bg-white/60",
        )}
      >
        <input
          id={id}
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          required
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (state.kind === "error") setState({ kind: "idle" });
          }}
          placeholder="you@example.com"
          aria-invalid={state.kind === "error" || undefined}
          aria-describedby={state.kind === "error" ? `${id}-err` : `${id}-note`}
          className={cn(
            "h-11 min-w-0 flex-1 bg-transparent text-base outline-none focus-visible:shadow-none",
            dark ? "placeholder:text-ivory/40" : "placeholder:text-graphite/40",
          )}
        />
        <input type="text" name="company" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
        <button
          type="submit"
          disabled={state.kind === "loading"}
          className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full bg-coral px-5 text-sm font-medium text-forest transition-colors hover:bg-coral-600 disabled:opacity-60"
        >
          {state.kind === "loading" ? <Spinner className="size-4" /> : <ArrowRight size={16} />}
          Subscribe
        </button>
      </div>
      {state.kind === "error" ? (
        <p id={`${id}-err`} role="alert" className={cn("mt-2 pl-5 text-sm", dark ? "text-coral" : "text-[#a5321a]")}>
          {state.message}
        </p>
      ) : (
        <p id={`${id}-note`} className={cn("mt-2 pl-5 text-xs", dark ? "text-ivory/50" : "text-graphite/55")}>
          Occasional design-process notes. Unsubscribe anytime. Stored only in this project&apos;s database.
        </p>
      )}
    </form>
  );
}
