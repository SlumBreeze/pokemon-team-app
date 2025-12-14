import React, { useState, useEffect } from 'react';
import { TeamMember, TypeName } from '../types';
import { TYPE_NAMES, TYPE_COLORS } from '../constants';
import { Search, Loader2, AlertCircle, X } from 'lucide-react';
import { fetchPokemon, fetchAbilityDescription } from '../services/pokeApi';

interface TeamSlotProps {
  index: number;
  member: TeamMember;
  onUpdate: (index: number, updates: Partial<TeamMember>) => void;
  onClear: (index: number) => void;
}

const TeamSlot: React.FC<TeamSlotProps> = ({ index, member, onUpdate, onClear }) => {
  const [inputValue, setInputValue] = useState(member.customName || '');
  
  // Sync input value if parent updates it (e.g. initial load)
  useEffect(() => {
    setInputValue(member.customName);
  }, [member.customName]);

  const handleSearch = async () => {
    if (!inputValue.trim()) return;

    onUpdate(index, { loading: true, error: null, customName: inputValue });

    try {
      const data = await fetchPokemon(inputValue);
      
      // Fetch ability description for the default (first) ability
      const defaultAbilityName = data.abilities[0]?.ability.name || '';
      let desc = '';
      if (defaultAbilityName) {
        const abilityData = data.abilities[0];
        desc = await fetchAbilityDescription(abilityData.ability.url);
      }
      
      onUpdate(index, {
        loading: false,
        data: data,
        selectedAbility: defaultAbilityName,
        abilityDescription: desc,
        teraType: data.types[0]?.type.name || 'normal',
        error: null
      });
    } catch (err: any) {
      onUpdate(index, {
        loading: false,
        data: null,
        error: err.message || "Not found"
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const clearSlot = () => {
    setInputValue('');
    onClear(index);
  };

  const getStat = (name: string) => {
    return member.data?.stats.find(s => s.stat.name === name)?.base_stat || 0;
  };

  return (
    <div className="bg-card border border-gray-700 rounded-lg p-4 flex flex-col gap-3 relative shadow-lg hover:shadow-xl transition-shadow duration-300">
      <div className="flex justify-between items-center text-gray-400 text-xs font-bold uppercase tracking-wider">
        <span>Slot {index + 1}</span>
        {member.data && (
          <button 
            onClick={clearSlot}
            className="text-red-400 hover:text-red-300 transition-colors"
            title="Clear Slot"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Input Area */}
      <div className="relative">
        <input 
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => { if(inputValue !== member.customName) handleSearch() }}
          placeholder="Enter Pokémon..."
          className="w-full bg-dark border border-gray-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500 transition-colors pr-8"
        />
        <div className="absolute right-2 top-2.5 text-gray-500">
          {member.loading ? (
            <Loader2 size={16} className="animate-spin text-violet-500" />
          ) : (
            <Search size={16} className="cursor-pointer hover:text-white" onClick={handleSearch} />
          )}
        </div>
      </div>

      {member.error && (
        <div className="text-red-400 text-xs flex items-center gap-1">
          <AlertCircle size={12} />
          {member.error}
        </div>
      )}

      {/* Pokemon Data Display */}
      {member.data ? (
        <div className="flex flex-col gap-3 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 flex-shrink-0 bg-dark/50 rounded-full flex items-center justify-center border border-gray-700">
              <img 
                src={member.data.sprites.other?.["official-artwork"].front_default || member.data.sprites.front_default} 
                alt={member.data.name} 
                className="w-14 h-14 object-contain"
              />
            </div>
            <div className="flex flex-col gap-1 min-w-0">
              <div className="font-bold text-lg capitalize truncate leading-tight">{member.data.name}</div>
              <div className="flex gap-1 flex-wrap">
                {member.data.types.map(t => (
                  <span 
                    key={t.type.name} 
                    className="px-1.5 py-0.5 rounded text-[10px] font-bold text-white shadow-sm uppercase tracking-wide"
                    style={{ backgroundColor: TYPE_COLORS[t.type.name] || '#777' }}
                  >
                    {t.type.name}
                  </span>
                ))}
              </div>
              <div className="text-xs text-gray-400">Spd: <span className="text-white font-mono">{getStat('speed')}</span></div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-1 items-start">
            {/* Ability Select */}
            <div className="flex flex-col">
              <label className="block text-[10px] text-gray-500 uppercase mb-1">Ability</label>
              <select 
                value={member.selectedAbility}
                onChange={async (e) => {
                  const newAbility = e.target.value;
                  onUpdate(index, { selectedAbility: newAbility, abilityDescription: 'Loading...' });
                  
                  const abilityData = member.data?.abilities.find(a => a.ability.name === newAbility);
                  if (abilityData) {
                    const desc = await fetchAbilityDescription(abilityData.ability.url);
                    onUpdate(index, { selectedAbility: newAbility, abilityDescription: desc });
                  }
                }}
                className="w-full bg-dark/50 border border-gray-700 rounded px-2 py-1 text-xs text-gray-200 focus:outline-none focus:border-violet-500 capitalize"
              >
                {member.data.abilities.map(a => (
                  <option key={a.ability.name} value={a.ability.name}>
                    {a.ability.name.replace(/-/g, ' ')} {a.is_hidden ? '(H)' : ''}
                  </option>
                ))}
              </select>
              {member.abilityDescription && (
                <div className="mt-1.5 p-1.5 bg-black/20 rounded border border-white/5 text-[10px] text-gray-400 leading-snug">
                  {member.abilityDescription}
                </div>
              )}
            </div>

            {/* Tera Type Select */}
            <div>
              <label className="block text-[10px] text-gray-500 uppercase mb-1">Tera Type</label>
              <select 
                value={member.teraType}
                onChange={(e) => onUpdate(index, { teraType: e.target.value })}
                className="w-full bg-dark/50 border border-gray-700 rounded px-2 py-1 text-xs text-gray-200 focus:outline-none focus:border-scarlet-500 capitalize"
              >
                {TYPE_NAMES.map(t => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-gray-600 text-sm italic min-h-[100px]">
          Empty Slot
        </div>
      )}
    </div>
  );
};

export default TeamSlot;