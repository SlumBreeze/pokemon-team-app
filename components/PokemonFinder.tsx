import React, { useState } from "react";
import {
  Search,
  MapPin,
  Loader2,
  AlertCircle,
  HelpCircle,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import AutocompleteInput from "./AutocompleteInput";
import {
  fetchPokemon,
  getPokemonNames,
  fetchEncounterLocations,
} from "../services/pokeApi";
import { PokemonData } from "../types";
import { TYPE_COLORS } from "../constants";

const PokemonFinder: React.FC = () => {
  const [inputValue, setInputValue] = useState("");
  const [pokemon, setPokemon] = useState<PokemonData | null>(null);
  const [locations, setLocations] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (overrideName?: string) => {
    const nameToSearch =
      typeof overrideName === "string" ? overrideName : inputValue;
    if (!nameToSearch.trim()) return;

    if (nameToSearch !== inputValue) setInputValue(nameToSearch);

    setLoading(true);
    setError(null);
    setPokemon(null);
    setLocations([]);

    try {
      const data = await fetchPokemon(nameToSearch);
      setPokemon(data);
      setLoading(false);

      // Now fetch locations
      setLocationLoading(true);
      const locs = await fetchEncounterLocations(
        data.location_area_encounters,
        data.name
      );
      setLocations(locs);
      setLocationLoading(false);
    } catch (err: any) {
      setError(err.message || "Pokemon not found");
      setLoading(false);
      setLocationLoading(false);
    }
  };

  // Safe color getter
  const getPrimaryColor = () => {
    if (!pokemon || !pokemon.types.length) return "#777777";
    return TYPE_COLORS[pokemon.types[0].type.name] || "#777777";
  };

  return (
    <div className="animate-in slide-in-from-right-4 duration-500 ease-out p-4">
      <div
        className="relative overflow-hidden rounded-[2rem] shadow-2xl min-h-[600px] transition-all duration-500 border border-white/20"
        style={{
          background: "linear-gradient(145deg, #ffffff 0%, #f0f0f0 100%)",
        }}
      >
        {/* Dynamic Background Blob */}
        {pokemon && (
          <div
            className="absolute -top-[20%] -right-[20%] w-[80%] h-[80%] rounded-full blur-3xl opacity-20 pointer-events-none transition-colors duration-1000"
            style={{ backgroundColor: getPrimaryColor() }}
          />
        )}

        {/* Header / Search Area */}
        <div className="relative z-10 p-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
            <div className="flex items-center gap-3">
              <div className="bg-black text-white p-2.5 rounded-xl shadow-lg">
                <MapPin size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-black uppercase tracking-tighter text-black leading-none">
                  Paldea Locator
                </h2>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                  Scarlet & Violet Database
                </p>
              </div>
            </div>

            <div className="w-full md:w-auto md:min-w-[320px] relative">
              <AutocompleteInput
                value={inputValue}
                onChange={setInputValue}
                onSubmit={handleSearch}
                fetchData={getPokemonNames}
                placeholder="PROTOCOL: ENTER SPECIES NAME..."
                isLoading={loading}
              />
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 bg-red-100/50 backdrop-blur-md border border-red-200 text-red-600 px-6 py-4 rounded-2xl flex items-center gap-3 font-bold animate-in fade-in shadow-sm">
              <AlertCircle size={20} />
              {error}
            </div>
          )}

          {/* Main Content Card */}
          {pokemon ? (
            <div className="bg-white/60 backdrop-blur-xl border border-white/50 rounded-3xl p-8 shadow-xl animate-in zoom-in-95 duration-500 flex flex-col lg:flex-row gap-10 relative overflow-hidden group">
              {/* Decorative Sideline */}
              <div
                className="absolute left-0 top-0 bottom-0 w-2 transition-colors duration-500"
                style={{ backgroundColor: getPrimaryColor() }}
              />

              {/* Column 1: Hero Identity */}
              <div className="flex-shrink-0 flex flex-col items-center lg:items-start w-full lg:w-72 gap-6 relative z-10">
                <div className="relative group-hover:scale-105 transition-transform duration-500 ease-out">
                  <div className="absolute inset-0 bg-black/5 rounded-full blur-2xl transform scale-90 translate-y-4"></div>
                  <img
                    src={
                      pokemon.sprites.other?.["official-artwork"]
                        .front_default || pokemon.sprites.front_default
                    }
                    alt={pokemon.name}
                    className="w-64 h-64 object-contain drop-shadow-2xl relative z-10"
                  />
                  {/* Number Badge */}
                  <div className="absolute -bottom-4 right-4 bg-black/80 backdrop-blur text-white text-xs font-black px-3 py-1 rounded-full border border-white/20 shadow-lg z-20">
                    #{String(pokemon.id).padStart(4, "0")}
                  </div>
                </div>

                <div className="text-center lg:text-left w-full">
                  <h1 className="text-4xl font-black capitalize text-black mb-3 tracking-tight">
                    {pokemon.name.replace(/-/g, " ")}
                  </h1>
                  <div className="flex flex-wrap gap-2 justify-center lg:justify-start">
                    {pokemon.types.map((t) => (
                      <span
                        key={t.type.name}
                        className="px-4 py-1.5 rounded-lg text-xs font-black text-white uppercase shadow-md tracking-wider transform hover:-translate-y-0.5 transition-transform"
                        style={{
                          backgroundColor: TYPE_COLORS[t.type.name] || "#777",
                          textShadow: "0 1px 2px rgba(0,0,0,0.2)",
                        }}
                      >
                        {t.type.name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Column 2: Stats (Compact) */}
              <div className="w-full lg:w-64 flex flex-col justify-center">
                <h3 className="text-xs font-black uppercase text-gray-400 mb-4 tracking-widest flex items-center gap-2">
                  <div className="h-px bg-gray-300 flex-1"></div>
                  Base Stats
                  <div className="h-px bg-gray-300 flex-1"></div>
                </h3>
                <div className="space-y-3">
                  {pokemon.stats.map((stat) => {
                    const shortName: Record<string, string> = {
                      hp: "HP",
                      attack: "ATK",
                      defense: "DEF",
                      "special-attack": "SPA",
                      "special-defense": "SPD",
                      speed: "SPE",
                    };
                    const val = stat.base_stat;
                    const percent = Math.min((val / 200) * 100, 100);
                    const color =
                      val >= 100
                        ? "#10b981"
                        : val >= 70
                        ? "#f59e0b"
                        : "#ef4444"; // emerald, amber, red

                    return (
                      <div key={stat.stat.name} className="group/stat">
                        <div className="flex justify-between text-[10px] font-bold uppercase text-gray-500 mb-1">
                          <span>{shortName[stat.stat.name]}</span>
                          <span className="text-black">{val}</span>
                        </div>
                        <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden shadow-inner">
                          <div
                            className="h-full rounded-full transition-all duration-1000 ease-out"
                            style={{
                              width: `${percent}%`,
                              backgroundColor: color,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Column 3: Locations (Grid) */}
              <div className="flex-1 min-w-0 bg-white/40 rounded-2xl p-6 border border-white/60 shadow-inner flex flex-col">
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-scarlet text-white p-2 rounded-lg shadow-sm">
                    <MapPin size={18} strokeWidth={2.5} />
                  </div>
                  <h3 className="text-lg font-black uppercase text-gray-800 tracking-tight">
                    Encounters
                  </h3>
                </div>

                <div className="flex-1 overflow-hidden relative">
                  {locationLoading ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 animate-pulse">
                      <Loader2 className="animate-spin mb-2" size={32} />
                      <span className="text-xs font-bold uppercase tracking-widest">
                        Scanning Map...
                      </span>
                    </div>
                  ) : locations.length > 0 ? (
                    <div className="h-full overflow-y-auto pr-2 custom-scrollbar">
                      <div className="flex flex-wrap gap-2">
                        {locations.map((loc) => (
                          <div
                            key={loc}
                            className="bg-white hover:bg-scarlet hover:text-white border border-gray-150 px-3 py-2 rounded-lg text-xs font-bold text-gray-600 shadow-sm transition-all duration-200 cursor-default select-none"
                          >
                            {loc}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center p-4 opacity-60">
                      <HelpCircle size={40} className="text-gray-400 mb-2" />
                      <p className="text-sm font-bold text-gray-600">
                        No Wild Locations
                      </p>
                      <p className="text-[10px] text-gray-400 max-w-[150px] mt-1 leading-tight">
                        Check Raids, Eggs, or Version Exclusives.
                      </p>
                    </div>
                  )}
                </div>
                {locations.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-black/5 text-[9px] font-bold text-gray-400 text-center uppercase tracking-widest">
                    Data Source: PokéAPI + Community Maps
                  </div>
                )}
              </div>
            </div>
          ) : (
            // Empty State
            !loading && (
              <div className="flex flex-col items-center justify-center py-24 text-gray-300">
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6 animate-pulse">
                  <Search size={40} className="text-gray-300" />
                </div>
                <h3 className="text-xl font-black uppercase tracking-widest opacity-40">
                  Awaiting Coordinates
                </h3>
                <p className="text-xs font-bold uppercase tracking-widest opacity-30 mt-2">
                  Enter a Pokemon name to begin scan
                </p>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default PokemonFinder;
