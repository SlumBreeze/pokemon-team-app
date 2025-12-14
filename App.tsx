import React, { useState } from 'react';
import TeamSlot from './components/TeamSlot';
import AnalysisSection from './components/AnalysisSection';
import { TeamMember } from './types';

const INITIAL_TEAM: TeamMember[] = Array.from({ length: 6 }, (_, i) => ({
  id: `slot-${i}`,
  data: null,
  selectedAbility: '',
  abilityDescription: '',
  teraType: '',
  heldItem: '',
  heldItemDescription: '',
  level: 50,
  loading: false,
  error: null,
  customName: ''
}));

const App: React.FC = () => {
  const [team, setTeam] = useState<TeamMember[]>(INITIAL_TEAM);

  const updateMember = (index: number, updates: Partial<TeamMember>) => {
    setTeam(prev => prev.map((member, i) => 
      i === index ? { ...member, ...updates } : member
    ));
  };

  const clearMember = (index: number) => {
    setTeam(prev => prev.map((member, i) => 
      i === index ? {
        ...member,
        data: null,
        selectedAbility: '',
        abilityDescription: '',
        teraType: '',
        heldItem: '',
        heldItemDescription: '',
        level: 50,
        loading: false,
        error: null,
        customName: ''
      } : member
    ));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-gray-100 font-sans pb-20">
      {/* Header */}
      <header className="bg-dark/80 backdrop-blur-md border-b border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tighter uppercase bg-clip-text text-transparent bg-gradient-to-r from-scarlet-500 to-violet-500">
              Scarlet<span className="text-white mx-1">&</span>Violet
            </h1>
            <p className="text-xs text-gray-400 tracking-widest uppercase">Team Matchup Analyzer</p>
          </div>
          <div className="hidden md:block text-xs text-gray-500">
            Powered by PokeAPI
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h2 className="text-xl font-bold mb-4 text-violet-400 uppercase tracking-wide flex items-center gap-2">
            <span className="w-2 h-8 bg-violet-600 rounded-full inline-block"></span>
            Build Your Team
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {team.map((member, index) => (
              <TeamSlot 
                key={member.id}
                index={index}
                member={member}
                onUpdate={updateMember}
                onClear={clearMember}
              />
            ))}
          </div>
        </div>

        <AnalysisSection team={team} />
      </main>
      
      <footer className="text-center py-8 text-gray-600 text-sm">
        <p>&copy; {new Date().getFullYear()} Team Analyzer. Pokémon Data provided by PokéAPI.</p>
        <p className="text-xs mt-1">Pokémon and Pokémon character names are trademarks of Nintendo.</p>
      </footer>
    </div>
  );
};

export default App;