export * from "./application";
export * from "./auth";

/** Product identity shared by all Sei clients. */
export const product = {
  name: "Sei",
  fullName: "Sei — Job Tracker",
  tagline: "Search. Evaluate. Iterate.",
} as const;
