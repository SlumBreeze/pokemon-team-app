import React, { useState, useEffect } from 'react';
import { TeamMember, PokemonData, MatchupResult, Boss } from '../types';
import { fetchPokemon } from '../services/pokeApi';
import { TYPE_COLORS, TYPE_NAMES, getMultiplier } from '../constants';
import { BOSSES } from '../bosses';
import { Loader2, Sword, ShieldAlert, ArrowUpCircle, ArrowDownCircle, MinusCircle, Gauge, Skull, Zap, Map } from 'lucide-react';
import MoveRecommender from './MoveRecommender';
import AutocompleteInput from './AutocompleteInput';

interface AnalysisSectionProps {
  team: TeamMember[];
}

const calculateStat = (base: number, level: number, isCompetitive: boolean): number => {
  if (isCompetitive) {
    const stat = Math.floor((((2 * base + 31 + 63) * level) / 100) + 5);
    return Math.floor(stat * 1.1);
  }
  return Math.floor(((2 * base + 31) * level) / 100) + 5;
};

const AnalysisSection: React.FC<AnalysisSectionProps> = ({ team }) => {
  const [enemyName, setEnemyName] = useState('');
  const [enemyLevel, setEnemyLevel] = useState(20);
  const [enemyTera, setEnemyTera] = useState<string>(''); // For bosses
  const [isCompetitive, setIsCompetitive] = useState(false);
  const [enemyData, setEnemyData] = useState<PokemonData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Trigger analysis when enemyName changes if it was a selection (handled by caller logic usually, but here we can listen)
  // Actually, handleAnalyze should be called manually or via submit
  
  const handleAnalyze = async () => {
    // Force use of current state enemyName
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

  const loadBoss = (bossName: string) => {
    const boss = BOSSES.find(b => b.name === bossName);
    if (!boss) return;
    setEnemyName(boss.ace);
    setEnemyLevel(boss.level);
    setEnemyTera(boss.tera);
    
    // Auto-fetch boss
    fetchBossData(boss.ace);
  };

  const fetchBossData = async (name: string) => {
    setLoading(true);
    setEnemyData(null); // Clear previous
    try {
        const data = await fetchPokemon(name);
        setEnemyData(data);
    } catch (e: any) {
        setError("Could not load boss data");
    } finally {
        setLoading(false);
    }
  };

  const calculateMatchups = (enemy: PokemonData): MatchupResult[] => {
    // If it's a boss with a known Tera, we assume they have Terastallized for defensive calc.
    const enemyDefensiveTypes = enemyTera ? [enemyTera] : enemy.types.map(t => t.type.name);
    
    // For Offensive calc (Enemy attacking us), we usually check their base types.
    // However, if they are Tera'd, they might have Tera Blast.
    // For simplicity in this tool, we assume the enemy attacks with their base types + tera type.
    const enemyAttackTypes = new Set<string>();
    enemy.types.forEach(t => enemyAttackTypes.add(t.type.name));
    if (enemyTera) enemyAttackTypes.add(enemyTera);

    const enemyBaseSpeed = enemy.stats.find(s => s.stat.name === 'speed')?.base_stat || 0;
    const realEnemySpeed = calculateStat(enemyBaseSpeed, enemyLevel, isCompetitive);

    return team.map(member => {
      if (!member.data) return null;

      // Speed Calc
      const memberBaseSpeed = member.data.stats.find(s => s.stat.name === 'speed')?.base_stat || 0;
      const realMemberSpeed = calculateStat(memberBaseSpeed, member.level, isCompetitive);
      const speedDiff = realMemberSpeed - realEnemySpeed;
      
      let speedTier: MatchupResult['speedTier'] = 'tie';
      if (speedDiff > 0) speedTier = 'faster';
      else if (speedDiff < 0) speedTier = 'slower';

      // --- Offensive Calculation (Me vs Enemy Defense) ---
      const attackTypes = new Set<string>();
      member.data.types.forEach(t => attackTypes.add(t.type.name));
      if (member.teraType) attackTypes.add(member.teraType);

      let maxMultiplier = 0;
      let bestMoveType = '';

      attackTypes.forEach(atkType => {
        let mult = getMultiplier(atkType, enemyDefensiveTypes[0]);
        if (enemyDefensiveTypes[1]) {
          mult *= getMultiplier(atkType, enemyDefensiveTypes[1]);
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

      // --- Defensive Calculation (Enemy vs Me) ---
      const isTeraDefensivelyActive = member.teraType && member.teraType !== member.data.types[0].type.name;
      const myDefensiveTypes = isTeraDefensivelyActive 
        ? [member.teraType]
        : member.data.types.map(t => t.type.name);

      let maxIncomingDamage = 0;

      enemyAttackTypes.forEach(enemyType => {
        let mult = getMultiplier(enemyType, myDefensiveTypes[0]);
        if (myDefensiveTypes[1]) {
          mult *= getMultiplier(enemyType, myDefensiveTypes[1]);
        }
        if (mult > maxIncomingDamage) maxIncomingDamage = mult;
      });

      return {
        memberId: member.id,
        offensiveScore: maxMultiplier,
        defensiveScore: maxIncomingDamage,
        bestMoveType,
        speedDiff,
        speedTier,
        message,
        mySpeed: realMemberSpeed,
        enemySpeed: realEnemySpeed
      };
    }).filter(Boolean) as MatchupResult[];
  };

  const matchups = enemyData ? calculateMatchups(enemyData) : [];

  // Team Weakness Matrix Calc
  const getTeamWeaknesses = () => {
    const weaknesses: {type: string, count: number}[] = [];
    
    TYPE_NAMES.forEach(type => {
        let count = 0;
        team.forEach(member => {
            if (!member.data) return;
            // Use base types for team overview usually, as Tera is situational
            const defTypes = member.data.types.map(t => t.type.name);
            let mult = getMultiplier(type, defTypes[0]);
            if (defTypes[1]) mult *= getMultiplier(type, defTypes[1]);
            
            if (mult >= 2) count++;
        });
        if (count >= 2) { // Show warning if 2 or more members are weak
            weaknesses.push({ type, count });
        }
    });
    return weaknesses.sort((a,b) => b.count - a.count);
  };

  const teamWeaknesses = getTeamWeaknesses();

  return (
    <div className="mt-8 bg-[#222] border-t-4 border-scarlet-600 rounded-lg p-6 shadow-2xl">
      <h2 className="text-2xl font-bold uppercase tracking-widest text-white mb-6 flex items-center gap-3">
        <Sword className="text-scarlet-500" />
        Combat Analysis
      </h2>

      {/* Control Panel */}
      <div className="flex flex-col gap-4 mb-8">
        
        {/* Boss Preset */}
        <div className="bg-dark/50 p-3 rounded-lg border border-gray-700 flex flex-col md:flex-row gap-3 items-center">
            <div className="flex items-center gap-2 text-violet-400 font-bold uppercase text-sm">
                <Map size={18} />
                <span>Campaign Boss:</span>
            </div>
            <select 
                onChange={(e) => loadBoss(e.target.value)}
                className="flex-grow bg-dark border border-gray-600 text-white text-sm rounded px-3 py-2 focus:outline-none focus:border-violet-500"
            >
                <option value="">-- Select a Gym Leader / Boss --</option>
                {BOSSES.map(b => (
                    <option key={b.name} value={b.name}>{b.label} (Lv {b.level})</option>
                ))}
            </select>
        </div>

        <div className="flex flex-col md:flex-row gap-4 items-stretch">
           <div className="relative flex-grow flex gap-2 z-20">
             <div className="flex-grow">
                 <AutocompleteInput 
                    value={enemyName}
                    onChange={(val) => {
                        setEnemyName(val);
                        setEnemyTera(''); // Clear tera if manual typing
                    }}
                    onSubmit={handleAnalyze}
                    placeholder="Or enter Custom Opponent..."
                    isLoading={loading}
                 />
             </div>
            
            <div className="w-24 bg-dark border border-gray-600 rounded flex flex-col px-2 py-1 justify-center shrink-0">
              <label className="text-[10px] text-gray-400 uppercase font-bold">Level</label>
              <input 
                type="number" 
                value={enemyLevel} 
                min="1" max="100"
                onChange={(e) => {
                   let val = parseInt(e.target.value) || 20;
                   if(val > 100) val = 100;
                   if(val < 1) val = 1;
                   setEnemyLevel(val);
                }}
                className="w-full bg-transparent text-white font-mono text-lg focus:outline-none"
              />
            </div>
          </div>
          <button 
            onClick={handleAnalyze}
            disabled={loading}
            className="bg-gradient-to-r from-scarlet-600 to-red-700 hover:from-scarlet-500 hover:to-red-600 text-white font-bold py-3 px-8 rounded shadow-lg transform active:scale-95 transition-all flex items-center justify-center gap-2 min-w-[140px] z-10"
          >
            {loading ? <Loader2 className="animate-spin" /> : 'ANALYZE'}
          </button>
        </div>

        <div className="flex items-center gap-2 bg-dark/50 p-2 rounded-lg self-start border border-gray-700">
           <Zap size={16} className={isCompetitive ? "text-yellow-400" : "text-gray-500"} />
           <span className="text-sm text-gray-300 font-bold uppercase">Competitive Mode</span>
           <button 
             onClick={() => setIsCompetitive(!isCompetitive)}
             className={`w-10 h-5 rounded-full relative transition-colors duration-200 ease-in-out ${isCompetitive ? 'bg-violet-600' : 'bg-gray-600'}`}
           >
             <div className={`w-3 h-3 bg-white rounded-full absolute top-1 transition-all duration-200 ${isCompetitive ? 'left-6' : 'left-1'}`} />
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
          <div className="flex items-center gap-6 p-4 bg-dark rounded-lg border border-gray-700 mb-6 relative overflow-hidden">
             <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-red-900/20 to-transparent pointer-events-none"></div>

             <div className="w-24 h-24 bg-gray-800 rounded-full flex items-center justify-center border-2 border-gray-600 z-10 relative">
               <img 
                 src={enemyData.sprites.other?.["official-artwork"].front_default || enemyData.sprites.front_default} 
                 alt={enemyData.name} 
                 className="w-20 h-20 object-contain"
               />
               {enemyTera && (
                   <div className="absolute -bottom-2 -right-2 bg-violet-600 text-[10px] px-2 py-0.5 rounded-full border border-white text-white font-bold uppercase shadow-lg z-20">
                       Tera {enemyTera}
                   </div>
               )}
             </div>
             <div className="z-10">
                <h3 className="text-2xl font-bold capitalize text-white flex items-center gap-2">
                  {enemyData.name}
                  <span className="text-sm bg-gray-700 px-2 py-0.5 rounded text-gray-300">Lv. {enemyLevel}</span>
                </h3>
                <div className="flex gap-2 mt-2">
                  {enemyData.types.map(t => (
                    <span 
                      key={t.type.name}
                      className="px-2 py-1 rounded text-xs font-bold text-white uppercase"
                      style={{ backgroundColor: TYPE_COLORS[t.type.name] || '#555' }}
                    >
                      {t.type.name}
                    </span>
                  ))}
                  {enemyTera && (
                      <span className="px-2 py-1 rounded text-xs font-bold text-white uppercase border border-violet-500 bg-violet-900/50">
                          Tera: {enemyTera}
                      </span>
                  )}
                </div>
                <div className="mt-2 text-gray-400 font-mono text-sm flex items-center gap-2">
                  <Gauge size={14} />
                  Est. Speed: <span className="text-white font-bold">{calculateStat(enemyData.stats.find(s => s.stat.name === 'speed')?.base_stat || 0, enemyLevel, isCompetitive)}</span>
                </div>
             </div>
          </div>

          {/* Results Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {matchups.map((matchup, idx) => {
              const member = team.find(m => m.id === matchup.memberId);
              if (!member?.data) return null;

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
                <div key={idx} className={`border-l-4 ${borderColor} ${bgGlow} bg-card p-4 rounded r-0 flex flex-col gap-2 relative overflow-hidden transition-all hover:bg-[#333]`}>
                  
                  {matchup.defensiveScore >= 2 && (
                     <div className="absolute right-2 top-2 animate-pulse" title="Opponent has super effective moves!">
                       <Skull size={20} className={matchup.defensiveScore >= 4 ? "text-red-500" : "text-orange-500"} />
                     </div>
                  )}

                  <div className="flex justify-between items-start pr-6">
                    <div>
                      <span className="font-bold capitalize text-lg block">{member.data.name}</span>
                      <span className="text-xs text-gray-500">Lv. {member.level}</span>
                    </div>
                    
                    <div className="flex flex-col items-end">
                      <div className="flex items-center gap-1 text-xs bg-dark/50 px-2 py-1 rounded mb-1">
                        {matchup.speedTier === 'faster' && <ArrowUpCircle size={14} className="text-green-500" />}
                        {matchup.speedTier === 'slower' && <ArrowDownCircle size={14} className="text-red-500" />}
                        {matchup.speedTier === 'tie' && <MinusCircle size={14} className="text-yellow-500" />}
                        <span className={`font-bold ${matchup.speedTier === 'faster' ? 'text-green-400' : matchup.speedTier === 'slower' ? 'text-red-400' : 'text-yellow-400'}`}>
                          {matchup.speedTier === 'faster' ? 'Faster' : matchup.speedTier === 'slower' ? 'Slower' : 'Tie'}
                        </span>
                      </div>
                      <span className="text-[10px] text-gray-500 font-mono">
                        {matchup.mySpeed} vs {matchup.enemySpeed}
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

                  <div className={`mt-1 font-bold text-sm ${matchup.offensiveScore >= 2 ? 'text-green-400' : matchup.offensiveScore < 1 ? 'text-red-400' : 'text-gray-300'}`}>
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

                  {matchup.defensiveScore >= 1 && (
                    <div className={`mt-3 pt-2 border-t border-white/5 text-xs flex items-center gap-2 ${matchup.defensiveScore >= 2 ? 'text-red-400' : 'text-gray-400'}`}>
                      {matchup.defensiveScore >= 2 ? <ShieldAlert size={14} /> : <div className="w-3" />}
                      <span>
                        {matchup.defensiveScore >= 4 ? "Takes 4x Damage!" : 
                         matchup.defensiveScore >= 2 ? "Takes Super Effective Dmg!" : 
                         "Takes Neutral Damage."}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Team Weakness Matrix */}
          {teamWeaknesses.length > 0 && (
             <div className="bg-red-900/10 border border-red-900/30 rounded p-4">
                 <h3 className="text-red-400 font-bold uppercase text-xs mb-3 flex items-center gap-2">
                     <ShieldAlert size={16} />
                     Team Defense Gaps (Shared Weaknesses)
                 </h3>
                 <div className="flex flex-wrap gap-2">
                     {teamWeaknesses.map(w => (
                         <div key={w.type} className="flex items-center bg-dark/80 rounded border border-gray-700 overflow-hidden">
                             <span 
                               className="px-2 py-1 text-[10px] font-bold text-white uppercase"
                               style={{ backgroundColor: TYPE_COLORS[w.type] || '#555' }}
                             >
                               {w.type}
                             </span>
                             <span className="px-2 py-1 text-xs text-red-300 font-bold">
                                 {w.count} Weak
                             </span>
                         </div>
                     ))}
                 </div>
             </div>
          )}

        </div>
      )}
    </div>
  );
};

export default AnalysisSection;