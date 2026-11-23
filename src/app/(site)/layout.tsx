import { CartDrawer } from "@/components/cart/cart-drawer";
import { ContextCursor } from "@/components/motion/context-cursor";
import { SiteFooter } from "@/components/layout/site-footer";
import { PageLoader } from "@/components/layout/page-loader";
import { SiteHeader } from "@/components/layout/site-header";
import { Providers } from "@/components/providers";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <PageLoader />
      <SiteHeader />
      <main id="main" tabIndex={-1} className="outline-none">
        {children}
      </main>
      <SiteFooter />
      <CartDrawer />
      <ContextCursor />
    </Providers>
  );
}
