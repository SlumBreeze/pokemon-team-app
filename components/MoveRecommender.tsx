import React, { useState, useEffect } from 'react';
import { MoveInfo } from '../types';
import { fetchMoveType } from '../services/pokeApi';
import { Loader2 } from 'lucide-react';

interface MoveRecommenderProps {
  moves: MoveInfo[];
  currentLevel: number;
  targetType: string;
}

const MoveRecommender: React.FC<MoveRecommenderProps> = ({ moves, currentLevel, targetType }) => {
  const [recommendedMoves, setRecommendedMoves] = useState<{ name: string, level: number }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const findMoves = async () => {
      setLoading(true);
      // Filter candidates: Learned at or before current level
      // Limit to 15 most recent to avoid fetching too many details
      const candidates = moves
        .filter(m => m.level_learned_at <= currentLevel)
        .slice(0, 15);

      const matches: { name: string, level: number }[] = [];

      // Check types in parallel
      await Promise.all(candidates.map(async (move) => {
        const type = await fetchMoveType(move.url);
        if (type === targetType) {
          matches.push({ name: move.name, level: move.level_learned_at });
        }
      }));

      if (isMounted) {
        // Sort matches by level descending (highest level moves first)
        matches.sort((a, b) => b.level - a.level);
        setRecommendedMoves(matches);
        setLoading(false);
      }
    };

    findMoves();

    return () => { isMounted = false; };
  }, [moves, currentLevel, targetType]);

  if (loading && recommendedMoves.length === 0) return <div className="text-[10px] text-gray-500 flex items-center gap-1 mt-2"><Loader2 size={10} className="animate-spin" /> checking moves...</div>;

  if (recommendedMoves.length === 0) return null;

  return (
    <div className="mt-2 text-xs bg-gray-50 p-2.5 rounded-xl border-2 border-black/10 shadow-inner">
      <div className="text-gray-400 mb-1.5 text-[10px] uppercase font-black tracking-widest flex justify-between">
        <span>Recommended Moves</span>
        {loading && <Loader2 size={10} className="animate-spin text-scarlet" />}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {recommendedMoves.map(move => (
          <span key={move.name} className="px-2 py-1 rounded-lg bg-white text-black capitalize border-2 border-black/5 shadow-sm text-[10px] font-bold flex items-center gap-1.5 transition-all">
            {move.name.replace(/-/g, ' ')}
            <span className="text-[8px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded-full font-black uppercase">Lvl {move.level}</span>
          </span>
        ))}
      </div>
    </div>
  );
};

export default MoveRecommender;