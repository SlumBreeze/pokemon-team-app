import React, { useState } from 'react';
import { TeamMember, NatureName, StatSpread, PokemonStat } from '../types';
import {
    NATURES,
    STAT_LABELS,
    STAT_COLORS,
    DEFAULT_EVS,
    DEFAULT_IVS,
    calculateStat,
    getNatureMultiplier
} from '../data/natures';
import { ChevronDown, ChevronUp, Sparkles, RotateCcw } from 'lucide-react';

interface StatEditorProps {
    member: TeamMember;
    onUpdate: (updates: Partial<TeamMember>) => void;
}

const STAT_KEYS: (keyof StatSpread)[] = ['hp', 'attack', 'defense', 'specialAttack', 'specialDefense', 'speed'];
const API_STAT_NAMES: Record<string, keyof StatSpread> = {
    'hp': 'hp',
    'attack': 'attack',
    'defense': 'defense',
    'special-attack': 'specialAttack',
    'special-defense': 'specialDefense',
    'speed': 'speed',
};

const StatEditor: React.FC<StatEditorProps> = ({ member, onUpdate }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const evs: StatSpread = { ...DEFAULT_EVS, ...member.evs };
    const ivs: StatSpread = { ...DEFAULT_IVS, ...member.ivs };
    const nature: NatureName = member.nature || 'hardy';

    const totalEvs = evs.hp + evs.attack + evs.defense + evs.specialAttack + evs.specialDefense + evs.speed;
    const maxEvs = 510;

    const updateEv = (stat: keyof StatSpread, value: number) => {
        const newValue = Math.max(0, Math.min(252, value));
        const currentOtherEvs = totalEvs - evs[stat];
        const clampedValue = Math.min(newValue, maxEvs - currentOtherEvs);

        onUpdate({
            evs: { ...evs, [stat]: clampedValue }
        });
    };

    const updateIv = (stat: keyof StatSpread, value: number) => {
        onUpdate({
            ivs: { ...ivs, [stat]: Math.max(0, Math.min(31, value)) }
        });
    };

    const updateNature = (newNature: NatureName) => {
        onUpdate({ nature: newNature });
    };

    const resetStats = () => {
        onUpdate({
            evs: { ...DEFAULT_EVS },
            ivs: { ...DEFAULT_IVS },
            nature: 'hardy'
        });
    };

    // Get base stats from Pokemon data
    const getBaseStat = (statKey: keyof StatSpread): number => {
        if (!member.data?.stats) return 0;
        const apiKey = Object.entries(API_STAT_NAMES).find(([_, v]) => v === statKey)?.[0];
        const stat = member.data.stats.find((s: PokemonStat) => s.stat.name === apiKey);
        return stat?.base_stat || 0;
    };

    // Calculate final stat
    const getFinalStat = (statKey: keyof StatSpread): number => {
        const baseStat = getBaseStat(statKey);
        const iv = ivs[statKey];
        const ev = evs[statKey];
        const isHp = statKey === 'hp';
        const natureMultiplier = isHp ? 1 : getNatureMultiplier(nature, statKey as any);

        return calculateStat(baseStat, iv, ev, member.level, isHp, natureMultiplier);
    };

    const natureEffect = NATURES[nature];

    if (!member.data) return null;

    return (
        <div className="mt-3 bg-gray-50 dark:bg-dark-card rounded-xl border-2 border-black/10 dark:border-dark-border shadow-inner transition-colors duration-200 overflow-hidden">
            {/* Header */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-100 dark:hover:bg-dark-border/50 transition-colors"
            >
                <span className="text-[10px] text-gray-500 dark:text-dark-text-secondary uppercase font-black tracking-widest flex items-center gap-2">
                    <Sparkles size={12} className="text-purple-500" />
                    Stats & Training
                    <span className="text-gray-400 dark:text-dark-text-secondary font-normal">
                        ({totalEvs}/{maxEvs} EVs)
                    </span>
                </span>
                {isExpanded ? (
                    <ChevronUp size={14} className="text-gray-400" />
                ) : (
                    <ChevronDown size={14} className="text-gray-400" />
                )}
            </button>

            {isExpanded && (
                <div className="px-3 pb-3 space-y-3">
                    {/* Nature Selector */}
                    <div className="flex items-center gap-2">
                        <label className="text-[10px] text-gray-500 dark:text-dark-text-secondary uppercase font-bold">Nature:</label>
                        <select
                            value={nature}
                            onChange={(e) => updateNature(e.target.value as NatureName)}
                            className="flex-1 bg-white dark:bg-dark-border border-2 border-black/10 dark:border-dark-border rounded-lg px-2 py-1 text-xs font-bold capitalize focus:outline-none focus:ring-2 focus:ring-purple-500/20 cursor-pointer"
                        >
                            {Object.keys(NATURES).map((n) => {
                                const effect = NATURES[n as NatureName];
                                let label = n.charAt(0).toUpperCase() + n.slice(1);
                                if (effect.up && effect.down) {
                                    label += ` (+${STAT_LABELS[effect.up]} -${STAT_LABELS[effect.down]})`;
                                }
                                return (
                                    <option key={n} value={n}>{label}</option>
                                );
                            })}
                        </select>
                        <button
                            onClick={resetStats}
                            className="p-1.5 rounded-lg bg-gray-200 dark:bg-dark-border hover:bg-gray-300 dark:hover:bg-dark-card transition-colors"
                            title="Reset to defaults"
                        >
                            <RotateCcw size={12} className="text-gray-500" />
                        </button>
                    </div>

                    {/* EV Progress Bar */}
                    <div className="relative h-2 bg-gray-200 dark:bg-dark-border rounded-full overflow-hidden">
                        <div
                            className="absolute inset-y-0 left-0 bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
                            style={{ width: `${(totalEvs / maxEvs) * 100}%` }}
                        />
                    </div>

                    {/* Stat Grid */}
                    <div className="grid gap-2">
                        {STAT_KEYS.map((statKey) => {
                            const baseStat = getBaseStat(statKey);
                            const finalStat = getFinalStat(statKey);
                            const isBuffed = natureEffect.up === statKey;
                            const isNerfed = natureEffect.down === statKey;

                            return (
                                <div key={statKey} className="flex items-center gap-2 bg-white dark:bg-dark-border/50 rounded-lg p-2 border border-black/5 dark:border-dark-border">
                                    {/* Stat Label */}
                                    <div
                                        className="w-10 text-[10px] font-black uppercase"
                                        style={{ color: STAT_COLORS[statKey] }}
                                    >
                                        {STAT_LABELS[statKey]}
                                        {isBuffed && <span className="text-green-500">↑</span>}
                                        {isNerfed && <span className="text-red-500">↓</span>}
                                    </div>

                                    {/* Base Stat */}
                                    <div className="w-8 text-[10px] text-gray-400 text-center font-mono">
                                        {baseStat}
                                    </div>

                                    {/* IV Input */}
                                    <div className="flex items-center gap-1">
                                        <span className="text-[8px] text-gray-400 uppercase">IV</span>
                                        <input
                                            type="number"
                                            min={0}
                                            max={31}
                                            value={ivs[statKey]}
                                            onChange={(e) => updateIv(statKey, parseInt(e.target.value) || 0)}
                                            className="w-10 bg-gray-100 dark:bg-dark-card border border-black/10 dark:border-dark-border rounded px-1 py-0.5 text-[10px] font-mono text-center focus:outline-none focus:ring-1 focus:ring-purple-500"
                                        />
                                    </div>

                                    {/* EV Slider */}
                                    <div className="flex-1 flex items-center gap-1">
                                        <span className="text-[8px] text-gray-400 uppercase">EV</span>
                                        <input
                                            type="range"
                                            min={0}
                                            max={252}
                                            step={4}
                                            value={evs[statKey]}
                                            onChange={(e) => updateEv(statKey, parseInt(e.target.value))}
                                            className="flex-1 h-1.5 accent-purple-500"
                                        />
                                        <input
                                            type="number"
                                            min={0}
                                            max={252}
                                            step={4}
                                            value={evs[statKey]}
                                            onChange={(e) => updateEv(statKey, parseInt(e.target.value) || 0)}
                                            className="w-10 bg-gray-100 dark:bg-dark-card border border-black/10 dark:border-dark-border rounded px-1 py-0.5 text-[10px] font-mono text-center focus:outline-none focus:ring-1 focus:ring-purple-500"
                                        />
                                    </div>

                                    {/* Final Stat */}
                                    <div
                                        className={`w-10 text-xs font-black text-right ${isBuffed ? 'text-green-600' : isNerfed ? 'text-red-500' : 'text-gray-700 dark:text-dark-text'
                                            }`}
                                    >
                                        {finalStat}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Quick EV Presets */}
                    <div className="flex flex-wrap gap-1">
                        <span className="text-[9px] text-gray-400 uppercase font-bold mr-1">Presets:</span>
                        <button
                            onClick={() => onUpdate({ evs: { hp: 252, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 252 } })}
                            className="px-2 py-0.5 text-[9px] font-bold bg-gray-200 dark:bg-dark-border hover:bg-gray-300 dark:hover:bg-dark-card rounded transition-colors"
                        >
                            Fast Sweep
                        </button>
                        <button
                            onClick={() => onUpdate({ evs: { hp: 252, attack: 0, defense: 252, specialAttack: 0, specialDefense: 0, speed: 0 } })}
                            className="px-2 py-0.5 text-[9px] font-bold bg-gray-200 dark:bg-dark-border hover:bg-gray-300 dark:hover:bg-dark-card rounded transition-colors"
                        >
                            Physical Wall
                        </button>
                        <button
                            onClick={() => onUpdate({ evs: { hp: 252, attack: 0, defense: 0, specialAttack: 0, specialDefense: 252, speed: 0 } })}
                            className="px-2 py-0.5 text-[9px] font-bold bg-gray-200 dark:bg-dark-border hover:bg-gray-300 dark:hover:bg-dark-card rounded transition-colors"
                        >
                            Special Wall
                        </button>
                        <button
                            onClick={() => onUpdate({ evs: { hp: 4, attack: 252, defense: 0, specialAttack: 0, specialDefense: 0, speed: 252 } })}
                            className="px-2 py-0.5 text-[9px] font-bold bg-gray-200 dark:bg-dark-border hover:bg-gray-300 dark:hover:bg-dark-card rounded transition-colors"
                        >
                            Physical Sweep
                        </button>
                        <button
                            onClick={() => onUpdate({ evs: { hp: 4, attack: 0, defense: 0, specialAttack: 252, specialDefense: 0, speed: 252 } })}
                            className="px-2 py-0.5 text-[9px] font-bold bg-gray-200 dark:bg-dark-border hover:bg-gray-300 dark:hover:bg-dark-card rounded transition-colors"
                        >
                            Special Sweep
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StatEditor;
