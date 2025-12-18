import { PokemonData, MoveInfo, EvolutionData } from "../types";

const BASE_URL = "https://pokeapi.co/api/v2";

// --- Cache ---
let cachedPokemonNames: string[] = [];
let cachedItemNames: string[] = [];
const moveTypeCache: Record<string, string> = {};
const itemDescCache: Record<string, string> = {};
const pokemonCache: Record<string, PokemonData> = {}; // Cache full pokemon data
let cachedPaldeaDex: { name: string; id: number }[] = [];

export const getPokemonNames = async (): Promise<string[]> => {
  if (cachedPokemonNames.length > 0) return cachedPokemonNames;

  try {
    const response = await fetch(`${BASE_URL}/pokemon?limit=2000`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    cachedPokemonNames = data.results.map((p: any) => p.name);
    return cachedPokemonNames;
  } catch (error) {
    console.error("Failed to fetch pokemon list from PokéAPI:", error);
    return [];
  }
};

export const getPaldeaPokedex = async (): Promise<
  { name: string; id: number }[]
> => {
  if (cachedPaldeaDex.length > 0) return cachedPaldeaDex;

  try {
    const response = await fetch(`${BASE_URL}/pokedex/31`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();

    cachedPaldeaDex = data.pokemon_entries.map((entry: any) => {
      const urlParts = entry.pokemon_species.url.split("/");
      const id = parseInt(urlParts[urlParts.length - 2]);
      return {
        name: entry.pokemon_species.name,
        id: id,
      };
    });

    return cachedPaldeaDex;
  } catch (error) {
    console.error("Failed to fetch Paldea Pokedex from PokéAPI:", error);
    return [];
  }
};

export const getItemNames = async (): Promise<string[]> => {
  if (cachedItemNames.length > 0) return cachedItemNames;

  try {
    const response = await fetch(`${BASE_URL}/item?limit=2000`);
    const data = await response.json();
    cachedItemNames = data.results.map((i: any) => i.name);
    return cachedItemNames;
  } catch (error) {
    console.error("Failed to fetch item list", error);
    return [];
  }
};

export const fetchItemDescription = async (
  itemName: string
): Promise<string> => {
  if (!itemName) return "";
  const cleanName = itemName.trim().toLowerCase().replace(/ /g, "-");

  if (itemDescCache[cleanName]) return itemDescCache[cleanName];

  try {
    const response = await fetch(`${BASE_URL}/item/${cleanName}`);
    if (!response.ok) return "No description available.";
    const data = await response.json();

    const effectEntry = data.effect_entries.find(
      (e: any) => e.language.name === "en"
    );
    let desc = "";
    if (effectEntry) {
      desc = effectEntry.short_effect || effectEntry.effect;
    } else {
      const flavorEntry = data.flavor_text_entries.find(
        (e: any) => e.language.name === "en"
      );
      if (flavorEntry) {
        desc = flavorEntry.flavor_text.replace(/[\n\f]/g, " ");
      } else {
        desc = "No description available.";
      }
    }

    itemDescCache[cleanName] = desc;
    return desc;
  } catch (e) {
    return "Failed to load description.";
  }
};

export const fetchPokemon = async (name: string): Promise<PokemonData> => {
  if (!name) throw new Error("Name is required");

  const cleanName = name
    .trim()
    .toLowerCase()
    .replace(/[\s.]/g, "-")
    .replace(/[^a-z0-9-]/g, "");

  if (pokemonCache[cleanName]) return pokemonCache[cleanName];

  let response = await fetch(`${BASE_URL}/pokemon/${cleanName}`);

  // FAILOVER: If specific pokemon name not found (404), try to find it via species default variety
  // This handles cases like 'oricorio' -> 'oricorio-baile', 'squawkabilly' -> 'squawkabilly-green-plumage', 'mimikyu' -> 'mimikyu-disguised'
  if (!response.ok && response.status === 404) {
    try {
      const speciesResponse = await fetch(
        `${BASE_URL}/pokemon-species/${cleanName}`
      );
      if (speciesResponse.ok) {
        const speciesData = await speciesResponse.json();
        const defaultVariety = speciesData.varieties.find(
          (v: any) => v.is_default
        );
        if (defaultVariety) {
          // Fetch the default variety URL directly
          response = await fetch(defaultVariety.pokemon.url);
        }
      }
    } catch (e) {
      // Fallback failed, proceed to standard error handling
      console.warn(`Species fallback failed for ${cleanName}`);
    }
  }

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Pokémon not found: ${name}`);
    }
    throw new Error("Failed to fetch Pokémon data");
  }

  const data = await response.json();

  // Process Moves: Include level-up AND machine (TMs) for catching utility
  const moves: MoveInfo[] = data.moves
    .map((m: any) => {
      const detail =
        m.version_group_details[m.version_group_details.length - 1];
      return {
        name: m.move.name,
        url: m.move.url,
        level_learned_at: detail.level_learned_at,
        learn_method: detail.move_learn_method.name,
      };
    })
    .filter(
      (m: MoveInfo) =>
        m.learn_method === "level-up" || m.learn_method === "machine"
    )
    .sort((a: MoveInfo, b: MoveInfo) => {
      if (a.learn_method === "level-up" && b.learn_method !== "level-up")
        return -1;
      if (a.learn_method !== "level-up" && b.learn_method === "level-up")
        return 1;
      return b.level_learned_at - a.level_learned_at;
    });

  const result = {
    ...data,
    speciesUrl: data.species.url,
    location_area_encounters: data.location_area_encounters,
    moves: moves,
  } as PokemonData;

  pokemonCache[cleanName] = result;
  return result;
};

export const fetchAbilityDescription = async (url: string): Promise<string> => {
  try {
    const response = await fetch(url);
    if (!response.ok) return "";
    const data = await response.json();

    const effectEntry = data.effect_entries.find(
      (e: any) => e.language.name === "en"
    );
    if (effectEntry) {
      return effectEntry.short_effect || effectEntry.effect;
    }

    const flavorEntry = data.flavor_text_entries.find(
      (e: any) => e.language.name === "en"
    );
    if (flavorEntry) {
      return flavorEntry.flavor_text.replace(/[\n\f]/g, " ");
    }

    return "No description available.";
  } catch (error) {
    console.error("Error fetching ability description:", error);
    return "Failed to load description.";
  }
};

export const fetchEvolutionInfo = async (
  speciesUrl: string,
  currentPokemonName: string
): Promise<EvolutionData | null> => {
  try {
    const speciesRes = await fetch(speciesUrl);
    const speciesData = await speciesRes.json();

    const chainRes = await fetch(speciesData.evolution_chain.url);
    const chainData = await chainRes.json();

    let chain = chainData.chain;

    // Helper recursive find
    const findNode = (node: any): any => {
      const nodeName = node.species.name.toLowerCase();
      const currName = currentPokemonName.toLowerCase();

      // Check for exact match or based on normalized names
      const normalizedCurr = currName.replace(/-/g, " ");
      const normalizedNode = nodeName.replace(/-/g, " ");

      // Precise species name matching or fuzzy inclusion for varieties
      if (
        currName === nodeName ||
        normalizedCurr === normalizedNode ||
        normalizedCurr.includes(normalizedNode)
      ) {
        return node;
      }

      for (const child of node.evolves_to) {
        const found = findNode(child);
        if (found) return found;
      }
      return null;
    };

    const currentNode = findNode(chain);

    if (!currentNode) {
      return { isFullyEvolved: true, error: "Species not found in chain" };
    }

    if (currentNode.evolves_to.length > 0) {
      // If multiple evolutions exist, we'll show a message or the first one
      const next = currentNode.evolves_to[0];
      const details = next.evolution_details[0];
      const targetName = next.species.name;
      const hasMultiple = currentNode.evolves_to.length > 1;

      let condition = "Unknown";
      let minLevel = undefined;

      if (details) {
        const trigger = details.trigger.name;
        if (trigger === "level-up") {
          if (details.min_level) {
            condition = `Level ${details.min_level}`;
            minLevel = details.min_level;
          } else if (details.min_happiness) condition = "High Friendship";
          else if (details.held_item)
            condition = `Hold ${details.held_item.name.replace(/-/g, " ")}`;
          else if (details.known_move)
            condition = `Know ${details.known_move.name.replace(/-/g, " ")}`;
          else if (details.time_of_day)
            condition = `Level Up (${details.time_of_day})`;
          else condition = "Level Up";
        } else if (trigger === "use-item") {
          condition = `Use ${details.item.name.replace(/-/g, " ")}`;
        } else if (trigger === "trade") {
          condition = "Trade";
        } else {
          condition = trigger.replace(/-/g, " ");
        }
      }

      return {
        isFullyEvolved: false,
        nextEvolutionName: hasMultiple
          ? `${targetName} (+ others)`
          : targetName,
        minLevel,
        triggerCondition: condition,
      };
    }

    return {
      isFullyEvolved: true,
    };
  } catch (error) {
    console.error("Fetch Evo Error", error);
    return {
      isFullyEvolved: true,
      error: "Evolution logic failed",
    };
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

export const fetchEncounterLocations = async (
  url: string,
  pokemonName?: string
): Promise<string[]> => {
  // 1. Check Local Custom Data First
  if (pokemonName) {
    // Normalize name to capitalized words (e.g. "lechonk" -> "Lechonk")
    // The keys in localLocations are Capitalized.
    const cleanName =
      pokemonName.charAt(0).toUpperCase() + pokemonName.slice(1).toLowerCase();

    // Handle special cases with hyphens if necessary, or just try direct match first
    // The extracted data has keys like "Iron Bundle", "Great Tusk" (Space separated)
    // But input pokemonName might be "iron-bundle"

    // Try to match by converting "iron-bundle" -> "Iron Bundle"
    const formattedName = pokemonName
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");

    const { LOCAL_ENCOUNTER_LOCATIONS } = await import("./localLocations");

    if (LOCAL_ENCOUNTER_LOCATIONS[formattedName]) {
      return LOCAL_ENCOUNTER_LOCATIONS[formattedName];
    }
    // Fallback for simple names
    if (LOCAL_ENCOUNTER_LOCATIONS[cleanName]) {
      return LOCAL_ENCOUNTER_LOCATIONS[cleanName];
    }
  }

  // 2. Fallback to API
  if (!url) return [];

  try {
    const res = await fetch(url);
    if (!res.ok) return [];

    const data = await res.json();

    // Set for deduplication
    const locations = new Set<string>();

    data.forEach((encounter: any) => {
      // Check if this encounter area has details for SV
      const hasSV = encounter.version_details.some(
        (detail: any) =>
          detail.version.name === "scarlet" || detail.version.name === "violet"
      );

      if (hasSV) {
        // Clean up the name
        const cleanName = encounter.location_area.name
          .replace(/-/g, " ")
          .replace(/area/gi, "Area")
          .replace(/province/gi, "Province")
          .replace(/sea/gi, "Sea")
          .replace(/path/gi, "Path")
          .replace(/passage/gi, "Passage")
          .replace(/cavern/gi, "Cavern");

        locations.add(cleanName);
      }
    });

    return Array.from(locations).sort();
  } catch (e) {
    console.error("Error fetching encounters:", e);
    return [];
  }
};
