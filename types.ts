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

export interface PokemonData {
  id: number;
  name: string;
  sprites: {
    front_default: string;
    other?: {
      'official-artwork': {
        front_default: string;
      };
    };
  };
  types: PokemonType[];
  stats: PokemonStat[];
  abilities: PokemonAbility[];
}

export interface TeamMember {
  id: string; // Unique ID for React keys
  data: PokemonData | null;
  selectedAbility: string;
  abilityDescription?: string;
  teraType: string;
  loading: boolean;
  error: string | null;
  customName: string; // The text in the input field
}

export type TypeName = 
  | 'normal' | 'fire' | 'water' | 'electric' | 'grass' | 'ice' 
  | 'fighting' | 'poison' | 'ground' | 'flying' | 'psychic' | 'bug' 
  | 'rock' | 'ghost' | 'dragon' | 'steel' | 'dark' | 'fairy';

export interface MatchupResult {
  memberId: string;
  offensiveScore: number; // Max multiplier
  bestMoveType: string;
  speedDiff: number;
  speedTier: 'faster' | 'slower' | 'tie';
  message: string;
}