"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "motion/react";
import { useState } from "react";
import { useForm, type FieldPath } from "react-hook-form";
import type { z } from "zod";
import { CONTACT_TOPICS, contactSchema } from "@/lib/validation/forms";
import { Button } from "../ui/button";
import { SelectField, TextAreaField, TextField } from "../ui/field";
import { Alert, Check } from "../ui/icons";

type Values = z.input<typeof contactSchema>;

export function ContactForm() {
  const [status, setStatus] = useState<{ kind: "idle" } | { kind: "sent" } | { kind: "error"; message: string }>({ kind: "idle" });
  const { register, handleSubmit, formState, setError, watch, reset } = useForm<Values>({
    resolver: zodResolver(contactSchema),
    mode: "onTouched",
    defaultValues: { name: "", email: "", topic: "product", orderReference: "", message: "", company: "" },
  });
  const topic = watch("topic");
  const e = formState.errors;

  const onSubmit = async (values: Values) => {
    setStatus({ kind: "idle" });
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(values),
      });
      const body = await res.json();
      if (!res.ok) {
        if (body?.error?.fieldErrors) {
          for (const [k, m] of Object.entries(body.error.fieldErrors as Record<string, string>)) setError(k as FieldPath<Values>, { message: m });
        }
        throw new Error(body?.error?.message ?? "We couldn't send your message.");
      }
      setStatus({ kind: "sent" });
      reset();
    } catch (err) {
      setStatus({ kind: "error", message: (err as Error).message });
    }
  };

  if (status.kind === "sent") {
    return (
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} role="status" className="rounded-[var(--radius-panel)] bg-mint/60 p-8">
        <span className="grid size-12 place-items-center rounded-full bg-forest text-mint">
          <Check size={22} />
        </span>
        <h2 className="text-display-4 mt-6">Message received.</h2>
        <p className="mt-3 max-w-md text-forest/80">
          Thanks for writing. Your message is saved for the project administrator to review. As this is a portfolio project, replies aren&apos;t
          guaranteed.
        </p>
        <Button variant="dark" className="mt-6" onClick={() => setStatus({ kind: "idle" })}>
          Send another
        </Button>
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-5 sm:grid-cols-2">
      <TextField label="Your name" autoComplete="name" error={e.name?.message} {...register("name")} />
      <TextField label="Email" type="email" autoComplete="email" error={e.email?.message} {...register("email")} />
      <SelectField label="Topic" error={e.topic?.message} {...register("topic")}>
        {CONTACT_TOPICS.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </SelectField>
      <TextField
        label="Order reference"
        optional={topic !== "order"}
        placeholder="SO-XXXX-XXXX"
        autoCapitalize="characters"
        error={e.orderReference?.message}
        {...register("orderReference")}
      />
      <TextAreaField label="Message" className="sm:col-span-2" rows={6} error={e.message?.message} {...register("message")} />
      <div className="hidden" aria-hidden="true">
        <label>
          Company <input tabIndex={-1} autoComplete="off" {...register("company")} />
        </label>
      </div>
      {status.kind === "error" && (
        <p role="alert" className="flex gap-2 rounded-xl bg-coral-200/70 p-4 text-sm text-[#6b230b] sm:col-span-2">
          <Alert size={18} className="shrink-0" /> {status.message}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
        <Button type="submit" size="lg" loading={formState.isSubmitting} arrow>
          Send message
        </Button>
        <p className="text-xs text-graphite/55">Stored in this project&apos;s database. See our privacy policy.</p>
      </div>
    </form>
  );
}
