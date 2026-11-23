/**
 * Page-enter choreography: a short CSS rise on every route change. Pure CSS
 * (transform only), so content is visible immediately and never waits for JS.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="animate-[page-in_0.7s_var(--ease-out-expo)_both]">{children}</div>;
}
