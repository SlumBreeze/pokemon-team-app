import React, { useState, useEffect } from "react";
import { PokemonData, TeamMember } from "../types";
import { fetchPokemon } from "../services/pokeApi";
import { getMultiplier } from "../constants";
import { ShieldAlert, Crown, Sword, Gauge, Zap, MinusCircle } from "lucide-react";

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
      try {
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
      } catch (error) {
        console.error("Error fetching counter suggestions:", error);
        setSuggestedCounters([]);
      } finally {
        setLoadingSuggestions(false);
      }
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

export default SuggestedCountersRow;
