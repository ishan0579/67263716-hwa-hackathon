import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Play, ArrowRight } from "lucide-react"

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <section className="relative min-h-[70vh] flex items-center justify-center overflow-hidden bg-teal-dark text-white">
        <div className="absolute inset-0 opacity-30" aria-hidden="true">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-mint blur-[120px] opacity-50" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-coral blur-[100px] opacity-40" />
        </div>
        <div className="relative z-10 px-6 text-center max-w-3xl mx-auto">
          <span className="inline-block rounded-full bg-coral/20 px-4 py-1.5 text-xs font-semibold text-coral tracking-wider uppercase mb-6">
            New product concept
          </span>
          <h1 className="font-display text-6xl md:text-8xl font-bold leading-tight mb-6 text-balance">
            Playtime has a plot twist.
          </h1>
          <p className="text-lg md:text-xl text-white/80 mb-10 max-w-2xl mx-auto leading-relaxed">
            Meet SniffOrbit ONE — a premium enrichment puzzle designed to turn
            every discovery into another adventure. Six chambers. One
            extraordinary toy.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" className="w-full sm:w-auto">
              Explore SniffOrbit <ArrowRight size={20} />
            </Button>
            <Button variant="outline" size="lg" asChild className="w-full sm:w-auto border-white/30 text-white hover:border-white">
              <Link href="/how-it-works">
                <Play size={20} className="mr-2" /> See how it works
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <h2 className="font-display text-4xl font-bold mb-16 text-center">Six discoveries. One toy.</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="rounded-lg border border-border p-8 text-center hover:border-primary transition">
                <span className="text-4xl">{String.fromCodePoint(0x1f415 + ((n - 1) % 4))}</span>
                <h3 className="mt-6 text-xl font-semibold">Chamber {n}</h3>
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                  A new scent challenge and reward on every play session.
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
