
import { bonusRates } from "./bonusRates";

export function calculateBonus(term: number, collection: number): number {
  // Condition: collection must be >= 600
  if (collection < 600) return 0;

  // Term-based rate
  // @ts-ignore: Indexing with number is safe here based on configuration
  return bonusRates[term] || 0;
}
