import React, { useState } from 'react';
import { TeamMember, PokemonData, MatchupResult } from '../types';
import { fetchPokemon } from '../services/pokeApi';
import { TYPE_COLORS, getMultiplier } from '../constants';
import { Search, Loader2, Sword, ShieldAlert, ArrowUpCircle, ArrowDownCircle, MinusCircle } from 'lucide-react';

interface AnalysisSectionProps {
  team: TeamMember[];
}

const AnalysisSection: React.FC<AnalysisSectionProps> = ({ team }) => {
  const [enemyName, setEnemyName] = useState('');
  const [enemyData, setEnemyData] = useState<PokemonData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!enemyName.trim()) return;
    setLoading(true);
    setError(null);
    setEnemyData(null);

    try {
      const data = await fetchPokemon(enemyName);
      setEnemyData(data);
    } catch (err: any) {
      setError(err.message || "Opponent not found");
    } finally {
      setLoading(false);
    }
  };

  const calculateMatchups = (enemy: PokemonData): MatchupResult[] => {
    const enemyTypes = enemy.types.map(t => t.type.name);
    const enemySpeed = enemy.stats.find(s => s.stat.name === 'speed')?.base_stat || 0;

    return team.map(member => {
      if (!member.data) return null;

      const memberSpeed = member.data.stats.find(s => s.stat.name === 'speed')?.base_stat || 0;
      const speedDiff = memberSpeed - enemySpeed;
      
      let speedTier: MatchupResult['speedTier'] = 'tie';
      if (speedDiff > 5) speedTier = 'faster';
      else if (speedDiff < -5) speedTier = 'slower';

      // Offensive Calculation
      // We check all the user's base types + their Tera type
      const attackTypes = new Set<string>();
      member.data.types.forEach(t => attackTypes.add(t.type.name));
      if (member.teraType) attackTypes.add(member.teraType);

      let maxMultiplier = 0;
      let bestMoveType = '';

      attackTypes.forEach(atkType => {
        let mult = getMultiplier(atkType, enemyTypes[0]);
        if (enemyTypes[1]) {
          mult *= getMultiplier(atkType, enemyTypes[1]);
        }
        
        if (mult > maxMultiplier) {
          maxMultiplier = mult;
          bestMoveType = atkType;
        }
      });

      let message = "Neutral Matchup";
      if (maxMultiplier >= 4) message = "Huge Damage (4x)";
      else if (maxMultiplier >= 2) message = "Super Effective (2x)";
      else if (maxMultiplier < 1) message = "Not Effective";

      return {
        memberId: member.id,
        offensiveScore: maxMultiplier,
        bestMoveType,
        speedDiff,
        speedTier,
        message
      };
    }).filter(Boolean) as MatchupResult[];
  };

  const matchups = enemyData ? calculateMatchups(enemyData) : [];

  return (
    <div className="mt-8 bg-[#222] border-t-4 border-scarlet-600 rounded-lg p-6 shadow-2xl">
      <h2 className="text-2xl font-bold uppercase tracking-widest text-white mb-6 flex items-center gap-3">
        <Sword className="text-scarlet-500" />
        Combat Analysis
      </h2>

      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="relative flex-grow">
           <input 
            type="text"
            value={enemyName}
            onChange={(e) => setEnemyName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
            placeholder="Enter Opponent Name (e.g. Garchomp)..."
            className="w-full bg-dark border border-gray-600 rounded-l px-4 py-3 text-white focus:outline-none focus:border-scarlet-500 text-lg placeholder-gray-600"
          />
        </div>
        <button 
          onClick={handleAnalyze}
          disabled={loading}
          className="bg-gradient-to-r from-scarlet-600 to-red-700 hover:from-scarlet-500 hover:to-red-600 text-white font-bold py-3 px-8 rounded shadow-lg transform active:scale-95 transition-all flex items-center justify-center gap-2 min-w-[160px]"
        >
          {loading ? <Loader2 className="animate-spin" /> : 'ANALYZE'}
        </button>
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
          <div className="flex items-center gap-6 p-4 bg-dark rounded-lg border border-gray-700 mb-6">
             <div className="w-24 h-24 bg-gray-800 rounded-full flex items-center justify-center border-2 border-gray-600">
               <img 
                 src={enemyData.sprites.other?.["official-artwork"].front_default || enemyData.sprites.front_default} 
                 alt={enemyData.name} 
                 className="w-20 h-20 object-contain"
               />
             </div>
             <div>
                <h3 className="text-2xl font-bold capitalize text-white">{enemyData.name}</h3>
                <div className="flex gap-2 mt-2">
                  {enemyData.types.map(t => (
                    <span 
                      key={t.type.name}
                      className="px-2 py-1 rounded text-xs font-bold text-white uppercase"
                      style={{ backgroundColor: TYPE_COLORS[t.type.name] }}
                    >
                      {t.type.name}
                    </span>
                  ))}
                </div>
                <div className="mt-2 text-gray-400 font-mono text-sm">
                  Base Speed: <span className="text-white">{enemyData.stats.find(s => s.stat.name === 'speed')?.base_stat}</span>
                </div>
             </div>
          </div>

          {/* Results Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {matchups.map((matchup, idx) => {
              const member = team.find(m => m.id === matchup.memberId);
              if (!member?.data) return null;

              // Determine card styling based on effectiveness
              let borderColor = 'border-gray-600';
              let bgGlow = '';
              
              if (matchup.offensiveScore >= 4) {
                 borderColor = 'border-green-500';
                 bgGlow = 'bg-green-900/10';
              } else if (matchup.offensiveScore >= 2) {
                 borderColor = 'border-green-600';
                 bgGlow = 'bg-green-900/5';
              } else if (matchup.offensiveScore < 1) {
                 borderColor = 'border-red-600';
                 bgGlow = 'bg-red-900/5';
              }

              return (
                <div key={idx} className={`border-l-4 ${borderColor} ${bgGlow} bg-card p-4 rounded r-0 flex flex-col gap-2 relative overflow-hidden`}>
                  <div className="flex justify-between items-start">
                    <span className="font-bold capitalize text-lg">{member.data.name}</span>
                    <div className="flex items-center gap-1 text-xs bg-dark/50 px-2 py-1 rounded">
                      {matchup.speedTier === 'faster' && <ArrowUpCircle size={14} className="text-green-500" />}
                      {matchup.speedTier === 'slower' && <ArrowDownCircle size={14} className="text-red-500" />}
                      {matchup.speedTier === 'tie' && <MinusCircle size={14} className="text-yellow-500" />}
                      <span className={matchup.speedTier === 'faster' ? 'text-green-400' : matchup.speedTier === 'slower' ? 'text-red-400' : 'text-yellow-400'}>
                        {matchup.speedTier === 'faster' ? 'Faster' : matchup.speedTier === 'slower' ? 'Slower' : 'Speed Tie'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-gray-400 text-sm">Best Type:</span>
                    <span 
                      className="px-2 py-0.5 rounded text-[10px] font-bold text-white uppercase"
                      style={{ backgroundColor: TYPE_COLORS[matchup.bestMoveType] || '#666' }}
                    >
                      {matchup.bestMoveType}
                    </span>
                  </div>

                  <div className={`mt-2 font-bold text-sm ${matchup.offensiveScore >= 2 ? 'text-green-400' : matchup.offensiveScore < 1 ? 'text-red-400' : 'text-gray-300'}`}>
                    {matchup.message}
                  </div>
                </div>
              );
            })}
            
            {matchups.length === 0 && (
              <div className="col-span-full text-center py-8 text-gray-500 italic">
                Add Pokémon to your team to see analysis results.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalysisSection;
