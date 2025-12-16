import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Profile } from '../types';
import { User, ChevronDown, Plus, Trash2, Edit2, Check, X } from 'lucide-react';

interface ProfileManagerProps {
    profiles: Record<string, Profile>;
    activeProfileId: string;
    onSwitchProfile: (profileId: string) => void;
    onCreateProfile: (name: string) => void;
    onRenameProfile: (profileId: string, newName: string) => void;
    onDeleteProfile: (profileId: string) => void;
}

const ProfileManager: React.FC<ProfileManagerProps> = ({
    profiles,
    activeProfileId,
    onSwitchProfile,
    onCreateProfile,
    onRenameProfile,
    onDeleteProfile
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [isRenaming, setIsRenaming] = useState<string | null>(null);
    const [inputValue, setInputValue] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const activeProfile = profiles[activeProfileId];
    const profileList = useMemo(() => {
        return Object.values(profiles).sort((a, b) => b.lastUpdated - a.lastUpdated);
    }, [profiles]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsOpen(false);
                setIsCreating(false);
                setIsRenaming(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
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
            setInputValue('');
            setIsCreating(false);
        }
    };

    const handleRename = (profileId: string) => {
        if (inputValue.trim()) {
            onRenameProfile(profileId, inputValue.trim());
            setInputValue('');
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

        const profileName = profiles[profileId]?.name || 'this profile';
        const shouldDelete = window.confirm(`Delete profile "${profileName}"?`);

        if (shouldDelete) {
            onDeleteProfile(profileId);
        }
    };

    const startRename = (profileId: string, currentName: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setIsRenaming(profileId);
        setInputValue(currentName);
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Profile Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-2 bg-black/30 hover:bg-black/50 border border-pink-400/30 rounded-lg transition-colors"
            >
                <User size={16} className="text-pink-300" />
                <span className="text-white text-sm font-medium max-w-[120px] truncate">
                    {activeProfile?.name || 'Profile'}
                </span>
                <ChevronDown size={14} className={`text-pink-300 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden">
                    <div className="p-2 border-b border-gray-700">
                        <span className="text-[10px] text-gray-500 uppercase font-bold">Profiles</span>
                    </div>

                    <div className="max-h-60 overflow-y-auto">
                        {profileList.map(profile => (
                            <div
                                key={profile.id}
                                onClick={() => {
                                    if (isRenaming !== profile.id) {
                                        onSwitchProfile(profile.id);
                                        setIsOpen(false);
                                    }
                                }}
                                className={`flex items-center justify-between px-3 py-2 cursor-pointer transition-colors ${profile.id === activeProfileId
                                    ? 'bg-pink-600/20 border-l-2 border-pink-500'
                                    : 'hover:bg-gray-800 border-l-2 border-transparent'
                                    }`}
                            >
                                {isRenaming === profile.id ? (
                                    <div className="flex items-center gap-2 flex-grow" onClick={e => e.stopPropagation()}>
                                        <input
                                            ref={inputRef}
                                            type="text"
                                            value={inputValue}
                                            onChange={e => setInputValue(e.target.value)}
                                            onKeyDown={e => {
                                                if (e.key === 'Enter') handleRename(profile.id);
                                                if (e.key === 'Escape') setIsRenaming(null);
                                            }}
                                            className="flex-grow bg-gray-800 text-white text-sm px-2 py-1 rounded border border-gray-600 focus:outline-none focus:border-pink-500"
                                        />
                                        <button onClick={() => handleRename(profile.id)} className="text-green-400 hover:text-green-300">
                                            <Check size={14} />
                                        </button>
                                        <button onClick={() => setIsRenaming(null)} className="text-gray-400 hover:text-white">
                                            <X size={14} />
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex-grow">
                                            <span className="text-white text-sm">{profile.name}</span>
                                            <div className="text-[10px] text-gray-500">
                                                {profile.team.filter(m => m.data).length} Pokémon • {profile.caughtPokemon.length} caught
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={(e) => startRename(profile.id, profile.name, e)}
                                                className="p-1 text-gray-500 hover:text-white rounded transition-colors"
                                                title="Rename"
                                            >
                                                <Edit2 size={12} />
                                            </button>
                                            <button
                                                onClick={(e) => handleDelete(profile.id, e)}
                                                className="p-1 text-gray-500 hover:text-red-400 rounded transition-colors"
                                                title="Delete"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Create New Profile */}
                    <div className="p-2 border-t border-gray-700">
                        {isCreating ? (
                            <div className="flex items-center gap-2">
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={inputValue}
                                    onChange={e => setInputValue(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') handleCreate();
                                        if (e.key === 'Escape') setIsCreating(false);
                                    }}
                                    placeholder="Profile name..."
                                    className="flex-grow bg-gray-800 text-white text-sm px-2 py-1.5 rounded border border-gray-600 focus:outline-none focus:border-pink-500"
                                />
                                <button onClick={handleCreate} className="text-green-400 hover:text-green-300">
                                    <Check size={16} />
                                </button>
                                <button onClick={() => setIsCreating(false)} className="text-gray-400 hover:text-white">
                                    <X size={16} />
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => {
                                    setIsCreating(true);
                                    setInputValue('');
                                }}
                                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-pink-400 hover:text-pink-300 hover:bg-pink-900/20 rounded transition-colors text-sm font-medium"
                            >
                                <Plus size={16} />
                                New Profile
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProfileManager;
