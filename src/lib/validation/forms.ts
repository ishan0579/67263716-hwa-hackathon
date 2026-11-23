import { z } from "zod";

const email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: "Enter a valid email address" }).max(254));

export const CONTACT_TOPICS = [
  { value: "product", label: "The SniffOrbit concept" },
  { value: "order", label: "A test order" },
  { value: "press", label: "Collaboration or press" },
  { value: "other", label: "Something else" },
] as const;

export const contactSchema = z.object({
  name: z.string().trim().min(2, "Please tell us your name").max(120),
  email,
  topic: z.enum(["product", "order", "press", "other"], { error: "Choose a topic" }),
  orderReference: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^(SO-[0-9A-Z]{4}-[0-9A-Z]{4})?$/, "Order references look like SO-XXXX-XXXX")
    .optional()
    .or(z.literal("")),
  message: z.string().trim().min(10, "A little more detail helps (10+ characters)").max(4000),
  /** Honeypot — real users never fill this in. */
  company: z.string().max(0).optional().or(z.literal("")),
});

export type ContactInput = z.infer<typeof contactSchema>;

export const newsletterSchema = z.object({
  email,
  source: z.enum(["footer", "final-cta", "about"]).default("footer"),
  company: z.string().max(0).optional().or(z.literal("")),
});

export const adminLoginSchema = z.object({
  email,
  password: z.string().min(1, "Password is required").max(200),
});
