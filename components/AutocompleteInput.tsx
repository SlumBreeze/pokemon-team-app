import React, { useState, useEffect, useRef } from 'react';
import { Loader2, Search } from 'lucide-react';

interface AutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value?: string) => void;
  fetchData: () => Promise<string[]>; // Made generic
  placeholder?: string;
  isLoading?: boolean;
  onBlur?: () => void;
  className?: string;
}

const AutocompleteInput: React.FC<AutocompleteInputProps> = ({
  value,
  onChange,
  onSubmit,
  fetchData,
  placeholder,
  isLoading,
  onBlur,
  className = ""
}) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [allOptions, setAllOptions] = useState<string[]>([]);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Load data source on mount
  useEffect(() => {
    fetchData().then(setAllOptions);
  }, [fetchData]);

  // Handle clicking outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter suggestions when value changes
  useEffect(() => {
    if (!value || value.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const lowerVal = value.toLowerCase();

    // Sort logic: Starts with query first, then alphabetical
    const filtered = allOptions
      .filter(n => n.includes(lowerVal))
      .sort((a, b) => {
        const aStarts = a.startsWith(lowerVal);
        const bStarts = b.startsWith(lowerVal);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        return a.localeCompare(b);
      })
      .slice(0, 8); // Limit to 8 suggestions for clean UI

    setSuggestions(filtered);
    // Only show if we have results and it's not an exact match already
    setShowSuggestions(filtered.length > 0 && filtered[0] !== lowerVal);
  }, [value, allOptions]);

  const handleSuggestionClick = (name: string) => {
    onChange(name);
    setShowSuggestions(false);
    // Pass the selected name directly to onSubmit to avoid state race conditions
    onSubmit(name);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      setShowSuggestions(false);
      onSubmit(value);
    }
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      <input
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setShowSuggestions(true);
        }}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          // Delay blur to allow suggestion click to register
          setTimeout(() => {
            if (onBlur) onBlur();
          }, 200);
        }}
        placeholder={placeholder}
        className={`w-full bg-gray-50 dark:bg-dark-card border-2 border-black dark:border-dark-border rounded-xl px-4 py-2 text-sm text-black dark:text-dark-text focus:outline-none focus:ring-4 focus:ring-black/5 transition-colors duration-200 pr-10 placeholder:text-gray-400 dark:placeholder:text-dark-text-secondary font-bold ${className}`}
        autoComplete="off"
      />

      <div className="absolute right-3 top-2.5 text-black dark:text-dark-text pointer-events-none">
        {isLoading ? (
          <Loader2 size={16} className="animate-spin text-scarlet" />
        ) : (
          <Search size={16} className="opacity-40" />
        )}
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <ul className="absolute z-50 w-full bg-white dark:bg-dark-card border-2 border-black dark:border-dark-border rounded-xl shadow-2xl max-h-56 overflow-y-auto mt-2 animate-in fade-in zoom-in-95 duration-150 p-1">
          {suggestions.map((name) => (
            <li
              key={name}
              onMouseDown={(e) => {
                e.preventDefault(); // Prevent input blur
                handleSuggestionClick(name);
              }}
              className="px-4 py-2.5 text-sm text-black dark:text-dark-text hover:bg-scarlet hover:text-white rounded-lg cursor-pointer capitalize font-bold transition-colors duration-200 mb-0.5 last:mb-0"
            >
              {name.replace(/-/g, ' ')}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default AutocompleteInput;