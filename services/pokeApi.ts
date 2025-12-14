import { PokemonData, MoveInfo } from '../types';

const BASE_URL = 'https://pokeapi.co/api/v2';

// --- Cache for Autocomplete ---
let cachedPokemonNames: string[] = [];
// --- Cache for Move Types ---
const moveTypeCache: Record<string, string> = {};

export const getPokemonNames = async (): Promise<string[]> => {
  if (cachedPokemonNames.length > 0) return cachedPokemonNames;
  
  try {
    // Limit 2000 covers up to Gen 9 and forms
    const response = await fetch(`${BASE_URL}/pokemon?limit=2000`);
    const data = await response.json();
    cachedPokemonNames = data.results.map((p: any) => p.name);
    return cachedPokemonNames;
  } catch (error) {
    console.error("Failed to fetch pokemon list", error);
    return [];
  }
};

export const fetchPokemon = async (name: string): Promise<PokemonData> => {
  if (!name) throw new Error("Name is required");
  
  const cleanName = name.trim().toLowerCase().replace(/[\s.]/g, '-').replace(/[^a-z0-9-]/g, '');

  const response = await fetch(`${BASE_URL}/pokemon/${cleanName}`);
  
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("Pokémon not found");
    }
    throw new Error("Failed to fetch Pokémon data");
  }
  
  const data = await response.json();

  // Process Moves: Filter for level-up moves only to keep it relevant for campaigns
  const moves: MoveInfo[] = data.moves
    .map((m: any) => {
      // Find version group details (preferring SV/Gen9, but fallback to latest available)
      const detail = m.version_group_details[m.version_group_details.length - 1];
      return {
        name: m.move.name,
        url: m.move.url,
        level_learned_at: detail.level_learned_at,
        learn_method: detail.move_learn_method.name
      };
    })
    .filter((m: MoveInfo) => m.learn_method === 'level-up')
    .sort((a: MoveInfo, b: MoveInfo) => b.level_learned_at - a.level_learned_at); // Recent moves first

  return {
    ...data,
    speciesUrl: data.species.url,
    moves: moves
  } as PokemonData;
};

export const fetchAbilityDescription = async (url: string): Promise<string> => {
  try {
    const response = await fetch(url);
    if (!response.ok) return "";
    const data = await response.json();
    
    const effectEntry = data.effect_entries.find((e: any) => e.language.name === 'en');
    if (effectEntry) {
      return effectEntry.short_effect || effectEntry.effect;
    }
    
    const flavorEntry = data.flavor_text_entries.find((e: any) => e.language.name === 'en');
    if (flavorEntry) {
      return flavorEntry.flavor_text.replace(/[\n\f]/g, ' ');
    }

    return "No description available.";
  } catch (error) {
    console.error("Error fetching ability description:", error);
    return "Failed to load description.";
  }
};

export const fetchEvolutionInfo = async (speciesUrl: string, currentPokemonName: string): Promise<string> => {
  try {
    const speciesRes = await fetch(speciesUrl);
    const speciesData = await speciesRes.json();
    
    const chainRes = await fetch(speciesData.evolution_chain.url);
    const chainData = await chainRes.json();

    let chain = chainData.chain;
    
    // Traverse to find current pokemon
    // Recursive search helper
    const findNode = (node: any): any => {
      if (node.species.name === currentPokemonName) return node;
      for (const child of node.evolves_to) {
        const found = findNode(child);
        if (found) return found;
      }
      return null;
    };

    const currentNode = findNode(chain);
    
    if (currentNode && currentNode.evolves_to.length > 0) {
      const next = currentNode.evolves_to[0]; // Just take first path for simplicity
      const details = next.evolution_details[0];
      const targetName = next.species.name;
      
      let reason = "Unknown";
      if (details) {
        if (details.trigger.name === 'level-up') {
            if (details.min_level) reason = `Level ${details.min_level}`;
            else if (details.min_happiness) reason = "High Friendship";
            else if (details.held_item) reason = `Hold ${details.held_item.name}`;
            else if (details.known_move) reason = `Know ${details.known_move.name}`;
            else reason = "Level Up Condition";
        } else if (details.trigger.name === 'use-item') {
            reason = `Use ${details.item.name}`;
        } else if (details.trigger.name === 'trade') {
            reason = "Trade";
        }
      }
      return `-> ${targetName} (${reason})`;
    }

    return "Fully Evolved";
  } catch (error) {
    return "";
  }
};

export const fetchMoveType = async (url: string): Promise<string> => {
  if (moveTypeCache[url]) return moveTypeCache[url];

  try {
    const res = await fetch(url);
    const data = await res.json();
    moveTypeCache[url] = data.type.name;
    return data.type.name;
  } catch (e) {
    return "normal";
  }
};