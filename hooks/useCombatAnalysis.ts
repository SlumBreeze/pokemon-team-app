import { useMemo } from "react";
import { TeamMember, PokemonData, MatchupResult } from "../types";
import { getMultiplier } from "../constants";
import { calculateStat, calculateCatchScore } from "../utils/combatUtils";

export const useCombatAnalysis = (
  team: TeamMember[],
  enemyData: PokemonData | null,
  enemyLevel: number,
  enemyTera: string
) => {
  return useMemo(() => {
    if (!enemyData)
      return { matchups: [], bestCounterId: null, bestCatcherId: null };

    const enemyDefensiveTypes = enemyTera
      ? [enemyTera]
      : enemyData.types.map((t) => t.type.name);

    const enemyAttackTypes = new Set<string>();
    enemyData.types.forEach((t) => enemyAttackTypes.add(t.type.name));
    if (enemyTera) enemyAttackTypes.add(enemyTera);

    const enemyBaseSpeed =
      enemyData.stats.find((s) => s.stat.name === "speed")?.base_stat || 0;
    const realEnemySpeed = calculateStat(enemyBaseSpeed, enemyLevel);

    let highestOffense = -1;
    let highestCatchScore = -1;
    let bestOffId = null;
    let bestCatchId = null;

    const results = team
      .map((member) => {
        if (!member.data) return null;

        // Speed Calc
        const memberBaseSpeed =
          member.data.stats.find((s) => s.stat.name === "speed")?.base_stat ||
          0;
        const realMemberSpeed = calculateStat(memberBaseSpeed, member.level);
        const speedDiff = realMemberSpeed - realEnemySpeed;

        let speedTier: MatchupResult["speedTier"] = "tie";
        if (speedDiff > 0) speedTier = "faster";
        else if (speedDiff < 0) speedTier = "slower";

        // --- Offensive Calculation (True Tera Logic) ---
        const originalTypes = member.data.types.map((t) => t.type.name);
        const teraType = member.teraType || originalTypes[0]; // Default to primary if not set

        let maxDamageScore = 0;
        let bestMoveType = "";

        // Check if we have specific moves selected
        const hasSelectedMoves = member.moves?.some(m => m !== null);

        if (hasSelectedMoves && member.moves) {
          member.moves.forEach(move => {
             if (!move) return;

             // Skip status moves for damage calc (unless we want to count them as 0, which is fine)
             if (move.damageClass === 'status') return;

             const atkType = move.type;
             const movePower = move.power || 0;

             // 1. Effectiveness
             let effectiveness = getMultiplier(atkType, enemyDefensiveTypes[0]);
             if (enemyDefensiveTypes[1])
               effectiveness *= getMultiplier(atkType, enemyDefensiveTypes[1]);
             
             // 2. STAB
             let stab = 1.0;
             const isOriginal = originalTypes.includes(atkType);
             const isTera = atkType === teraType;
             
             if (isTera && isOriginal) stab = 2.0;
             else if (isTera && !isOriginal) stab = 1.5;
             else if (!isTera && isOriginal) stab = 1.5;
             
             // 3. Base Power Factor (Simple heuristic: normalize around 80bp)
             // If we just use effectiveness * stab, that's like assuming equal power.
             // But now we have real power. 
             // Existing logic was just Type * STAB (implicitly assuming "good move").
             // Let's scale it. 
             // Old max score was usually around 2.25 (1.5 * 1.5) to 6 (4 * 1.5).
             // Let's keep the score scale roughly compatible: Score = Effectiveness * STAB.
             // But we prioritize high power moves. 
             // If we want to strictly use the move, we should weight it.
             // But the UI expects "Score" like 4x, 2x etc.
             // Let's stick to Effectiveness * STAB, but maybe penalize low power?
             // Or better: Just use Effectiveness * STAB for the "Score" aimed at the user (Type Matchup),
             // but strictly filter by the moves we have.
             
             const totalScore = effectiveness * stab;
             
             if (totalScore > maxDamageScore) {
               maxDamageScore = totalScore;
               bestMoveType = atkType;
             }
          });
          
          // If we have moves but none are damaging (e.g. all status), maxDamageScore is 0.
          
        } else {
            // Fallback: Assume best possible moves for known types
            const attackTypes = new Set([...originalTypes, teraType]);

            attackTypes.forEach((atkType) => {
              // 1. Calculate Type Effectiveness (0x, 0.5x, 1x, 2x, 4x)
              let effectiveness = getMultiplier(atkType, enemyDefensiveTypes[0]);
              if (enemyDefensiveTypes[1])
                effectiveness *= getMultiplier(atkType, enemyDefensiveTypes[1]);

              // 2. Calculate Gen 9 STAB Multiplier
              let stab = 1.0;
              const isOriginal = originalTypes.includes(atkType);
              const isTera = atkType === teraType;

              if (isTera && isOriginal) {
                stab = 2.0; // The "Tera Nuke" (Adaptability)
              } else if (isTera && !isOriginal) {
                stab = 1.5; // Defensive Tera providing offensive coverage
              } else if (!isTera && isOriginal) {
                stab = 1.5; // Retained STAB from original typing
              } else {
                stab = 1.0; // Coverage move (shouldn't happen with this set logic, but safe fallback)
              }

              const totalScore = effectiveness * stab;

              if (totalScore > maxDamageScore) {
                maxDamageScore = totalScore;
                bestMoveType = atkType;
              }
            });
        }

        // --- Defensive Calculation ---
        const isTeraDefensivelyActive =
          member.teraType && member.teraType !== member.data.types[0].type.name;
        const myDefensiveTypes = isTeraDefensivelyActive
          ? [member.teraType]
          : member.data.types.map((t) => t.type.name);

        let maxIncomingDamage = 0;
        enemyAttackTypes.forEach((enemyType) => {
          let mult = getMultiplier(enemyType, myDefensiveTypes[0]);
          if (myDefensiveTypes[1])
            mult *= getMultiplier(enemyType, myDefensiveTypes[1]);
          if (mult > maxIncomingDamage) maxIncomingDamage = mult;
        });

        // --- Catch Calculation ---
        const catchInfo = calculateCatchScore(member, enemyData, enemyTera);
        // Penalize catch score if we die easily
        if (maxIncomingDamage >= 2) catchInfo.score -= 20;
        else if (maxIncomingDamage <= 0.5) catchInfo.score += 15;

        // Track Bests
        if (maxDamageScore > highestOffense) {
          highestOffense = maxDamageScore;
          bestOffId = member.id;
        } else if (maxDamageScore === highestOffense && speedDiff > 0) {
          // Tie breaker: Prefer faster Pokemon when offense is equal
          bestOffId = member.id;
        }

        if (catchInfo.score > highestCatchScore) {
          highestCatchScore = catchInfo.score;
          bestCatchId = member.id;
        }

        // --- Message & Badge Logic ---
        let message = "Neutral";
        if (maxDamageScore >= 6) message = "NUCLEAR DAMAGE (OHKO)";
        else if (maxDamageScore >= 4) message = "Massive Damage";
        else if (maxDamageScore >= 3) message = "Super Effective";
        else if (maxDamageScore >= 1.5) message = "Solid Hit";
        else if (maxDamageScore < 1) message = "Not Effective";

        return {
          memberId: member.id,
          offensiveScore: maxDamageScore, // Now includes STAB/Tera
          defensiveScore: maxIncomingDamage,
          bestMoveType,
          speedDiff,
          speedTier,
          message,
          mySpeed: realMemberSpeed,
          enemySpeed: realEnemySpeed,
          catchScore: catchInfo.score,
          catchMoves: catchInfo.moves,
        };
      })
      .filter(Boolean) as (MatchupResult & {
        catchScore: number;
        catchMoves: string[];
      })[];

    return {
      matchups: results,
      bestCounterId: bestOffId,
      bestCatcherId: highestCatchScore > 10 ? bestCatchId : null,
    };
  }, [enemyData, team, enemyLevel, enemyTera]);
};
