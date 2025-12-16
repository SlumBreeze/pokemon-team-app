import { PokemonData, TeamMember } from '../types';
import { fetchPokemon } from '../services/pokeApi';
import { getMultiplier } from '../constants';

const getBST = (p: PokemonData) => p.stats.reduce((acc, s) => acc + s.base_stat, 0);

// Helper to check if a pokemon counters the boss
const getBossScore = (p: PokemonData, bossDefensiveType?: string) => {
  if (!bossDefensiveType) return 0;
  
  let maxMult = 0;
  p.types.forEach(t => {
    const mult = getMultiplier(t.type.name, bossDefensiveType);
    if (mult > maxMult) maxMult = mult;
  });

  // Huge bonus for super effective (2x or 4x)
  if (maxMult >= 2) return 150; 
  // Penalty for being resisted
  if (maxMult <= 0.5) return -100;
  
  return 0;
};

export const generateBestTeam = async (
  caughtNames: string[], 
  currentTeam: TeamMember[],
  bossDefensiveType?: string
): Promise<string[]> => {
  if (caughtNames.length === 0) return [];

  // 1. Identify Locked Members
  const lockedMembers = currentTeam.filter(m => m.locked && m.data);
  const lockedNames = new Set(lockedMembers.map(m => m.data!.name));
  
  // Start the new team with the locked ones
  const newTeam: PokemonData[] = lockedMembers.map(m => m.data!);
  const coveredTypes = new Set<string>();
  
  newTeam.forEach(p => p.types.forEach(t => coveredTypes.add(t.type.name)));

  // 2. Fetch Candidates (excluding ones already locked in)
  const candidates: PokemonData[] = [];
  const limit = caughtNames.length > 50 ? 50 : caughtNames.length;
  
  for (const name of caughtNames.slice(0, limit)) {
    if (lockedNames.has(name)) continue; // Skip if already in team
    try {
      const data = await fetchPokemon(name);
      candidates.push(data);
    } catch (e) {
      console.error(`Failed to fetch ${name}`);
    }
  }

  // 3. Score Candidates (BST + Boss Bonus)
  candidates.sort((a, b) => {
    const scoreA = getBST(a) + getBossScore(a, bossDefensiveType);
    const scoreB = getBST(b) + getBossScore(b, bossDefensiveType);
    return scoreB - scoreA; // Descending
  });

  // 4. Fill Remaining Slots
  // Core Requirement (only if no Boss selected, otherwise pure offense)
  const requiredCores = bossDefensiveType ? [] : ['fire', 'water', 'grass'];

  // A. Fill Core slots first (if needed and not covered by locked members)
  for (const type of requiredCores) {
    if (newTeam.length >= 6) break;
    if ([...coveredTypes].includes(type)) continue;

    const bestFit = candidates.find(p => 
      p.types.some(t => t.type.name === type) && 
      !newTeam.some(member => member.id === p.id)
    );
    if (bestFit) {
      newTeam.push(bestFit);
      bestFit.types.forEach(t => coveredTypes.add(t.type.name));
    }
  }

  // B. Fill rest with highest Score
  for (const p of candidates) {
    if (newTeam.length >= 6) break;
    
    const isAlreadyInTeam = newTeam.some(member => member.id === p.id);
    if (!isAlreadyInTeam) {
      newTeam.push(p);
    }
  }

  return newTeam.map(p => p.name);
};