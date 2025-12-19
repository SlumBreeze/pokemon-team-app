import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// MapGenie tile configuration
const MAPGENIE_TILES =
  "https://tiles.mapgenie.io/games/pokemon-scarlet-violet/paldea-region/default-v1/{z}/{x}/{y}.jpg";
const MARKERS_URL =
  "https://cdn.mapgenie.io/images/games/pokemon-scarlet-violet/markers.json";

// Map configuration based on MapGenie's actual settings
// Their coordinate system: lat 0 to 1.4, lng -1.4 to 0
const MAP_CENTER: [number, number] = [0.58, -0.8];
const MAP_BOUNDS: L.LatLngBoundsExpression = [
  [0, -1.4], // Southwest
  [1.4, 0], // Northeast
];

// Create a simple CRS for game maps
const createSimpleCRS = () => {
  return L.CRS.Simple;
};

interface MarkerData {
  id: number;
  category_id: number;
  title: string;
  description?: string;
  latitude: number;
  longitude: number;
  media?: { url: string }[];
}

interface MarkersResponse {
  [key: string]: MarkerData[];
}

interface PaldeaMapLeafletProps {
  highlightedPokemon?: string;
  onClose?: () => void;
}

// Component to handle map initialization
const MapController: React.FC = () => {
  const map = useMap();

  useEffect(() => {
    // Force a resize to ensure tiles load correctly
    setTimeout(() => {
      map.invalidateSize();
    }, 100);
  }, [map]);

  return null;
};

// Create custom icon
const createIcon = (color: string = "#dc2626", size: number = 16) => {
  return L.divIcon({
    className: "custom-marker",
    html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        background: ${color};
        border: 2px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 6px rgba(0,0,0,0.4);
      "></div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
};

// Category colors and names
const CATEGORY_INFO: Record<string, { color: string; name: string }> = {
  pokemon: { color: "#dc2626", name: "Pokémon" },
  location: { color: "#3b82f6", name: "Locations" },
  chansey_supply_shop: { color: "#10b981", name: "Chansey Shop" },
  clothing_store: { color: "#f59e0b", name: "Clothing" },
  delibird_presents: { color: "#8b5cf6", name: "Delibird" },
  fast_travel: { color: "#06b6d4", name: "Fast Travel" },
  food_store: { color: "#f97316", name: "Food Store" },
  general_store: { color: "#84cc16", name: "General Store" },
};

const PaldeaMapLeaflet: React.FC<PaldeaMapLeafletProps> = ({
  highlightedPokemon,
  onClose,
}) => {
  const [markers, setMarkers] = useState<MarkersResponse>({});
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(
    new Set(["pokemon", "location", "fast_travel"])
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch markers from MapGenie
  useEffect(() => {
    const fetchMarkers = async () => {
      try {
        const response = await fetch(MARKERS_URL);
        if (!response.ok) throw new Error("Failed to fetch markers");
        const data = await response.json();
        setMarkers(data);
        setLoading(false);
      } catch (err: any) {
        console.error("Marker fetch error:", err);
        setError(err.message);
        setLoading(false);
      }
    };
    fetchMarkers();
  }, []);

  const toggleCategory = (category: string) => {
    setSelectedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  // Get all markers for selected categories
  const visibleMarkers = Object.entries(markers)
    .filter(([key]) => selectedCategories.has(key))
    .flatMap(([category, items]) =>
      Array.isArray(items) ? items.map((item) => ({ ...item, category })) : []
    );

  // Available categories from loaded data
  const availableCategories = Object.keys(markers).filter(
    (key) => Array.isArray(markers[key]) && markers[key].length > 0
  );

  return (
    <div className="relative w-full h-[600px] bg-gray-900 rounded-2xl overflow-hidden shadow-2xl">
      {/* Category Filter Bar */}
      <div className="absolute top-3 left-14 z-[1000] flex flex-wrap gap-1.5 max-w-[60%]">
        {availableCategories.slice(0, 8).map((category) => {
          const info = CATEGORY_INFO[category] || {
            color: "#6b7280",
            name: category,
          };
          return (
            <button
              key={category}
              onClick={() => toggleCategory(category)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold shadow-md transition-all border ${
                selectedCategories.has(category)
                  ? "text-white border-transparent"
                  : "bg-white/90 text-gray-600 hover:bg-white border-gray-200"
              }`}
              style={
                selectedCategories.has(category)
                  ? { backgroundColor: info.color }
                  : {}
              }
            >
              {info.name}
            </button>
          );
        })}
      </div>

      {/* Close Button */}
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-[1000] bg-white/95 hover:bg-white px-4 py-2 rounded-lg text-sm font-bold shadow-md transition-colors"
        >
          Close Map
        </button>
      )}

      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-[1000]">
          <div className="text-white text-center">
            <div className="animate-spin w-10 h-10 border-4 border-white border-t-transparent rounded-full mx-auto mb-3"></div>
            <p className="font-bold">Loading Map...</p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="absolute top-16 left-14 z-[1000] bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-bold">
          Error: {error}
        </div>
      )}

      {/* Leaflet Map */}
      <MapContainer
        center={MAP_CENTER}
        zoom={10}
        minZoom={8}
        maxZoom={14}
        crs={L.CRS.Simple}
        maxBounds={MAP_BOUNDS}
        maxBoundsViscosity={1.0}
        style={{ height: "100%", width: "100%", background: "#1a1a2e" }}
        zoomControl={true}
      >
        <TileLayer url={MAPGENIE_TILES} tileSize={256} noWrap={true} />

        {/* Markers */}
        {visibleMarkers.slice(0, 500).map((marker) => {
          const catInfo = CATEGORY_INFO[marker.category] || {
            color: "#dc2626",
            name: marker.category,
          };
          return (
            <Marker
              key={`${marker.category}-${marker.id}`}
              position={[marker.latitude, marker.longitude]}
              icon={createIcon(catInfo.color)}
            >
              <Popup>
                <div className="min-w-[180px] max-w-[250px]">
                  <h3 className="font-bold text-sm mb-1">{marker.title}</h3>
                  <p className="text-[10px] text-gray-500 uppercase mb-2 tracking-wide">
                    {catInfo.name}
                  </p>
                  {marker.description && (
                    <p className="text-xs text-gray-600 leading-tight">
                      {marker.description.slice(0, 150)}
                      {marker.description.length > 150 ? "..." : ""}
                    </p>
                  )}
                  {marker.media?.[0]?.url && (
                    <img
                      src={marker.media[0].url}
                      alt={marker.title}
                      className="w-full h-20 object-cover rounded mt-2"
                    />
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}

        <MapController />
      </MapContainer>

      {/* Marker Count */}
      <div className="absolute bottom-3 left-3 z-[1000] bg-black/70 backdrop-blur text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-2">
        <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
        {visibleMarkers.length} markers
      </div>
    </div>
  );
};

export default PaldeaMapLeaflet;
