/** Model layers (bottom → top) with their exploded-view offsets. Shared by 3D scenes and copy. */
export const LAYERS = [
  { key: "base", label: "Non-slip base ring", offset: -0.28 },
  { key: "housing", label: "Weighted housing", offset: 0 },
  { key: "indexer", label: "Ratchet indexer", offset: 0.62 },
  { key: "tray", label: "Food-contact tray", offset: 1.28 },
  { key: "lid", label: "Lid & scent ports", offset: 2.0 },
  { key: "shutter", label: "Spring shutter & hub", offset: 2.48 },
] as const;
