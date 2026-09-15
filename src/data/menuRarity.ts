import type { MenuRarity, Recipe } from '../types/game';

export const menuRarityInfo: Record<MenuRarity, { label: string }> = {
  normal: { label: 'ノーマル' },
  rare: { label: 'レア' },
  superRare: { label: '特別' },
  secret: { label: '秘伝' },
};

type RaritySource = Pick<Recipe, 'price' | 'initiallyUnlocked' | 'hidden' | 'forest' | 'unlockEventId'>;

export function inferMenuRarity(recipe: RaritySource): MenuRarity {
  if (recipe.forest || recipe.hidden || recipe.unlockEventId?.endsWith('-stage10')) return 'secret';
  if (recipe.unlockEventId?.includes('-growth5') || /-stage(?:5|6|8)$/.test(recipe.unlockEventId || '')) return 'superRare';
  if (recipe.unlockEventId || (!recipe.initiallyUnlocked && recipe.price > 350)) return 'rare';
  return 'normal';
}
