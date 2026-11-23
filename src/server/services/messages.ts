import { desc, eq, sql } from "drizzle-orm";
import { db } from "../db";
import { contactSubmissions, newsletterSubscriptions } from "../db/schema";
import type { ContactInput } from "@/lib/validation/forms";

export async function createContactSubmission(input: ContactInput) {
  const [row] = await db
    .insert(contactSubmissions)
    .values({
      name: input.name,
      email: input.email,
      topic: input.topic,
      orderReference: input.orderReference || null,
      message: input.message,
    })
    .returning({ id: contactSubmissions.id, createdAt: contactSubmissions.createdAt });
  return row!;
}

/** Idempotent subscribe: re-subscribing an existing address simply reactivates it. */
export async function subscribeToNewsletter(email: string, source: string) {
  const [row] = await db
    .insert(newsletterSubscriptions)
    .values({ email, source, status: "subscribed" })
    .onConflictDoUpdate({
      target: newsletterSubscriptions.email,
      set: { status: "subscribed", updatedAt: new Date() },
    })
    .returning({
      id: newsletterSubscriptions.id,
      created: sql<boolean>`(xmax = 0)`,
    });
  return { id: row!.id, alreadySubscribed: !row!.created };
}

export async function listContactSubmissions(limit = 100) {
  return db.select().from(contactSubmissions).orderBy(desc(contactSubmissions.createdAt)).limit(limit);
}

export async function setContactStatus(id: string, status: "new" | "read" | "archived") {
  const [row] = await db.update(contactSubmissions).set({ status }).where(eq(contactSubmissions.id, id)).returning();
  return row ?? null;
}

export async function listNewsletter(limit = 100) {
  return db.select().from(newsletterSubscriptions).orderBy(desc(newsletterSubscriptions.createdAt)).limit(limit);
}
