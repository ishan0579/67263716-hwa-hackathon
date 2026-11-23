const formatters = new Map<string, Intl.NumberFormat>();

/** Formats integer minor units (cents) as currency, e.g. 12900 → "$129". */
export function formatMoney(cents: number, currency = "USD", opts: { exact?: boolean } = {}) {
  const whole = cents % 100 === 0 && !opts.exact;
  const key = `${currency}-${whole}`;
  let f = formatters.get(key);
  if (!f) {
    f = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: whole ? 0 : 2,
      maximumFractionDigits: whole ? 0 : 2,
    });
    formatters.set(key, f);
  }
  return f.format(cents / 100);
}
