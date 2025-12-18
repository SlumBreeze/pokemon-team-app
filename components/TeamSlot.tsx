import React, { useState, useEffect } from "react";
import { TeamMember, TypeName } from "../types";
import { TYPE_NAMES, TYPE_COLORS } from "../constants";
import {
  AlertCircle,
  X,
  Sparkles,
  ShoppingBag,
  ArrowRight,
  CheckCircle,
  ArrowUpCircle,
  Lock,
  Unlock,
  Loader2,
} from "lucide-react";
import {
  fetchPokemon,
  fetchAbilityDescription,
  fetchEvolutionInfo,
  getPokemonNames,
  getItemNames,
  fetchItemDescription,
} from "../services/pokeApi";
import AutocompleteInput from "./AutocompleteInput";
import { getRecommendedItems, RecommendedItem } from "../itemRecommendations";

interface TeamSlotProps {
  index: number;
  member: TeamMember;
  onUpdate: (index: number, updates: Partial<TeamMember>) => void;
  onClear: (index: number) => void;
  onToggleLock: (index: number) => void;
}

const TeamSlot: React.FC<TeamSlotProps> = ({
  index,
  member,
  onUpdate,
  onClear,
  onToggleLock,
}) => {
  const [inputValue, setInputValue] = useState(member.customName || "");
  const [itemInputValue, setItemInputValue] = useState(member.heldItem || "");
  const [recommendations, setRecommendations] = useState<RecommendedItem[]>([]);
  const [previewItemDesc, setPreviewItemDesc] = useState<string | null>(null);

  useEffect(() => {
    setInputValue(member.customName);
  }, [member.customName]);

  useEffect(() => {
    setItemInputValue(member.heldItem || "");
  }, [member.heldItem]);

  // Update recommendations whenever data or evolution details change
  useEffect(() => {
    if (member.data) {
      const recs = getRecommendedItems(member.data, member.evolutionDetails);
      setRecommendations(recs);
    } else {
      setRecommendations([]);
    }
  }, [member.data, member.evolutionDetails]);

  const handleSearch = async (overrideName?: string) => {
    const nameToSearch =
      typeof overrideName === "string" ? overrideName : inputValue;
    if (!nameToSearch.trim()) return;

    if (nameToSearch !== inputValue) setInputValue(nameToSearch);

    onUpdate(index, { loading: true, error: null, customName: nameToSearch });

    try {
      const data = await fetchPokemon(nameToSearch);

      const defaultAbilityName = data.abilities[0]?.ability.name || "";
      let desc = "";
      if (defaultAbilityName) {
        const abilityData = data.abilities[0];
        desc = await fetchAbilityDescription(abilityData.ability.url);
      }

      const evoInfo = await fetchEvolutionInfo(data.speciesUrl, data.name);

      onUpdate(index, {
        loading: false,
        data: data,
        selectedAbility: defaultAbilityName,
        abilityDescription: desc,
        teraType: data.types[0]?.type.name || "normal",
        error: null,
        customName: "",
        evolutionDetails: evoInfo,
        heldItem: "",
        heldItemDescription: "",
      });
      setInputValue("");
      setItemInputValue("");
    } catch (err: any) {
      onUpdate(index, {
        loading: false,
        data: null,
        error: err.message || "Not found",
      });
    }
  };

  const handleItemSelect = async (itemName?: string) => {
    const itemToSet = itemName || itemInputValue;
    if (!itemToSet) return;

    onUpdate(index, { heldItem: itemToSet });
    const desc = await fetchItemDescription(itemToSet);
    onUpdate(index, { heldItem: itemToSet, heldItemDescription: desc });
  };

  const handleRecommendationHover = async (itemName: string | null) => {
    if (!itemName) {
      setPreviewItemDesc(null);
      return;
    }
    const desc = await fetchItemDescription(itemName);
    setPreviewItemDesc(desc);
  };

  const clearSlot = () => {
    setInputValue("");
    setItemInputValue("");
    onClear(index);
  };

  // Evolution Status Renderer
  const renderEvolutionStatus = () => {
    const evo = member.evolutionDetails;
    if (!evo)
      return (
        <div className="text-[10px] text-gray-500 bg-dark/50 border border-gray-800 rounded px-2 py-1 flex items-center gap-1.5 italic">
          <Loader2 className="animate-spin" size={10} />
          <span>Loading evolution info...</span>
        </div>
      );

    if (evo.isFullyEvolved) {
      return (
        <div className="text-[10px] text-green-400 bg-green-900/10 border border-green-800/30 rounded px-2 py-1 flex items-center gap-1.5 font-bold uppercase tracking-wider">
          <CheckCircle size={10} />
          <span>Fully Evolved</span>
        </div>
      );
    }

    // Check level evolution
    if (evo.minLevel) {
      if (member.level >= evo.minLevel) {
        return (
          <div className="text-[10px] text-green-300 bg-green-900/30 border border-green-500 rounded px-2 py-1 flex items-center gap-1.5 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.3)]">
            <ArrowUpCircle size={10} />
            <span className="font-bold uppercase">
              Ready to Evolve! (Lv {evo.minLevel})
            </span>
          </div>
        );
      } else {
        return (
          <div className="text-[10px] text-yellow-500 bg-yellow-900/10 border border-yellow-800/30 rounded px-2 py-1 flex items-center gap-1.5">
            <ArrowRight size={10} />
            <span>
              Next:{" "}
              <span className="capitalize font-bold text-yellow-400">
                {evo.nextEvolutionName}
              </span>{" "}
              at Lv. {evo.minLevel}
            </span>
          </div>
        );
      }
    }

    // Other conditions (stones, friendship, etc)
    return (
      <div className="text-[10px] text-blue-400 bg-blue-900/10 border border-blue-800/30 rounded px-2 py-1 flex items-center gap-1.5">
        <Sparkles size={10} />
        <span className="capitalize">
          Next:{" "}
          <span className="font-bold text-blue-300">
            {evo.nextEvolutionName}
          </span>{" "}
          ({evo.triggerCondition})
        </span>
      </div>
    );
  };

  return (
    <div
      className={`bg-card border ${
        member.locked
          ? "border-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.1)]"
          : "border-gray-700"
      } rounded-lg p-4 flex flex-col gap-3 relative shadow-lg hover:shadow-xl transition-all duration-300 min-h-[220px]`}
    >
      <div className="flex justify-between items-center text-gray-400 text-xs font-bold uppercase tracking-wider">
        <span className="flex items-center gap-2">
          Slot {index + 1}
          {member.locked && <Lock size={12} className="text-amber-500" />}
        </span>
        <div className="flex items-center gap-2">
          {member.data && (
            <button
              onClick={() => onToggleLock(index)}
              className={`transition-colors ${
                member.locked
                  ? "text-amber-500 hover:text-amber-400"
                  : "text-gray-600 hover:text-gray-400"
              }`}
              title={
                member.locked
                  ? "Unlock Slot"
                  : "Lock Slot (Keep during Auto-Build)"
              }
            >
              {member.locked ? <Lock size={14} /> : <Unlock size={14} />}
            </button>
          )}
          {member.data && !member.locked && (
            <button
              onClick={clearSlot}
              className="text-red-400 hover:text-red-300 transition-colors"
              title="Clear Slot"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="relative z-10">
        <AutocompleteInput
          value={inputValue}
          onChange={setInputValue}
          onSubmit={handleSearch}
          fetchData={getPokemonNames}
          placeholder={member.data ? "Replace..." : "Enter Pokémon..."}
          isLoading={member.loading}
          onBlur={() => {
            if (inputValue && inputValue !== member.customName && !member.data)
              handleSearch();
          }}
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
          {/* Header Info */}
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 flex-shrink-0 bg-dark/50 rounded-full flex items-center justify-center border border-gray-700 relative">
              <img
                src={
                  member.data.sprites.other?.["official-artwork"]
                    .front_default || member.data.sprites.front_default
                }
                alt={member.data.name}
                className="w-14 h-14 object-contain"
              />
            </div>
            <div className="flex flex-col gap-1 min-w-0 flex-grow">
              <div className="font-bold text-lg capitalize truncate leading-tight flex justify-between items-center">
                {member.data.name}
                <div className="flex items-center bg-dark/50 rounded px-1.5 border border-gray-700 h-6">
                  <span className="text-[10px] text-gray-400 mr-1">Lv.</span>
                  <select
                    value={member.level}
                    onChange={(e) =>
                      onUpdate(index, { level: parseInt(e.target.value) })
                    }
                    className="bg-transparent text-xs font-mono focus:outline-none text-white cursor-pointer w-10 text-right appearance-none"
                  >
                    {Array.from({ length: 100 }, (_, i) => 100 - i).map(
                      (lvl) => (
                        <option
                          key={lvl}
                          value={lvl}
                          className="bg-dark text-white"
                        >
                          {lvl}
                        </option>
                      )
                    )}
                  </select>
                </div>
              </div>
              <div className="flex gap-1 flex-wrap mt-0.5">
                {member.data.types.map((t) => (
                  <span
                    key={t.type.name}
                    className="px-1.5 py-0.5 rounded text-[10px] font-bold text-white shadow-sm uppercase tracking-wide"
                    style={{
                      backgroundColor: TYPE_COLORS[t.type.name] || "#777",
                    }}
                  >
                    {t.type.name}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Evolution Hint */}
          {renderEvolutionStatus()}

          {/* Controls */}
          <div className="grid grid-cols-2 gap-2 items-start">
            <div className="flex flex-col">
              <label className="block text-[10px] text-gray-500 uppercase mb-1">
                Ability
              </label>
              <select
                value={member.selectedAbility}
                onChange={async (e) => {
                  const newAbility = e.target.value;
                  onUpdate(index, {
                    selectedAbility: newAbility,
                    abilityDescription: "Loading...",
                  });

                  const abilityData = member.data?.abilities.find(
                    (a) => a.ability.name === newAbility
                  );
                  if (abilityData) {
                    const desc = await fetchAbilityDescription(
                      abilityData.ability.url
                    );
                    onUpdate(index, {
                      selectedAbility: newAbility,
                      abilityDescription: desc,
                    });
                  }
                }}
                className="w-full bg-dark/50 border border-gray-700 rounded px-2 py-1 text-xs text-gray-200 focus:outline-none focus:border-violet-500 capitalize"
              >
                {member.data.abilities.map((a) => (
                  <option key={a.ability.name} value={a.ability.name}>
                    {a.ability.name.replace(/-/g, " ")}{" "}
                    {a.is_hidden ? "(H)" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] text-gray-500 uppercase mb-1">
                Tera Type
              </label>
              <select
                value={member.teraType}
                onChange={(e) => onUpdate(index, { teraType: e.target.value })}
                className="w-full bg-dark/50 border border-gray-700 rounded px-2 py-1 text-xs text-gray-200 focus:outline-none focus:border-scarlet-500 capitalize"
              >
                {TYPE_NAMES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Held Item Section */}
          <div>
            <label className="block text-[10px] text-gray-500 uppercase mb-1">
              Held Item
            </label>
            <div className="relative z-0">
              <AutocompleteInput
                value={itemInputValue}
                onChange={setItemInputValue}
                onSubmit={handleItemSelect}
                fetchData={getItemNames}
                placeholder="Search Item..."
                onBlur={() => handleItemSelect(itemInputValue)}
              />
            </div>

            {/* Description Box (Shows Selected Item OR Hover Preview) */}
            <div className="mt-1 min-h-[30px] bg-dark/30 border border-gray-800 rounded px-2 py-1.5">
              {previewItemDesc ? (
                <p className="text-[10px] text-violet-300 animate-in fade-in leading-snug">
                  <strong className="text-violet-400">Preview:</strong>{" "}
                  {previewItemDesc}
                </p>
              ) : member.heldItemDescription ? (
                <p className="text-[10px] text-gray-400 leading-snug">
                  {member.heldItemDescription}
                </p>
              ) : (
                <p className="text-[10px] text-gray-600 italic">
                  No item selected
                </p>
              )}
            </div>
          </div>

          {/* Item Recommendations */}
          {recommendations.length > 0 && (
            <div className="mt-1">
              <div className="flex items-center gap-1 text-[10px] text-gray-500 uppercase font-bold mb-1">
                <ShoppingBag size={10} />
                Recommended
              </div>
              <div className="flex flex-wrap gap-1">
                {recommendations.map((item) => (
                  <button
                    key={item.name}
                    onClick={() => handleItemSelect(item.name)}
                    onMouseEnter={() => handleRecommendationHover(item.name)}
                    onMouseLeave={() => handleRecommendationHover(null)}
                    className="px-1.5 py-0.5 bg-dark border border-gray-600 hover:bg-gray-700 hover:border-gray-500 rounded flex items-center gap-1.5 transition-colors group text-left"
                  >
                    <span className="text-[10px] font-bold text-gray-300 group-hover:text-white transition-colors">
                      {item.name}
                    </span>
                    <span className="text-[9px] text-gray-500 group-hover:text-gray-400 hidden sm:inline-block">
                      ({item.reason})
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
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
