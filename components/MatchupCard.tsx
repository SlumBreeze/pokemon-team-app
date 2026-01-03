import React from "react";
import { TeamMember, MatchupResult, PokemonData } from "../types";
import { TYPE_COLORS, RAID_SETUP_MOVES, RAID_SUPPORT_MOVES } from "../constants";
import {
  ArrowUpCircle,
  ArrowDownCircle,
  MinusCircle,
  Crown,
  CircleDot,
  Skull,
  Zap,
  ShieldAlert,
} from "lucide-react";
import MoveRecommender from "./MoveRecommender";

interface MatchupCardProps {
  matchup: MatchupResult & { catchScore: number; catchMoves: string[] };
  member: TeamMember;
  isBestCounter: boolean;
  isBestCatcher: boolean;
  isRaidMode: boolean;
  replacementSuggestion: PokemonData | null;
  enemyTera?: string;
  enemyDefaultType?: string;
}

const MatchupCard: React.FC<MatchupCardProps> = ({
  matchup,
  member,
  isBestCounter,
  isBestCatcher,
  isRaidMode,
  replacementSuggestion,
  enemyTera,
  enemyDefaultType,
}) => {
  if (!member.data) return null;

  let borderColor = "border-gray-600";
  let bgGlow = "";
  let shadow = "";

  // Check for Raid Roles
  const hasSetup = member.data.moves.some((m) =>
    RAID_SETUP_MOVES.includes(m.name)
  );
  const hasSupport = member.data.moves.some((m) =>
    RAID_SUPPORT_MOVES.includes(m.name)
  );

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
      className={`border-4 ${borderColor} ${bgGlow} ${shadow} bg-white dark:bg-dark-card p-2.5 rounded-xl flex flex-col gap-1 relative overflow-hidden transition-all duration-200 hover:shadow-2xl hover:-translate-y-1 block`}
    >
      {isBestCounter && (
        <div className="absolute right-0 top-0 bg-amber-500 text-black text-[9px] font-black px-2 py-0.5 rounded-bl-lg uppercase flex items-center gap-1 shadow-lg z-10 tracking-widest border-b-2 border-l-2 border-black">
          <Crown size={10} /> BEST COUNTER
        </div>
      )}
      {isBestCatcher && (
        <div
          className={`absolute right-0 ${
            isBestCounter ? "top-6" : "top-0"
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
              matchup.defensiveScore >= 4 ? "text-red-500" : "text-orange-500"
            }
          />
        </div>
      )}

      <div className="flex justify-between items-start pr-0 mt-1">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white dark:bg-dark-card rounded-full border-2 border-black dark:border-dark-border shadow-sm flex items-center justify-center overflow-hidden transition-colors duration-200">
            <img
              src={member.data.sprites.front_default}
              alt={member.data.name}
              className="w-10 h-10 object-contain"
            />
          </div>
          <div>
            <span className="font-black capitalize text-base block text-black dark:text-dark-text leading-tight">
              {member.data.name}
            </span>
            <span className="text-[10px] text-black/40 dark:text-dark-text-secondary font-black uppercase tracking-widest">
              LV {member.level}
            </span>
          </div>
        </div>

        {!isRaidMode && (
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-1 text-[9px] bg-gray-50 dark:bg-dark-border border-2 border-black/5 dark:border-dark-border px-2 py-0.5 rounded-full mb-0.5 shadow-inner transition-colors duration-200">
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
                className={`font-black uppercase tracking-widest ${
                  matchup.speedTier === "faster"
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
        )}
      </div>

      {/* Raid Badges */}
      {isRaidMode && (
        <div className="flex gap-1 mt-1 flex-wrap">
          {hasSetup && (
            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-[9px] font-black uppercase rounded border border-purple-200 flex items-center gap-1">
              ⚡ SELF SETUP
            </span>
          )}
          {hasSupport && (
            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[9px] font-black uppercase rounded border border-blue-200 flex items-center gap-1">
              🛡️ TEAM SUPPORT
            </span>
          )}
        </div>
      )}

      <div className="flex items-center gap-1.5 mt-1">
        <span className="text-black/40 dark:text-dark-text-secondary text-[9px] font-black uppercase tracking-widest">
          Best Type:
        </span>
        <span
          className="px-2 py-0.5 rounded text-[10px] font-black text-white uppercase shadow-sm"
          style={{
            backgroundColor: TYPE_COLORS[matchup.bestMoveType] || "#666",
          }}
        >
          {matchup.bestMoveType}
        </span>
      </div>

      <div
        className={`mt-0.5 font-black text-[10px] uppercase tracking-widest ${
          matchup.offensiveScore >= 2
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
          className={`mt-4 pt-3 border-t border-black/5 text-[10px] flex items-center gap-2 font-black tracking-widest ${
            matchup.defensiveScore >= 2 ? "text-red-600" : "text-black/30"
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
              ? isRaidMode
                ? "⛔ UNSAFE FOR RAID"
                : "Takes Super Effective Dmg!"
              : "Takes Neutral Damage."}
          </span>
        </div>
      )}

      {/* Replacement Suggestion - shows when weak to boss */}
      {matchup.defensiveScore >= 2 && replacementSuggestion && (
        <div className="mt-3 bg-amber-50 border-2 border-amber-200 p-3 rounded-xl shadow-inner animate-in slide-in-from-bottom-2">
          <div className="text-[10px] text-amber-900 uppercase font-black mb-2 flex items-center gap-1.5 tracking-widest">
            <Zap size={12} className="text-amber-600" /> Consider Instead
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-white p-1 rounded-full border-2 border-amber-200 shadow-sm">
              <img
                src={
                  replacementSuggestion.sprites.other?.["official-artwork"]
                    .front_default ||
                  replacementSuggestion.sprites.front_default
                }
                alt={replacementSuggestion.name}
                className="w-10 h-10 object-contain"
              />
            </div>
            <div className="flex-grow">
              <div className="font-black text-amber-900 capitalize text-sm">
                {replacementSuggestion.name.replace(/-/g, " ")}
              </div>
              <div className="flex gap-1 mt-1">
                {replacementSuggestion.types.map((t) => (
                  <span
                    key={t.type.name}
                    className="px-1.5 py-0.5 rounded text-[8px] font-black text-white uppercase"
                    style={{
                      backgroundColor: TYPE_COLORS[t.type.name] || "#555",
                    }}
                  >
                    {t.type.name.slice(0, 3)}
                  </span>
                ))}
              </div>
            </div>
            {/* Reason Badge */}
            <div className="flex flex-col items-end gap-1">
              <span className="px-2 py-1 bg-green-100 border border-green-300 text-green-700 rounded-lg text-[10px] font-black uppercase tracking-tight">
                {(replacementSuggestion as any).reason || "Strong Counter"}
              </span>
              <span className="text-[8px] text-amber-500 font-bold">
                vs {enemyTera || enemyDefaultType}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MatchupCard;
