import { PokemonData } from './types';

export interface RecommendedItem {
  name: string;
  reason: string;
}

const TYPE_ITEMS: Record<string, string> = {
  normal: 'Silk Scarf',
  fire: 'Charcoal',
  water: 'Mystic Water',
  electric: 'Magnet',
  grass: 'Miracle Seed',
  ice: 'Never-Melt Ice',
  fighting: 'Black Belt',
  poison: 'Poison Barb',
  ground: 'Soft Sand',
  flying: 'Sharp Beak',
  psychic: 'Twisted Spoon',
  bug: 'Silver Powder',
  rock: 'Hard Stone',
  ghost: 'Spell Tag',
  dragon: 'Dragon Fang',
  steel: 'Metal Coat',
  dark: 'Black Glasses',
  fairy: 'Fairy Feather',
};

export const getRecommendedItems = (pokemon: PokemonData, evolutionDetails?: string): RecommendedItem[] => {
  const items: RecommendedItem[] = [];
  
  // 1. Check Stats (Physical vs Special)
  const stats = pokemon.stats;
  const atk = stats.find(s => s.stat.name === 'attack')?.base_stat || 0;
  const spAtk = stats.find(s => s.stat.name === 'special-attack')?.base_stat || 0;

  if (atk >= spAtk) {
    items.push({ name: 'Muscle Band', reason: 'Boosts Physical' });
  } else {
    items.push({ name: 'Wise Glasses', reason: 'Boosts Special' });
  }

  // 2. Check Type Boosters
  pokemon.types.forEach(t => {
      const typeName = t.type.name;
      if (TYPE_ITEMS[typeName]) {
          items.push({ name: TYPE_ITEMS[typeName], reason: `Boosts ${typeName}` });
      }
  });

  // 3. Check Friendship Evolution (Soothe Bell)
  if (evolutionDetails && evolutionDetails.toLowerCase().includes('friendship')) {
      items.push({ name: 'Soothe Bell', reason: 'Required for Evo' });
  }

  // 4. Specific Utility (loaded dice, etc could go here later)

  return items.slice(0, 3); // Return top 3 recommendations
};