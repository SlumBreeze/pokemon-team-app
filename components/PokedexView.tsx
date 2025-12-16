import React, { useState, useEffect } from 'react';
import { getPaldeaPokedex } from '../services/pokeApi';
import { Loader2, Search, CheckCircle, Wand2 } from 'lucide-react';

interface PokedexViewProps {
  caughtPokemon: string[];
  onToggleCaught: (name: string) => void;
  onAutoBuild: () => void;
  isBuilding: boolean;
}

const PokedexView: React.FC<PokedexViewProps> = ({ caughtPokemon, onToggleCaught, onAutoBuild, isBuilding }) => {
  const [pokedex, setPokedex] = useState<{ name: string; id: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const loadDex = async () => {
      const data = await getPaldeaPokedex();
      setPokedex(data);
      setLoading(false);
    };
    loadDex();
  }, []);

  const filtered = pokedex.filter(p => p.name.includes(search.toLowerCase()));

  // Count caught in current filtered view or total
  const totalCaught = caughtPokemon.length;
  const paldeaCount = pokedex.length;

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-violet-400 mb-1">Paldea Pokedex</h2>
          <p className="text-xs text-gray-400">
            Caught: <span className="text-white font-bold">{totalCaught}</span> / {paldeaCount}
          </p>
        </div>

        <div className="flex gap-4 w-full md:w-auto">
          <div className="relative flex-grow md:flex-grow-0">
             <Search className="absolute left-3 top-2.5 text-gray-500" size={16} />
             <input 
               type="text" 
               placeholder="Search Pokedex..." 
               value={search}
               onChange={(e) => setSearch(e.target.value)}
               className="bg-dark border border-gray-600 rounded-full pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-violet-500 w-full"
             />
          </div>
          
          <button 
            onClick={onAutoBuild}
            disabled={isBuilding || totalCaught === 0}
            className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold shadow-lg transition-all ${isBuilding || totalCaught === 0 ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white active:scale-95'}`}
          >
            {isBuilding ? <Loader2 className="animate-spin" size={18} /> : <Wand2 size={18} />}
            <span className="hidden sm:inline">Suggest Best Team</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-violet-500" size={40} />
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
          {filtered.slice(0, 150).map((p) => { // Render limit for performance
            const isCaught = caughtPokemon.includes(p.name);
            return (
              <button
                key={p.name}
                onClick={() => onToggleCaught(p.name)}
                className={`group relative rounded-lg p-2 flex flex-col items-center gap-2 transition-all duration-200 border ${
                  isCaught 
                    ? 'bg-violet-900/30 border-violet-500 shadow-[0_0_10px_rgba(139,92,246,0.3)]' 
                    : 'bg-card/50 border-gray-800 hover:border-gray-600 hover:bg-card opacity-70 hover:opacity-100'
                }`}
              >
                 <div className="absolute top-1 right-1">
                   {isCaught && <CheckCircle size={14} className="text-green-400 bg-black rounded-full" />}
                 </div>
                 <div className="text-[10px] text-gray-500 font-mono absolute top-1 left-2">#{String(p.id).padStart(3, '0')}</div>
                 
                 <div className="w-16 h-16 mt-2 flex items-center justify-center">
                    <img 
                      src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${p.id}.png`}
                      alt={p.name}
                      className={`w-full h-full object-contain transition-all ${isCaught ? 'filter-none scale-110' : 'grayscale group-hover:grayscale-0'}`}
                      loading="lazy"
                    />
                 </div>
                 <span className="text-[10px] capitalize font-bold text-center truncate w-full">
                    {p.name.replace(/-/g, ' ')}
                 </span>
              </button>
            );
          })}
        </div>
      )}
      
      {!loading && filtered.length === 0 && (
         <div className="text-center py-10 text-gray-500">No Pokemon found.</div>
      )}
    </div>
  );
};

export default PokedexView;