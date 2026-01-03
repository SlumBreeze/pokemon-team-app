import React, { useState, useEffect, useRef } from "react";
import TeamSlot from "./components/TeamSlot";
import AnalysisSection from "./components/AnalysisSection";
import PokedexView from "./components/PokedexView";
import ProfileManager from "./components/ProfileManager";
import PokemonFinder from "./components/PokemonFinder";
import ErrorHandlingTest from "./components/ErrorHandlingTest";
import { TeamMember, Profile, ProfilesState } from "./types";
import { fetchPokemon, fetchEvolutionInfo } from "./services/pokeApi";
import { generateBestTeam } from "./utils/teamOptimizer";
import { useToast } from "./components/Toast";
import { ErrorBoundary } from "./components/ErrorBoundary";
import {
  Save,
  Upload,
  LayoutGrid,
  Users,
  MapPin,
  CheckCircle,
  AlertCircle,
  Sun,
  Moon,
} from "lucide-react";

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
  moves: [null, null, null, null],
}));

const STORAGE_KEY = "sv-profiles-v1";

const createDefaultProfile = (): Profile => ({
  id: generateId(),
  name: "Default",
  team: INITIAL_TEAM,
  lastUpdated: Date.now(),
});

const App: React.FC = () => {
  const { showToast } = useToast();

  // --- Profile State ---
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [activeProfileId, setActiveProfileId] = useState<string>("");
  const [globalCaughtPokemon, setGlobalCaughtPokemon] = useState<string[]>([]);
  const [globalShinyPokemon, setGlobalShinyPokemon] = useState<string[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [storageType, setStorageType] = useState<
    "firebase" | "local" | "offline"
  >("offline");
  const [syncStatus, setSyncStatus] = useState<
    "synced" | "syncing" | "error" | "local"
  >("local");
  const [lastUpdated, setLastUpdated] = useState<number>(0);

  // --- Theme State ---
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme-preference');
    if (saved === null) return true;
    return saved === 'dark';
  });

  // --- Global State ---
  const [activeTab, setActiveTab] = useState<"builder" | "pokedex" | "finder" | "test">(
    "builder"
  );
  const [isAutoBuilding, setIsAutoBuilding] = useState(false);
  const [isRearranging, setIsRearranging] = useState(false);
  const [targetBossType, setTargetBossType] = useState<string | undefined>(
    undefined
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get current profile data
  const activeProfile = profiles[activeProfileId];
  const team = activeProfile?.team || INITIAL_TEAM;
  const caughtPokemon = globalCaughtPokemon;

  // --- Profile Persistence (API + LocalStorage) ---
  useEffect(() => {
    // Load profiles from server on mount
    const loadProfiles = async () => {
      let serverData = null;
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_URL || ""}/api/profiles`
        );
        serverData = await response.json();
      } catch (e) {
        console.warn("Server profiles unreachable:", e);
      }

      // Try LocalStorage
      let localData: any = null;
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          localData = JSON.parse(stored);
        }
      } catch (e) {
        console.error("LocalStorage error:", e);
      }

      // Merge Logic: Server > Local > Default
      let mergedProfiles = {};
      let mergedActiveId = "";
      let mergedCaught: string[] = [];
      let mergedShiny: string[] = [];
      let currentStorageType: "firebase" | "local" | "offline" = "offline";

      // Always prefer Server data if available (even if empty)
      if (serverData) {
        console.log("Using Server data as source of truth.");
        mergedProfiles = serverData.profiles || {};
        mergedActiveId = serverData.activeProfileId || "";
        mergedCaught = serverData.globalCaughtPokemon || [];
        mergedShiny = serverData.globalShinyPokemon || [];
        currentStorageType = serverData.storageType || "firebase";

        // If server returned NO profiles, create a default one immediately
        if (Object.keys(mergedProfiles).length === 0) {
          console.log("Server data empty, creating default profile.");
          const defaultProfile = createDefaultProfile();
          mergedProfiles = { [defaultProfile.id]: defaultProfile };
          mergedActiveId = defaultProfile.id;
        }
        // If server has profiles but no active ID, pick the first one
        else if (!mergedActiveId) {
           mergedActiveId = Object.keys(mergedProfiles)[0];
        }
      } else if (
        localData &&
        localData.profiles &&
        Object.keys(localData.profiles).length > 0
      ) {
        // Server offline, but LocalStorage has data
        console.log("Using LocalStorage backup");
        mergedProfiles = localData.profiles;
        mergedActiveId = localData.activeProfileId;
        mergedCaught = localData.globalCaughtPokemon || [];
        mergedShiny = localData.globalShinyPokemon || [];
        currentStorageType = "offline";
      } else {
        // Nothing anywhere, create default
        const defaultProfile = createDefaultProfile();
        mergedProfiles = { [defaultProfile.id]: defaultProfile };
        mergedActiveId = defaultProfile.id;
        mergedCaught = [];
        currentStorageType = serverData
          ? serverData.storageType || "local"
          : "offline";
      }

      setProfiles(mergedProfiles);
      setActiveProfileId(mergedActiveId);
      setGlobalCaughtPokemon(mergedCaught);
      setGlobalShinyPokemon(mergedShiny);
      setStorageType(currentStorageType);

      // Update sync status based on storage type
      if (currentStorageType === "firebase") {
        setSyncStatus("synced");
      } else {
        setSyncStatus("local");
      }

      setIsLoaded(true);
    };

    loadProfiles();
  }, []);

  // Save profiles to server on change (debounced) and LocalStorage (immediately)
  useEffect(() => {
    if (!isLoaded || Object.keys(profiles).length === 0) return;

    const timestamp = Date.now();
    setLastUpdated(timestamp);

    const state: ProfilesState = {
      activeProfileId,
      profiles,
      globalCaughtPokemon,
      globalShinyPokemon,
      lastUpdated: timestamp,
    };

    // 1. Immediate LocalStorage Save
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error("Failed to save to localStorage", e);
    }

    // Set status to syncing if we are online/using firebase
    if (storageType === "firebase") {
      setSyncStatus("syncing");
    }

    // 2. Debounced Server Save
    const saveTimeout = setTimeout(async () => {
      try {
        await fetch(`${import.meta.env.VITE_API_URL || ""}/api/profiles`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(state),
        });
        setSyncStatus("synced");
      } catch (e) {
        console.error("Failed to save profiles to server:", e);
        setStorageType("offline"); // Update status if save fails
        setSyncStatus("error");
      }
    }, 500); // Debounce 500ms

    return () => clearTimeout(saveTimeout);
  }, [profiles, activeProfileId, globalCaughtPokemon, globalShinyPokemon, isLoaded]);

  // Theme persistence
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme-preference', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme-preference', 'light');
    }
  }, [isDarkMode]);

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

  // --- Global Pokedex Migration Bridge ---
  // If legacy data exists in ANY profile, merge it into global and clean up.
  useEffect(() => {
    if (!isLoaded || Object.keys(profiles).length === 0) return;

    const allCaught = new Set<string>(globalCaughtPokemon);
    let hasLegacyData = false;

    // Check all profiles for legacy caught lists
    Object.values(profiles).forEach((p: any) => {
      if (
        p.caughtPokemon &&
        Array.isArray(p.caughtPokemon) &&
        p.caughtPokemon.length > 0
      ) {
        p.caughtPokemon.forEach((name: string) => allCaught.add(name));
        hasLegacyData = true;
      }
    });

    if (hasLegacyData) {
      console.log("Migration: Legacy Pokedex data detected. Merging...");
      const mergedList = Array.from(allCaught);
      setGlobalCaughtPokemon(mergedList);

      // Clean up legacy data from ALL profiles in the state
      setProfiles((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((id) => {
          const p = { ...next[id] };
          if ((p as any).caughtPokemon) {
            delete (p as any).caughtPokemon;
          }
          next[id] = p as Profile;
        });
        return next;
      });
    }
  }, [isLoaded, profiles, globalCaughtPokemon]);

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
      typeof updater === "function" ? updater(globalCaughtPokemon) : updater;
    setGlobalCaughtPokemon(newCaught);
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

  const moveMember = (index: number, direction: "left" | "right") => {
    const newIndex = direction === "left" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex > 5) return;

    setTeam((prev) => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[newIndex];
      next[newIndex] = temp;
      return next;
    });
  };

  // --- Pokedex Logic ---
  const toggleCaught = (name: string) => {
    setCaughtPokemon((prev) => {
      if (prev.includes(name)) return prev.filter((n) => n !== name);
      return [...prev, name];
    });
  };

  const toggleShiny = (name: string) => {
    setGlobalShinyPokemon((prev) => {
      if (prev.includes(name)) return prev.filter((n) => n !== name);
      return [...prev, name];
    });
    // Also mark as caught if not already
    if (!globalCaughtPokemon.includes(name)) {
      setCaughtPokemon((prev) => [...prev, name]);
    }
  };

  const handleAutoBuild = async (overrideTargetType?: string) => {
    if (caughtPokemon.length === 0) return;
    setIsAutoBuilding(true);

    try {
      // Use override type (from Analysis) or global state (from main flow - though main flow usually clears it)
      const targetType = overrideTargetType || targetBossType;

      // Debug logging to verify full Pokedex is being scanned
      console.log(
        `[Auto Build] Scanning ${caughtPokemon.length
        } caught Pokemon. Target Boss Type: ${targetType || "None (General)"}`
      );

      const bestTeamNames = await generateBestTeam(
        caughtPokemon,
        team,
        targetType
      );

      console.log(`[Auto Build] Generated team: ${bestTeamNames.join(", ")}`);

      const newTeam = [...team];
      // List of names to distribute into unlocked slots
      // We must subtract the locked mons that are staying in place to avoid duplication
      const namesToDistribute = [...bestTeamNames];

      // Log locked status
      const lockedSlots = team.filter((m) => m.locked).length;
      console.log(`[Auto Build] Locked slots: ${lockedSlots}`);

      team.forEach((member, idx) => {
        if (member.locked && member.data) {
          console.log(
            `[Auto Build] Slot ${idx} is LOCKED with ${member.data.name}`
          );
          const nameIdx = namesToDistribute.indexOf(member.data.name);
          if (nameIdx > -1) {
            namesToDistribute.splice(nameIdx, 1);
          }
        }
      });

      console.log(
        `[Auto Build] Names to distribute (after removing locked): ${namesToDistribute.join(
          ", "
        )}`
      );

      for (let i = 0; i < 6; i++) {
        if (!newTeam[i].locked) {
          if (namesToDistribute.length > 0) {
            const name = namesToDistribute.shift()!;
            console.log(`[Auto Build] Filling slot ${i} with: ${name}`);
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
            console.log(`[Auto Build] Clearing slot ${i} (no more names)`);
            newTeam[i] = {
              ...INITIAL_TEAM[i],
              id: newTeam[i].id,
              locked: false,
            };
          }
        } else {
          console.log(`[Auto Build] Skipping slot ${i} (locked)`);
        }
      }

      console.log(
        `[Auto Build] Final team: ${newTeam
          .map((m) => m.data?.name || "empty")
          .join(", ")}`
      );

      setTeam(newTeam);
      setActiveTab("builder"); // Switch back to view result
    } catch (e) {
      console.error("Auto build failed", e);
      showToast("Failed to auto-build team. Please try again.", "error");
    } finally {
      setIsAutoBuilding(false);
    }
  };

  // --- Save System ---
  const handleExport = () => {
    const data = JSON.stringify(
      { team, globalCaughtPokemon: caughtPokemon },
      null,
      2
    );
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
        if (
          parsed.globalCaughtPokemon &&
          Array.isArray(parsed.globalCaughtPokemon)
        )
          setGlobalCaughtPokemon(parsed.globalCaughtPokemon);
        else if (parsed.caughtPokemon && Array.isArray(parsed.caughtPokemon))
          setGlobalCaughtPokemon(parsed.caughtPokemon); // Legacy support
        showToast("Save file imported successfully!", "success");
      } catch (err) {
        showToast("Failed to parse save file.", "error");
      }
    };
    reader.readAsText(file);
    // Reset input
    e.target.value = "";
  };

  const handleExportPokedex = () => {
    if (globalCaughtPokemon.length === 0) return;
    const data = JSON.stringify(
      {
        trainer: "Paldea Trainer",
        exportDate: new Date().toISOString(),
        pokedexCount: globalCaughtPokemon.length,
        caughtPokemon: globalCaughtPokemon,
      },
      null,
      2
    );
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pokedex-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleManualSync = async () => {
    if (!isLoaded) return;

    setSyncStatus("syncing");
    const timestamp = Date.now();
    setLastUpdated(timestamp);

    const state: ProfilesState = {
      activeProfileId,
      profiles,
      globalCaughtPokemon,
      globalShinyPokemon,
      lastUpdated: timestamp,
    };

    try {
      // Also update local storage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

      const res = await fetch(`${import.meta.env.VITE_API_URL || ""}/api/profiles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(state),
      });

      if (res.ok) {
        setSyncStatus("synced");
        setStorageType("firebase"); // Assume we are back online if this works
        showToast("Sync completed successfully!", "success");
      } else {
        throw new Error("Server responded with error");
      }
    } catch (e) {
      console.error("Manual sync failed:", e);
      setSyncStatus("error");
      showToast("Sync failed. Checking connection...", "error");
      // Check if server is reachable at all
      try {
        await fetch(`${import.meta.env.VITE_API_URL || ""}/api/profiles`);
      } catch (pingError) {
        setStorageType("offline");
      }
    }
  };

  const toggleTheme = () => {
    setIsDarkMode(prev => !prev);
  };

  return (
    <div className="min-h-screen bg-scarlet dark:bg-dark-bg text-dark dark:text-dark-text font-sans pb-20 transition-colors duration-200">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept=".json"
      />

      {/* Header */}
      <header className="bg-white dark:bg-dark-card border-b-8 border-black dark:border-dark-border sticky top-0 z-50 shadow-xl transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white border-4 border-black rounded-full flex items-center justify-center relative shadow-inner">
                <div className="w-4 h-4 bg-white border-2 border-black rounded-full z-10"></div>
                <div className="absolute top-0 left-0 w-full h-1/2 bg-scarlet border-b-2 border-black rounded-t-full"></div>
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-black tracking-tighter uppercase text-black dark:text-dark-text drop-shadow-sm flex items-center gap-2">
                  Trainer Hub <span className="text-scarlet">SV</span>
                </h1>
                <div className="flex items-center gap-2">
                  <p className="text-[10px] text-gray-500 dark:text-dark-text-secondary tracking-widest uppercase font-bold">
                    Team Analyzer & Management
                  </p>

                  {/* Sync Status Indicator */}
                  {syncStatus === "synced" && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase bg-green-100 text-green-700 flex items-center gap-1">
                      ☁️ Cloud Synced
                    </span>
                  )}
                  {syncStatus === "syncing" && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase bg-blue-100 text-blue-700 flex items-center gap-1 animate-pulse">
                      🔄 Syncing...
                    </span>
                  )}
                  {(syncStatus === "local" || syncStatus === "error") && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase bg-red-100 text-red-600 flex items-center gap-1">
                      ⚠️ Local Only
                    </span>
                  )}

                  {/* Manual Sync Button */}
                  <button
                    onClick={handleManualSync}
                    className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase bg-gray-100 dark:bg-dark-card text-gray-700 dark:text-dark-text hover:bg-gray-200 dark:hover:bg-dark-border transition-colors border border-gray-300 dark:border-dark-border ml-1"
                    title="Force Save to Cloud"
                  >
                    Sync Now
                  </button>

                  {/* Theme Toggle Button */}
                  <button
                    onClick={toggleTheme}
                    className="px-3 py-1.5 rounded-lg font-bold text-xs uppercase bg-gray-100 dark:bg-dark-card text-gray-700 dark:text-dark-text hover:bg-gray-200 dark:hover:bg-dark-border transition-colors border-2 border-gray-300 dark:border-dark-border ml-2 flex items-center gap-1.5 shadow-sm"
                    title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
                    aria-label={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
                  >
                    {isDarkMode ? (
                      <>
                        <Sun size={14} className="text-yellow-400" />
                        <span>Light</span>
                      </>
                    ) : (
                      <>
                        <Moon size={14} className="text-indigo-400" />
                        <span>Dark</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex bg-gray-100 dark:bg-dark-card rounded-full p-1 border-2 border-black dark:border-dark-border shadow-md transition-colors duration-200">
              <button
                onClick={() => setActiveTab("builder")}
                className={`flex items-center gap-2 px-6 py-2 rounded-full text-sm font-bold transition-all ${activeTab === "builder"
                  ? "bg-scarlet text-white shadow-md"
                  : "text-gray-500 dark:text-dark-text-secondary hover:text-black dark:hover:text-dark-text hover:bg-gray-200 dark:hover:bg-dark-border"
                  }`}
              >
                <Users size={16} /> Team Builder
              </button>
              <button
                onClick={() => setActiveTab("pokedex")}
                className={`flex items-center gap-2 px-6 py-2 rounded-full text-sm font-bold transition-all ${activeTab === "pokedex"
                  ? "bg-black dark:bg-dark-bg text-white shadow-md"
                  : "text-gray-500 dark:text-dark-text-secondary hover:text-black dark:hover:text-dark-text hover:bg-gray-200 dark:hover:bg-dark-border"
                  }`}
              >
                <LayoutGrid size={16} /> My Pokedex
              </button>

              <button
                onClick={() => setActiveTab("finder")}
                className={`flex items-center gap-2 px-6 py-2 rounded-full text-sm font-bold transition-all ${activeTab === "finder"
                  ? "bg-scarlet text-white shadow-md"
                  : "text-gray-500 dark:text-dark-text-secondary hover:text-black dark:hover:text-dark-text hover:bg-gray-200 dark:hover:bg-dark-border"
                  }`}
              >
                <MapPin size={16} /> Locations
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
                globalCaughtPokemon={globalCaughtPokemon}
              />
              <div className="h-6 w-px bg-gray-200 dark:bg-dark-border" />
              <button
                onClick={handleImportClick}
                className="p-2 text-gray-400 dark:text-dark-text-secondary hover:text-black dark:hover:text-dark-text hover:bg-gray-100 dark:hover:bg-dark-border rounded-full transition-colors border border-transparent hover:border-gray-200 dark:hover:border-dark-border"
                title="Import Save File"
              >
                <Upload size={16} />
              </button>
              <button
                onClick={handleExport}
                className="p-2 text-gray-400 dark:text-dark-text-secondary hover:text-black dark:hover:text-dark-text hover:bg-gray-100 dark:hover:bg-dark-border rounded-full transition-colors border border-transparent hover:border-gray-200 dark:hover:border-dark-border"
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
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <h2 className="text-xl font-bold text-white uppercase tracking-wide flex items-center gap-2 drop-shadow-md">
                  <span className="w-2 h-8 bg-black rounded-full inline-block"></span>
                  Current Team
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsRearranging(!isRearranging)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all border-2 ${isRearranging
                      ? "bg-amber-500 border-white text-white shadow-[0_0_15px_rgba(245,158,11,0.4)]"
                      : "bg-white border-black text-black hover:bg-gray-100"
                      }`}
                  >
                    {isRearranging ? (
                      <>
                        <CheckCircle size={14} /> Finish Rearranging
                      </>
                    ) : (
                      <>
                        <LayoutGrid size={14} /> Rearrange Team
                      </>
                    )}
                  </button>
                </div>
              </div>

              <ErrorBoundary>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {team.map((member, index) => (
                    <TeamSlot
                      key={member.id}
                      index={index}
                      member={member}
                      onUpdate={updateMember}
                      onClear={clearMember}
                      onToggleLock={toggleLock}
                      isRearranging={isRearranging}
                      onMove={moveMember}
                    />
                  ))}
                </div>
              </ErrorBoundary>
            </div>
            <ErrorBoundary>
              <AnalysisSection
                team={team}
                onBossSelect={setTargetBossType}
                caughtPokemon={caughtPokemon}
                onToggleCaught={toggleCaught}
                onAutoBuildTeam={handleAutoBuild}
                isBuilding={isAutoBuilding}
              />
            </ErrorBoundary>
          </div>
        )}

        {activeTab === "pokedex" && (
          <div className="animate-in slide-in-from-right-4 duration-300">
            <ErrorBoundary>
              <PokedexView
                caughtPokemon={caughtPokemon}
                shinyPokemon={globalShinyPokemon}
                onToggleCaught={toggleCaught}
                onToggleShiny={toggleShiny}
                onAutoBuild={handleAutoBuild}
                isBuilding={isAutoBuilding}
                onExport={handleExportPokedex}
              />
            </ErrorBoundary>
          </div>
        )}

        {activeTab === "finder" && (
          <div className="animate-in slide-in-from-right-4 duration-300">
            <ErrorBoundary>
              <PokemonFinder />
            </ErrorBoundary>
          </div>
        )}

        {activeTab === "test" && (
          <div className="animate-in slide-in-from-right-4 duration-300">
            <ErrorHandlingTest />
          </div>
        )}
      </main>

      <footer className="text-center py-8 text-white/60 dark:text-dark-text-secondary text-sm">
        <p>
          &copy; {new Date().getFullYear()} Trainer Hub Analyzer. Pokémon Data
          provided by PokéAPI.
        </p>
        <p className="text-xs mt-1">
          Pokémon and Pokémon character names are trademarks of Nintendo.
        </p>
        <button
          onClick={() => setActiveTab("test")}
          className="text-xs mt-2 hover:text-white dark:hover:text-dark-text transition-colors"
        >
          Test Errors
        </button>
      </footer>
    </div>
  );
};

export default App;
