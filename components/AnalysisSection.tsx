import React, { useState } from "react";
import { TeamMember, PokemonData } from "../types";
import { fetchPokemon, getPokemonNames } from "../services/pokeApi";
import { TYPE_COLORS } from "../constants";
import { BOSSES } from "../bosses";
import {
  Loader2,
  ShieldAlert,
  MinusCircle,
  Gauge,
  Map,
  CircleDot,
  CheckCircle,
  PlusCircle,
  Swords,
} from "lucide-react";
import AutocompleteInput from "./AutocompleteInput";
import SuggestedCountersRow from "./SuggestedCountersRow";
import TeamWeaknessMatrix from "./TeamWeaknessMatrix";
import MatchupCard from "./MatchupCard";
import { useCombatAnalysis } from "../hooks/useCombatAnalysis";
import { calculateStat } from "../utils/combatUtils";

interface AnalysisSectionProps {
  team: TeamMember[];
  onBossSelect: (type: string | undefined) => void;
  caughtPokemon: string[];
  onToggleCaught: (name: string) => void;
  onAutoBuildTeam: (startType?: string) => void;
  isBuilding: boolean;
}

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
  const [isRaidMode, setIsRaidMode] = useState(false);

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

  // Use the extracted hook for combat logic
  const { matchups, bestCounterId, bestCatcherId } = useCombatAnalysis(
    team,
    enemyData,
    enemyLevel,
    enemyTera
  );

  // Helper for catch button
  const isCaught = enemyData ? caughtPokemon.includes(enemyData.name) : false;

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
    <div className="mt-12 bg-white dark:bg-dark-card border-4 border-black dark:border-dark-border rounded-3xl p-8 shadow-2xl relative overflow-hidden transition-colors duration-200">
      <div className="absolute top-0 right-0 w-32 h-32 bg-scarlet rounded-bl-full opacity-10 pointer-events-none"></div>

      <h2 className="text-3xl font-black uppercase tracking-tighter text-black dark:text-dark-text mb-4 flex items-center gap-3">
        <div className="w-8 h-8 bg-scarlet border-4 border-black rounded-full flex items-center justify-center relative shadow-md">
          <div className="w-2 h-2 bg-white border-2 border-black rounded-full z-10"></div>
          <div className="absolute top-0 left-0 w-full h-1/2 bg-black opacity-20 rounded-t-full"></div>
        </div>
        Combat Analyzer
      </h2>

      {/* Control Panel */}
      <div className="flex flex-col gap-4 mb-4">
        {/* Boss Preset */}
        <div className="bg-gray-50 dark:bg-dark-card border-2 border-black dark:border-dark-border rounded-2xl p-4 shadow-inner transition-colors duration-200">
          <div className="flex items-center gap-2 text-black dark:text-dark-text font-black uppercase text-xs mb-4">
            <Map size={18} className="text-scarlet" />
            <span>Select Major Encounter:</span>
          </div>
          <select
            onChange={(e) => loadBoss(e.target.value)}
            className="w-full bg-white dark:bg-dark-card border-2 border-black dark:border-dark-border text-black dark:text-dark-text font-bold text-sm rounded-xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-scarlet/10 cursor-pointer transition-colors duration-200"
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
              <div className="text-[10px] text-gray-400 dark:text-dark-text-secondary font-bold uppercase mb-1 ml-1">
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
                className="text-gray-400 dark:text-dark-text-secondary hover:text-black dark:hover:text-dark-text transition-colors duration-200"
              >
                <MinusCircle size={24} />
              </button>
              <div className="w-20 bg-white dark:bg-dark-card border-2 border-black dark:border-dark-border rounded-xl flex flex-col px-3 py-1 justify-center shrink-0 shadow-sm transition-all duration-200 focus-within:ring-4 focus-within:ring-scarlet/10">
                <label className="text-[10px] text-gray-400 dark:text-dark-text-secondary font-black uppercase tracking-tighter">
                  Level
                </label>
                <select
                  value={enemyLevel}
                  onChange={(e) => setEnemyLevel(parseInt(e.target.value))}
                  className="w-full bg-transparent text-black dark:text-dark-text font-black text-lg focus:outline-none cursor-pointer"
                >
                  {Array.from({ length: 100 }, (_, i) => i + 1).map((level) => (
                    <option
                      key={level}
                      value={level}
                      className="bg-white dark:bg-dark-card text-black dark:text-dark-text"
                    >
                      {level}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => setEnemyLevel((l) => Math.min(100, l + 1))}
                className="text-gray-400 dark:text-dark-text-secondary hover:text-black dark:hover:text-dark-text transition-colors duration-200"
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

        {/* Toggle Raid Mode */}
        <div className="flex justify-end mt-2">
          <button
            onClick={() => setIsRaidMode(!isRaidMode)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black text-xs uppercase tracking-wider transition-all duration-200 border-2 shadow-sm ${
              isRaidMode
                ? "bg-purple-600 text-white border-purple-800"
                : "bg-white dark:bg-dark-card text-gray-500 dark:text-dark-text-secondary border-gray-200 dark:border-dark-border hover:border-gray-400 dark:hover:border-gray-400"
            }`}
          >
            <Swords size={16} />
            Tera Raid Mode
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
          <div className="flex items-center gap-4 p-4 bg-white dark:bg-dark-card rounded-3xl border-4 border-black dark:border-dark-border mb-4 relative overflow-hidden group shadow-2xl transition-colors duration-200">
            <div className="absolute right-0 top-0 h-full w-1/2 bg-gradient-to-l from-gray-50 to-transparent pointer-events-none"></div>

            <div className="w-28 h-28 bg-gray-50 dark:bg-dark-card rounded-full flex items-center justify-center border-4 border-black dark:border-dark-border z-10 relative shadow-inner transition-colors duration-200">
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
                <h3 className="text-3xl font-black capitalize text-black dark:text-dark-text flex items-center gap-3">
                  {enemyData.name}
                  <span className="text-sm bg-black text-white px-3 py-1 rounded-full font-bold">
                    Lv. {enemyLevel}
                  </span>
                </h3>

                {/* Catch Button */}
                <button
                  onClick={() => onToggleCaught(enemyData.name)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase shadow-lg transition-all transform active:scale-95 ${
                    isCaught
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
              <div className="mt-3 text-black dark:text-dark-text font-black text-sm flex items-center gap-2 opacity-60 uppercase tracking-tighter">
                <Gauge size={14} className="text-scarlet" />
                Est. Speed:{" "}
                <span className="text-black dark:text-dark-text font-black">
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

              return (
                <MatchupCard
                  key={idx}
                  matchup={matchup}
                  member={member}
                  isBestCounter={matchup.memberId === bestCounterId}
                  isBestCatcher={matchup.memberId === bestCatcherId}
                  isRaidMode={isRaidMode}
                  replacementSuggestion={findReplacementFromSuggested(
                    member.data.name
                  )}
                  enemyTera={enemyTera}
                  enemyDefaultType={enemyData.types[0]?.type.name}
                />
              );
            })}
          </div>

          {/* Team Weakness Matrix */}
          <TeamWeaknessMatrix team={team} />

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
