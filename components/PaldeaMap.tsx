import React, { useState } from "react";
import { ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import paldeaMapImage from "../assets/paldea_map_hd.jpg";

interface PaldeaMapProps {
  selectedLocation: string;
  spriteUrl: string;
  allLocations: string[];
  onClose?: () => void;
}

// Coordinate System: % from Top-Left
// Refined based on labeled Paldea region reference map
const COORDINATES: Record<string, { x: number; y: number }> = {
  // --- South Province (bottom area of map) ---
  "South Province (Area One)": { x: 68, y: 75 },
  "South Province (Area Two)": { x: 42, y: 62 },
  "South Province (Area Three)": { x: 58, y: 58 },
  "South Province (Area Four)": { x: 28, y: 78 },
  "South Province (Area Five)": { x: 55, y: 70 },
  "South Province (Area Six)": { x: 35, y: 72 },
  "Inlet Grotto": { x: 52, y: 88 },
  "Poco Path": { x: 50, y: 85 },
  "Cabo Poco": { x: 50, y: 92 },
  "Los Platos": { x: 48, y: 80 },

  // --- West Province (left side of map) ---
  "West Province (Area One)": { x: 30, y: 52 },
  "West Province (Area Two)": { x: 22, y: 35 },
  "West Province (Area Three)": { x: 38, y: 38 },
  "Asado Desert": { x: 18, y: 50 },
  Cascarrafa: { x: 28, y: 45 },
  "Porto Marinada": { x: 15, y: 38 },

  // --- East Province (right side of map) ---
  "East Province (Area One)": { x: 72, y: 55 },
  "East Province (Area Two)": { x: 82, y: 45 },
  "East Province (Area Three)": { x: 70, y: 35 },
  "Tagtree Thicket": { x: 58, y: 32 },
  Artazon: { x: 72, y: 65 },
  Levincia: { x: 88, y: 48 },

  // --- North Province (top area of map) ---
  "North Province (Area One)": { x: 68, y: 22 },
  "North Province (Area Two)": { x: 82, y: 25 },
  "North Province (Area Three)": { x: 50, y: 15 },
  "Glaseado Mountain": { x: 48, y: 25 },
  "Casseroya Lake": { x: 28, y: 22 },
  "Dalizapa Passage": { x: 42, y: 28 },
  Montenevera: { x: 45, y: 20 },

  // --- Center (crater area) ---
  "Great Crater of Paldea": { x: 50, y: 48 },
  "Area Zero": { x: 50, y: 48 },

  // --- Seas (edges of map) ---
  "South Paldean Sea": { x: 50, y: 95 },
  "West Paldean Sea": { x: 8, y: 55 },
  "East Paldean Sea": { x: 92, y: 55 },
  "North Paldean Sea": { x: 50, y: 5 },
};

const PaldeaMap: React.FC<PaldeaMapProps> = ({
  selectedLocation,
  spriteUrl,
  allLocations,
  onClose,
}) => {
  const [hoveredLocation, setHoveredLocation] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Get coordinates for the selected location
  const selectedCoords = COORDINATES[selectedLocation];

  // Also show other locations as faded dots
  const otherLocations = allLocations
    .filter((loc) => loc !== selectedLocation && COORDINATES[loc])
    .map((loc) => ({ name: loc, coords: COORDINATES[loc] }));

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.5, 4));
  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.5, 1));
    if (zoom <= 1.5) setPan({ x: 0, y: 0 });
  };
  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoom > 1) {
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  return (
    <div className="relative w-full bg-gradient-to-br from-sky-50 to-blue-100 rounded-2xl border border-white/60 shadow-xl overflow-hidden">
      {/* Zoom Controls */}
      <div className="absolute top-3 left-3 z-30 flex flex-col gap-1">
        <button
          onClick={handleZoomIn}
          className="bg-white/90 hover:bg-white p-2 rounded-lg shadow-md transition-colors"
          title="Zoom In"
        >
          <ZoomIn size={18} />
        </button>
        <button
          onClick={handleZoomOut}
          className="bg-white/90 hover:bg-white p-2 rounded-lg shadow-md transition-colors"
          title="Zoom Out"
        >
          <ZoomOut size={18} />
        </button>
        <button
          onClick={handleReset}
          className="bg-white/90 hover:bg-white p-2 rounded-lg shadow-md transition-colors"
          title="Reset View"
        >
          <Maximize2 size={18} />
        </button>
      </div>

      {/* Zoom Level Indicator */}
      <div className="absolute top-3 right-3 z-30 bg-white/90 backdrop-blur px-2 py-1 rounded-lg text-xs font-bold text-gray-600 shadow-md">
        {Math.round(zoom * 100)}%
      </div>

      {/* Map Container with Zoom/Pan */}
      <div
        className="relative w-full aspect-[4/3] cursor-grab active:cursor-grabbing overflow-hidden"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div
          className="relative w-full h-full transition-transform duration-200 ease-out"
          style={{
            transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${
              pan.y / zoom
            }px)`,
            transformOrigin: "center center",
          }}
        >
          {/* Map Image */}
          <img
            src={paldeaMapImage}
            alt="Map of Paldea"
            className="w-full h-full object-cover select-none pointer-events-none"
            draggable={false}
          />

          {/* Other location markers (faded) */}
          {otherLocations.map(({ name, coords }) => (
            <div
              key={name}
              style={{
                left: `${coords.x}%`,
                top: `${coords.y}%`,
              }}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 z-10 cursor-pointer"
              onMouseEnter={() => setHoveredLocation(name)}
              onMouseLeave={() => setHoveredLocation(null)}
            >
              {/* Small faded dot for other locations */}
              <div className="w-4 h-4 bg-gray-500/70 rounded-full border-2 border-white shadow-md hover:bg-gray-600 hover:scale-125 transition-all" />

              {/* Tooltip on hover */}
              {hoveredLocation === name && (
                <div
                  className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-black/90 text-white text-xs font-bold px-3 py-1.5 rounded-lg whitespace-nowrap z-50 shadow-xl"
                  style={{ transform: `translate(-50%, 0) scale(${1 / zoom})` }}
                >
                  {name}
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-black/90" />
                </div>
              )}
            </div>
          ))}

          {/* Selected location with Pokemon sprite */}
          {selectedCoords && (
            <div
              style={{
                left: `${selectedCoords.x}%`,
                top: `${selectedCoords.y}%`,
              }}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center"
            >
              {/* Pulsing ring behind sprite */}
              <div className="absolute w-20 h-20 bg-scarlet/30 rounded-full animate-ping" />
              <div className="absolute w-16 h-16 bg-scarlet/20 rounded-full animate-pulse" />

              {/* Pokemon sprite as marker */}
              <div className="relative w-14 h-14 bg-white rounded-full shadow-2xl border-4 border-scarlet flex items-center justify-center overflow-hidden">
                <img
                  src={spriteUrl}
                  alt="Pokemon"
                  className="w-12 h-12 object-contain drop-shadow-md"
                />
              </div>

              {/* Location name tooltip - always visible for selected */}
              <div
                className="absolute -bottom-10 bg-scarlet text-white text-xs font-black px-3 py-1.5 rounded-lg shadow-xl whitespace-nowrap"
                style={{ transform: `scale(${1 / zoom})` }}
              >
                {selectedLocation}
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-b-scarlet" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* No coordinates found warning */}
      {!selectedCoords && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 z-40">
          <div className="bg-white/90 backdrop-blur px-4 py-2 rounded-lg text-sm font-bold text-gray-600 shadow-lg">
            📍 Location not mapped: {selectedLocation}
          </div>
        </div>
      )}

      {/* Bottom Info Bar */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-3 flex items-center justify-between">
        <div className="text-[11px] font-bold text-white/90">
          🗺️ PALDEA REGION
        </div>
        <div className="text-[10px] font-bold text-white/70">
          {allLocations.length} Location{allLocations.length > 1 ? "s" : ""} •
          Drag to pan when zoomed
        </div>
      </div>
    </div>
  );
};

export default PaldeaMap;
