import React, { useState, useEffect } from 'react';
import { TeamMember, TypeName } from '../types';
import { TYPE_NAMES, TYPE_COLORS } from '../constants';
import { AlertCircle, X, Sparkles } from 'lucide-react';
import { fetchPokemon, fetchAbilityDescription, fetchEvolutionInfo } from '../services/pokeApi';
import AutocompleteInput from './AutocompleteInput';

interface TeamSlotProps {
  index: number;
  member: TeamMember;
  onUpdate: (index: number, updates: Partial<TeamMember>) => void;
  onClear: (index: number) => void;
}

const TeamSlot: React.FC<TeamSlotProps> = ({ index, member, onUpdate, onClear }) => {
  const [inputValue, setInputValue] = useState(member.customName || '');
  
  useEffect(() => {
    setInputValue(member.customName);
  }, [member.customName]);

  const handleSearch = async () => {
    // Determine the name to search: prefer local input value
    // This fixes issues where selecting from dropdown updates state but this function reads old state
    const nameToSearch = inputValue; 

    if (!nameToSearch.trim()) return;

    onUpdate(index, { loading: true, error: null, customName: nameToSearch });

    try {
      const data = await fetchPokemon(nameToSearch);
      
      const defaultAbilityName = data.abilities[0]?.ability.name || '';
      let desc = '';
      if (defaultAbilityName) {
        const abilityData = data.abilities[0];
        desc = await fetchAbilityDescription(abilityData.ability.url);
      }

      // Fetch Evolution Info
      const evoInfo = await fetchEvolutionInfo(data.speciesUrl, data.name);
      
      onUpdate(index, {
        loading: false,
        data: data,
        selectedAbility: defaultAbilityName,
        abilityDescription: desc,
        teraType: data.types[0]?.type.name || 'normal',
        error: null,
        customName: '',
        evolutionDetails: evoInfo
      });
      setInputValue('');
    } catch (err: any) {
      onUpdate(index, {
        loading: false,
        data: null,
        error: err.message || "Not found"
      });
    }
  };

  const clearSlot = () => {
    setInputValue('');
    onClear(index);
  };

  return (
    <div className="bg-card border border-gray-700 rounded-lg p-4 flex flex-col gap-3 relative shadow-lg hover:shadow-xl transition-shadow duration-300 min-h-[220px]">
      <div className="flex justify-between items-center text-gray-400 text-xs font-bold uppercase tracking-wider">
        <span>Slot {index + 1}</span>
        {member.data && (
          <button onClick={clearSlot} className="text-red-400 hover:text-red-300 transition-colors" title="Clear Slot">
            <X size={14} />
          </button>
        )}
      </div>

      <div className="relative z-10"> {/* Higher Z-Index for dropdown */}
        <AutocompleteInput 
          value={inputValue}
          onChange={setInputValue}
          onSubmit={handleSearch}
          placeholder={member.data ? "Replace..." : "Enter Pokémon..."}
          isLoading={member.loading}
          onBlur={() => { if(inputValue && inputValue !== member.customName && !member.data) handleSearch() }}
        />
      </div>

      {member.error && (
        <div className="text-red-400 text-xs flex items-center gap-1">
          <AlertCircle size={12} />
          {member.error}
        </div>
      )}

      {member.data ? (
        <div className="flex flex-col gap-3 animate-fade-in flex-grow">
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 flex-shrink-0 bg-dark/50 rounded-full flex items-center justify-center border border-gray-700 relative">
              <img 
                src={member.data.sprites.other?.["official-artwork"].front_default || member.data.sprites.front_default} 
                alt={member.data.name} 
                className="w-14 h-14 object-contain"
              />
            </div>
            <div className="flex flex-col gap-1 min-w-0 flex-grow">
              <div className="font-bold text-lg capitalize truncate leading-tight flex justify-between">
                {member.data.name}
                <div className="flex items-center bg-dark/50 rounded px-1.5 border border-gray-700">
                    <span className="text-[10px] text-gray-400 mr-1">Lv.</span>
                    <input 
                      type="number" 
                      min="1" 
                      max="100" 
                      value={member.level}
                      onChange={(e) => {
                        let val = parseInt(e.target.value) || 1;
                        if(val > 100) val = 100;
                        if(val < 1) val = 1;
                        onUpdate(index, { level: val });
                      }}
                      className="w-8 bg-transparent text-right text-xs font-mono focus:outline-none text-white"
                    />
                </div>
              </div>
              <div className="flex gap-1 flex-wrap mt-0.5">
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
            </div>
          </div>
          
          {/* Evolution Hint */}
          {member.evolutionDetails && member.evolutionDetails !== "Fully Evolved" && (
            <div className="text-[10px] text-yellow-500 bg-yellow-900/10 border border-yellow-800/30 rounded px-2 py-1 flex items-center gap-1">
                <Sparkles size={10} />
                <span className="capitalize">{member.evolutionDetails}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 mt-auto items-start">
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
            </div>

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
        <div className="flex-1 flex items-center justify-center text-gray-600 text-sm italic">
          Empty Slot
        </div>
      )}
    </div>
  );
};

export default TeamSlot;