export interface PokemonStat {
  base_stat: number;
  stat: {
    name: string;
  };
}

export interface PokemonType {
  slot: number;
  type: {
    name: string;
    url: string;
  };
}

export interface PokemonAbility {
  is_hidden: boolean;
  ability: {
    name: string;
    url: string;
  };
}

export interface MoveInfo {
  name: string;
  url: string;
  level_learned_at: number;
  learn_method: string;
}

export interface MoveDetails {
  name: string;
  power: number | null;
  accuracy: number | null;
  damageClass: 'physical' | 'special' | 'status';
  type: string;
  effectDescription: string;
  pp: number;
}

export interface PokemonData {
  id: number;
  name: string;
  sprites: {
    front_default: string;
    other?: {
      "official-artwork": {
        front_default: string;
      };
    };
  };
  types: PokemonType[];
  stats: PokemonStat[];
  abilities: PokemonAbility[];
  speciesUrl: string;
  location_area_encounters: string;
  moves: MoveInfo[];
}

export interface EvolutionData {
  isFullyEvolved: boolean;
  nextEvolutionName?: string;
  minLevel?: number;
  triggerCondition?: string;
  error?: string;
}

export interface TeamMember {
  id: string;
  data: PokemonData | null;
  selectedAbility: string;
  abilityDescription?: string;
  teraType: string;
  heldItem?: string;
  heldItemDescription?: string;
  level: number;
  loading: boolean;
  error: string | null;
  customName: string;
  evolutionDetails?: EvolutionData | null;
  locked?: boolean;
  // Training data
  nature?: NatureName;
  evs?: StatSpread;
  ivs?: StatSpread;
}

export type NatureName =
  | 'adamant' | 'bashful' | 'bold' | 'brave' | 'calm'
  | 'careful' | 'docile' | 'gentle' | 'hardy' | 'hasty'
  | 'impish' | 'jolly' | 'lax' | 'lonely' | 'mild'
  | 'modest' | 'naive' | 'naughty' | 'quiet' | 'quirky'
  | 'rash' | 'relaxed' | 'sassy' | 'serious' | 'timid';

export interface StatSpread {
  hp: number;
  attack: number;
  defense: number;
  specialAttack: number;
  specialDefense: number;
  speed: number;
}

export interface Boss {
  label: string;
  name: string; // The Trainer Name
  ace: string; // The Pokemon Name
  level: number;
  tera: string; // TypeName
}

export type TypeName =
  | "normal"
  | "fire"
  | "water"
  | "electric"
  | "grass"
  | "ice"
  | "fighting"
  | "poison"
  | "ground"
  | "flying"
  | "psychic"
  | "bug"
  | "rock"
  | "ghost"
  | "dragon"
  | "steel"
  | "dark"
  | "fairy";

export interface MatchupResult {
  memberId: string;
  offensiveScore: number;
  defensiveScore: number;
  bestMoveType: string;
  speedDiff: number;
  speedTier: "faster" | "slower" | "tie";
  message: string;
  mySpeed: number;
  enemySpeed: number;
  catchScore?: number;
  catchMoves?: string[];
}

// Profile System Types
export interface Profile {
  id: string;
  name: string;
  team: TeamMember[];
  lastUpdated: number;
}

export interface ProfilesState {
  activeProfileId: string;
  profiles: Record<string, Profile>;
  globalCaughtPokemon: string[];
  globalShinyPokemon: string[];
  lastUpdated?: number; // New: Global sync timestamp
}

export interface EnhancedEncounter {
  locationName: string;
  method: string;
  minLevel: number;
  maxLevel: number;
  rarity: 'common' | 'uncommon' | 'rare' | 'very-rare';
  conditions: string[];
  chance: number;
}
