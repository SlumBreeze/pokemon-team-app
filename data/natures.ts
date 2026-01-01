import { NatureName } from '../types';

export interface NatureEffect {
    up: 'attack' | 'defense' | 'specialAttack' | 'specialDefense' | 'speed' | null;
    down: 'attack' | 'defense' | 'specialAttack' | 'specialDefense' | 'speed' | null;
}

export const NATURES: Record<NatureName, NatureEffect> = {
    // Neutral natures (no stat changes)
    hardy: { up: null, down: null },
    docile: { up: null, down: null },
    serious: { up: null, down: null },
    bashful: { up: null, down: null },
    quirky: { up: null, down: null },

    // Attack boosting
    lonely: { up: 'attack', down: 'defense' },
    brave: { up: 'attack', down: 'speed' },
    adamant: { up: 'attack', down: 'specialAttack' },
    naughty: { up: 'attack', down: 'specialDefense' },

    // Defense boosting
    bold: { up: 'defense', down: 'attack' },
    relaxed: { up: 'defense', down: 'speed' },
    impish: { up: 'defense', down: 'specialAttack' },
    lax: { up: 'defense', down: 'specialDefense' },

    // Special Attack boosting
    modest: { up: 'specialAttack', down: 'attack' },
    mild: { up: 'specialAttack', down: 'defense' },
    quiet: { up: 'specialAttack', down: 'speed' },
    rash: { up: 'specialAttack', down: 'specialDefense' },

    // Special Defense boosting
    calm: { up: 'specialDefense', down: 'attack' },
    gentle: { up: 'specialDefense', down: 'defense' },
    sassy: { up: 'specialDefense', down: 'speed' },
    careful: { up: 'specialDefense', down: 'specialAttack' },

    // Speed boosting
    timid: { up: 'speed', down: 'attack' },
    hasty: { up: 'speed', down: 'defense' },
    jolly: { up: 'speed', down: 'specialAttack' },
    naive: { up: 'speed', down: 'specialDefense' },
};

export const STAT_LABELS: Record<string, string> = {
    hp: 'HP',
    attack: 'Atk',
    defense: 'Def',
    specialAttack: 'SpA',
    specialDefense: 'SpD',
    speed: 'Spe',
};

export const STAT_COLORS: Record<string, string> = {
    hp: '#FF5959',
    attack: '#F5AC78',
    defense: '#FAE078',
    specialAttack: '#9DB7F5',
    specialDefense: '#A7DB8D',
    speed: '#FA92B2',
};

// Default stat spreads
export const DEFAULT_EVS = {
    hp: 0,
    attack: 0,
    defense: 0,
    specialAttack: 0,
    specialDefense: 0,
    speed: 0,
};

export const DEFAULT_IVS = {
    hp: 31,
    attack: 31,
    defense: 31,
    specialAttack: 31,
    specialDefense: 31,
    speed: 31,
};

// Calculate final stat value
export const calculateStat = (
    baseStat: number,
    iv: number,
    ev: number,
    level: number,
    isHp: boolean,
    natureMultiplier: number
): number => {
    if (isHp) {
        // HP formula
        return Math.floor(((2 * baseStat + iv + Math.floor(ev / 4)) * level) / 100) + level + 10;
    }
    // Other stats formula
    return Math.floor((Math.floor(((2 * baseStat + iv + Math.floor(ev / 4)) * level) / 100) + 5) * natureMultiplier);
};

export const getNatureMultiplier = (
    nature: NatureName,
    stat: 'attack' | 'defense' | 'specialAttack' | 'specialDefense' | 'speed'
): number => {
    const effect = NATURES[nature];
    if (effect.up === stat) return 1.1;
    if (effect.down === stat) return 0.9;
    return 1.0;
};
