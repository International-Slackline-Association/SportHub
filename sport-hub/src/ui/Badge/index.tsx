export { default as Badge } from "./Badge";
export { default as ContestSize } from "./ContestSize";
export { default as Discipline } from "./Discipline";
export { default as Role } from "./Role";
export { default as Gender } from "./Gender";
export { default as AgeCategory } from "./AgeCategory";

export type { BadgeColor } from "./Badge";
export type { ContestSizeVariant } from "./ContestSize";

// SAMPLE_WORD -> SampleWord
export const pascalCaseToTitleCase = (str: string) => str.split('_').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join('');
