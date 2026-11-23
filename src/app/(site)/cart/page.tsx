import type { Metadata } from "next";
import { CartView } from "@/components/cart/cart-view";

export const metadata: Metadata = {
  title: "Your cart",
  description: "Review your SniffOrbit ONE selection, choose a shipping estimate and continue to the test-mode checkout.",
  robots: { index: false },
};

export default function CartPage() {
  return <CartView />;
}
