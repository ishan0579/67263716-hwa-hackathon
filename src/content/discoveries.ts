/**
 * The six chamber inserts ("discoveries"). Inserts are removable and
 * interchangeable, so owners can reorder them to set the starting difficulty.
 * These are design proposals — not behaviourally validated.
 */
export type Discovery = {
  index: number;
  key: string;
  name: string;
  title: string;
  insert: string;
  description: string;
  interaction: string;
  difficulty: 1 | 2 | 3;
  ownerNote: string;
};

export const DISCOVERIES: Discovery[] = [
  {
    index: 0,
    key: "open-cup",
    name: "Open Cup",
    title: "The welcome",
    insert: "Shallow open dish",
    description:
      "The first chamber hides nothing behind the shutter. Slide it, find the reward — a simple first lesson that the door means food.",
    interaction: "Nose or paw pushes the shutter; reward is immediately reachable.",
    difficulty: 1,
    ownerNote: "Ideal first position for dogs new to puzzles.",
  },
  {
    index: 1,
    key: "ridge-field",
    name: "Ridge Field",
    title: "The nose nudge",
    insert: "Low parallel ridges",
    description:
      "Kibble settles between gentle ridges, so licking and nosing take a little longer than a single gulp.",
    interaction: "Tongue and nose work between ridges to collect scattered pieces.",
    difficulty: 1,
    ownerNote: "Works best with small, dry kibble.",
  },
  {
    index: 2,
    key: "pillar-maze",
    name: "Pillar Maze",
    title: "The search",
    insert: "Five soft pillars",
    description:
      "Rounded pillars break up the chamber floor. The nose has to search around them instead of scooping straight in.",
    interaction: "Sniffing and nosing around obstacles.",
    difficulty: 2,
    ownerNote: "Pillars are designed to flex, not to be chewed.",
  },
  {
    index: 3,
    key: "lift-flap",
    name: "Lift Flap",
    title: "The lift",
    insert: "Hinged flap",
    description:
      "A light hinged flap covers the reward. Nosing it upward reveals what's underneath — a new movement to learn.",
    interaction: "Upward nose flick lifts the flap on a captive hinge.",
    difficulty: 2,
    ownerNote: "Flap is captive and cannot be removed without disassembly.",
  },
  {
    index: 4,
    key: "tilt-dome",
    name: "Tilt Dome",
    title: "The tip",
    insert: "Pinned rocking dome",
    description:
      "A small dome rocks on a fixed pin over the reward. Tipping it aside takes a confident nudge — and a moment of problem solving.",
    interaction: "Sideways push rocks the dome off the reward.",
    difficulty: 3,
    ownerNote: "Dome is pinned (captive), never loose — no small parts.",
  },
  {
    index: 5,
    key: "deep-well",
    name: "Deep Well",
    title: "The finale",
    insert: "Narrow deep well",
    description:
      "The last chamber is deeper and narrower. It asks for persistence, and it's the most satisfying to empty.",
    interaction: "Tongue reaches into a narrow well.",
    difficulty: 3,
    ownerNote: "May not suit flat-faced breeds — swap in an easier insert.",
  },
];

export const DIFFICULTY_LABEL: Record<1 | 2 | 3, string> = { 1: "Gentle", 2: "Curious", 3: "Clever" };
