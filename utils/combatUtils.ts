import { TeamMember, PokemonData, MatchupResult } from "../types";
import { getMultiplier, RAID_SETUP_MOVES, RAID_SUPPORT_MOVES } from "../constants";

// Special moves for catching
export const CATCHING_MOVES = {
  SWIPE: ["false-swipe", "hold-back"],
  SLEEP: [
    "spore",
    "sleep-powder",
    "hypnosis",
    "yawn",
    "sing",
    "lovely-kiss",
    "dark-void",
    "grass-whistle",
  ],
  PARALYZE: ["thunder-wave", "glare", "stun-spore", "nuzzle"],
};

export const calculateStat = (base: number, level: number): number => {
  return Math.floor(((2 * base + 31) * level) / 100) + 5;
};

export const calculateCatchScore = (
  member: TeamMember,
  enemy: PokemonData,
  enemyTera: string
): { score: number; moves: string[] } => {
  if (!member.data) return { score: 0, moves: [] };

  let score = 0;
  const helpfulMoves: string[] = [];

  const memberMoves = member.data.moves.map((m) => m.name);

  // 1. False Swipe Utility
  const hasSwipe = memberMoves.some((m) =>
    CATCHING_MOVES.SWIPE.includes(m)
  );
  const enemyIsGhost =
    enemy.types.some((t) => t.type.name === "ghost") ||
    enemyTera === "ghost";

  if (hasSwipe) {
    if (!enemyIsGhost) {
      score += 50;
      helpfulMoves.push("False Swipe");
    } else {
      // It has the move but it won't work
      score += 0;
    }
  }

  // 2. Status Utility
  const hasSleep = memberMoves.some((m) =>
    CATCHING_MOVES.SLEEP.includes(m)
  );
  const enemyIsGrass =
    enemy.types.some((t) => t.type.name === "grass") ||
    enemyTera === "grass"; // Immunity to powders

  if (hasSleep) {
    if (enemyIsGrass && memberMoves.includes("spore")) {
      // Spore fails on grass
    } else {
      score += 40;
      helpfulMoves.push("Sleep Move");
    }
  } else {
    const hasParalyze = memberMoves.some((m) =>
      CATCHING_MOVES.PARALYZE.includes(m)
    );
    const enemyIsElectric =
      enemy.types.some((t) => t.type.name === "electric") ||
      enemyTera === "electric";
    const enemyIsGround =
      enemy.types.some((t) => t.type.name === "ground") ||
      enemyTera === "ground";

    if (hasParalyze) {
      if (enemyIsElectric) {
        // Fails
      } else if (enemyIsGround && memberMoves.includes("thunder-wave")) {
        // Fails
      } else {
        score += 25;
        helpfulMoves.push("Paralyze Move");
      }
    }
  }

  return { score, moves: helpfulMoves };
};
