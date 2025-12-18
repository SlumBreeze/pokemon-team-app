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
  level: number,
  isCompetitive: boolean
): number => {
  if (isCompetitive) {
    const stat = Math.floor(((2 * base + 31 + 63) * level) / 100 + 5);
    return Math.floor(stat * 1.1);
  }
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
      const batchSize = 10;
      const searchLimit = Math.min(caughtPokemon.length, 100);

      for (let i = 0; i < searchLimit; i += batchSize) {
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

  if (loadingSuggestions) {
    return (
      <div className="mt-8 bg-white border-4 border-black rounded-2xl p-8 flex flex-col items-center justify-center gap-4 shadow-xl">
        <Loader2 className="animate-spin text-scarlet" size={32} />
        <span className="text-black font-black uppercase tracking-widest text-xs">Finding Best Counters...</span>
      </div>
    );
  }

  if (suggestedCounters.length === 0) {
    return null;
  }

  return (
    <div className="mt-6 bg-white border-4 border-black rounded-2xl p-6 shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-2 bg-scarlet"></div>
      <h3 className="text-black font-black uppercase text-xs mb-4 flex items-center gap-2 tracking-widest">
        <Crown size={16} className="text-scarlet" />
        Top Counters from Your Pokédex <span className="text-black/40 font-black ml-2 uppercase">VS {targetType}</span>
      </h3>
      <div className="flex flex-wrap gap-3 mb-4">
        {suggestedCounters.map((p) => (
          <button
            key={p.id}
            onClick={() => setSelectedId(p.id === selectedId ? null : p.id)}
            className={`bg-gray-50 border-2 rounded-xl p-2 flex flex-col items-center gap-1 w-24 transition-all cursor-pointer ${p.id === selectedId
              ? "border-scarlet ring-4 ring-scarlet/10 scale-105 shadow-lg"
              : "border-black/10 hover:border-black"
              }`}
          >
            <div className="p-1 bg-white rounded-full border border-black/5 shadow-inner mb-1">
              <img
                src={
                  p.sprites.other?.["official-artwork"].front_default ||
                  p.sprites.front_default
                }
                alt={p.name}
                className="w-16 h-16 object-contain"
              />
            </div>
            <span className="text-[10px] text-black capitalize text-center truncate w-full font-black">
              {p.name.replace(/-/g, " ")}
            </span>
            <div className="flex gap-0.5">
              {p.types.map((t) => (
                <span
                  key={t.type.name}
                  className="px-1 py-0.5 rounded text-[7px] font-black text-white uppercase"
                  style={{
                    backgroundColor: TYPE_COLORS[t.type.name] || "#555",
                  }}
                >
                  {t.type.name.slice(0, 3)}
                </span>
              ))}
            </div>
            {(p as any).reason && (
              <span className="text-[9px] text-scarlet font-black mt-2 text-center leading-tight uppercase tracking-tighter">
                {(p as any).reason}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Selected Pokemon Analysis */}
      {selectedPokemon && analysis && (
        <div className="bg-white border-2 border-black rounded-2xl p-6 animate-in slide-in-from-top-2 shadow-lg mt-4">
          <div className="flex items-center gap-6 mb-4">
            <div className="p-2 bg-gray-50 rounded-full border-2 border-black shadow-inner">
              <img
                src={
                  selectedPokemon.sprites.other?.["official-artwork"]
                    .front_default || selectedPokemon.sprites.front_default
                }
                alt={selectedPokemon.name}
                className="w-20 h-20 object-contain"
              />
            </div>
            <div className="flex-grow">
              <div className="flex items-center gap-3">
                <h4 className="text-2xl font-black capitalize text-black">
                  {selectedPokemon.name.replace(/-/g, " ")}
                </h4>
                {(selectedPokemon as any).reason && (
                  <span className="px-3 py-1 bg-scarlet rounded-full text-[10px] text-white font-black uppercase tracking-widest shadow-sm">
                    {(selectedPokemon as any).reason}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-xs text-gray-400 font-bold uppercase tracking-tight">Your Trainer Level:</span>
                <select
                  value={selectedLevel}
                  onChange={(e) => setSelectedLevel(parseInt(e.target.value))}
                  className="bg-gray-100 border-2 border-black rounded-lg px-3 py-1 text-black text-sm font-bold focus:outline-none focus:ring-2 focus:ring-scarlet/20"
                >
                  {Array.from({ length: 100 }, (_, i) => 100 - i).map((lvl) => (
                    <option key={lvl} value={lvl} className="bg-white text-black">
                      {lvl}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
            {/* Speed Check */}
            <div
              className={`p-3 rounded-xl border-2 ${analysis.isFaster
                ? "bg-green-50 border-green-200"
                : "bg-red-50 border-red-200"
                } shadow-sm`}
            >
              <div className="text-[10px] text-black/40 font-black uppercase mb-1 tracking-widest">
                Speed
              </div>
              <div
                className={`font-black text-sm uppercase tracking-tighter ${analysis.isFaster ? "text-green-600" : "text-red-600"
                  }`}
              >
                {analysis.isFaster ? (
                  <span className="flex items-center gap-1.5 font-bold">
                    <ArrowUpCircle size={16} /> Faster ({analysis.mySpeed})
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 font-bold">
                    <ArrowDownCircle size={16} /> Slower ({analysis.mySpeed})
                  </span>
                )}
              </div>
              <div className="text-[10px] text-gray-400 font-bold mt-1">
                Enemy: {enemySpeed}
              </div>
            </div>

            {/* Effectiveness */}
            <div
              className={`p-3 rounded-xl border-2 ${analysis.isStillEffective
                ? "bg-green-50 border-green-200"
                : "bg-yellow-50 border-yellow-200"
                } shadow-sm`}
            >
              <div className="text-[10px] text-black/40 font-black uppercase mb-1 tracking-widest">
                Offense
              </div>
              <div
                className={`font-black text-sm uppercase tracking-tighter ${analysis.isStillEffective
                  ? "text-green-600"
                  : "text-yellow-600"
                  }`}
              >
                {analysis.bestMult >= 4
                  ? "4x Super Effective!"
                  : analysis.bestMult >= 2
                    ? "2x Super Effective"
                    : "Neutral Damage"}
              </div>
            </div>

            {/* Defense Check */}
            <div
              className={`p-3 rounded-xl border-2 ${analysis.isImmune || analysis.isResistant
                ? "bg-green-50 border-green-200"
                : analysis.defenseMult >= 2
                  ? "bg-red-50 border-red-200"
                  : "bg-gray-50 border-gray-200"
                } shadow-sm`}
            >
              <div className="text-[10px] text-black/40 font-black uppercase mb-1 tracking-widest">
                Defense
              </div>
              <div
                className={`font-black text-sm uppercase tracking-tighter ${analysis.isImmune || analysis.isResistant
                  ? "text-green-600"
                  : analysis.defenseMult >= 2
                    ? "text-red-600"
                    : "text-gray-400"
                  }`}
              >
                {analysis.isImmune
                  ? "Immune (0x)"
                  : analysis.isResistant
                    ? `Resistant (${analysis.defenseMult}x)`
                    : analysis.defenseMult >= 2
                      ? `Weak (${analysis.defenseMult}x)`
                      : "Neutral"}
              </div>
            </div>

            {/* Level Check */}
            <div
              className={`p-3 rounded-xl border-2 col-span-2 md:col-span-3 ${analysis.levelAdvantage
                ? "bg-green-50 border-green-200"
                : "bg-orange-50 border-orange-200"
                } shadow-sm`}
            >
              <div className="text-[10px] text-black/40 font-black uppercase mb-1 tracking-widest text-center md:text-left">
                Level Comparison
              </div>
              <div
                className={`font-black uppercase tracking-tighter text-sm text-center md:text-left ${analysis.levelAdvantage ? "text-green-600" : "text-orange-600"
                  }`}
              >
                {analysis.levelAdvantage
                  ? `Level ${selectedLevel} (Over boss lvl ${enemyLevel})`
                  : `Needs +${enemyLevel - selectedLevel
                  } levels (Target: ${enemyLevel})`}
              </div>
            </div>
          </div>

          {/* Verdict */}
          <div
            className={`mt-4 p-4 rounded-2xl text-center font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-lg border-2 border-black/10 ${verdict.color}`}
          >
            {verdict.icon}
            <div className="flex flex-col text-left">
              <span className="text-sm">{verdict.label}</span>
              <span className="text-[10px] opacity-90 font-bold tracking-tight">
                {verdict.message}
              </span>
            </div>
          </div>

          {/* Replacement Suggestion */}
          {replacementSuggestion && replacementSuggestion.data && (
            <div className="mt-4 p-4 bg-gray-50 border-2 border-black/10 rounded-2xl shadow-inner">
              <div className="text-[10px] text-gray-400 uppercase font-black mb-3 flex items-center gap-1.5 tracking-widest">
                <ArrowDownCircle size={14} className="text-scarlet" /> Suggested Replacement
              </div>
              <div className="flex items-center gap-4">
                <div className="bg-white p-1 rounded-full border-2 border-black/5 shadow-sm">
                  <img
                    src={
                      replacementSuggestion.data.sprites.other?.[
                        "official-artwork"
                      ].front_default ||
                      replacementSuggestion.data.sprites.front_default
                    }
                    alt={replacementSuggestion.data.name}
                    className="w-12 h-12 object-contain grayscale opacity-60"
                  />
                </div>
                <div className="flex-grow">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-black capitalize font-black text-sm">
                        Replace: {replacementSuggestion.data.name.replace(/-/g, " ")}
                      </span>
                      <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                        Slot {team.findIndex((m) => m.id === replacementSuggestion.id) + 1}
                      </div>
                    </div>
                    {replacementSuggestion.locked && (
                      <span className="flex items-center gap-1 px-2 py-1 bg-black text-white rounded-full text-[9px] font-black uppercase tracking-widest shadow-md">
                        <Lock size={10} /> Locked
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-scarlet font-black uppercase tracking-tighter mt-1">
                    Worst matchup vs {targetType}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Next Best Alternative */}
          {nextBest && (
            <div className="mt-4 bg-blue-50 border-2 border-blue-200 rounded-2xl overflow-hidden shadow-md">
              <div className="px-4 py-2.5 bg-blue-100/50 text-[10px] text-blue-700 uppercase font-black flex items-center gap-1.5 tracking-widest border-b border-blue-200">
                <Crown size={14} className="text-amber-500" /> Next Best Alternative
              </div>
              <button
                onClick={() => setSelectedId(nextBest.id)}
                className="flex items-center gap-4 p-4 hover:bg-white transition-all w-full text-left group"
              >
                <div className="bg-white p-1 rounded-full border-2 border-blue-100 shadow-sm group-hover:scale-110 transition-transform">
                  <img
                    src={
                      nextBest.sprites.other?.["official-artwork"]
                        .front_default || nextBest.sprites.front_default
                    }
                    alt={nextBest.name}
                    className="w-12 h-12 object-contain"
                  />
                </div>
                <div>
                  <div className="text-blue-900 capitalize font-black text-sm group-hover:text-blue-700 transition-colors">
                    Try: {nextBest.name.replace(/-/g, " ")}
                  </div>
                  <div className="text-[10px] text-blue-400 font-bold uppercase tracking-widest mt-0.5">
                    Strong Offensive Counter
                  </div>
                </div>
                <ArrowRight size={16} className="ml-auto text-blue-300 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
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
  const [isCompetitive, setIsCompetitive] = useState(false);
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
      enemyLevel,
      isCompetitive
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
          member.level,
          isCompetitive
        );
        const speedDiff = realMemberSpeed - realEnemySpeed;

        let speedTier: MatchupResult["speedTier"] = "tie";
        if (speedDiff > 0) speedTier = "faster";
        else if (speedDiff < 0) speedTier = "slower";

        // --- Offensive Calculation ---
        const attackTypes = new Set<string>();
        member.data.types.forEach((t) => attackTypes.add(t.type.name));
        if (member.teraType) attackTypes.add(member.teraType);

        let maxMultiplier = 0;
        let bestMoveType = "";

        attackTypes.forEach((atkType) => {
          let mult = getMultiplier(atkType, enemyDefensiveTypes[0]);
          if (enemyDefensiveTypes[1])
            mult *= getMultiplier(atkType, enemyDefensiveTypes[1]);
          if (mult > maxMultiplier) {
            maxMultiplier = mult;
            bestMoveType = atkType;
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
        if (maxMultiplier > highestOffense) {
          highestOffense = maxMultiplier;
          bestOffId = member.id;
        } else if (maxMultiplier === highestOffense && speedDiff > 0) {
          // Tie breaker: Prefer faster Pokemon when offense is equal
          bestOffId = member.id;
        }

        if (catchInfo.score > highestCatchScore) {
          highestCatchScore = catchInfo.score;
          bestCatchId = member.id;
        }

        let message = "Neutral Matchup";
        if (maxMultiplier >= 4) message = "Huge Damage (4x)";
        else if (maxMultiplier >= 2) message = "Super Effective (2x)";
        else if (maxMultiplier < 1) message = "Not Effective";

        return {
          memberId: member.id,
          offensiveScore: maxMultiplier,
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
  }, [enemyData, team, enemyLevel, enemyTera, isCompetitive]);

  const { matchups, bestCounterId, bestCatcherId } = analysisData;

  // Team Weakness Matrix Calc
  const getTeamWeaknesses = () => {
    const weaknesses: { type: string; count: number }[] = [];

    TYPE_NAMES.forEach((type) => {
      let count = 0;
      team.forEach((member) => {
        if (!member.data) return;
        const defTypes = member.data.types.map((t) => t.type.name);
        let mult = getMultiplier(type, defTypes[0]);
        if (defTypes[1]) mult *= getMultiplier(type, defTypes[1]);

        if (mult >= 2) count++;
      });
      if (count >= 2) {
        weaknesses.push({ type, count });
      }
    });
    return weaknesses.sort((a, b) => b.count - a.count);
  };

  const teamWeaknesses = getTeamWeaknesses();

  // Helper for catch button
  const isCaught = enemyData ? caughtPokemon.includes(enemyData.name) : false;

  return (
    <div className="mt-12 bg-white border-4 border-black rounded-3xl p-8 shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-scarlet rounded-bl-full opacity-10 pointer-events-none"></div>

      <h2 className="text-3xl font-black uppercase tracking-tighter text-black mb-8 flex items-center gap-3">
        <div className="w-8 h-8 bg-scarlet border-4 border-black rounded-full flex items-center justify-center relative shadow-md">
          <div className="w-2 h-2 bg-white border-2 border-black rounded-full z-10"></div>
          <div className="absolute top-0 left-0 w-full h-1/2 bg-black opacity-20 rounded-t-full"></div>
        </div>
        Combat Analyzer
      </h2>

      {/* Control Panel */}
      <div className="flex flex-col gap-6 mb-8">
        {/* Boss Preset */}
        <div className="bg-gray-50 border-2 border-black rounded-2xl p-6 shadow-inner">
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
              <div className="text-[10px] text-gray-400 font-bold uppercase mb-1 ml-1">Custom Opponent</div>
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

            <div className="w-28 bg-white border-2 border-black rounded-xl flex flex-col px-3 py-1 justify-center shrink-0 shadow-sm transition-focus focus-within:ring-4 focus-within:ring-scarlet/10">
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
          </div>
          <button
            onClick={handleAnalyze}
            disabled={loading}
            className="bg-scarlet hover:bg-red-600 text-white font-black py-4 px-10 rounded-2xl shadow-lg transform active:scale-95 transition-all flex items-center justify-center gap-2 min-w-[160px] border-b-4 border-red-800 z-10 uppercase tracking-widest text-sm"
          >
            {loading ? <Loader2 className="animate-spin" /> : "Analyze"}
          </button>
        </div>

        {/* Suggest Counter Team Action */}
        {enemyData && enemyTera && (
          <div className="flex justify-end animate-fade-in">
            <button
              onClick={() => onAutoBuildTeam(enemyTera)}
              disabled={isBuilding}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white rounded font-bold shadow-lg transition-transform active:scale-95 text-sm"
            >
              {isBuilding ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                <Zap size={16} />
              )}
              Suggest Best Team vs {enemyTera}
            </button>
          </div>
        )}

        <div className="flex items-center gap-2 bg-gray-100 p-2.5 rounded-2xl self-start border-2 border-black shadow-inner">
          <Zap
            size={16}
            className={isCompetitive ? "text-yellow-500" : "text-gray-400"}
          />
          <span className="text-sm text-black font-black uppercase tracking-tighter">
            Competitive Mode
          </span>
          <button
            onClick={() => setIsCompetitive(!isCompetitive)}
            className={`w-12 h-6 rounded-full relative transition-all duration-300 ${isCompetitive ? "bg-black" : "bg-gray-300"
              }`}
          >
            <div
              className={`w-4 h-4 bg-white rounded-full absolute top-1 shadow-md transition-all duration-300 ${isCompetitive ? "left-7" : "left-1"
                }`}
            />
          </button>
        </div>
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
          <div className="flex items-center gap-8 p-6 bg-white rounded-3xl border-4 border-black mb-8 relative overflow-hidden group shadow-2xl">
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
              {enemyTera && (
                <div className="absolute -bottom-2 -right-2 bg-violet-600 text-[10px] px-2 py-0.5 rounded-full border border-white text-white font-bold uppercase shadow-lg z-20">
                  Tera {enemyTera}
                </div>
              )}
            </div>
            <div className="z-10 flex-grow">
              <div className="flex items-center gap-6">
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
                  <span className="px-2 py-1 rounded text-xs font-black text-white uppercase border-2 border-black/10 shadow-sm"
                    style={{ backgroundColor: TYPE_COLORS[enemyTera] || "#8a2be2" }}
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
                    enemyLevel,
                    isCompetitive
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Results Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
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
                  className={`border-4 ${borderColor} ${bgGlow} ${shadow} bg-white p-5 rounded-2xl flex flex-col gap-2 relative overflow-hidden transition-all hover:shadow-2xl hover:-translate-y-1 block`}
                >
                  {isBestCounter && (
                    <div className="absolute right-0 top-0 bg-amber-500 text-black text-[10px] font-black px-3 py-1 rounded-bl-xl uppercase flex items-center gap-1 shadow-lg z-10 tracking-widest border-b-2 border-l-2 border-black">
                      <Crown size={12} /> BEST COUNTER
                    </div>
                  )}
                  {isBestCatcher && (
                    <div
                      className={`absolute right-0 ${isBestCounter ? "top-8" : "top-0"
                        } bg-blue-500 text-white text-[10px] font-black px-3 py-1 rounded-bl-xl uppercase flex items-center gap-1 shadow-lg z-10 tracking-widest border-b-2 border-l-2 border-black`}
                    >
                      <CircleDot size={12} /> BEST CATCHER
                    </div>
                  )}

                  {matchup.defensiveScore >= 2 && (
                    <div
                      className="absolute right-2 top-8 animate-pulse opacity-50"
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

                  <div className="flex justify-between items-start pr-6 mt-2">
                    <div>
                      <span className="font-black capitalize text-xl block text-black">
                        {member.data.name}
                      </span>
                      <span className="text-xs text-black/40 font-black uppercase tracking-widest">
                        LV {member.level}
                      </span>
                    </div>

                    <div className="flex flex-col items-end">
                      <div className="flex items-center gap-1.5 text-[10px] bg-gray-50 border-2 border-black/5 px-2.5 py-1 rounded-full mb-1 shadow-inner">
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

                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-black/40 text-[10px] font-black uppercase tracking-widest">Best Type:</span>
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
                    className={`mt-2 font-black text-[11px] uppercase tracking-widest ${matchup.offensiveScore >= 2
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
                            {m.replace(/-/g, ' ')}
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
                </div>
              );
            })}
          </div>

          {/* Team Weakness Matrix */}
          {teamWeaknesses.length > 0 && (
            <div className="bg-white border-4 border-black rounded-3xl p-6 shadow-2xl mt-8">
              <h3 className="text-black font-black uppercase text-sm mb-4 flex items-center gap-2 tracking-widest">
                <ShieldAlert size={18} className="text-scarlet" />
                Team Defense Gaps
              </h3>
              <div className="flex flex-wrap gap-3">
                {teamWeaknesses.map((w) => (
                  <div
                    key={w.type}
                    className="flex items-center bg-gray-50 rounded-xl border-2 border-black overflow-hidden shadow-sm"
                  >
                    <span
                      className="px-3 py-1.5 text-xs font-black text-white uppercase shadow-inner"
                      style={{ backgroundColor: TYPE_COLORS[w.type] || "#555" }}
                    >
                      {w.type}
                    </span>
                    <span className="px-3 py-1.5 text-xs text-red-600 font-black uppercase tracking-tighter">
                      {w.count} Weak
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Suggested Counters Row */}
          {enemyTera && caughtPokemon.length > 0 && enemyData && (
            <SuggestedCountersRow
              caughtPokemon={caughtPokemon}
              targetType={enemyTera}
              suggestedCounters={suggestedCounters}
              setSuggestedCounters={setSuggestedCounters}
              loadingSuggestions={loadingSuggestions}
              setLoadingSuggestions={setLoadingSuggestions}
              enemyLevel={enemyLevel}
              enemySpeed={calculateStat(
                enemyData.stats.find((s) => s.stat.name === "speed")
                  ?.base_stat || 0,
                enemyLevel,
                isCompetitive
              )}
              team={team}
            />
          )}
        </div>
      )
      }
    </div >
  );
};

export default AnalysisSection;
