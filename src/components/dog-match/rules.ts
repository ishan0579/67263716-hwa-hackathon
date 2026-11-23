/**
 * Dog Match — transparent, rule-based suggestions. Every recommendation is
 * derived from the explicit rules below and explained to the user. This is
 * not veterinary or behavioural advice, and there is no AI involved.
 */
import { DISCOVERIES } from "@/content/discoveries";

export type Answers = {
  size?: "small" | "medium" | "large" | "giant";
  age?: "puppy" | "adult" | "senior";
  experience?: "none" | "some" | "pro";
  chewing?: "gentle" | "occasional" | "power";
  food?: "high" | "medium" | "low";
  style?: "nose" | "paws" | "both" | "watcher";
  considerations?: ("flatface" | "mobility" | "guarding" | "multidog")[];
};

export type Question = {
  id: keyof Answers;
  title: string;
  help?: string;
  multi?: boolean;
  options: { value: string; label: string; detail?: string }[];
};

export const QUESTIONS: Question[] = [
  {
    id: "size",
    title: "How big is your dog?",
    help: "Approximate adult weight.",
    options: [
      { value: "small", label: "Small", detail: "Under 10 kg" },
      { value: "medium", label: "Medium", detail: "10–20 kg" },
      { value: "large", label: "Large", detail: "20–35 kg" },
      { value: "giant", label: "Giant", detail: "Over 35 kg" },
    ],
  },
  {
    id: "age",
    title: "How old are they?",
    options: [
      { value: "puppy", label: "Puppy", detail: "Under 1 year" },
      { value: "adult", label: "Adult", detail: "1–8 years" },
      { value: "senior", label: "Senior", detail: "8+ years" },
    ],
  },
  {
    id: "experience",
    title: "Have they used food puzzles before?",
    options: [
      { value: "none", label: "Never tried one" },
      { value: "some", label: "A few simple ones" },
      { value: "pro", label: "Puzzle pro", detail: "Solves most quickly" },
    ],
  },
  {
    id: "chewing",
    title: "How do they treat their toys?",
    help: "Be honest — this one matters most for safety.",
    options: [
      { value: "gentle", label: "Gentle explorer", detail: "Rarely chews toys" },
      { value: "occasional", label: "Occasional chewer", detail: "Mouths toys sometimes" },
      { value: "power", label: "Power chewer", detail: "Destroys most toys" },
    ],
  },
  {
    id: "food",
    title: "How food-motivated are they?",
    options: [
      { value: "high", label: "Very", detail: "Will work for any crumb" },
      { value: "medium", label: "Moderately" },
      { value: "low", label: "Picky eater" },
    ],
  },
  {
    id: "style",
    title: "How do they like to explore?",
    options: [
      { value: "nose", label: "Nose first", detail: "Sniffs everything" },
      { value: "paws", label: "Paws first", detail: "Digs and paws" },
      { value: "both", label: "A bit of both" },
      { value: "watcher", label: "Watches, then decides" },
    ],
  },
  {
    id: "considerations",
    title: "Anything we should keep in mind?",
    help: "Select all that apply.",
    multi: true,
    options: [
      { value: "flatface", label: "Flat-faced breed", detail: "e.g. pug, French bulldog" },
      { value: "mobility", label: "Reduced vision or mobility" },
      { value: "guarding", label: "Guards food or toys" },
      { value: "multidog", label: "Lives with other dogs" },
    ],
  },
];

export type MatchResult = {
  suitable: boolean;
  size: "standard" | "large";
  level: 1 | 2 | 3;
  levelName: string;
  order: number[];
  reasons: string[];
  cautions: string[];
};

const ORDERS: Record<1 | 2 | 3, number[]> = { 1: [0, 1, 2, 3, 4, 5], 2: [2, 1, 3, 0, 4, 5], 3: [3, 4, 5, 2, 1, 0] };
const NAMES = { 1: "Gentle", 2: "Curious", 3: "Clever" } as const;

export function evaluate(a: Answers): MatchResult {
  const reasons: string[] = [];
  const cautions: string[] = [];
  const cons = a.considerations ?? [];

  // Size
  let size: "standard" | "large" = "standard";
  if (a.size === "large" || a.size === "giant") {
    size = "large";
    reasons.push("Large size, because the Large (Ø 34 cm) is proposed for dogs over roughly 15–20 kg.");
  } else {
    reasons.push("Standard size, because the Standard (Ø 28 cm) is proposed for dogs up to roughly 20 kg.");
  }
  if (a.size === "giant") cautions.push("For dogs over ~40 kg even the Large may feel small. Watch that the shutter suits their muzzle.");

  // Level
  let level = a.experience === "pro" ? 3 : a.experience === "some" ? 2 : 1;
  reasons.push(
    a.experience === "pro"
      ? "Clever start, because puzzle-experienced dogs may enjoy the two-step inserts up front."
      : a.experience === "some"
        ? "Curious start, because some puzzle experience suggests they're ready for a search."
        : "Gentle start, because first-timers learn fastest when the first chamber pays off immediately.",
  );
  if (a.food === "low" && level > 1) {
    level -= 1;
    reasons.push("One level easier, because picky eaters can lose interest if rewards feel too hard to reach.");
  }
  if (a.style === "watcher" && level > 1) {
    level = 1;
    reasons.push("Gentle start, because cautious dogs often build confidence with quick early wins.");
  }
  if ((a.age === "puppy" || a.age === "senior") && level > 2) {
    level = 2;
    reasons.push(`Capped at Curious, because ${a.age === "puppy" ? "puppies" : "senior dogs"} may do better with shorter, easier sessions.`);
  }
  if (cons.includes("mobility") && level > 1) {
    level = 1;
    reasons.push("Gentle start, because reduced vision or mobility makes early success especially important.");
  }

  let order = [...ORDERS[level as 1 | 2 | 3]];
  if (cons.includes("flatface")) {
    order = order.filter((i) => i !== 5).concat(5);
    cautions.push(`Flat-faced breeds may find the ${DISCOVERIES[5]!.name} hard to reach — swap it for an Open Cup or Ridge Field insert.`);
  }

  // Safety
  let suitable = true;
  if (a.chewing === "power") {
    suitable = false;
    cautions.unshift("Not recommended: SniffOrbit is a puzzle, not a chew toy, and it hasn't been durability tested. Please don't give it to dogs that destroy toys.");
  } else if (a.chewing === "occasional") {
    cautions.push("Occasional chewers should be supervised closely and the puzzle put away after play.");
  }
  if (a.age === "puppy") cautions.push("Puppies explore with their mouths — supervise every session.");
  if (cons.includes("guarding")) cautions.push("If your dog guards food, use the puzzle away from other pets and people, and consider advice from a qualified trainer or behaviourist.");
  if (cons.includes("multidog")) cautions.push("In multi-dog homes, give each dog its own puzzle and space to avoid conflict.");
  if (cons.includes("mobility")) cautions.push("Place the puzzle on a non-slip surface they can reach comfortably.");
  cautions.push("Always supervise play. Recommendations here are general guidance, not veterinary or behavioural advice.");

  return { suitable, size, level: level as 1 | 2 | 3, levelName: NAMES[level as 1 | 2 | 3], order, reasons, cautions };
}
