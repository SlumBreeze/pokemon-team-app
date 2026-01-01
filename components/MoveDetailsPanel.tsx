import React, { useState, useEffect } from "react";
import { MoveInfo, MoveDetails } from "../types";
import { fetchMoveDetails } from "../services/pokeApi";
import { TYPE_COLORS } from "../constants";
import { Loader2, Zap, Sparkles, BarChart3, ChevronDown, ChevronUp } from "lucide-react";

interface MoveDetailsPanelProps {
    moves: MoveInfo[];
    currentLevel: number;
}

const MoveDetailsPanel: React.FC<MoveDetailsPanelProps> = ({ moves, currentLevel }) => {
    const [expandedMoves, setExpandedMoves] = useState<Record<string, MoveDetails | null>>({});
    const [loadingMoves, setLoadingMoves] = useState<Record<string, boolean>>({});
    const [isExpanded, setIsExpanded] = useState(false);

    // Filter moves to those learned at or before current level (level-up only)
    const availableMoves = moves
        .filter(m => m.learn_method === "level-up" && m.level_learned_at <= currentLevel && m.level_learned_at > 0)
        .sort((a, b) => b.level_learned_at - a.level_learned_at)
        .slice(0, 8); // Show top 8 most recently learned

    const handleToggleMove = async (move: MoveInfo) => {
        const key = move.name;

        if (expandedMoves[key] !== undefined) {
            // Toggle off
            setExpandedMoves(prev => {
                const next = { ...prev };
                delete next[key];
                return next;
            });
            return;
        }

        // Fetch details
        setLoadingMoves(prev => ({ ...prev, [key]: true }));
        const details = await fetchMoveDetails(move.url);
        setExpandedMoves(prev => ({ ...prev, [key]: details }));
        setLoadingMoves(prev => ({ ...prev, [key]: false }));
    };

    const getDamageClassIcon = (damageClass: string) => {
        switch (damageClass) {
            case 'physical':
                return <Zap size={12} className="text-orange-500" title="Physical" />;
            case 'special':
                return <Sparkles size={12} className="text-purple-500" title="Special" />;
            default:
                return <BarChart3 size={12} className="text-gray-500" title="Status" />;
        }
    };

    const getDamageClassColor = (damageClass: string) => {
        switch (damageClass) {
            case 'physical': return 'bg-orange-100 dark:bg-orange-900/30 border-orange-300 dark:border-orange-700';
            case 'special': return 'bg-purple-100 dark:bg-purple-900/30 border-purple-300 dark:border-purple-700';
            default: return 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600';
        }
    };

    if (availableMoves.length === 0) return null;

    return (
        <div className="mt-3 bg-gray-50 dark:bg-dark-card rounded-xl border-2 border-black/10 dark:border-dark-border shadow-inner transition-colors duration-200 overflow-hidden">
            {/* Header */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-100 dark:hover:bg-dark-border/50 transition-colors"
            >
                <span className="text-[10px] text-gray-500 dark:text-dark-text-secondary uppercase font-black tracking-widest flex items-center gap-2">
                    <Zap size={12} className="text-yellow-500" />
                    Move Breakdown
                    <span className="text-gray-400 dark:text-dark-text-secondary font-normal">
                        ({availableMoves.length} moves at Lv.{currentLevel})
                    </span>
                </span>
                {isExpanded ? (
                    <ChevronUp size={14} className="text-gray-400" />
                ) : (
                    <ChevronDown size={14} className="text-gray-400" />
                )}
            </button>

            {/* Move List */}
            {isExpanded && (
                <div className="px-3 pb-3 space-y-2">
                    {availableMoves.map(move => {
                        const details = expandedMoves[move.name];
                        const isLoading = loadingMoves[move.name];
                        const isOpen = details !== undefined;

                        return (
                            <div
                                key={move.name}
                                className="bg-white dark:bg-dark-border/50 rounded-lg border border-black/5 dark:border-dark-border overflow-hidden transition-all"
                            >
                                {/* Move Header */}
                                <button
                                    onClick={() => handleToggleMove(move)}
                                    className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-50 dark:hover:bg-dark-card transition-colors text-left"
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-black dark:text-dark-text capitalize">
                                            {move.name.replace(/-/g, " ")}
                                        </span>
                                        <span className="text-[9px] text-gray-400 dark:text-dark-text-secondary bg-gray-100 dark:bg-dark-card px-1.5 py-0.5 rounded font-bold">
                                            Lv.{move.level_learned_at}
                                        </span>
                                    </div>
                                    {isLoading ? (
                                        <Loader2 size={12} className="animate-spin text-gray-400" />
                                    ) : (
                                        <ChevronDown
                                            size={12}
                                            className={`text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
                                        />
                                    )}
                                </button>

                                {/* Move Details (Expanded) */}
                                {details && (
                                    <div className="px-3 pb-3 pt-1 border-t border-black/5 dark:border-dark-border">
                                        {/* Type + Class + Stats Row */}
                                        <div className="flex flex-wrap items-center gap-2 mb-2">
                                            {/* Type Badge */}
                                            <span
                                                className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full text-white"
                                                style={{ backgroundColor: TYPE_COLORS[details.type] || '#888' }}
                                            >
                                                {details.type}
                                            </span>

                                            {/* Damage Class */}
                                            <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border flex items-center gap-1 ${getDamageClassColor(details.damageClass)}`}>
                                                {getDamageClassIcon(details.damageClass)}
                                                {details.damageClass}
                                            </span>

                                            {/* Power */}
                                            {details.power !== null && (
                                                <span className="text-[9px] font-bold text-gray-600 dark:text-dark-text-secondary">
                                                    ⚡ {details.power} PWR
                                                </span>
                                            )}

                                            {/* Accuracy */}
                                            {details.accuracy !== null && (
                                                <span className="text-[9px] font-bold text-gray-600 dark:text-dark-text-secondary">
                                                    🎯 {details.accuracy}%
                                                </span>
                                            )}

                                            {/* PP */}
                                            <span className="text-[9px] font-bold text-gray-500 dark:text-dark-text-secondary">
                                                PP: {details.pp}
                                            </span>
                                        </div>

                                        {/* Effect Description */}
                                        <p className="text-[10px] text-gray-600 dark:text-dark-text-secondary leading-relaxed">
                                            {details.effectDescription}
                                        </p>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default MoveDetailsPanel;
