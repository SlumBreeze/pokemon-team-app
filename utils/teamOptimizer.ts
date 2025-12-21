import { PokemonData, TeamMember } from "../types";
import { fetchPokemon } from "../services/pokeApi";
import { getMultiplier } from "../constants";

const getBST = (p: PokemonData) =>
  p.stats.reduce((acc, s) => acc + s.base_stat, 0);

/**
 * Calculates a score based on Type Advantages/Disadvantages.
 * Updated with requested weights: +1000 for SE, -1000 for Weakness.
 */
const getBossScore = (p: PokemonData, bossDefensiveType?: string) => {
  if (!bossDefensiveType) return 0;

  let maxOffensiveMult = 0;
  p.types.forEach((t) => {
    const mult = getMultiplier(t.type.name, bossDefensiveType);
    if (mult > maxOffensiveMult) maxOffensiveMult = mult;
  });

  const bossAttackType = bossDefensiveType;
  let damageTakenMult = 1;
  p.types.forEach((t) => {
    damageTakenMult *= getMultiplier(bossAttackType, t.type.name);
  });

  let score = 0;

  // 1. SUPER EFFECTIVE BONUS (+1000)
  // This massive bonus ensures a counter always outranks a neutral high-stat mon.
  if (maxOffensiveMult >= 2) {
    score += 1000;
  } else if (maxOffensiveMult <= 0.5) {
    score -= 200; // Penalty for dealing weak damage
  }

  // 2. TYPE WEAKNESS PENALTY (-1000)
  // This keeps liabilities (like Fire vs Water) out of the team.
  if (damageTakenMult >= 2) {
    score -= 1000;
  } else if (damageTakenMult <= 0.5) {
    score += 200; // Small bonus for resistances
  }

  return score;
};

export const generateBestTeam = async (
  caughtNames: string[],
  currentTeam: TeamMember[],
  bossDefensiveType?: string
): Promise<string[]> => {
  if (caughtNames.length === 0) return [];

  const lockedMembers = currentTeam.filter((m) => m.locked && m.data);
  const lockedNames = new Set(lockedMembers.map((m) => m.data!.name));
  const newTeam: PokemonData[] = lockedMembers.map((m) => m.data!);
  const coveredTypes = new Set<string>();

  newTeam.forEach((p) => p.types.forEach((t) => coveredTypes.add(t.type.name)));

  const candidates: PokemonData[] = [];
  const chunkSize = 20;
  const namesToFetch = caughtNames.filter((n) => !lockedNames.has(n));

  for (let i = 0; i < namesToFetch.length; i += chunkSize) {
    const chunk = namesToFetch.slice(i, i + chunkSize);
    const promises = chunk.map((name) => fetchPokemon(name).catch(() => null));
    const results = await Promise.all(promises);
    results.forEach((r) => {
      if (r) candidates.push(r);
    });
  }

  // 3. Scoring with BST + requested bonuses
  // Store scores for logging
  const scoredCandidates = candidates.map((p) => {
    const bst = getBST(p);
    const potentialBonus = bst < 450 ? 200 : 0;
    const typeScore = getBossScore(p, bossDefensiveType);
    const totalScore = bst + potentialBonus + typeScore;
    return { pokemon: p, bst, potentialBonus, typeScore, totalScore };
  });

  // Sort by total score descending
  scoredCandidates.sort((a, b) => b.totalScore - a.totalScore);

  // Log top 10 candidates for debugging
  console.log(
    `[Optimizer] Top 10 candidates for ${bossDefensiveType || "general"}:`
  );
  scoredCandidates.slice(0, 10).forEach((c, i) => {
    console.log(
      `  ${i + 1}. ${c.pokemon.name}: BST=${c.bst}, Potential=${
        c.potentialBonus
      }, TypeBonus=${c.typeScore}, TOTAL=${c.totalScore}`
    );
  });

  // Extract sorted Pokemon array
  candidates.length = 0;
  scoredCandidates.forEach((c) => candidates.push(c.pokemon));

  const requiredCores = bossDefensiveType ? [] : ["fire", "water", "grass"];

  for (const type of requiredCores) {
    if (newTeam.length >= 6) break;
    if ([...coveredTypes].includes(type)) continue;

    const bestFit = candidates.find(
      (p) =>
        p.types.some((t) => t.type.name === type) &&
        !newTeam.some((member) => member.name === p.name)
    );
    if (bestFit) {
      newTeam.push(bestFit);
      bestFit.types.forEach((t) => coveredTypes.add(t.type.name));
    }
  }

  for (const p of candidates) {
    if (newTeam.length >= 6) break;
    if (!newTeam.some((member) => member.name === p.name)) {
      newTeam.push(p);
    }
  }

  return newTeam.map((p) => p.name);
};
