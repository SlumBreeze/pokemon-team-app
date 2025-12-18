import React, { useState, useEffect } from 'react';
import { getPaldeaPokedex } from '../services/pokeApi';
import { Loader2, Search, CheckCircle, Wand2, Download } from 'lucide-react';

interface PokedexViewProps {
  caughtPokemon: string[];
  onToggleCaught: (name: string) => void;
  isBuilding: boolean;
  onExport: () => void;
}

const PokedexView: React.FC<PokedexViewProps> = ({ caughtPokemon, onToggleCaught, onAutoBuild, isBuilding, onExport }) => {
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
          <h2 className="text-3xl font-black text-white uppercase tracking-tighter drop-shadow-md">Paldea Pokedex</h2>
          <p className="text-xs text-white/80 font-bold uppercase tracking-widest mt-1">
            Collected: <span className="text-white bg-black px-2 py-0.5 rounded">{totalCaught}</span> / {paldeaCount}
          </p>
        </div>

        <div className="flex gap-4 w-full md:w-auto">
          <div className="relative flex-grow md:flex-grow-0">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search Collected..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-white border-2 border-black rounded-xl pl-9 pr-4 py-2 text-sm text-black focus:outline-none focus:ring-4 focus:ring-black/5 w-full font-bold"
            />
          </div>

          <button
            onClick={onAutoBuild}
            disabled={isBuilding || totalCaught === 0}
            className={`flex items-center gap-2 px-6 py-2 rounded-xl font-black uppercase tracking-widest shadow-lg transition-all border-b-4 ${isBuilding || totalCaught === 0 ? 'bg-gray-400 border-gray-600 text-gray-200 cursor-not-allowed opacity-50' : 'bg-white border-gray-200 hover:bg-gray-50 text-black active:scale-95'}`}
            title="Auto-Build Best team from Caught Pokemon"
          >
            {isBuilding ? <Loader2 className="animate-spin" size={18} /> : <Wand2 size={18} className="text-scarlet" />}
            <span className="hidden sm:inline">Auto Build</span>
          </button>

          <button
            onClick={onExport}
            disabled={totalCaught === 0}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black uppercase tracking-widest shadow-lg transition-all border-b-4 ${totalCaught === 0 ? 'bg-gray-400 border-gray-600 text-gray-200 cursor-not-allowed opacity-50' : 'bg-black border-black/20 hover:bg-gray-900 text-white active:scale-95'}`}
            title="Export Pokedex as JSON (Share with others or LLMs)"
          >
            <Download size={18} className="text-white" />
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
                className={`group relative rounded-xl p-3 flex flex-col items-center gap-2 transition-all duration-200 border-2 ${isCaught
                  ? 'bg-white border-black shadow-lg scale-105 z-10'
                  : 'bg-white/40 border-black/10 hover:border-black/30 opacity-60 hover:opacity-100'
                  }`}
              >
                <div className="absolute top-1.5 right-1.5 z-20">
                  {isCaught && <CheckCircle size={16} className="text-green-500 bg-white rounded-full" />}
                </div>
                <div className="text-[10px] text-gray-400 font-black absolute top-1.5 left-2 uppercase tracking-tighter">#{String(p.id).padStart(3, '0')}</div>

                <div className="w-16 h-16 mt-3 flex items-center justify-center p-1 bg-gray-50/50 rounded-full border border-black/5 shadow-inner">
                  <img
                    src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${p.id}.png`}
                    alt={p.name}
                    className={`w-full h-full object-contain transition-all duration-300 ${isCaught ? 'filter-none scale-125' : 'grayscale group-hover:grayscale-0 group-hover:scale-110'}`}
                    loading="lazy"
                  />
                </div>
                <span className={`text-[10px] capitalize font-black text-center truncate w-full ${isCaught ? 'text-black' : 'text-gray-500'}`}>
                  {p.name.replace(/-/g, ' ')}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {!loading && filtered.length > 150 && (
        <div className="text-center py-2 text-gray-500 text-sm">Showing 150 of {filtered.length} results. Refine your search to see more.</div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="text-center py-10 text-gray-500">No Pokemon found.</div>
      )}
    </div>
  );
};

export default PokedexView;