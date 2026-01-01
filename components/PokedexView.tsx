import React, { useState, useEffect } from 'react';
import { getPaldeaPokedex } from '../services/pokeApi';
import { Loader2, Search, CheckCircle, Wand2, Download, Sparkles } from 'lucide-react';

interface PokedexViewProps {
  caughtPokemon: string[];
  shinyPokemon: string[];
  onToggleCaught: (name: string) => void;
  onToggleShiny: (name: string) => void;
  isBuilding: boolean;
  onExport: () => void;
}

const PokedexView: React.FC<PokedexViewProps> = ({
  caughtPokemon,
  shinyPokemon,
  onToggleCaught,
  onToggleShiny,
  onAutoBuild,
  isBuilding,
  onExport
}) => {
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
  const totalShiny = shinyPokemon.length;
  const paldeaCount = pokedex.length;

  const handleCardClick = (name: string, e: React.MouseEvent) => {
    // Shift+click or right-click to toggle shiny
    if (e.shiftKey) {
      onToggleShiny(name);
    } else {
      onToggleCaught(name);
    }
  };

  const handleShinyClick = (name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleShiny(name);
  };

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <div>
          <h2 className="text-3xl font-black text-white uppercase tracking-tighter drop-shadow-md">Paldea Pokedex</h2>
          <div className="flex gap-4 mt-1">
            <p className="text-xs text-white/80 font-bold uppercase tracking-widest">
              Collected: <span className="text-white bg-black px-2 py-0.5 rounded">{totalCaught}</span> / {paldeaCount}
            </p>
            {totalShiny > 0 && (
              <p className="text-xs text-yellow-300 font-bold uppercase tracking-widest flex items-center gap-1">
                <Sparkles size={12} className="text-yellow-400" />
                Shinies: <span className="text-white bg-gradient-to-r from-purple-500 to-pink-500 px-2 py-0.5 rounded">{totalShiny}</span>
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-4 w-full md:w-auto">
          <div className="relative flex-grow md:flex-grow-0">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search Collected..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-white dark:bg-dark-card border-2 border-black dark:border-dark-border rounded-xl pl-9 pr-4 py-2 text-sm text-black dark:text-dark-text focus:outline-none focus:ring-4 focus:ring-black/5 w-full font-bold transition-colors duration-200"
            />
          </div>

          <button
            onClick={onAutoBuild}
            disabled={isBuilding || totalCaught === 0}
            className={`flex items-center gap-2 px-6 py-2 rounded-xl font-black uppercase tracking-widest shadow-lg transition-all duration-200 border-b-4 ${isBuilding || totalCaught === 0 ? 'bg-gray-400 border-gray-600 text-gray-200 cursor-not-allowed opacity-50' : 'bg-white dark:bg-dark-card border-gray-200 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-border text-black dark:text-dark-text active:scale-95'}`}
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

      {/* Shiny hint */}
      <div className="mb-4 text-xs text-white/60 font-medium flex items-center gap-2">
        <Sparkles size={12} className="text-yellow-400" />
        <span>Tip: <kbd className="bg-white/20 px-1.5 py-0.5 rounded text-[10px] font-bold">Shift + Click</kbd> to mark as shiny</span>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-violet-500" size={40} />
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
          {filtered.slice(0, 150).map((p) => { // Render limit for performance
            const isCaught = caughtPokemon.includes(p.name);
            const isShiny = shinyPokemon.includes(p.name);
            return (
              <button
                key={p.name}
                onClick={(e) => handleCardClick(p.name, e)}
                className={`group relative rounded-xl p-3 flex flex-col items-center gap-2 transition-all duration-200 border-2 ${isShiny
                    ? 'bg-gradient-to-br from-yellow-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30 border-yellow-400 dark:border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.3)] scale-105 z-10'
                    : isCaught
                      ? 'bg-white dark:bg-dark-card border-black dark:border-dark-border shadow-lg scale-105 z-10'
                      : 'bg-white/40 dark:bg-dark-card/40 border-black/10 dark:border-dark-border/30 hover:border-black/30 dark:hover:border-dark-border opacity-60 hover:opacity-100'
                  }`}
              >
                {/* Status Icons */}
                <div className="absolute top-1.5 right-1.5 z-20 flex gap-1">
                  {isShiny && (
                    <Sparkles size={14} className="text-yellow-500 drop-shadow-sm animate-pulse" />
                  )}
                  {isCaught && !isShiny && (
                    <CheckCircle size={16} className="text-green-500 bg-white rounded-full" />
                  )}
                </div>

                {/* Shiny toggle button (visible on caught cards) */}
                {isCaught && (
                  <button
                    onClick={(e) => handleShinyClick(p.name, e)}
                    className={`absolute top-1.5 left-1.5 z-20 p-1 rounded-full transition-all ${isShiny
                        ? 'bg-yellow-400 text-white shadow-lg'
                        : 'bg-gray-200 dark:bg-dark-border text-gray-400 hover:bg-yellow-100 hover:text-yellow-500'
                      }`}
                    title={isShiny ? "Remove shiny" : "Mark as shiny"}
                  >
                    <Sparkles size={10} />
                  </button>
                )}

                {/* Dex number */}
                {!isCaught && (
                  <div className="text-[10px] text-gray-400 dark:text-dark-text-secondary font-black absolute top-1.5 left-2 uppercase tracking-tighter">
                    #{String(p.id).padStart(3, '0')}
                  </div>
                )}

                <div className={`w-16 h-16 mt-3 flex items-center justify-center p-1 rounded-full border shadow-inner transition-colors duration-200 ${isShiny
                    ? 'bg-gradient-to-br from-yellow-100 to-pink-100 dark:from-purple-800/50 dark:to-pink-800/50 border-yellow-300 dark:border-yellow-600'
                    : 'bg-gray-50/50 dark:bg-dark-border/50 border-black/5 dark:border-dark-border'
                  }`}>
                  <img
                    src={isShiny
                      ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${p.id}.png`
                      : `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${p.id}.png`
                    }
                    alt={p.name}
                    className={`w-full h-full object-contain transition-all duration-300 ${isCaught || isShiny ? 'filter-none scale-125' : 'grayscale group-hover:grayscale-0 group-hover:scale-110'
                      }`}
                    loading="lazy"
                  />
                </div>
                <span className={`text-[10px] capitalize font-black text-center truncate w-full ${isShiny ? 'text-yellow-600 dark:text-yellow-400' : isCaught ? 'text-black dark:text-dark-text' : 'text-gray-500 dark:text-dark-text-secondary'
                  }`}>
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