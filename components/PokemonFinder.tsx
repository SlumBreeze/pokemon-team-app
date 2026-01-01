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
import PaldeaMap from "./PaldeaMap";
import {
  fetchPokemon,
  getPokemonNames,
  fetchEncounterLocations,
  fetchEnhancedEncounters,
} from "../services/pokeApi";
import { PokemonData, EnhancedEncounter } from "../types";
import { TYPE_COLORS } from "../constants";
import { SANDWICH_RECIPES } from "../data/sandwiches";
import { Copy, ChefHat } from "lucide-react";

const PokemonFinder: React.FC = () => {
  const [inputValue, setInputValue] = useState("");
  const [pokemon, setPokemon] = useState<PokemonData | null>(null);
  const [locations, setLocations] = useState<string[]>([]);
  const [enhancedEncounters, setEnhancedEncounters] = useState<EnhancedEncounter[]>([]);
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);

  const handleSearch = async (overrideName?: string) => {
    const nameToSearch =
      typeof overrideName === "string" ? overrideName : inputValue;
    if (!nameToSearch.trim()) return;

    if (nameToSearch !== inputValue) setInputValue(nameToSearch);

    setLoading(true);
    setError(null);
    setPokemon(null);
    setLocations([]);
    setEnhancedEncounters([]);

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

      // Also fetch enhanced encounters
      const enhanced = await fetchEnhancedEncounters(
        data.location_area_encounters,
        data.name
      );
      setEnhancedEncounters(enhanced);
      setLocationLoading(false);
    } catch (err: any) {
      setError(err.message || "Pokemon not found");
      setLoading(false);
      setLocationLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // You could add a toast here if you had a toast system
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
                <h2 className="text-2xl font-black uppercase tracking-tighter text-black dark:text-dark-text leading-none">
                  Paldea Locator
                </h2>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-dark-text-secondary">
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
            <>
              <div className="bg-white/60 dark:bg-dark-card/60 backdrop-blur-xl border border-white/50 dark:border-dark-border/50 rounded-3xl p-8 shadow-xl animate-in zoom-in-95 duration-500 flex flex-col lg:flex-row gap-10 relative overflow-hidden group transition-colors duration-200">
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
                    <h1 className="text-4xl font-black capitalize text-black dark:text-dark-text mb-3 tracking-tight">
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
                  <h3 className="text-xs font-black uppercase text-gray-400 dark:text-dark-text-secondary mb-4 tracking-widest flex items-center gap-2">
                    <div className="h-px bg-gray-300 dark:bg-dark-border flex-1"></div>
                    Base Stats
                    <div className="h-px bg-gray-300 dark:bg-dark-border flex-1"></div>
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
                          <div className="flex justify-between text-[10px] font-bold uppercase text-gray-500 dark:text-dark-text-secondary mb-1">
                            <span>{shortName[stat.stat.name]}</span>
                            <span className="text-black dark:text-dark-text">{val}</span>
                          </div>
                          <div className="h-2 w-full bg-gray-100 dark:bg-dark-border rounded-full overflow-hidden shadow-inner transition-colors duration-200">
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

                {/* Column 3: Location List & Sandwich Chef */}
                <div className="flex-1 min-w-0 flex flex-col gap-6">

                  {/* Sandwich Chef Card */}
                  {pokemon.types[0] && SANDWICH_RECIPES[pokemon.types[0].type.name] && (
                    <div className="bg-orange-50 rounded-2xl p-5 border-2 border-orange-200 relative overflow-hidden group/sandwich shadow-sm hover:shadow-md transition-shadow">
                      <div className="absolute top-0 right-0 p-4 opacity-10">
                        <ChefHat size={64} className="text-orange-900" />
                      </div>

                      <div className="flex items-center gap-2 mb-3 relative z-10">
                        <div className="bg-orange-500 text-white p-1.5 rounded-lg shadow-sm">
                          <ChefHat size={16} />
                        </div>
                        <h3 className="text-sm font-black uppercase text-orange-900 tracking-tight">
                          Chef Recommendation
                        </h3>
                      </div>

                      <div className="relative z-10">
                        <h4 className="font-black text-lg text-gray-800 dark:text-dark-text mb-1">
                          {SANDWICH_RECIPES[pokemon.types[0].type.name].name}
                        </h4>
                        <p className="text-xs font-bold text-orange-600 uppercase tracking-wide mb-3">
                          {SANDWICH_RECIPES[pokemon.types[0].type.name].effect}
                        </p>

                        <div className="flex flex-col gap-2 text-xs text-gray-700 dark:text-dark-text-secondary bg-white/60 dark:bg-dark-card/60 rounded-xl p-3 border border-orange-100/50 dark:border-dark-border/50 backdrop-blur-sm transition-colors duration-200">
                          <div>
                            <span className="font-bold text-gray-500 dark:text-dark-text-secondary uppercase text-[10px] tracking-wider block mb-1">Ingredients</span>
                            <span className="font-medium leading-relaxed">
                              {SANDWICH_RECIPES[pokemon.types[0].type.name].ingredients.join(", ")}
                            </span>
                          </div>
                          <div className="h-px bg-orange-200/50 dark:bg-dark-border w-full my-0.5"></div>
                          <div>
                            <span className="font-bold text-gray-500 dark:text-dark-text-secondary uppercase text-[10px] tracking-wider block mb-1">Seasonings</span>
                            <span className="font-medium leading-relaxed">
                              {SANDWICH_RECIPES[pokemon.types[0].type.name].seasonings.join(", ")}
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            const recipe = SANDWICH_RECIPES[pokemon.types[0].type.name];
                            const text = `${recipe.name}\n${recipe.effect}\n\nIngredients: ${recipe.ingredients.join(", ")}\nSeasonings: ${recipe.seasonings.join(", ")}`;
                            copyToClipboard(text);
                          }}
                          className="mt-3 w-full bg-white dark:bg-dark-card hover:bg-orange-100 dark:hover:bg-orange-900/20 text-orange-700 text-xs font-bold py-2 rounded-lg border border-orange-200 dark:border-dark-border flex items-center justify-center gap-2 transition-colors duration-200 active:scale-95"
                        >
                          <Copy size={12} />
                          Copy Recipe
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Locations Box */}
                  <div className="bg-white/40 dark:bg-dark-card/40 rounded-2xl p-6 border border-white/60 dark:border-dark-border/60 shadow-inner flex flex-col relative overflow-hidden flex-grow transition-colors duration-200">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="bg-scarlet text-white p-2 rounded-lg shadow-sm">
                        <MapPin size={18} strokeWidth={2.5} />
                      </div>
                      <h3 className="text-lg font-black uppercase text-gray-800 dark:text-dark-text tracking-tight">
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
                      ) : enhancedEncounters.length > 0 ? (
                        <div className="h-full overflow-y-auto pr-2 custom-scrollbar space-y-2">
                          {enhancedEncounters.map((enc, idx) => {
                            const rarityColors: Record<string, { bg: string; text: string; border: string }> = {
                              'common': { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400', border: 'border-green-200 dark:border-green-700' },
                              'uncommon': { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-400', border: 'border-yellow-200 dark:border-yellow-700' },
                              'rare': { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-400', border: 'border-orange-200 dark:border-orange-700' },
                              'very-rare': { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', border: 'border-red-200 dark:border-red-700' },
                            };
                            const colors = rarityColors[enc.rarity] || rarityColors['common'];

                            const methodIcons: Record<string, string> = {
                              'walk': '🚶',
                              'surf': '🏄',
                              'old-rod': '🎣',
                              'good-rod': '🎣',
                              'super-rod': '🎣',
                              'cave': '🕳️',
                              'headbutt': '🌳',
                            };

                            return (
                              <button
                                key={`${enc.locationName}-${enc.method}-${idx}`}
                                onClick={() => {
                                  setSelectedLocation(enc.locationName);
                                  setViewMode("map");
                                }}
                                className={`w-full p-3 rounded-xl text-left transition-all duration-200 border ${colors.bg} ${colors.border} hover:scale-[1.02] active:scale-[0.98] shadow-sm`}
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-sm font-bold text-gray-800 dark:text-dark-text">
                                    {enc.locationName}
                                  </span>
                                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${colors.bg} ${colors.text} border ${colors.border}`}>
                                    {enc.rarity.replace('-', ' ')}
                                  </span>
                                </div>
                                <div className="flex flex-wrap gap-2 text-[10px]">
                                  {/* Method */}
                                  <span className="flex items-center gap-1 bg-white/60 dark:bg-dark-card/60 px-2 py-0.5 rounded-full font-medium text-gray-600 dark:text-dark-text-secondary">
                                    {methodIcons[enc.method] || '🎮'} {enc.method.replace(/-/g, ' ')}
                                  </span>
                                  {/* Level Range */}
                                  <span className="flex items-center gap-1 bg-white/60 dark:bg-dark-card/60 px-2 py-0.5 rounded-full font-medium text-gray-600 dark:text-dark-text-secondary">
                                    Lv.{enc.minLevel}-{enc.maxLevel}
                                  </span>
                                  {/* Chance */}
                                  <span className="flex items-center gap-1 bg-white/60 dark:bg-dark-card/60 px-2 py-0.5 rounded-full font-medium text-gray-600 dark:text-dark-text-secondary">
                                    {enc.chance}%
                                  </span>
                                  {/* Conditions */}
                                  {enc.conditions.map((cond, i) => (
                                    <span key={i} className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 px-2 py-0.5 rounded-full font-medium">
                                      {cond}
                                    </span>
                                  ))}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      ) : locations.length > 0 ? (
                        <div className="h-full overflow-y-auto pr-2 custom-scrollbar">
                          <div className="flex flex-wrap gap-2">
                            {locations.map((loc) => (
                              <button
                                key={loc}
                                onClick={() => {
                                  setSelectedLocation(loc);
                                  setViewMode("map");
                                }}
                                className={`px-3 py-2 rounded-lg text-xs font-bold shadow-sm transition-all duration-200 cursor-pointer select-none text-left border ${selectedLocation === loc
                                  ? "bg-scarlet text-white border-scarlet"
                                  : "bg-white dark:bg-dark-card hover:bg-scarlet hover:text-white border-gray-150 dark:border-dark-border text-gray-600 dark:text-dark-text-secondary"
                                  }`}
                              >
                                {loc}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center p-4 opacity-60">
                          <HelpCircle size={40} className="text-gray-400 dark:text-dark-text-secondary mb-2" />
                          <p className="text-sm font-bold text-gray-600 dark:text-dark-text-secondary">
                            No Wild Locations
                          </p>
                          <p className="text-[10px] text-gray-400 dark:text-dark-text-secondary max-w-[150px] mt-1 leading-tight">
                            Check Raids, Eggs, or Version Exclusives.
                          </p>
                        </div>
                      )}
                    </div>
                    {(enhancedEncounters.length > 0 || locations.length > 0) && (
                      <div className="mt-4 pt-4 border-t border-black/5 dark:border-dark-border text-[9px] font-bold text-gray-400 dark:text-dark-text-secondary text-center uppercase tracking-widest">
                        Click a location to view on map
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Map Section - Below the card */}
              {viewMode === "map" && selectedLocation && (
                <div className="mt-8 animate-in slide-in-from-bottom-4 duration-500">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-scarlet text-white p-2 rounded-lg shadow-lg">
                        <MapPin size={20} />
                      </div>
                      <div>
                        <h3 className="text-lg font-black uppercase text-gray-800 dark:text-dark-text tracking-tight">
                          Map View
                        </h3>
                        <p className="text-[10px] font-bold uppercase text-gray-400 dark:text-dark-text-secondary tracking-widest">
                          {selectedLocation}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setViewMode("list");
                        setSelectedLocation(null);
                      }}
                      className="text-sm font-black uppercase bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border px-4 py-2 rounded-xl shadow-sm hover:bg-gray-50 dark:hover:bg-dark-border transition-colors duration-200"
                    >
                      Close Map
                    </button>
                  </div>
                  <PaldeaMap
                    selectedLocation={selectedLocation}
                    spriteUrl={pokemon?.sprites.front_default || ""}
                    allLocations={locations}
                  />
                </div>
              )}
            </>
          ) : (
            // Empty State
            !loading && (
              <div className="flex flex-col items-center justify-center py-24 text-gray-300 dark:text-dark-text-secondary">
                <div className="w-24 h-24 bg-gray-100 dark:bg-dark-border rounded-full flex items-center justify-center mb-6 animate-pulse transition-colors duration-200">
                  <Search size={40} className="text-gray-300 dark:text-dark-text-secondary" />
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
      </div >
    </div >
  );
};

export default PokemonFinder;
