export const SITE = {
  name: "SniffOrbit",
  product: "SniffOrbit ONE",
  tagline: "Every playtime, a new discovery.",
  description:
    "SniffOrbit ONE is a six-chamber dog-enrichment puzzle concept with a spring-return shutter and a mechanical indexing tray. Explore it in 3D, try the interactive demo and place a test order.",
  url: (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  contactEmail: "hello@snifforbit.example",
};

export const PRIMARY_NAV = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/experience", label: "Play demo" },
  { href: "/dog-match", label: "Dog Match" },
  { href: "/customize", label: "Customize" },
  { href: "/about", label: "Story" },
] as const;

export const FOOTER_NAV = {
  Explore: [
    { href: "/product/snifforbit-one", label: "SniffOrbit ONE" },
    { href: "/how-it-works", label: "How it works" },
    { href: "/experience", label: "Interactive demo" },
    { href: "/customize", label: "Customize" },
    { href: "/dog-match", label: "Dog Match quiz" },
  ],
  Support: [
    { href: "/faq", label: "FAQ" },
    { href: "/order/track", label: "Track an order" },
    { href: "/shipping-returns", label: "Shipping & returns" },
    { href: "/contact", label: "Contact" },
  ],
  Company: [
    { href: "/about", label: "Our story" },
    { href: "/faq#safety", label: "Product safety" },
    { href: "/privacy", label: "Privacy policy" },
    { href: "/terms", label: "Terms" },
  ],
} as const;
