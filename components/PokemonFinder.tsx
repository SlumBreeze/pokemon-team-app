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
            const locs = await fetchEncounterLocations(data.location_area_encounters);
            setLocations(locs);
            setLocationLoading(false);
        } catch (err: any) {
            setError(err.message || "Pokemon not found");
            setLoading(false);
            setLocationLoading(false);
        }
    };

    return (
        <div className="animate-in slide-in-from-right-4 duration-300">
            <div className="bg-white border-4 border-black rounded-3xl p-6 shadow-2xl relative overflow-hidden min-h-[500px]">
                {/* Header Decor */}
                <div className="absolute top-0 left-0 w-full h-4 bg-scarlet border-b-2 border-black"></div>
                <div className="absolute top-0 right-10 w-20 h-20 bg-gray-100 rounded-full border-4 border-black -translate-y-1/2 flex items-end justify-center pb-2 z-0">
                    <div className="w-8 h-8 bg-white border-4 border-black rounded-full shadow-inner"></div>
                </div>

                <div className="relative z-10 flex flex-col items-center max-w-2xl mx-auto">
                    <div className="flex items-center gap-3 mb-8 mt-4">
                        <MapPin size={32} className="text-scarlet" />
                        <h2 className="text-3xl font-black uppercase tracking-tighter text-black">
                            Paldea Locator
                        </h2>
                    </div>

                    {/* Search Bar */}
                    <div className="w-full max-w-md mb-10 relative">
                        <div className="absolute -left-3 -top-3 text-scarlet animate-bounce hidden md:block">
                            <Sparkles size={24} />
                        </div>
                        <AutocompleteInput
                            value={inputValue}
                            onChange={setInputValue}
                            onSubmit={handleSearch}
                            fetchData={getPokemonNames}
                            placeholder="Enter Pokémon Name..."
                            isLoading={loading}
                        />
                        <p className="text-xs text-gray-400 text-center mt-2 font-bold uppercase tracking-widest">
                            Find where to catch 'em in Scarlet & Violet
                        </p>
                    </div>

                    {/* Result View */}
                    {error && (
                        <div className="bg-red-50 border-2 border-red-200 text-red-600 px-6 py-4 rounded-xl flex items-center gap-3 font-bold animate-in fade-in">
                            <AlertCircle size={20} />
                            {error}
                        </div>
                    )}

                    {pokemon && (
                        <div className="w-full bg-gray-50 border-2 border-black rounded-2xl p-6 shadow-xl animate-in zoom-in-95 duration-300 flex flex-col md:flex-row gap-8">
                            {/* Left Column: Image & Info */}
                            <div className="flex-shrink-0 flex flex-col items-center md:items-start gap-4">
                                <div className="w-48 h-48 bg-white border-4 border-black rounded-full flex items-center justify-center shadow-lg relative mx-auto md:mx-0">
                                    <div className="absolute inset-0 bg-gradient-to-br from-black/5 to-transparent rounded-full pointer-events-none"></div>
                                    <img
                                        src={
                                            pokemon.sprites.other?.["official-artwork"].front_default ||
                                            pokemon.sprites.front_default
                                        }
                                        alt={pokemon.name}
                                        className="w-40 h-40 object-contain drop-shadow-xl z-10"
                                    />
                                    <div className="absolute bottom-2 right-2 bg-black text-white text-xs font-black px-2 py-0.5 rounded-full border-2 border-white">
                                        #{String(pokemon.id).padStart(4, "0")}
                                    </div>
                                </div>

                                <div className="text-center md:text-left w-full">
                                    <h3 className="text-2xl font-black capitalize text-black leading-none mb-2">
                                        {pokemon.name.replace(/-/g, " ")}
                                    </h3>
                                    <div className="flex flex-wrap gap-1 justify-center md:justify-start">
                                        {pokemon.types.map((t) => (
                                            <span
                                                key={t.type.name}
                                                className="px-2 py-0.5 rounded textxs font-black text-white uppercase shadow-sm tracking-wider"
                                                style={{
                                                    backgroundColor:
                                                        TYPE_COLORS[t.type.name] || "#777",
                                                }}
                                            >
                                                {t.type.name}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Right Column: Locations */}
                            <div className="flex-grow min-w-0">
                                <div className="flex items-center gap-2 mb-4 border-b-2 border-black/10 pb-2">
                                    <div className="bg-scarlet text-white p-1.5 rounded-lg">
                                        <MapPin size={18} />
                                    </div>
                                    <h4 className="text-lg font-black uppercase text-black tracking-wide">
                                        Encounter Locations
                                    </h4>
                                </div>

                                {locationLoading ? (
                                    <div className="flex items-center gap-2 text-gray-500 font-bold py-10">
                                        <Loader2 className="animate-spin text-scarlet" />
                                        Scanning Paldea Region map...
                                    </div>
                                ) : locations.length > 0 ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                        {locations.map((loc) => (
                                            <div
                                                key={loc}
                                                className="bg-white border-l-4 border-scarlet px-3 py-2 text-sm font-bold text-gray-700 shadow-sm rounded-r-lg hover:bg-gray-50 transition-colors"
                                            >
                                                {loc}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 text-blue-800 flex items-start gap-3">
                                        <HelpCircle className="flex-shrink-0 mt-0.5" />
                                        <div className="text-sm">
                                            <p className="font-bold mb-1">
                                                No Wild Encounters Found
                                            </p>
                                            <p className="opacity-80">
                                                This Pokémon might not be found in the wild in Scarlet
                                                or Violet. It could be:
                                            </p>
                                            <ul className="list-disc list-inside mt-2 space-y-0.5 opacity-80 text-xs font-semibold">
                                                <li>Version Exclusive to the other game</li>
                                                <li>Evolution only (catch pre-evolution)</li>
                                                <li>Raid Battle or Special Event only</li>
                                                <li>Starter or Gift Pokémon</li>
                                                <li>DLC Exclusive (this finder checks base Paldea)</li>
                                            </ul>
                                        </div>
                                    </div>
                                )}

                                {locations.length > 0 && (
                                    <div className="mt-4 text-[10px] text-gray-400 font-bold uppercase tracking-widest text-right">
                                        Source: Serebii / Bulbapedia Data via PokéAPI
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {!pokemon && !loading && !error && (
                        <div className="mt-12 text-center text-gray-300">
                            <MapPin size={64} className="mx-auto mb-4 opacity-50" />
                            <p className="text-lg font-black uppercase tracking-widest opacity-50">Waiting for Input</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PokemonFinder;
