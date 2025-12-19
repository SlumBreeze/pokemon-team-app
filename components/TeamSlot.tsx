import React, { useState, useEffect } from "react";
import { TeamMember, TypeName } from "../types";
import { TYPE_NAMES, TYPE_COLORS } from "../constants";
import {
  AlertCircle,
  X,
  Sparkles,
  ShoppingBag,
  CheckCircle,
  ArrowUpCircle,
  Lock,
  Unlock,
  Loader2,
  Minus,
  Plus,
  ArrowLeft,
  ArrowRight,
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
  isRearranging?: boolean;
  onMove?: (index: number, direction: "left" | "right") => void;
}

const TeamSlot: React.FC<TeamSlotProps> = ({
  index,
  member,
  onUpdate,
  onClear,
  onToggleLock,
  isRearranging,
  onMove,
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
        <div className="text-[10px] text-green-700 bg-green-100 border border-green-200 rounded-lg px-2.5 py-1.5 flex items-center gap-2 font-black uppercase tracking-wider shadow-sm">
          <CheckCircle size={12} className="text-green-600" />
          <span>Fully Evolved</span>
        </div>
      );
    }

    // Check level evolution
    if (evo.minLevel) {
      if (member.level >= evo.minLevel) {
        return (
          <div className="text-[10px] text-white bg-green-500 border-2 border-green-600 rounded-lg px-2.5 py-1.5 flex items-center gap-2 animate-pulse shadow-lg font-black uppercase tracking-wider">
            <ArrowUpCircle size={12} />
            <span>Ready to Evolve! (Lv {evo.minLevel})</span>
          </div>
        );
      } else {
        return (
          <div className="text-[10px] text-yellow-800 bg-yellow-50 border border-yellow-200 rounded-lg px-2.5 py-1.5 flex items-center gap-2 font-black uppercase tracking-wider shadow-sm">
            <ArrowRight size={12} className="text-yellow-600" />
            <span>
              Next: <span className="capitalize">{evo.nextEvolutionName}</span>{" "}
              at Lv. {evo.minLevel}
            </span>
          </div>
        );
      }
    }

    // Other conditions (stones, friendship, etc)
    return (
      <div className="text-[10px] text-blue-800 bg-blue-50 border border-blue-200 rounded-lg px-2.5 py-1.5 flex items-center gap-2 font-black uppercase tracking-wider shadow-sm">
        <Sparkles size={12} className="text-blue-600" />
        <span className="capitalize">
          Next: <span className="font-black">{evo.nextEvolutionName}</span> (
          {evo.triggerCondition})
        </span>
      </div>
    );
  };

  return (
    <div
      className={`bg-white border-2 ${
        member.locked
          ? "border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.2)]"
          : "border-black shadow-xl"
      } rounded-2xl p-5 flex flex-col gap-3 relative hover:shadow-2xl transition-all duration-300 min-h-[220px]`}
    >
      <div className="flex justify-between items-center text-gray-400 text-[10px] font-black uppercase tracking-widest">
        <span className="flex items-center gap-2">
          Slot {index + 1}
          {member.locked && <Lock size={12} className="text-amber-600" />}
        </span>
        <div className="flex items-center gap-2">
          {member.data && (
            <button
              onClick={() => onToggleLock(index)}
              className={`transition-colors p-1 rounded-full hover:bg-gray-100 ${
                member.locked
                  ? "text-amber-600 hover:text-amber-500"
                  : "text-gray-400 hover:text-black"
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
          {member.data && !member.locked && !isRearranging && (
            <button
              onClick={clearSlot}
              className="p-1 rounded-full text-red-500 hover:text-red-600 hover:bg-red-50 transition-colors"
              title="Clear Slot"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Rearrange Overlay */}
      {isRearranging && member.data && (
        <div className="absolute inset-0 z-50 bg-amber-500/10 backdrop-blur-[1px] rounded-2xl border-2 border-amber-500 flex items-center justify-center pointer-events-none">
          <div className="flex gap-4 pointer-events-auto">
            <button
              disabled={index === 0}
              onClick={() => onMove?.(index, "left")}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all bg-white border-4 border-amber-500 text-amber-500 shadow-xl active:scale-90 ${
                index === 0
                  ? "opacity-30 grayscale cursor-not-allowed"
                  : "hover:bg-amber-500 hover:text-white"
              }`}
            >
              <ArrowLeft size={24} strokeWidth={3} />
            </button>
            <button
              disabled={index === 5}
              onClick={() => onMove?.(index, "right")}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all bg-white border-4 border-amber-500 text-amber-500 shadow-xl active:scale-90 ${
                index === 5
                  ? "opacity-30 grayscale cursor-not-allowed"
                  : "hover:bg-amber-500 hover:text-white"
              }`}
            >
              <ArrowRight size={24} strokeWidth={3} />
            </button>
          </div>
          <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-amber-500 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded shadow-sm">
            Move Mode
          </div>
        </div>
      )}

      <div
        className={`relative z-10 ${
          isRearranging ? "opacity-50 grayscale pointer-events-none" : ""
        }`}
      >
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
            <div className="w-16 h-16 flex-shrink-0 bg-gray-50 rounded-full flex items-center justify-center border-2 border-black relative shadow-inner">
              <img
                src={
                  member.data.sprites.other?.["official-artwork"]
                    .front_default || member.data.sprites.front_default
                }
                alt={member.data.name}
                className="w-14 h-14 object-contain z-10"
              />
            </div>
            <div className="flex flex-col gap-0.5 min-w-0 flex-grow">
              <div className="font-black text-xl capitalize truncate leading-tight flex justify-between items-center text-black">
                {member.data.name}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() =>
                      onUpdate(index, { level: Math.max(1, member.level - 1) })
                    }
                    className="w-6 h-6 flex items-center justify-center bg-white border-2 border-black rounded-full hover:bg-gray-100 active:scale-95 transition-all shadow-sm"
                    title="Decrease Level"
                  >
                    <Minus size={10} className="text-black stroke-[3px]" />
                  </button>
                  <div className="flex items-center justify-center bg-gray-100 rounded-full px-2.5 border-2 border-black h-[34px] min-w-[54px] shadow-inner">
                    <span className="text-[10px] text-gray-500 font-black uppercase mr-1 select-none">
                      Lv
                    </span>
                    <select
                      value={member.level}
                      onChange={(e) =>
                        onUpdate(index, { level: parseInt(e.target.value) })
                      }
                      className="bg-transparent text-[11px] font-mono font-black focus:outline-none text-black cursor-pointer w-8 h-full text-right appearance-none border-none outline-none py-0 m-0"
                    >
                      {Array.from({ length: 100 }, (_, i) => 100 - i).map(
                        (lvl) => (
                          <option
                            key={lvl}
                            value={lvl}
                            className="bg-white text-black"
                          >
                            {lvl}
                          </option>
                        )
                      )}
                    </select>
                  </div>
                  <button
                    onClick={() =>
                      onUpdate(index, {
                        level: Math.min(100, member.level + 1),
                      })
                    }
                    className="w-6 h-6 flex items-center justify-center bg-white border-2 border-black rounded-full hover:bg-gray-100 active:scale-95 transition-all shadow-sm"
                    title="Increase Level"
                  >
                    <Plus size={10} className="text-black stroke-[3px]" />
                  </button>
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
              <label className="block text-[10px] text-gray-400 font-black uppercase mb-1 tracking-tighter">
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
                className="w-full bg-gray-50 border-2 border-black rounded-lg px-2 py-1.5 text-xs text-black font-bold focus:outline-none focus:ring-2 focus:ring-scarlet/20 capitalize cursor-pointer"
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
              <label className="block text-[10px] text-gray-400 font-black uppercase mb-1 tracking-tighter">
                Tera Type
              </label>
              <select
                value={member.teraType}
                onChange={(e) => onUpdate(index, { teraType: e.target.value })}
                className="w-full bg-gray-50 border-2 border-black rounded-lg px-2 py-1.5 text-xs text-black font-bold focus:outline-none focus:ring-2 focus:ring-scarlet/20 capitalize cursor-pointer"
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
            <label className="block text-[10px] text-gray-400 font-black uppercase mb-1 tracking-tighter">
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
            <div className="mt-1 min-h-[30px] bg-gray-50 border-2 border-black rounded-lg px-2 py-1.5 shadow-inner">
              {previewItemDesc ? (
                <p className="text-[10px] text-scarlet font-bold animate-in fade-in leading-snug">
                  <strong className="text-black uppercase text-[9px]">
                    Preview:
                  </strong>{" "}
                  {previewItemDesc}
                </p>
              ) : member.heldItemDescription ? (
                <p className="text-[10px] text-gray-600 leading-snug font-medium">
                  {member.heldItemDescription}
                </p>
              ) : (
                <p className="text-[10px] text-gray-400 italic font-medium">
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
              <div className="flex flex-wrap gap-1.5">
                {recommendations.map((item) => (
                  <button
                    key={item.name}
                    onClick={() => handleItemSelect(item.name)}
                    onMouseEnter={() => handleRecommendationHover(item.name)}
                    onMouseLeave={() => handleRecommendationHover(null)}
                    className="px-2 py-1 bg-white border-2 border-black hover:bg-gray-50 rounded-lg flex items-center gap-1.5 transition-all active:scale-95 group text-left shadow-sm"
                  >
                    <span className="text-[10px] font-black text-black">
                      {item.name}
                    </span>
                    <span className="text-[9px] text-gray-400 group-hover:text-scarlet font-bold hidden sm:inline-block">
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
