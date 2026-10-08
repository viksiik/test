/**
 * Спільне ядро (shared kernel): категорії речей. Ними оперують і tickets (що зламалось),
 * і volunteers (що вміє майстер), тож вони не належать жодному з модулів. Див. spec §1, audit №2.
 */
export const CATEGORIES = [
  'electronics',
  'appliances',
  'textile',
  'bicycles',
  'furniture',
] as const;
export type Category = (typeof CATEGORIES)[number];
