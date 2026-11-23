import Link from "next/link";
import type { ReactNode } from "react";

export type FaqEntry = { id: string; question: string; answer: ReactNode; text: string; group: "Product" | "Safety" | "Orders" };

/**
 * FAQ answers reflect the real implementation and the product's concept status.
 * `text` is the plain-text version used for FAQPage structured data.
 */
export const FAQ: FaqEntry[] = [
  {
    id: "how-it-works",
    group: "Product",
    question: "How does SniffOrbit ONE work?",
    text: "Treats go into six chambers on a removable tray. A single window in the lid sits over one chamber at a time. Your dog slides a large, spring-loaded shutter to open the window and reach the reward. When the shutter springs closed, a proposed ratchet-and-pawl mechanism turns the tray 60°, so the next chamber is waiting behind the same door.",
    answer: (
      <>
        <p>
          Treats go into six chambers on a removable tray. A single window in the lid sits over one chamber at a time. Your dog slides a large,
          spring-loaded shutter to open the window and reach the reward.
        </p>
        <p>
          When the shutter springs closed, a proposed ratchet-and-pawl mechanism turns the tray 60°, so the next chamber is waiting behind the same
          door. <Link href="/how-it-works">See the mechanism step by step</Link>.
        </p>
      </>
    ),
  },
  {
    id: "different",
    group: "Product",
    question: "What makes it different from other food puzzles?",
    text: "Many puzzles present the same challenge each time. SniffOrbit ONE is designed around a sequence: six chambers, each with an interchangeable insert, revealed one at a time. Owners can reorder inserts to change the order and difficulty. Whether this keeps a particular dog engaged longer has not been tested.",
    answer: (
      <p>
        Many puzzles present the same challenge every time. SniffOrbit ONE is designed around a <em>sequence</em>: six chambers, each with an
        interchangeable insert, revealed one at a time. You can reorder the inserts to change the order and difficulty. We haven&apos;t tested
        whether this keeps any particular dog engaged for longer — that would need real-world trials.
      </p>
    ),
  },
  {
    id: "sizes",
    group: "Product",
    question: "What dog sizes is it intended for?",
    text: "The proposed Standard size (Ø 28 cm) is intended for small to medium dogs of roughly 5–20 kg; the proposed Large size (Ø 34 cm) for medium to large dogs of roughly 15–40 kg. These are design targets, not validated recommendations.",
    answer: (
      <p>
        The proposed <strong>Standard</strong> (Ø 28 cm) targets small to medium dogs of roughly 5–20 kg; the proposed <strong>Large</strong> (Ø
        34 cm) targets medium to large dogs of roughly 15–40 kg. These are design targets, not validated recommendations — the{" "}
        <Link href="/dog-match">Dog Match quiz</Link> explains its suggestion.
      </p>
    ),
  },
  {
    id: "cleaning",
    group: "Product",
    question: "How do you clean it?",
    text: "The design lets the lid twist off and the food-contact tray and inserts lift out for washing. Until dishwasher testing is done, the recommendation is to hand-wash the tray and inserts in warm soapy water and let them dry fully.",
    answer: (
      <p>
        The design lets the lid twist off and the food-contact tray and inserts lift out for washing. Until dishwasher testing is done, the
        recommendation is to hand-wash the tray and inserts in warm, soapy water and let them dry completely before reassembly.
      </p>
    ),
  },
  {
    id: "food",
    group: "Product",
    question: "What food can it hold?",
    text: "It is designed for dry kibble and small dry treats, roughly 30 ml per chamber in the Standard size. Wet food, spreads and very large treats are not recommended because they could jam the shutter or be hard to clean.",
    answer: (
      <p>
        It&apos;s designed for dry kibble and small dry treats — roughly 30 ml per chamber in the Standard size (provisional). Wet food, spreads
        and very large treats aren&apos;t recommended: they could jam the shutter or be hard to clean.
      </p>
    ),
  },
  {
    id: "chewers",
    group: "Safety",
    question: "Is it suitable for aggressive chewers?",
    text: "No. SniffOrbit ONE is a puzzle, not a chew toy, and it has not been durability or bite tested. It should not be given to dogs that chew or destroy toys.",
    answer: (
      <p>
        No. SniffOrbit ONE is a puzzle, not a chew toy, and it has not been durability or bite tested. Please don&apos;t give it to dogs that chew
        or destroy toys.
      </p>
    ),
  },
  {
    id: "unattended",
    group: "Safety",
    question: "Can my dog use it unattended?",
    text: "No. Like any food puzzle, it should be used under supervision, and put away when playtime is over. It has not been safety-tested or certified.",
    answer: (
      <p>
        No. Like any food puzzle, it should be used under supervision and put away when playtime is over. The concept has not been safety-tested
        or certified.
      </p>
    ),
  },
  {
    id: "manufactured",
    group: "Orders",
    question: "Is this a manufactured product?",
    text: "No. SniffOrbit ONE is a product concept and portfolio project. It has not been manufactured, certified or tested with dogs. Dimensions and materials shown are proposals.",
    answer: (
      <p>
        No. SniffOrbit ONE is a product concept and portfolio project. It hasn&apos;t been manufactured, certified or tested with dogs, and the
        dimensions and materials shown are proposals. <Link href="/about">Read the story</Link>.
      </p>
    ),
  },
  {
    id: "ordering",
    group: "Orders",
    question: "How does ordering work?",
    text: "The store is fully functional but runs in test mode. Checkout validates your details, checks live stock, calculates totals on the server and saves a real order record with a reference and private tracking key. No payment card is requested, no money is taken and nothing ships.",
    answer: (
      <p>
        The store is fully functional but runs in test mode. Checkout validates your details, checks live stock, calculates totals on the server
        and saves a real order record with a reference and a private tracking key you can use on the <Link href="/order/track">order tracking</Link>{" "}
        page. No card details are requested, no money is taken and nothing ships.
      </p>
    ),
  },
  {
    id: "returns",
    group: "Orders",
    question: "What is the return or refund policy for the demonstration store?",
    text: "Because no payment is taken and no product ships, there is nothing to return or refund. Test orders may be cancelled by the store administrator, which releases the reserved demo stock.",
    answer: (
      <p>
        Because no payment is taken and no product ships, there&apos;s nothing to return or refund. Test orders may be cancelled by the store
        administrator, which returns the demo stock to inventory. See <Link href="/shipping-returns">shipping &amp; returns</Link>.
      </p>
    ),
  },
];
