import { ProductForm } from "@/components/admin/product-form";
import { PageHeader } from "@/components/admin/ui";
import { Breadcrumbs } from "@/components/ui/misc";
import { requireAdminPage } from "@/server/auth/session";

export const metadata = { title: "New product" };

export default async function AdminNewProductPage() {
  await requireAdminPage();
  return (
    <>
      <PageHeader
        breadcrumbs={<Breadcrumbs items={[{ href: "/admin/products", label: "Products" }, { label: "New product" }]} />}
        title="New product"
        description="Start with the basics. After creating the product you can add colour and size variants with prices and stock."
      />
      <ProductForm mode="create" />
    </>
  );
}
