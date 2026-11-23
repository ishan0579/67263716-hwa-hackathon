import type { ReactNode } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { requireAdminPage } from "@/server/auth/session";

/**
 * Authenticated admin chrome. Each page still calls requireAdminPage() itself,
 * because layouts are not re-run on every client-side navigation.
 */
export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const admin = await requireAdminPage();
  return <AdminShell admin={{ name: admin.name, email: admin.email }}>{children}</AdminShell>;
}
