export function Footer() {
  return (
    <footer className="border-t border-border bg-teal-dark text-white pt-16 pb-12">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          <div>
            <span className="font-display text-xl font-bold tracking-tight">
              SNIFFORBIT ONE
            </span>
            <p className="mt-4 text-sm text-mint/70 max-w-[280px] leading-relaxed">
              A premium enrichment concept for curious dogs. Every playtime, a
              new discovery.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold tracking-wider uppercase mb-4">Shop</h3>
            <ul className="space-y-2 text-sm text-mint/70">
              <li><a href="/product/snifforbit-one" className="hover:text-white">Product</a></li>
              <li><a href="/customize" className="hover:text-white">Customize</a></li>
              <li><a href="/cart" className="hover:text-white">Cart</a></li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold tracking-wider uppercase mb-4">Learn</h3>
            <ul className="space-y-2 text-sm text-mint/70">
              <li><a href="/how-it-works" className="hover:text-white">How it works</a></li>
              <li><a href="/experience" className="hover:text-white">Experience</a></li>
              <li><a href="/dog-match" className="hover:text-white">Dog Match</a></li>
              <li><a href="/faq" className="hover:text-white">FAQ</a></li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold tracking-wider uppercase mb-4">Policy</h3>
            <ul className="space-y-2 text-sm text-mint/70">
              <li><a href="/privacy" className="hover:text-white">Privacy</a></li>
              <li><a href="/terms" className="hover:text-white">Terms</a></li>
              <li><a href="/shipping-returns" className="hover:text-white">Shipping &amp; returns</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-mint/60">
          <p>SniffOrbit ONE — Product Concept Demonstration</p>
          <p>Demo store — test orders only</p>
        </div>
      </div>
    </footer>
  )
}
