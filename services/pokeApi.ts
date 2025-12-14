import { PokemonData } from '../types';

const BASE_URL = 'https://pokeapi.co/api/v2';

export const fetchPokemon = async (name: string): Promise<PokemonData> => {
  if (!name) throw new Error("Name is required");
  
  // Clean name: Lowercase, remove special chars (except hyphens which are often used in IDs)
  // For specialized forms like "Tapu Koko", API expects "tapu-koko"
  const cleanName = name.trim().toLowerCase().replace(/[\s.]/g, '-').replace(/[^a-z0-9-]/g, '');

  const response = await fetch(`${BASE_URL}/pokemon/${cleanName}`);
  
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("Pokémon not found");
    }
    throw new Error("Failed to fetch Pokémon data");
  }
  
  const data = await response.json();
  return data as PokemonData;
};

export const fetchAbilityDescription = async (url: string): Promise<string> => {
  try {
    const response = await fetch(url);
    if (!response.ok) return "";
    const data = await response.json();
    
    // Try to find English effect entry
    const effectEntry = data.effect_entries.find((e: any) => e.language.name === 'en');
    if (effectEntry) {
      return effectEntry.short_effect || effectEntry.effect;
    }
    
    // Fallback to flavor text (useful for newer gens if effect_entries are missing)
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