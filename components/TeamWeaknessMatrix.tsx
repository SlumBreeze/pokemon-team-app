import React, { useMemo } from "react";
import { TeamMember } from "../types";
import { TYPE_NAMES, TYPE_COLORS, getMultiplier } from "../constants";
import { ShieldAlert } from "lucide-react";

interface TeamWeaknessMatrixProps {
  team: TeamMember[];
}

const TeamWeaknessMatrix: React.FC<TeamWeaknessMatrixProps> = ({ team }) => {
  const teamWeaknesses = useMemo(() => {
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
  }, [team]);

  if (teamWeaknesses.length === 0) return null;

  return (
    <div className="bg-white dark:bg-dark-card border-4 border-black dark:border-dark-border rounded-3xl p-6 shadow-2xl mt-4 transition-colors duration-200">
      <div className="mb-4 border-b-2 border-black/5 pb-2">
        <h3 className="text-black dark:text-dark-text font-black uppercase text-lg flex items-center gap-2 tracking-widest">
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
            className="flex flex-col bg-gray-50 dark:bg-dark-card rounded-xl border-2 border-black dark:border-dark-border overflow-hidden shadow-sm transition-all duration-200 hover:shadow-md"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 bg-white dark:bg-dark-card border-b-2 border-black/5 dark:border-dark-border transition-colors duration-200">
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
            <div className="flex items-center gap-2 p-3 bg-gray-50/50 dark:bg-dark-border/50 flex-wrap transition-colors duration-200">
              {w.members.map((m) => (
                <div
                  key={m.id}
                  className="w-8 h-8 bg-white dark:bg-dark-card rounded-full border border-black/10 dark:border-dark-border flex items-center justify-center shadow-sm relative group cursor-help transition-colors duration-200"
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
  );
};

export default TeamWeaknessMatrix;
