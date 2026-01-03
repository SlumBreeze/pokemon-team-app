import React, { useCallback, useState } from "react";
import { MoveDetails, PokemonData } from "../types";
import { fetchMoveDetails } from "../services/pokeApi";
import { TYPE_COLORS } from "../constants";
import { X, Zap, Sparkles, BarChart3, Search } from "lucide-react";
import AutocompleteInput from "./AutocompleteInput";

interface MoveSelectorProps {
  memberData: PokemonData;
  selectedMoves: (MoveDetails | null)[];
  onUpdate: (moves: (MoveDetails | null)[]) => void;
}

const MoveSelector: React.FC<MoveSelectorProps> = ({
  memberData,
  selectedMoves,
  onUpdate,
}) => {
  const [inputs, setInputs] = useState<string[]>(["", "", "", ""]);

  // Memoize the move list provider for AutocompleteInput
  const getMoveNames = useCallback(async () => {
    return memberData.moves.map((m) => m.name);
  }, [memberData]);

  const handleInputChange = (index: number, val: string) => {
    const newInputs = [...inputs];
    newInputs[index] = val;
    setInputs(newInputs);
  };

  const handleMoveSelect = async (index: number, moveName: string) => {
    if (!moveName) return;

    // Clear input for this slot
    handleInputChange(index, "");

    // Find the move in the pokemon's move pool to get the URL
    // If not found (manual entry?), we might fail to get details, but we can try generic fetch or search
    const moveInfo = memberData.moves.find(
      (m) => m.name.toLowerCase() === moveName.toLowerCase()
    );

    let details: MoveDetails;

    if (moveInfo) {
      details = await fetchMoveDetails(moveInfo.url);
    } else {
      // Fallback: try to fetch by name directly from API (if user typed something valid but not in list)
      // or just create a dummy if we can't verify it.
      // For now, let's try to fetch by name if possible, or just fail gracefully.
      try {
        const res = await fetch(`https://pokeapi.co/api/v2/move/${moveName.toLowerCase().replace(/ /g, '-')}`);
        if (res.ok) {
           const data = await res.json();
           details = {
             name: data.name,
             power: data.power,
             accuracy: data.accuracy,
             damageClass: data.damage_class?.name || 'status',
             type: data.type?.name || 'normal',
             effectDescription: "Custom move",
             pp: data.pp
           };
        } else {
            throw new Error("Move not found");
        }
      } catch (e) {
          console.warn("Could not fetch details for custom move:", moveName);
          // Placeholder
          details = {
            name: moveName,
            power: null,
            accuracy: null,
            damageClass: 'status',
            type: 'normal',
            effectDescription: "Unknown move",
            pp: 0
          };
      }
    }

    const newMoves = [...(selectedMoves || [null, null, null, null])];
    newMoves[index] = details;
    onUpdate(newMoves);
  };

  const clearMove = (index: number) => {
    const newMoves = [...(selectedMoves || [null, null, null, null])];
    newMoves[index] = null;
    onUpdate(newMoves);
    // Ensure input is clear when showing it again
    handleInputChange(index, "");
  };

  const getDamageClassIcon = (damageClass: string) => {
    switch (damageClass) {
      case "physical":
        return <Zap size={10} className="text-orange-500" />;
      case "special":
        return <Sparkles size={10} className="text-purple-500" />;
      default:
        return <BarChart3 size={10} className="text-gray-500" />;
    }
  };

  return (
    <div className="mt-2 flex flex-col gap-2">
      <label className="text-[10px] text-gray-400 dark:text-dark-text-secondary font-black uppercase tracking-tighter">
        Moveset
      </label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {Array.from({ length: 4 }).map((_, i) => {
          const move = selectedMoves?.[i];

          return (
            <div
              key={i}
              className="relative group bg-gray-50 dark:bg-dark-card border border-black/10 dark:border-dark-border rounded-lg p-1.5 transition-all focus-within:ring-2 focus-within:ring-scarlet/20"
            >
              {move ? (
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-black capitalize text-black dark:text-dark-text truncate pr-4">
                      {move.name.replace(/-/g, " ")}
                    </span>
                    <button
                      onClick={() => clearMove(i)}
                      className="absolute right-1 top-1 p-0.5 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <X size={12} />
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className="text-[9px] font-bold uppercase px-1.5 rounded text-white shadow-sm"
                      style={{ backgroundColor: TYPE_COLORS[move.type] || "#777" }}
                    >
                      {move.type}
                    </span>
                    <div
                      className="flex items-center gap-0.5 px-1.5 py-0.5 bg-white dark:bg-dark-border/30 rounded border border-gray-200 dark:border-dark-border"
                      title={move.damageClass}
                    >
                      {getDamageClassIcon(move.damageClass)}
                    </div>
                    {move.power && (
                      <span className="text-[9px] font-bold text-gray-500 dark:text-dark-text-secondary">
                        {move.power}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <AutocompleteInput
                    value={inputs[i]}
                    onChange={(val) => handleInputChange(i, val)}
                    onSubmit={(val) => val && handleMoveSelect(i, val)}
                    fetchData={getMoveNames}
                    placeholder={`Move ${i + 1}...`}
                    isLoading={false}
                    className="py-1.5 px-3 text-xs"
                  />
                  {/* Overlay to make it look smaller/cleaner until focused? No, AutocompleteInput styles are fixed. 
                      Let's rely on AutocompleteInput's default styling but maybe compact it slightly if needed?
                      The standard input is a bit big.
                      We might want to pass a className to AutocompleteInput or wrap it.
                      The current AutocompleteInput has fixed classes. 
                      I might need to modify AutocompleteInput to accept className or 'size' prop.
                      For now, it's fine.
                  */}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MoveSelector;
