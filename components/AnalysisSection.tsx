import React, { useState, useMemo, useEffect } from "react";
import { TeamMember, PokemonData, MatchupResult } from "../types";
import { fetchPokemon, getPokemonNames } from "../services/pokeApi";
import { TYPE_COLORS, TYPE_NAMES, getMultiplier } from "../constants";
import { BOSSES } from "../bosses";
import {
  Loader2,
  Sword,
  ShieldAlert,
  ArrowUpCircle,
  ArrowDownCircle,
  MinusCircle,
  Gauge,
  Skull,
  Zap,
  Map,
  CircleDot,
  Crown,
  CheckCircle,
  ArrowRight,
  Lock,
  PlusCircle,
} from "lucide-react";
import MoveRecommender from "./MoveRecommender";
import AutocompleteInput from "./AutocompleteInput";

interface AnalysisSectionProps {
  team: TeamMember[];
  onBossSelect: (type: string | undefined) => void;
  caughtPokemon: string[];
  onToggleCaught: (name: string) => void;
  onAutoBuildTeam: (startType?: string) => void;
  isBuilding: boolean;
}

// Special moves for catching
const CATCHING_MOVES = {
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

const calculateStat = (
  base: number,
  level: number
): number => {
  return Math.floor(((2 * base + 31) * level) / 100) + 5;
};

// --- Suggested Counters Row Component ---
interface SuggestedCountersRowProps {
  caughtPokemon: string[];
  targetType: string;
  suggestedCounters: PokemonData[];
  setSuggestedCounters: React.Dispatch<React.SetStateAction<PokemonData[]>>;
  loadingSuggestions: boolean;
  setLoadingSuggestions: React.Dispatch<React.SetStateAction<boolean>>;
  enemyLevel: number;
  enemySpeed: number;
  team: TeamMember[];
}

const SuggestedCountersRow: React.FC<SuggestedCountersRowProps> = ({
  caughtPokemon,
  targetType,
  suggestedCounters,
  setSuggestedCounters,
  loadingSuggestions,
  setLoadingSuggestions,
  enemyLevel,
  enemySpeed,
  team,
}) => {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedLevel, setSelectedLevel] = useState(20);

  useEffect(() => {
    const fetchCounters = async () => {
      if (!targetType || caughtPokemon.length === 0) {
        setSuggestedCounters([]);
        return;
      }

      setLoadingSuggestions(true);
      const results: (PokemonData & { score: number; reason: string })[] = [];
      const batchSize = 20; // Increased batch for faster processing
      // Scan ALL caught Pokemon (no artificial limit)

      for (let i = 0; i < caughtPokemon.length; i += batchSize) {
        const batch = caughtPokemon.slice(i, i + batchSize);
        const batchData = await Promise.all(
          batch.map(async (name) => {
            try {
              const data = await fetchPokemon(name);

              // Scoring Logic
              let offenseMult = 0;
              data.types.forEach((t) => {
                const mult = getMultiplier(t.type.name, targetType);
                if (mult > offenseMult) offenseMult = mult;
              });

              let defenseMult = 1;
              data.types.forEach((t) => {
                defenseMult *= getMultiplier(targetType, t.type.name);
              });

              // Heuristic: (Offense * 10) + (Defense bonus)
              // Defense bonus: Immunity (0x) = 15, Resistance (0.5x) = 5, Neutral = 0, Weak = -10
              let defenseBonus = 0;
              if (defenseMult === 0) defenseBonus = 15;
              else if (defenseMult <= 0.5) defenseBonus = 5;
              else if (defenseMult >= 2) defenseBonus = -10;

              const score = offenseMult * 10 + defenseBonus;

              let reason = "";
              if (defenseMult === 0) reason = `Immune to ${targetType}`;
              else if (offenseMult >= 4) reason = `Huge 4x Damage`;
              else if (offenseMult >= 2) reason = `Super Effective`;
              else if (defenseMult <= 0.5) reason = `Resists ${targetType}`;

              return score >= 10 ? { ...data, score, reason } : null;
            } catch (e) {
              return null;
            }
          })
        );

        batchData.forEach((p) => {
          if (p) results.push(p);
        });

        if (results.length >= 12) break; // Find a good pool
      }

      // Sort by score and take top 6
      const sorted = results.sort((a, b) => b.score - a.score).slice(0, 6);
      setSuggestedCounters(sorted as any);
      setLoadingSuggestions(false);
    };

    fetchCounters();
  }, [targetType, caughtPokemon, setSuggestedCounters, setLoadingSuggestions]);

  // Reset selection when counters change
  useEffect(() => {
    setSelectedId(null);
  }, [suggestedCounters]);

  const selectedPokemon = suggestedCounters.find((p) => p.id === selectedId);

  // Calculate stats for selected Pokemon
  const getAnalysis = () => {
    if (!selectedPokemon) return null;

    const baseSpeed =
      selectedPokemon.stats.find((s) => s.stat.name === "speed")?.base_stat ||
      0;
    const mySpeed =
      Math.floor(((2 * baseSpeed + 31) * selectedLevel) / 100) + 5;
    const speedDiff = mySpeed - enemySpeed;
    const isFaster = speedDiff > 0;

    // Get best offensive multiplier
    let bestMult = 0;
    selectedPokemon.types.forEach((t) => {
      const mult = getMultiplier(t.type.name, targetType);
      if (mult > bestMult) bestMult = mult;
    });

    // Get defensive multiplier (Damage taken from targetType)
    let defenseMult = 1;
    selectedPokemon.types.forEach((t) => {
      defenseMult *= getMultiplier(targetType, t.type.name);
    });

    const isStillEffective = bestMult >= 2;
    const isResistant = defenseMult <= 0.5 && defenseMult > 0;
    const isImmune = defenseMult === 0;
    const levelAdvantage = selectedLevel >= enemyLevel;

    return {
      mySpeed,
      speedDiff,
      isFaster,
      bestMult,
      isStillEffective,
      isResistant,
      isImmune,
      levelAdvantage,
      defenseMult,
    };
  };

  const analysis = getAnalysis();

  // Unified Verdict Logic
  const getVerdict = () => {
    if (!analysis) return null;

    if (!analysis.levelAdvantage) {
      return {
        label: "Under-leveled",
        message: `Needs to be at least level ${enemyLevel}`,
        color: "bg-orange-600 text-white",
        icon: <ShieldAlert size={16} />,
      };
    }

    if (analysis.isImmune) {
      return {
        label: "Exceptional Choice!",
        message: `Completely Immune to ${targetType}!`,
        color: "bg-green-600 text-white",
        icon: <Crown size={18} />,
      };
    }

    if (analysis.isResistant && analysis.isStillEffective) {
      return {
        label: "Great Counter",
        message: "Resistant & Super Effective!",
        color: "bg-green-600 text-white",
        icon: <Sword size={16} />,
      };
    }

    if (analysis.isResistant) {
      return {
        label: "Solid Defense",
        message: `Resists ${targetType} (Safe to switch in)`,
        color: "bg-blue-600 text-white",
        icon: <Gauge size={16} />,
      };
    }

    if (analysis.isStillEffective) {
      return {
        label: "Offensive Choice",
        message: "High damage, but watch your health",
        color: "bg-yellow-600 text-black",
        icon: <Zap size={16} />,
      };
    }

    return {
      label: "May not be effective",
      message: "Neutral matchup, consider alternatives",
      color: "bg-red-600 text-white",
      icon: <MinusCircle size={16} />,
    };
  };

  const verdict = getVerdict();

  // Find the weakest party member to suggest replacing
  const getReplacementSuggestion = () => {
    if (!selectedPokemon) return null;

    // Find party member with worst matchup against targetType (ignore locked state for analysis)
    let worstMember: TeamMember | null = null;
    let worstScore = Infinity;

    team.forEach((member) => {
      if (!member.data) return;

      // Calculate offensive score against targetType
      let bestMult = 0;
      member.data.types.forEach((t) => {
        const mult = getMultiplier(t.type.name, targetType);
        if (mult > bestMult) bestMult = mult;
      });

      if (bestMult < worstScore) {
        worstScore = bestMult;
        worstMember = member;
      }
    });

    return worstMember;
  };

  const replacementSuggestion = getReplacementSuggestion();

  // Get next best alternative if current selection is not 'Great/Solid'
  const getNextBest = () => {
    if (!verdict) return null;

    // Suggest alternative if not Exceptional or Great
    const isSubOptimal =
      verdict.label !== "Exceptional Choice!" &&
      verdict.label !== "Great Counter";
    if (!isSubOptimal) return null;

    // Find next counter that isn't the current selection
    const alternatives = suggestedCounters.filter((p) => p.id !== selectedId);
    return alternatives.length > 0 ? alternatives[0] : null;
  };

  const nextBest = getNextBest();

  // This component now only fetches data for inline suggestions
  // No visible UI - all suggestions appear inline on matchup cards
  return null;
};

const AnalysisSection: React.FC<AnalysisSectionProps> = ({
  team,
  onBossSelect,
  caughtPokemon,
  onToggleCaught,
  onAutoBuildTeam,
  isBuilding,
}) => {
  const [enemyName, setEnemyName] = useState("");
  const [enemyLevel, setEnemyLevel] = useState(20);
  const [enemyTera, setEnemyTera] = useState<string>(""); // For bosses
  const [enemyData, setEnemyData] = useState<PokemonData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestedCounters, setSuggestedCounters] = useState<PokemonData[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  const handleAnalyze = async (overrideName?: string | React.MouseEvent) => {
    const nameToSearch =
      typeof overrideName === "string" ? overrideName : enemyName;

    if (!nameToSearch.trim()) return;
    if (typeof overrideName === "string") setEnemyName(overrideName);

    setLoading(true);
    setError(null);
    setEnemyData(null);

    try {
      const data = await fetchPokemon(nameToSearch);
      setEnemyData(data);
    } catch (err: any) {
      setError(err.message || "Opponent not found");
    } finally {
      setLoading(false);
    }
  };

  const loadBoss = (bossName: string) => {
    if (!bossName) {
      setEnemyName("");
      setEnemyTera("");
      onBossSelect(undefined);
      return;
    }
    const boss = BOSSES.find((b) => b.name === bossName);
    if (!boss) return;
    setEnemyName(boss.ace);
    setEnemyLevel(boss.level);
    setEnemyTera(boss.tera);
    onBossSelect(boss.tera);
    fetchBossData(boss.ace);
  };

  const fetchBossData = async (name: string) => {
    setLoading(true);
    setEnemyData(null);
    try {
      const data = await fetchPokemon(name);
      setEnemyData(data);
    } catch (e: any) {
      setError("Could not load boss data");
    } finally {
      setLoading(false);
    }
  };

  // Logic extracted to useMemo below to prevent re-renders
  const analysisData = useMemo(() => {
    if (!enemyData)
      return { matchups: [], bestCounterId: null, bestCatcherId: null };

    const calculateCatchScore = (
      member: TeamMember,
      enemy: PokemonData
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

    const enemyDefensiveTypes = enemyTera
      ? [enemyTera]
      : enemyData.types.map((t) => t.type.name);

    const enemyAttackTypes = new Set<string>();
    enemyData.types.forEach((t) => enemyAttackTypes.add(t.type.name));
    if (enemyTera) enemyAttackTypes.add(enemyTera);

    const enemyBaseSpeed =
      enemyData.stats.find((s) => s.stat.name === "speed")?.base_stat || 0;
    const realEnemySpeed = calculateStat(
      enemyBaseSpeed,
      enemyLevel
    );

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
        const realMemberSpeed = calculateStat(
          memberBaseSpeed,
          member.level
        );
        const speedDiff = realMemberSpeed - realEnemySpeed;

        let speedTier: MatchupResult["speedTier"] = "tie";
        if (speedDiff > 0) speedTier = "faster";
        else if (speedDiff < 0) speedTier = "slower";

        // --- Offensive Calculation (True Tera Logic) ---
        const originalTypes = member.data.types.map(t => t.type.name);
        const teraType = member.teraType || originalTypes[0]; // Default to primary if not set

        // We evaluate all types the Pokemon effectively "has" (Originals + Tera)
        const attackTypes = new Set([...originalTypes, teraType]);

        let maxDamageScore = 0;
        let bestMoveType = "";
        let isTeraBoosted = false; // Is this using the 2.0x Adapter boost?

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
            isTeraBoosted = (stab === 2.0);
          }
        });

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
        const catchInfo = calculateCatchScore(member, enemyData);
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
        // Score breakdown: 
        // 8.0 = 4x Weakness + Tera Adaptability (2.0)
        // 6.0 = 4x Weakness + Standard STAB (1.5)
        // 4.0 = 2x Weakness + Tera Adaptability (2.0)
        // 3.0 = 2x Weakness + Standard STAB (1.5)

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

  const { matchups, bestCounterId, bestCatcherId } = analysisData;

  // Team Weakness Matrix Calc
  const getTeamWeaknesses = () => {
    const weaknesses: { type: string; members: TeamMember[] }[] = [];

    TYPE_NAMES.forEach((type) => {
      const vulnerableMembers: TeamMember[] = [];
      team.forEach((member) => {
        if (!member.data) return;
        const defTypes = member.data.types.map((t) => t.type.name);
        let mult = getMultiplier(type, defTypes[0]);
        if (defTypes[1]) mult *= getMultiplier(type, defTypes[1]);

        if (mult >= 2) vulnerableMembers.push(member);
      });
      if (vulnerableMembers.length >= 2) {
        weaknesses.push({ type, members: vulnerableMembers });
      }
    });
    return weaknesses.sort((a, b) => b.members.length - a.members.length);
  };

  const teamWeaknesses = getTeamWeaknesses();

  // Helper for catch button
  const isCaught = enemyData ? caughtPokemon.includes(enemyData.name) : false;

  // Replacement suggestions cache (stored by target type)
  const [replacementCache, setReplacementCache] = useState<
    Record<string, { name: string; types: string[] } | null>
  >({});

  // Find a replacement from Pokedex that counters the given type
  const getReplacementSuggestion = (
    targetType: string
  ): { name: string; types: string[] } | null => {
    if (!targetType) return null;

    // Check cache first
    if (replacementCache[targetType] !== undefined) {
      return replacementCache[targetType];
    }

    // Find first caught Pokemon that counters this type and isn't already in team
    const teamNames = team.filter((m) => m.data).map((m) => m.data!.name);

    // Types that are super effective against targetType
    const counterTypes: Record<string, string[]> = {
      water: ["electric", "grass"],
      fire: ["water", "rock", "ground"],
      grass: ["fire", "ice", "poison", "flying", "bug"],
      electric: ["ground"],
      ground: ["water", "grass", "ice"],
      rock: ["water", "grass", "fighting", "ground", "steel"],
      flying: ["electric", "ice", "rock"],
      poison: ["ground", "psychic"],
      psychic: ["bug", "ghost", "dark"],
      fighting: ["flying", "psychic", "fairy"],
      bug: ["fire", "flying", "rock"],
      ghost: ["ghost", "dark"],
      dark: ["fighting", "bug", "fairy"],
      dragon: ["ice", "dragon", "fairy"],
      steel: ["fire", "fighting", "ground"],
      fairy: ["poison", "steel"],
      ice: ["fire", "fighting", "rock", "steel"],
      normal: ["fighting"],
    };

    // The boss has targetType - we need Pokemon that can hit it super effectively
    // OR resist its attacks
    const effectiveTypes = counterTypes[targetType] || [];

    // Look for a caught Pokemon with one of these types that isn't in the team
    for (const pName of caughtPokemon) {
      if (teamNames.includes(pName)) continue;

      // We don't have type data here - just return the name and we'll display it
      // The actual UI will need to fetch this or we use a simple heuristic
      // For now, return the first available - the Top Counters section already calculated this
    }

    return null; // Will be populated by the SuggestedCounters component data
  };

  // Use suggestedCounters for replacement suggestions (already calculated)
  const findReplacementFromSuggested = (
    memberName: string
  ): PokemonData | null => {
    if (!suggestedCounters || suggestedCounters.length === 0) return null;

    // Find first suggested counter that isn't the member being replaced
    const replacement = suggestedCounters.find((p) => p.name !== memberName);
    return replacement || null;
  };

  return (
    <div className="mt-12 bg-white border-4 border-black rounded-3xl p-8 shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-scarlet rounded-bl-full opacity-10 pointer-events-none"></div>

      <h2 className="text-3xl font-black uppercase tracking-tighter text-black mb-4 flex items-center gap-3">
        <div className="w-8 h-8 bg-scarlet border-4 border-black rounded-full flex items-center justify-center relative shadow-md">
          <div className="w-2 h-2 bg-white border-2 border-black rounded-full z-10"></div>
          <div className="absolute top-0 left-0 w-full h-1/2 bg-black opacity-20 rounded-t-full"></div>
        </div>
        Combat Analyzer
      </h2>

      {/* Control Panel */}
      <div className="flex flex-col gap-4 mb-4">
        {/* Boss Preset */}
        <div className="bg-gray-50 border-2 border-black rounded-2xl p-4 shadow-inner">
          <div className="flex items-center gap-2 text-black font-black uppercase text-xs mb-4">
            <Map size={18} className="text-scarlet" />
            <span>Select Major Encounter:</span>
          </div>
          <select
            onChange={(e) => loadBoss(e.target.value)}
            className="w-full bg-white border-2 border-black text-black font-bold text-sm rounded-xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-scarlet/10 cursor-pointer"
          >
            <option value="">-- Choose Gym Leader / Boss --</option>
            {BOSSES.map((b) => (
              <option key={b.name} value={b.name}>
                {b.label} (Lv {b.level})
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col md:flex-row gap-4 items-stretch">
          <div className="relative flex-grow flex gap-4 z-20">
            <div className="flex-grow">
              <div className="text-[10px] text-gray-400 font-bold uppercase mb-1 ml-1">
                Custom Opponent
              </div>
              <AutocompleteInput
                value={enemyName}
                onChange={(val) => {
                  setEnemyName(val);
                  setEnemyTera(""); // Clear tera if manual typing
                  onBossSelect(undefined);
                }}
                onSubmit={handleAnalyze}
                fetchData={getPokemonNames}
                placeholder="Name..."
                isLoading={loading}
              />
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setEnemyLevel((l) => Math.max(1, l - 1))}
                className="text-gray-400 hover:text-black transition-colors"
              >
                <MinusCircle size={24} />
              </button>
              <div className="w-20 bg-white border-2 border-black rounded-xl flex flex-col px-3 py-1 justify-center shrink-0 shadow-sm transition-focus focus-within:ring-4 focus-within:ring-scarlet/10">
                <label className="text-[10px] text-gray-400 font-black uppercase tracking-tighter">
                  Level
                </label>
                <select
                  value={enemyLevel}
                  onChange={(e) => setEnemyLevel(parseInt(e.target.value))}
                  className="w-full bg-transparent text-black font-black text-lg focus:outline-none cursor-pointer"
                >
                  {Array.from({ length: 100 }, (_, i) => i + 1).map((level) => (
                    <option
                      key={level}
                      value={level}
                      className="bg-white text-black"
                    >
                      {level}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => setEnemyLevel((l) => Math.min(100, l + 1))}
                className="text-gray-400 hover:text-black transition-colors"
              >
                <PlusCircle size={24} />
              </button>
            </div>
          </div>
          <button
            onClick={handleAnalyze}
            disabled={loading}
            className="bg-scarlet hover:bg-red-600 text-white font-black py-4 px-10 rounded-2xl shadow-lg transform active:scale-95 transition-all flex items-center justify-center gap-2 min-w-[160px] border-b-4 border-red-800 z-10 uppercase tracking-widest text-sm"
          >
            {loading ? <Loader2 className="animate-spin" /> : "Analyze"}
          </button>
        </div>

        {/* Removed: "Auto Build" button - user keeps team locked, replacement suggestions are now inline on cards */}


      </div>

      {error && (
        <div className="p-4 bg-red-900/20 border border-red-800 rounded text-red-400 flex items-center gap-2 mb-6">
          <ShieldAlert size={20} />
          {error}
        </div>
      )}

      {enemyData && (
        <div className="animate-fade-in">
          {/* Enemy Header */}
          <div className="flex items-center gap-4 p-4 bg-white rounded-3xl border-4 border-black mb-4 relative overflow-hidden group shadow-2xl">
            <div className="absolute right-0 top-0 h-full w-1/2 bg-gradient-to-l from-gray-50 to-transparent pointer-events-none"></div>

            <div className="w-28 h-28 bg-gray-50 rounded-full flex items-center justify-center border-4 border-black z-10 relative shadow-inner">
              <img
                src={
                  enemyData.sprites.other?.["official-artwork"].front_default ||
                  enemyData.sprites.front_default
                }
                alt={enemyData.name}
                className="w-24 h-24 object-contain"
              />
            </div>
            <div className="z-10 flex-grow">
              <div className="flex items-center gap-4">
                <h3 className="text-3xl font-black capitalize text-black flex items-center gap-3">
                  {enemyData.name}
                  <span className="text-sm bg-black text-white px-3 py-1 rounded-full font-bold">
                    Lv. {enemyLevel}
                  </span>
                </h3>

                {/* Catch Button */}
                <button
                  onClick={() => onToggleCaught(enemyData.name)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase shadow-lg transition-all transform active:scale-95 ${isCaught
                    ? "bg-green-600 hover:bg-green-500 text-white border border-green-400"
                    : "bg-white hover:bg-gray-200 text-red-600 border border-red-500"
                    }`}
                  title={isCaught ? "Remove from Pokedex" : "Add to Pokedex"}
                >
                  {isCaught ? (
                    <CheckCircle size={14} />
                  ) : (
                    <CircleDot size={14} />
                  )}
                  {isCaught ? "Caught" : "Catch"}
                </button>
              </div>

              <div className="flex gap-2 mt-2">
                {enemyData.types.map((t) => (
                  <span
                    key={t.type.name}
                    className="px-2 py-1 rounded text-xs font-bold text-white uppercase"
                    style={{
                      backgroundColor: TYPE_COLORS[t.type.name] || "#555",
                    }}
                  >
                    {t.type.name}
                  </span>
                ))}
                {enemyTera && (
                  <span
                    className="px-2 py-1 rounded text-xs font-black text-white uppercase border-2 border-black/10 shadow-sm"
                    style={{
                      backgroundColor: TYPE_COLORS[enemyTera] || "#8a2be2",
                    }}
                  >
                    TERA: {enemyTera}
                  </span>
                )}
              </div>
              <div className="mt-3 text-black font-black text-sm flex items-center gap-2 opacity-60 uppercase tracking-tighter">
                <Gauge size={14} className="text-scarlet" />
                Est. Speed:{" "}
                <span className="text-black font-black">
                  {calculateStat(
                    enemyData.stats.find((s) => s.stat.name === "speed")
                      ?.base_stat || 0,
                    enemyLevel
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Results Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            {matchups.map((matchup, idx) => {
              const member = team.find((m) => m.id === matchup.memberId);
              if (!member?.data) return null;

              const isBestCounter = matchup.memberId === bestCounterId;
              const isBestCatcher = matchup.memberId === bestCatcherId;

              let borderColor = "border-gray-600";
              let bgGlow = "";
              let shadow = "";

              if (isBestCounter) {
                borderColor = "border-amber-500 shadow-xl shadow-amber-500/10";
                bgGlow = "bg-amber-50/50";
                shadow = "scale-[1.02] z-10";
              } else if (isBestCatcher) {
                borderColor = "border-blue-500 shadow-xl shadow-blue-500/10";
                bgGlow = "bg-blue-50/50";
                shadow = "scale-[1.02] z-10";
              } else if (matchup.offensiveScore >= 4) {
                borderColor = "border-green-500";
                bgGlow = "bg-green-50/30";
              } else if (matchup.offensiveScore >= 2) {
                borderColor = "border-green-400";
                bgGlow = "bg-green-50/20";
              } else if (matchup.offensiveScore < 1) {
                borderColor = "border-red-500";
                bgGlow = "bg-red-50/30";
              }

              return (
                <div
                  key={idx}
                  className={`border-4 ${borderColor} ${bgGlow} ${shadow} bg-white p-2.5 rounded-xl flex flex-col gap-1 relative overflow-hidden transition-all hover:shadow-2xl hover:-translate-y-1 block`}
                >
                  {isBestCounter && (
                    <div className="absolute right-0 top-0 bg-amber-500 text-black text-[9px] font-black px-2 py-0.5 rounded-bl-lg uppercase flex items-center gap-1 shadow-lg z-10 tracking-widest border-b-2 border-l-2 border-black">
                      <Crown size={10} /> BEST COUNTER
                    </div>
                  )}
                  {isBestCatcher && (
                    <div
                      className={`absolute right-0 ${isBestCounter ? "top-6" : "top-0"
                        } bg-blue-500 text-white text-[9px] font-black px-2 py-0.5 rounded-bl-lg uppercase flex items-center gap-1 shadow-lg z-10 tracking-widest border-b-2 border-l-2 border-black`}
                    >
                      <CircleDot size={12} /> BEST CATCHER
                    </div>
                  )}

                  {matchup.defensiveScore >= 2 && (
                    <div
                      className="absolute right-2 top-6 animate-pulse opacity-50"
                      title="Opponent has super effective moves!"
                    >
                      <Skull
                        size={20}
                        className={
                          matchup.defensiveScore >= 4
                            ? "text-red-500"
                            : "text-orange-500"
                        }
                      />
                    </div>
                  )}

                  <div className="flex justify-between items-start pr-0 mt-1">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-white rounded-full border-2 border-black shadow-sm flex items-center justify-center overflow-hidden">
                        <img
                          src={member.data.sprites.front_default}
                          alt={member.data.name}
                          className="w-10 h-10 object-contain"
                        />
                      </div>
                      <div>
                        <span className="font-black capitalize text-base block text-black leading-tight">
                          {member.data.name}
                        </span>
                        <span className="text-[10px] text-black/40 font-black uppercase tracking-widest">
                          LV {member.level}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end">
                      <div className="flex items-center gap-1 text-[9px] bg-gray-50 border-2 border-black/5 px-2 py-0.5 rounded-full mb-0.5 shadow-inner">
                        {matchup.speedTier === "faster" && (
                          <ArrowUpCircle size={14} className="text-green-600" />
                        )}
                        {matchup.speedTier === "slower" && (
                          <ArrowDownCircle size={14} className="text-red-600" />
                        )}
                        {matchup.speedTier === "tie" && (
                          <MinusCircle size={14} className="text-yellow-600" />
                        )}
                        <span
                          className={`font-black uppercase tracking-widest ${matchup.speedTier === "faster"
                            ? "text-green-600"
                            : matchup.speedTier === "slower"
                              ? "text-red-600"
                              : "text-yellow-600"
                            }`}
                        >
                          {matchup.speedTier === "faster"
                            ? "Faster"
                            : matchup.speedTier === "slower"
                              ? "Slower"
                              : "Tie"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-black/40 text-[9px] font-black uppercase tracking-widest">
                      Best Type:
                    </span>
                    <span
                      className="px-2 py-0.5 rounded text-[10px] font-black text-white uppercase shadow-sm"
                      style={{
                        backgroundColor:
                          TYPE_COLORS[matchup.bestMoveType] || "#666",
                      }}
                    >
                      {matchup.bestMoveType}
                    </span>
                  </div>

                  <div
                    className={`mt-0.5 font-black text-[10px] uppercase tracking-widest ${matchup.offensiveScore >= 2
                      ? "text-green-600"
                      : matchup.offensiveScore < 1
                        ? "text-red-600"
                        : "text-black/30"
                      }`}
                  >
                    {matchup.message}
                  </div>

                  {/* Move Recommender */}
                  {matchup.offensiveScore >= 2 && (
                    <MoveRecommender
                      moves={member.data.moves}
                      currentLevel={member.level}
                      targetType={matchup.bestMoveType}
                    />
                  )}

                  {/* Catch Recommendations */}
                  {isBestCatcher && matchup.catchMoves.length > 0 && (
                    <div className="mt-3 bg-blue-50 border-2 border-blue-100 p-3 rounded-xl shadow-inner">
                      <div className="text-[10px] text-blue-900 uppercase font-black mb-2 flex items-center gap-1.5 tracking-widest">
                        <CircleDot size={12} /> CATCH STRATEGY
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {matchup.catchMoves.map((m) => (
                          <span
                            key={m}
                            className="text-[10px] bg-white border border-blue-200 px-2 py-1 rounded-lg text-blue-700 capitalize font-bold shadow-sm"
                          >
                            {m.replace(/-/g, " ")}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {matchup.defensiveScore >= 1 && (
                    <div
                      className={`mt-4 pt-3 border-t border-black/5 text-[10px] flex items-center gap-2 font-black tracking-widest ${matchup.defensiveScore >= 2
                        ? "text-red-600"
                        : "text-black/30"
                        }`}
                    >
                      {matchup.defensiveScore >= 2 ? (
                        <ShieldAlert size={16} />
                      ) : (
                        <div className="w-4" />
                      )}
                      <span className="uppercase tracking-tighter">
                        {matchup.defensiveScore >= 4
                          ? "Takes 4x Damage!"
                          : matchup.defensiveScore >= 2
                            ? "Takes Super Effective Dmg!"
                            : "Takes Neutral Damage."}
                      </span>
                    </div>
                  )}

                  {/* Replacement Suggestion - shows when weak to boss */}
                  {matchup.defensiveScore >= 2 &&
                    (() => {
                      const replacement = findReplacementFromSuggested(
                        member.data.name
                      );
                      if (!replacement) return null;

                      return (
                        <div className="mt-3 bg-amber-50 border-2 border-amber-200 p-3 rounded-xl shadow-inner animate-in slide-in-from-bottom-2">
                          <div className="text-[10px] text-amber-900 uppercase font-black mb-2 flex items-center gap-1.5 tracking-widest">
                            <Zap size={12} className="text-amber-600" />{" "}
                            Consider Instead
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="bg-white p-1 rounded-full border-2 border-amber-200 shadow-sm">
                              <img
                                src={
                                  replacement.sprites.other?.[
                                    "official-artwork"
                                  ].front_default ||
                                  replacement.sprites.front_default
                                }
                                alt={replacement.name}
                                className="w-10 h-10 object-contain"
                              />
                            </div>
                            <div className="flex-grow">
                              <div className="font-black text-amber-900 capitalize text-sm">
                                {replacement.name.replace(/-/g, " ")}
                              </div>
                              <div className="flex gap-1 mt-1">
                                {replacement.types.map((t) => (
                                  <span
                                    key={t.type.name}
                                    className="px-1.5 py-0.5 rounded text-[8px] font-black text-white uppercase"
                                    style={{
                                      backgroundColor:
                                        TYPE_COLORS[t.type.name] || "#555",
                                    }}
                                  >
                                    {t.type.name.slice(0, 3)}
                                  </span>
                                ))}
                              </div>
                            </div>
                            {/* Reason Badge - More prominent */}
                            <div className="flex flex-col items-end gap-1">
                              <span className="px-2 py-1 bg-green-100 border border-green-300 text-green-700 rounded-lg text-[10px] font-black uppercase tracking-tight">
                                {(replacement as any).reason ||
                                  "Strong Counter"}
                              </span>
                              <span className="text-[8px] text-amber-500 font-bold">
                                vs {enemyTera || enemyData?.types[0]?.type.name}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                </div>
              );
            })}
          </div>

          {/* Team Weakness Matrix */}
          {teamWeaknesses.length > 0 && (
            <div className="bg-white border-4 border-black rounded-3xl p-6 shadow-2xl mt-4">
              <div className="mb-4 border-b-2 border-black/5 pb-2">
                <h3 className="text-black font-black uppercase text-lg flex items-center gap-2 tracking-widest">
                  <ShieldAlert size={24} className="text-scarlet" />
                  Team Defense Gaps
                </h3>
                <p className="text-xs text-black/50 font-bold mt-1 uppercase tracking-wider pl-8">
                  Shared weaknesses across your team that opponents can exploit.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {teamWeaknesses.map((w) => (
                  <div
                    key={w.type}
                    className="flex flex-col bg-gray-50 rounded-xl border-2 border-black overflow-hidden shadow-sm transition-all hover:shadow-md"
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between px-3 py-2 bg-white border-b-2 border-black/5">
                      <span
                        className="px-2 py-0.5 text-[10px] font-black text-white uppercase rounded shadow-sm"
                        style={{
                          backgroundColor: TYPE_COLORS[w.type] || "#555",
                        }}
                      >
                        {w.type}
                      </span>
                      <span className="text-[10px] text-red-600 font-black uppercase tracking-wider">
                        {w.members.length} Vulnerable
                      </span>
                    </div>

                    {/* Member Sprites */}
                    <div className="flex items-center gap-2 p-3 bg-gray-50/50 flex-wrap">
                      {w.members.map((m) => (
                        <div
                          key={m.id}
                          className="w-8 h-8 bg-white rounded-full border border-black/10 flex items-center justify-center shadow-sm relative group cursor-help"
                          title={`${m.data?.name} is weak to ${w.type}`}
                        >
                          <img
                            src={m.data?.sprites.front_default}
                            alt={m.data?.name}
                            className="w-6 h-6 object-contain"
                          />
                          {/* Hover Tooltip */}
                          <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-black text-white text-[9px] px-2 py-1 rounded font-bold uppercase whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                            {m.data?.name}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Suggested Counters Row - now primarily provides data for inline replacement suggestions */}
          {caughtPokemon.length > 0 && enemyData && (
            <SuggestedCountersRow
              caughtPokemon={caughtPokemon}
              targetType={enemyTera || enemyData.types[0]?.type.name}
              suggestedCounters={suggestedCounters}
              setSuggestedCounters={setSuggestedCounters}
              loadingSuggestions={loadingSuggestions}
              setLoadingSuggestions={setLoadingSuggestions}
              enemyLevel={enemyLevel}
              enemySpeed={calculateStat(
                enemyData.stats.find((s) => s.stat.name === "speed")
                  ?.base_stat || 0,
                enemyLevel
              )}

              team={team}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default AnalysisSection;
