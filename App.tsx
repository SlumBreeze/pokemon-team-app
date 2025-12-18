import React, { useState, useEffect, useRef } from "react";
import TeamSlot from "./components/TeamSlot";
import AnalysisSection from "./components/AnalysisSection";
import PokedexView from "./components/PokedexView";
import ProfileManager from "./components/ProfileManager";
import { TeamMember, Profile, ProfilesState } from "./types";
import { fetchPokemon, fetchEvolutionInfo } from "./services/pokeApi";
import { generateBestTeam } from "./utils/teamOptimizer";
import { Save, Upload, LayoutGrid, Users } from "lucide-react";

const generateId = () => {
  try {
    return crypto.randomUUID();
  } catch (e) {
    return (
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15)
    );
  }
};

const INITIAL_TEAM: TeamMember[] = Array.from({ length: 6 }, (_, i) => ({
  id: `slot-${i}`,
  data: null,
  selectedAbility: "",
  abilityDescription: "",
  teraType: "",
  heldItem: "",
  heldItemDescription: "",
  level: 20,
  loading: false,
  error: null,
  customName: "",
  locked: false,
}));

const STORAGE_KEY = "sv-profiles-v1";

const createDefaultProfile = (): Profile => ({
  id: generateId(),
  name: "Default",
  team: INITIAL_TEAM,
  caughtPokemon: [],
  lastUpdated: Date.now(),
});

const App: React.FC = () => {
  // --- Profile State ---
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [activeProfileId, setActiveProfileId] = useState<string>("");
  const [isLoaded, setIsLoaded] = useState(false);

  // --- Global State ---
  const [activeTab, setActiveTab] = useState<"builder" | "pokedex">("builder");
  const [isAutoBuilding, setIsAutoBuilding] = useState(false);
  const [targetBossType, setTargetBossType] = useState<string | undefined>(
    undefined
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get current profile data
  const activeProfile = profiles[activeProfileId];
  const team = activeProfile?.team || INITIAL_TEAM;
  const caughtPokemon = activeProfile?.caughtPokemon || [];

  // --- Profile Persistence (API) ---
  useEffect(() => {
    // Load profiles from server on mount
    const loadProfiles = async () => {
      try {
        const response = await fetch("/api/profiles");
        const data = await response.json();

        if (data && data.profiles && Object.keys(data.profiles).length > 0) {
          setProfiles(data.profiles);
          setActiveProfileId(data.activeProfileId);
        } else {
          // No saved profiles or empty object from server, create default
          const defaultProfile = createDefaultProfile();
          setProfiles({ [defaultProfile.id]: defaultProfile });
          setActiveProfileId(defaultProfile.id);
        }
      } catch (e) {
        console.warn("Server profiles unreachable, using local default:", e);
        // Fallback to default profile if server unavailable
        const defaultProfile = createDefaultProfile();
        setProfiles({ [defaultProfile.id]: defaultProfile });
        setActiveProfileId(defaultProfile.id);
      }
      setIsLoaded(true);
    };

    loadProfiles();
  }, []);

  // Save profiles to server on change (debounced)
  useEffect(() => {
    if (!isLoaded || Object.keys(profiles).length === 0) return;

    const saveTimeout = setTimeout(async () => {
      try {
        const state: ProfilesState = { activeProfileId, profiles };
        await fetch("/api/profiles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(state),
        });
      } catch (e) {
        console.error("Failed to save profiles to server:", e);
      }
    }, 500); // Debounce 500ms

    return () => clearTimeout(saveTimeout);
  }, [profiles, activeProfileId, isLoaded]);

  // Hydrate evolution info for team members that are missing it
  useEffect(() => {
    if (!isLoaded || !activeProfile) return;

    const hydrateEvolutionInfo = async () => {
      const updatedTeam = await Promise.all(
        team.map(async (member) => {
          // Skip if no data or if evolution details already exist
          if (!member.data || member.evolutionDetails) {
            return member;
          }

          try {
            const evoInfo = await fetchEvolutionInfo(
              member.data.speciesUrl,
              member.data.name
            );
            return { ...member, evolutionDetails: evoInfo };
          } catch (e) {
            console.error("Failed to hydrate evolution info:", e);
            return {
              ...member,
              evolutionDetails: {
                isFullyEvolved: true,
                error: "Failed to load",
              },
            };
          }
        })
      );

      // Only update if something changed
      const hasChanges = updatedTeam.some(
        (m, i) => m.evolutionDetails !== team[i].evolutionDetails
      );
      if (hasChanges) {
        updateActiveProfile({ team: updatedTeam });
      }
    };

    hydrateEvolutionInfo();
  }, [isLoaded, activeProfileId]); // Re-run when profile changes

  // --- Profile Management ---
  const updateActiveProfile = (updates: Partial<Profile>) => {
    if (!activeProfileId) return;
    setProfiles((prev) => ({
      ...prev,
      [activeProfileId]: {
        ...prev[activeProfileId],
        ...updates,
        lastUpdated: Date.now(),
      },
    }));
  };

  const switchProfile = (profileId: string) => {
    setActiveProfileId(profileId);
  };

  const createProfile = (name: string) => {
    const newProfile = createDefaultProfile();
    newProfile.name = name;
    setProfiles((prev) => ({ ...prev, [newProfile.id]: newProfile }));
    setActiveProfileId(newProfile.id);
  };

  const renameProfile = (profileId: string, newName: string) => {
    setProfiles((prev) => ({
      ...prev,
      [profileId]: {
        ...prev[profileId],
        name: newName,
        lastUpdated: Date.now(),
      },
    }));
  };

  const deleteProfile = (profileId: string) => {
    const remainingIds = Object.keys(profiles).filter((id) => id !== profileId);
    if (remainingIds.length === 0) return;

    setProfiles((prev) => {
      const newProfiles = { ...prev };
      delete newProfiles[profileId];
      return newProfiles;
    });

    if (activeProfileId === profileId) {
      setActiveProfileId(remainingIds[0]);
    }
  };

  const duplicateProfile = (profileId: string) => {
    const original = profiles[profileId];
    if (!original) return;

    const newProfile: Profile = {
      ...original,
      id: generateId(),
      name: `${original.name} (Copy)`,
      lastUpdated: Date.now(),
    };

    setProfiles((prev) => ({ ...prev, [newProfile.id]: newProfile }));
    setActiveProfileId(newProfile.id);
  };

  // --- Team State Helpers ---
  const setTeam = (
    updater: TeamMember[] | ((prev: TeamMember[]) => TeamMember[])
  ) => {
    const newTeam = typeof updater === "function" ? updater(team) : updater;
    updateActiveProfile({ team: newTeam });
  };

  const setCaughtPokemon = (
    updater: string[] | ((prev: string[]) => string[])
  ) => {
    const newCaught =
      typeof updater === "function" ? updater(caughtPokemon) : updater;
    updateActiveProfile({ caughtPokemon: newCaught });
  };

  // --- Team Management ---
  const updateMember = (index: number, updates: Partial<TeamMember>) => {
    setTeam((prev) =>
      prev.map((member, i) =>
        i === index ? { ...member, ...updates } : member
      )
    );
  };

  const toggleLock = (index: number) => {
    setTeam((prev) =>
      prev.map((member, i) =>
        i === index ? { ...member, locked: !member.locked } : member
      )
    );
  };

  const clearMember = (index: number) => {
    setTeam((prev) =>
      prev.map((member, i) =>
        i === index
          ? {
              ...member,
              data: null,
              selectedAbility: "",
              abilityDescription: "",
              teraType: "",
              heldItem: "",
              heldItemDescription: "",
              level: 20,
              loading: false,
              error: null,
              customName: "",
              locked: false,
            }
          : member
      )
    );
  };

  // --- Pokedex Logic ---
  const toggleCaught = (name: string) => {
    setCaughtPokemon((prev) => {
      if (prev.includes(name)) return prev.filter((n) => n !== name);
      return [...prev, name];
    });
  };

  const handleAutoBuild = async (overrideTargetType?: string) => {
    if (caughtPokemon.length === 0) return;
    setIsAutoBuilding(true);

    try {
      // Use override type (from Analysis) or global state (from main flow - though main flow usually clears it)
      const targetType = overrideTargetType || targetBossType;
      const bestTeamNames = await generateBestTeam(
        caughtPokemon,
        team,
        targetType
      );

      const newTeam = [...team];
      // List of names to distribute into unlocked slots
      // We must subtract the locked mons that are staying in place to avoid duplication
      const namesToDistribute = [...bestTeamNames];

      team.forEach((member) => {
        if (member.locked && member.data) {
          const idx = namesToDistribute.indexOf(member.data.name);
          if (idx > -1) {
            namesToDistribute.splice(idx, 1);
          }
        }
      });

      for (let i = 0; i < 6; i++) {
        if (!newTeam[i].locked) {
          if (namesToDistribute.length > 0) {
            const name = namesToDistribute.shift()!;
            const data = await fetchPokemon(name);
            newTeam[i] = {
              ...INITIAL_TEAM[i],
              id: newTeam[i].id, // Keep slot ID
              data: data,
              teraType: data.types[0].type.name,
              selectedAbility: data.abilities[0]?.ability.name || "",
              loading: false,
              locked: false,
            };
          } else {
            // Clear slot if no more mons
            newTeam[i] = {
              ...INITIAL_TEAM[i],
              id: newTeam[i].id,
              locked: false,
            };
          }
        }
      }
      setTeam(newTeam);
      setActiveTab("builder"); // Switch back to view result
    } catch (e) {
      console.error("Auto build failed", e);
    } finally {
      setIsAutoBuilding(false);
    }
  };

  // --- Save System ---
  const handleExport = () => {
    const data = JSON.stringify({ team, caughtPokemon }, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pokemon-team-sv-${new Date()
      .toISOString()
      .slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.team && Array.isArray(parsed.team)) setTeam(parsed.team);
        if (parsed.caughtPokemon && Array.isArray(parsed.caughtPokemon))
          setCaughtPokemon(parsed.caughtPokemon);
        alert("Save file imported successfully!");
      } catch (err) {
        alert("Failed to parse save file.");
      }
    };
    reader.readAsText(file);
    // Reset input
    e.target.value = "";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-gray-100 font-sans pb-20">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept=".json"
      />

      {/* Header */}
      <header className="bg-gradient-to-r from-pink-600/90 via-fuchsia-600/90 to-purple-700/90 backdrop-blur-md border-b border-pink-400/30 sticky top-0 z-50 shadow-lg shadow-purple-900/30">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-black tracking-tighter uppercase text-white drop-shadow-lg">
                  Scarlet<span className="text-pink-200 mx-1">&</span>Violet
                </h1>
                <p className="text-[10px] text-pink-100/80 tracking-widest uppercase">
                  Trainer Hub & Team Analyzer
                </p>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex bg-black/40 rounded-full p-1 border border-gray-700">
              <button
                onClick={() => setActiveTab("builder")}
                className={`flex items-center gap-2 px-6 py-2 rounded-full text-sm font-bold transition-all ${
                  activeTab === "builder"
                    ? "bg-scarlet-600 text-white shadow-lg"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <Users size={16} /> Team Builder
              </button>
              <button
                onClick={() => setActiveTab("pokedex")}
                className={`flex items-center gap-2 px-6 py-2 rounded-full text-sm font-bold transition-all ${
                  activeTab === "pokedex"
                    ? "bg-violet-600 text-white shadow-lg"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <LayoutGrid size={16} /> My Pokedex
              </button>
            </div>

            {/* Profile & Save Tools */}
            <div className="flex items-center gap-3">
              <ProfileManager
                profiles={profiles}
                activeProfileId={activeProfileId}
                onSwitchProfile={switchProfile}
                onCreateProfile={createProfile}
                onRenameProfile={renameProfile}
                onDeleteProfile={deleteProfile}
                onDuplicateProfile={duplicateProfile}
              />
              <div className="h-6 w-px bg-pink-400/30" />
              <button
                onClick={handleImportClick}
                className="p-2 text-pink-200/60 hover:text-white hover:bg-white/10 rounded transition-colors"
                title="Import Save File"
              >
                <Upload size={16} />
              </button>
              <button
                onClick={handleExport}
                className="p-2 text-pink-200/60 hover:text-white hover:bg-white/10 rounded transition-colors"
                title="Export Save File"
              >
                <Save size={16} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {activeTab === "builder" && (
          <div className="animate-in slide-in-from-left-4 duration-300">
            <div className="mb-6">
              <h2 className="text-xl font-bold mb-4 text-scarlet-400 uppercase tracking-wide flex items-center gap-2">
                <span className="w-2 h-8 bg-scarlet-600 rounded-full inline-block"></span>
                Current Team
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {team.map((member, index) => (
                  <TeamSlot
                    key={member.id}
                    index={index}
                    member={member}
                    onUpdate={updateMember}
                    onClear={clearMember}
                    onToggleLock={toggleLock}
                  />
                ))}
              </div>
            </div>
            <AnalysisSection
              team={team}
              onBossSelect={setTargetBossType}
              caughtPokemon={caughtPokemon}
              onToggleCaught={toggleCaught}
              onAutoBuildTeam={handleAutoBuild}
              isBuilding={isAutoBuilding}
            />
          </div>
        )}

        {activeTab === "pokedex" && (
          <div className="animate-in slide-in-from-right-4 duration-300">
            <PokedexView
              caughtPokemon={caughtPokemon}
              onToggleCaught={toggleCaught}
              onAutoBuild={handleAutoBuild}
              isBuilding={isAutoBuilding}
            />
          </div>
        )}
      </main>

      <footer className="text-center py-8 text-gray-600 text-sm">
        <p>
          &copy; {new Date().getFullYear()} Team Analyzer. Pokémon Data provided
          by PokéAPI.
        </p>
        <p className="text-xs mt-1">
          Pokémon and Pokémon character names are trademarks of Nintendo.
        </p>
      </footer>
    </div>
  );
};

export default App;
