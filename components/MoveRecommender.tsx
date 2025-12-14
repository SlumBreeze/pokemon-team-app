import React, { useState, useEffect } from 'react';
import { MoveInfo } from '../types';
import { fetchMoveType } from '../services/pokeApi';
import { Loader2 } from 'lucide-react';
import { TYPE_COLORS } from '../constants';

interface MoveRecommenderProps {
  moves: MoveInfo[];
  currentLevel: number;
  targetType: string;
}

const MoveRecommender: React.FC<MoveRecommenderProps> = ({ moves, currentLevel, targetType }) => {
  const [recommendedMoves, setRecommendedMoves] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    
    const findMoves = async () => {
      setLoading(true);
      // Filter candidates: Learned at or before current level
      // Limit to 20 most recent to avoid fetching 100 move details
      const candidates = moves
        .filter(m => m.level_learned_at <= currentLevel)
        .slice(0, 15);

      const matches: string[] = [];

      // Check types in parallel
      await Promise.all(candidates.map(async (move) => {
        const type = await fetchMoveType(move.url);
        if (type === targetType) {
          matches.push(move.name);
        }
      }));

      if (isMounted) {
        setRecommendedMoves(matches);
        setLoading(false);
      }
    };

    findMoves();

    return () => { isMounted = false; };
  }, [moves, currentLevel, targetType]);

  if (loading) return <div className="text-[10px] text-gray-500 flex items-center gap-1"><Loader2 size={10} className="animate-spin"/> checking moves...</div>;

  if (recommendedMoves.length === 0) return null;

  return (
    <div className="mt-2 text-xs bg-dark/30 p-2 rounded border border-gray-700">
      <div className="text-gray-400 mb-1 text-[10px] uppercase font-bold">Recommended Moves:</div>
      <div className="flex flex-wrap gap-1">
        {recommendedMoves.map(move => (
          <span key={move} className="px-1.5 py-0.5 rounded bg-gray-700 text-white capitalize border border-gray-600">
            {move.replace(/-/g, ' ')}
          </span>
        ))}
      </div>
    </div>
  );
};

export default MoveRecommender;