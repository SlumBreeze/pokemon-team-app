import React, { useState, useEffect, useRef } from 'react';
import TeamSlot from './components/TeamSlot';
import AnalysisSection from './components/AnalysisSection';
import PokedexView from './components/PokedexView';
import { TeamMember } from './types';
import { fetchPokemon } from './services/pokeApi';
import { generateBestTeam } from './utils/teamOptimizer';
import { Save, Upload, LayoutGrid, Users } from 'lucide-react';

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
  customName: '',
  locked: false
}));

interface AppState {
  team: TeamMember[];
  caughtPokemon: string[];
}

const App: React.FC = () => {
  // --- Global State ---
  const [activeTab, setActiveTab] = useState<'builder' | 'pokedex'>('builder');
  const [team, setTeam] = useState<TeamMember[]>(INITIAL_TEAM);
  const [caughtPokemon, setCaughtPokemon] = useState<string[]>([]);
  const [isAutoBuilding, setIsAutoBuilding] = useState(false);
  const [targetBossType, setTargetBossType] = useState<string | undefined>(undefined);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Persistence ---
  useEffect(() => {
    // Load state on mount
    try {
      const saved = localStorage.getItem('sv-team-analyzer-v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Handle migration from v1 (which was just the team array)
        if (Array.isArray(parsed)) {
            setTeam(parsed);
        } else {
            if (parsed.team) setTeam(parsed.team);
            if (parsed.caughtPokemon) setCaughtPokemon(parsed.caughtPokemon);
        }
      }
    } catch (e) {
      console.error("Failed to load save data", e);
    }
  }, []);

  useEffect(() => {
    // Save state on change
    try {
      const stateToSave: AppState = { team, caughtPokemon };
      localStorage.setItem('sv-team-analyzer-v2', JSON.stringify(stateToSave));
    } catch (e) {
      console.error("Failed to save data", e);
    }
  }, [team, caughtPokemon]);

  // --- Team Management ---
  const updateMember = (index: number, updates: Partial<TeamMember>) => {
    setTeam(prev => prev.map((member, i) => 
      i === index ? { ...member, ...updates } : member
    ));
  };

  const toggleLock = (index: number) => {
    setTeam(prev => prev.map((member, i) => 
        i === index ? { ...member, locked: !member.locked } : member
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
        customName: '',
        locked: false
      } : member
    ));
  };

  // --- Pokedex Logic ---
  const toggleCaught = (name: string) => {
    setCaughtPokemon(prev => {
        if (prev.includes(name)) return prev.filter(n => n !== name);
        return [...prev, name];
    });
  };

  const handleAutoBuild = async () => {
    if (caughtPokemon.length === 0) return;
    setIsAutoBuilding(true);
    
    try {
        const bestTeamNames = await generateBestTeam(caughtPokemon, team, targetBossType);
        
        const newTeam = [...team];
        // List of names to distribute into unlocked slots
        // We must subtract the locked mons that are staying in place to avoid duplication
        const namesToDistribute = [...bestTeamNames];
        
        team.forEach(member => {
            if (member.locked && member.data) {
                 const idx = namesToDistribute.indexOf(member.data.name);
                 if (idx > -1) {
                     namesToDistribute.splice(idx, 1);
                 }
            }
        });

        for (let i = 0; i < 6; i++) {
             if (!newTeam[i].locked) {
                 if (namesToDistribute.length > 0) {
                     const name = namesToDistribute.shift()!;
                     const data = await fetchPokemon(name);
                     newTeam[i] = {
                         ...INITIAL_TEAM[i],
                         id: newTeam[i].id, // Keep slot ID
                         data: data,
                         teraType: data.types[0].type.name,
                         selectedAbility: data.abilities[0]?.ability.name || '',
                         loading: false,
                         locked: false
                     };
                 } else {
                     // Clear slot if no more mons
                     newTeam[i] = { ...INITIAL_TEAM[i], id: newTeam[i].id, locked: false }; 
                 }
             }
        }
        setTeam(newTeam);
        setActiveTab('builder'); // Switch back to view result
    } catch (e) {
        console.error("Auto build failed", e);
    } finally {
        setIsAutoBuilding(false);
    }
  };

  // --- Save System ---
  const handleExport = () => {
    const data = JSON.stringify({ team, caughtPokemon }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pokemon-team-sv-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const parsed = JSON.parse(event.target?.result as string);
            if (parsed.team && Array.isArray(parsed.team)) setTeam(parsed.team);
            if (parsed.caughtPokemon && Array.isArray(parsed.caughtPokemon)) setCaughtPokemon(parsed.caughtPokemon);
            alert("Save file imported successfully!");
        } catch (err) {
            alert("Failed to parse save file.");
        }
    };
    reader.readAsText(file);
    // Reset input
    e.target.value = '';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-gray-100 font-sans pb-20">
      <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".json" />

      {/* Header */}
      <header className="bg-dark/80 backdrop-blur-md border-b border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-black tracking-tighter uppercase bg-clip-text text-transparent bg-gradient-to-r from-scarlet-500 to-violet-500">
                        Scarlet<span className="text-white mx-1">&</span>Violet
                        </h1>
                        <p className="text-[10px] text-gray-400 tracking-widest uppercase">Trainer Hub & Team Analyzer</p>
                    </div>
                </div>

                {/* Navigation Tabs */}
                <div className="flex bg-black/40 rounded-full p-1 border border-gray-700">
                    <button 
                        onClick={() => setActiveTab('builder')}
                        className={`flex items-center gap-2 px-6 py-2 rounded-full text-sm font-bold transition-all ${activeTab === 'builder' ? 'bg-scarlet-600 text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                    >
                        <Users size={16} /> Team Builder
                    </button>
                    <button 
                        onClick={() => setActiveTab('pokedex')}
                        className={`flex items-center gap-2 px-6 py-2 rounded-full text-sm font-bold transition-all ${activeTab === 'pokedex' ? 'bg-violet-600 text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                    >
                        <LayoutGrid size={16} /> My Pokedex
                    </button>
                </div>

                {/* Save Tools */}
                <div className="flex items-center gap-2">
                    <button onClick={handleImportClick} className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors" title="Import Save">
                        <Upload size={18} />
                    </button>
                    <button onClick={handleExport} className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors" title="Export Save">
                        <Save size={18} />
                    </button>
                </div>
            </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        
        {activeTab === 'builder' && (
            <div className="animate-in slide-in-from-left-4 duration-300">
                <div className="mb-6">
                    <h2 className="text-xl font-bold mb-4 text-scarlet-400 uppercase tracking-wide flex items-center gap-2">
                        <span className="w-2 h-8 bg-scarlet-600 rounded-full inline-block"></span>
                        Current Team
                    </h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {team.map((member, index) => (
                        <TeamSlot 
                            key={member.id}
                            index={index}
                            member={member}
                            onUpdate={updateMember}
                            onClear={clearMember}
                            onToggleLock={toggleLock}
                        />
                        ))}
                    </div>
                </div>
                <AnalysisSection 
                    team={team} 
                    onBossSelect={setTargetBossType}
                    caughtPokemon={caughtPokemon}
                    onToggleCaught={toggleCaught}
                />
            </div>
        )}

        {activeTab === 'pokedex' && (
            <div className="animate-in slide-in-from-right-4 duration-300">
                 <PokedexView 
                    caughtPokemon={caughtPokemon} 
                    onToggleCaught={toggleCaught} 
                    onAutoBuild={handleAutoBuild}
                    isBuilding={isAutoBuilding}
                 />
            </div>
        )}
      </main>
      
      <footer className="text-center py-8 text-gray-600 text-sm">
        <p>&copy; {new Date().getFullYear()} Team Analyzer. Pokémon Data provided by PokéAPI.</p>
        <p className="text-xs mt-1">Pokémon and Pokémon character names are trademarks of Nintendo.</p>
      </footer>
    </div>
  );
};

export default App;