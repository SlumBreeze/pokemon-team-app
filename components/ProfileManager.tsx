import React, { useState, useRef, useEffect, useMemo } from "react";
import { Profile } from "../types";
import {
  User,
  ChevronDown,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Copy,
} from "lucide-react";

interface ProfileManagerProps {
  profiles: Record<string, Profile>;
  activeProfileId: string;
  onSwitchProfile: (profileId: string) => void;
  onCreateProfile: (name: string) => void;
  onRenameProfile: (profileId: string, newName: string) => void;
  onDeleteProfile: (profileId: string) => void;
  onDuplicateProfile: (profileId: string) => void;
  globalCaughtPokemon: string[];
}

const ProfileManager: React.FC<ProfileManagerProps> = ({
  profiles,
  activeProfileId,
  onSwitchProfile,
  onCreateProfile,
  onRenameProfile,
  onDeleteProfile,
  onDuplicateProfile,
  globalCaughtPokemon,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isRenaming, setIsRenaming] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const activeProfile = profiles[activeProfileId];
  const profileList = useMemo(() => {
    return Object.values(profiles).sort(
      (a: Profile, b: Profile) => (b.lastUpdated || 0) - (a.lastUpdated || 0)
    );
  }, [profiles]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setIsCreating(false);
        setIsRenaming(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Focus input when creating/renaming
  useEffect(() => {
    if ((isCreating || isRenaming) && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isCreating, isRenaming]);

  const handleCreate = () => {
    if (inputValue.trim()) {
      onCreateProfile(inputValue.trim());
      setInputValue("");
      setIsCreating(false);
    }
  };

  const handleRename = (profileId: string) => {
    if (inputValue.trim()) {
      onRenameProfile(profileId, inputValue.trim());
      setInputValue("");
      setIsRenaming(null);
    }
  };

  const handleDelete = (profileId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (Object.keys(profiles).length <= 1) {
      alert("Cannot delete the only profile!");
      return;
    }

    // Direct delete - user clicked trash icon intentionally
    console.log("Deleting profile:", profileId);
    onDeleteProfile(profileId);
  };

  const startRename = (
    profileId: string,
    currentName: string,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    setIsRenaming(profileId);
    setInputValue(currentName);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Profile Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-gray-50 hover:bg-gray-100 border-2 border-black rounded-full transition-all shadow-sm active:scale-95"
      >
        <User size={16} className="text-scarlet" />
        <span className="text-black text-sm font-black max-w-[120px] truncate uppercase tracking-tighter">
          {activeProfile?.name || "Profile"}
        </span>
        <ChevronDown
          size={14}
          className={`text-black transition-transform ${isOpen ? "rotate-180" : ""
            }`}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-white border-2 border-black rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="px-4 py-3 border-b-2 border-black bg-gray-50">
            <span className="text-[10px] text-gray-400 uppercase font-black tracking-widest">
              Available Sessions
              <span className="float-right text-scarlet">{globalCaughtPokemon.length} Caught</span>
            </span>
          </div>

          <div className="max-h-60 overflow-y-auto">
            {profileList.map((profile) => (
              <div
                key={profile.id}
                onClick={() => {
                  if (isRenaming !== profile.id) {
                    onSwitchProfile(profile.id);
                    setIsOpen(false);
                  }
                }}
                className={`flex items-center justify-between px-4 py-3 cursor-pointer transition-all ${profile.id === activeProfileId
                  ? "bg-scarlet text-white font-black"
                  : "hover:bg-gray-50 text-black border-b border-gray-100"
                  }`}
              >
                {isRenaming === profile.id ? (
                  <div
                    className="flex items-center gap-2 flex-grow"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      ref={inputRef}
                      type="text"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleRename(profile.id);
                        if (e.key === "Escape") setIsRenaming(null);
                      }}
                      className="flex-grow bg-white text-black text-sm px-2 py-1.5 rounded-lg border-2 border-black focus:outline-none"
                    />
                    <button
                      onClick={() => handleRename(profile.id)}
                      className="text-green-400 hover:text-green-300"
                    >
                      <Check size={14} />
                    </button>
                    <button
                      onClick={() => setIsRenaming(null)}
                      className="text-gray-400 hover:text-white"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex-grow">
                      <span className={`text-sm ${profile.id === activeProfileId ? 'text-white' : 'text-black font-bold'}`}>{profile.name}</span>
                      <div className={`text-[10px] ${profile.id === activeProfileId ? 'text-white/70' : 'text-gray-400'} font-bold uppercase tracking-tighter`}>
                        {profile.team.filter((m) => m.data).length} pkmn
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) =>
                          startRename(profile.id, profile.name, e)
                        }
                        className={`p-1.5 rounded transition-colors ${profile.id === activeProfileId ? 'text-white/70 hover:text-white hover:bg-white/10' : 'text-gray-400 hover:text-black hover:bg-gray-100'}`}
                        title="Rename"
                      >
                        <Edit2 size={12} />
                      </button>
                      <button
                        onClick={(e) => handleDelete(profile.id, e)}
                        className={`p-1.5 rounded transition-colors ${profile.id === activeProfileId ? 'text-white/70 hover:text-white hover:bg-white/10' : 'text-gray-400 hover:text-red-500 hover:bg-red-50'}`}
                        title="Delete"
                      >
                        <Trash2 size={12} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDuplicateProfile(profile.id);
                        }}
                        className={`p-1.5 rounded transition-colors ${profile.id === activeProfileId ? 'text-white/70 hover:text-white hover:bg-white/10' : 'text-gray-400 hover:text-blue-500 hover:bg-blue-50'}`}
                        title="Duplicate Profile"
                      >
                        <Copy size={12} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Create New Profile */}
          <div className="p-3 bg-gray-50 border-t-2 border-black">
            {isCreating ? (
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreate();
                    if (e.key === "Escape") setIsCreating(false);
                  }}
                  placeholder="Profile name..."
                  className="flex-grow bg-white text-black text-sm px-2 py-2 rounded-lg border-2 border-black focus:outline-none"
                />
                <button
                  onClick={handleCreate}
                  className="text-green-600 hover:text-green-500 p-1"
                >
                  <Check size={20} />
                </button>
                <button
                  onClick={() => setIsCreating(false)}
                  className="text-gray-400 hover:text-black p-1"
                >
                  <X size={20} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setIsCreating(true);
                  setInputValue("");
                }}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-black text-white hover:bg-gray-800 rounded-xl transition-all shadow-md active:scale-95 text-xs font-black uppercase tracking-widest"
              >
                <Plus size={16} />
                New Session
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileManager;
