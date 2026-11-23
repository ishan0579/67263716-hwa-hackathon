"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, Moon, Sun, ShoppingCart, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTheme } from "@/components/providers"
import { cn } from "@/lib/utils"

const NAV = [
  { href: "/", label: "Home" },
  { href: "/product/snifforbit-one", label: "Product" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/experience", label: "Experience" },
  { href: "/customize", label: "Customize" },
  { href: "/dog-match", label: "Dog Match" },
  { href: "/faq", label: "FAQ" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
]

export function Navbar() {
  const pathname = usePathname()
  const { theme, toggle } = useTheme()
  return (
    <nav className="fixed top-0 w-full z-40 border-b border-border bg-background/80 backdrop-blur">
      <div className="flex items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="rounded-md bg-teal-dark px-2 py-1 text-xs font-semibold tracking-wider text-white">
            SNIFFORBIT
          </span>
          <span className="font-display text-xl font-bold tracking-tight text-foreground">
            ONE
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-8 text-sm font-medium">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "transition-colors",
                pathname === item.href
                  ? "text-primary"
                  : "text-foreground hover:text-primary"
              )}
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={toggle}
            className="rounded-md p-2 text-foreground hover:bg-accent"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <a href="/cart" className="relative rounded-md p-2 text-foreground hover:bg-accent" aria-label="Cart">
            <ShoppingCart size={18} />
            <span className="sr-only">Cart</span>
          </a>
          <Button size="sm" asChild>
            <Link href="/customize" className="flex items-center gap-2">
              <Search size={16} /> Configure
            </Link>
          </Button>
        </div>
      </div>
    </nav>
  )
}
