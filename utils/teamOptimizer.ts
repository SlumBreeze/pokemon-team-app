import { PokemonData, TeamMember } from "../types";
import { fetchPokemon } from "../services/pokeApi";
import { getMultiplier } from "../constants";

const getBST = (p: PokemonData) =>
  p.stats.reduce((acc, s) => acc + s.base_stat, 0);

// Helper to check if a pokemon counters the boss
const getBossScore = (p: PokemonData, bossDefensiveType?: string) => {
  if (!bossDefensiveType) return 0;

  let maxOffensiveMult = 0;
  // Check our offensive types against the boss
  p.types.forEach((t) => {
    const mult = getMultiplier(t.type.name, bossDefensiveType);
    if (mult > maxOffensiveMult) maxOffensiveMult = mult;
  });

  // Check boss's offensive types (which is the same as bossDefensiveType for this simplified model)
  // against our defensive types
  let maxDefensiveMultTaken = 0;
  // Assuming Boss attacks with its own Type (STAB)
  const bossAttackType = bossDefensiveType;

  // Calculate how much damage WE take from the Boss
  let damageTakenMult = 1;
  p.types.forEach((t) => {
    damageTakenMult *= getMultiplier(bossAttackType, t.type.name);
  });

  let score = 0;

  // 1. HARD COUNTER PRIORITY (Offense)
  // Logic: If we have a Super Effective move, we get a bonus.
  // User requested +500 to allow stats to still matter somewhat, but overcome ~400 BST gaps.
  if (maxOffensiveMult >= 2) {
    score += 500;
  } else if (maxOffensiveMult <= 0.5) {
    score -= 100; // Penalty for dealing weak damage
  }

  // 2. WEAKNESS AVOIDANCE (Defense)
  // Logic: If we take Super Effective damage from the boss, penalty.
  if (damageTakenMult >= 2) {
    score -= 500;
  } else if (damageTakenMult <= 0.5) {
    score += 100; // Bonus for adhering to resistances
  }

  return score;
};

export const generateBestTeam = async (
  caughtNames: string[],
  currentTeam: TeamMember[],
  bossDefensiveType?: string
): Promise<string[]> => {
  if (caughtNames.length === 0) return [];

  // 1. Identify Locked Members
  const lockedMembers = currentTeam.filter((m) => m.locked && m.data);
  const lockedNames = new Set(lockedMembers.map((m) => m.data!.name));

  // Start the new team with the locked ones
  const newTeam: PokemonData[] = lockedMembers.map((m) => m.data!);
  const coveredTypes = new Set<string>();

  newTeam.forEach((p) => p.types.forEach((t) => coveredTypes.add(t.type.name)));

  // 2. Fetch ALL Candidates (Concurrent, no limit)
  // Chunking to avoid overwhelming the browser/network if list is massive (e.g. 500+)
  // checking 100 at a time is usually safe for PokeAPI/Client
  const candidates: PokemonData[] = [];
  const chunkSize = 20;

  // Filter out locked names first to save calls
  const namesToFetch = caughtNames.filter((n) => !lockedNames.has(n));

  for (let i = 0; i < namesToFetch.length; i += chunkSize) {
    const chunk = namesToFetch.slice(i, i + chunkSize);
    const promises = chunk.map((name) => fetchPokemon(name).catch((e) => null));
    const results = await Promise.all(promises);
    results.forEach((r) => {
      if (r) candidates.push(r);
    });
  }

  // 3. Score Candidates
  candidates.sort((a, b) => {
    const bstA = getBST(a);
    const bstB = getBST(b);

    // Evolution/Potential Bonus
    // Heuristic: If stats are low (< 500), give a small nudge so middle-stage mons like Pawmo (405)
    // aren't buried instantly by neutral high-stat mons.
    const potentialBonusA = bstA < 500 ? 100 : 0;
    const potentialBonusB = bstB < 500 ? 100 : 0;

    const scoreA = bstA + potentialBonusA + getBossScore(a, bossDefensiveType);
    const scoreB = bstB + potentialBonusB + getBossScore(b, bossDefensiveType);

    return scoreB - scoreA; // Descending
  });

  // 4. Fill Remaining Slots
  // Core Requirement (only if no Boss selected, otherwise pure offense/countering)
  const requiredCores = bossDefensiveType ? [] : ["fire", "water", "grass"];

  // A. Fill Core slots first (if needed and not covered by locked members)
  for (const type of requiredCores) {
    if (newTeam.length >= 6) break;
    if ([...coveredTypes].includes(type)) continue;

    const bestFit = candidates.find(
      (p) =>
        p.types.some((t) => t.type.name === type) &&
        !newTeam.some((member) => member.id === p.id)
    );
    if (bestFit) {
      newTeam.push(bestFit);
      bestFit.types.forEach((t) => coveredTypes.add(t.type.name));
    }
  }

  // B. Fill rest with highest Score
  for (const p of candidates) {
    if (newTeam.length >= 6) break;

    // Duplicate check using ID or Name
    const isAlreadyInTeam = newTeam.some((member) => member.name === p.name);
    if (!isAlreadyInTeam) {
      newTeam.push(p);
    }
  }

  return newTeam.map((p) => p.name);
};
