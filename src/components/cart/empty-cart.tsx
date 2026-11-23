import { ButtonLink } from "../ui/button";
import { BrandMark } from "../layout/brand-mark";

export function EmptyCart({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex max-w-xs flex-col items-center text-center">
      <div className="relative mb-6 grid size-28 place-items-center">
        <div className="absolute inset-0 rounded-full border border-dashed border-forest/25 [animation:orbit-spin_24s_linear_infinite]" />
        <BrandMark className="size-14 text-forest" active={-1} />
      </div>
      <p className="font-display text-2xl font-semibold tracking-[-0.03em]">Nothing to sniff out here — yet.</p>
      <p className="mt-2 text-sm leading-relaxed text-graphite/65">
        Your cart is empty. Configure a SniffOrbit ONE in the colour and size that suits your dog.
      </p>
      <div className="mt-6 flex flex-col gap-2">
        <ButtonLink href="/customize" arrow onClick={onNavigate}>
          Customize yours
        </ButtonLink>
        <ButtonLink href="/dog-match" variant="ghost" onClick={onNavigate}>
          Not sure? Take Dog Match
        </ButtonLink>
      </div>
    </div>
  );
}
