/**
 * Shared pieces of the "bordered input with focus ring" look used across
 * options.tsx and PersonaList.tsx. Deliberately excludes width, padding/text
 * size, and background opacity — those vary per call site (compact panel
 * search vs. full-size form field), and combining two Tailwind classes for
 * the same CSS property in one className string has unreliable last-wins
 * behavior (resolution order depends on Tailwind's generated stylesheet,
 * not string order). Each call site supplies its own values for those.
 */
export const INPUT_BASE_CLS =
  "rounded-lg border border-gray-200 outline-none transition placeholder:text-gray-400 focus:border-persona-400 focus:bg-white focus:ring-2 focus:ring-persona-500/20 dark:border-gray-700 dark:bg-gray-800/80 dark:focus:border-persona-500 dark:focus:bg-gray-800"
