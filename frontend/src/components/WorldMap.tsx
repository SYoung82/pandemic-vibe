import { useMemo } from 'react';

interface City {
  name: string;
  color: string;
  x: number; // percentage position on map
  y: number;
  infections?: Record<string, number>; // color -> count
  hasResearchStation?: boolean;
}

interface Player {
  id: string;
  user_id: string;
  role?: string;
  turn_order: number;
  current_city_id?: string | null;
}

interface WorldMapProps {
  cities: City[];
  players: Player[];
  onCityClick?: (cityName: string) => void;
  currentPlayerId?: string;
}

// Pandemic game cities with approximate world map positions (percentage-based)
const CITY_POSITIONS: Record<string, { x: number; y: number }> = {
  // North America (Blue)
  'San Francisco': { x: 12, y: 38 },
  'Chicago': { x: 18, y: 35 },
  'Montreal': { x: 22, y: 32 },
  'New York': { x: 24, y: 36 },
  'Washington': { x: 23, y: 39 },
  'Atlanta': { x: 20, y: 40 },

  // Europe (Blue)
  'London': { x: 45, y: 30 },
  'Madrid': { x: 43, y: 38 },
  'Paris': { x: 47, y: 32 },
  'Essen': { x: 48, y: 30 },
  'Milan': { x: 49, y: 34 },
  'St. Petersburg': { x: 54, y: 27 },

  // Asia (Red)
  'Beijing': { x: 72, y: 36 },
  'Seoul': { x: 76, y: 37 },
  'Shanghai': { x: 74, y: 40 },
  'Tokyo': { x: 78, y: 38 },
  'Osaka': { x: 77, y: 40 },
  'Taipei': { x: 75, y: 44 },
  'Hong Kong': { x: 73, y: 46 },
  'Bangkok': { x: 70, y: 50 },
  'Manila': { x: 76, y: 50 },
  'Ho Chi Minh City': { x: 71, y: 52 },
  'Jakarta': { x: 72, y: 58 },
  'Sydney': { x: 82, y: 68 },

  // Middle East/South Asia (Black)
  'Istanbul': { x: 52, y: 38 },
  'Moscow': { x: 56, y: 30 },
  'Tehran': { x: 58, y: 40 },
  'Delhi': { x: 64, y: 44 },
  'Mumbai': { x: 63, y: 48 },
  'Chennai': { x: 66, y: 52 },
  'Kolkata': { x: 67, y: 46 },
  'Karachi': { x: 61, y: 45 },
  'Riyadh': { x: 58, y: 45 },
  'Baghdad': { x: 57, y: 41 },
  'Cairo': { x: 52, y: 43 },
  'Algiers': { x: 47, y: 40 },

  // South America/Africa (Yellow)
  'Mexico City': { x: 16, y: 48 },
  'Miami': { x: 21, y: 45 },
  'Bogota': { x: 22, y: 54 },
  'Lima': { x: 20, y: 60 },
  'Santiago': { x: 22, y: 68 },
  'Buenos Aires': { x: 26, y: 68 },
  'São Paulo': { x: 30, y: 64 },
  'Lagos': { x: 47, y: 52 },
  'Kinshasa': { x: 50, y: 58 },
  'Khartoum': { x: 54, y: 50 },
  'Johannesburg': { x: 52, y: 66 },
};

const COLOR_MAP: Record<string, string> = {
  blue: '#3B82F6',
  yellow: '#EAB308',
  black: '#1F2937',
  red: '#EF4444',
};

const ROLE_COLORS: Record<string, string> = {
  medic: '#EF4444',          // Red
  scientist: '#8B5CF6',      // Purple
  researcher: '#3B82F6',     // Blue
  operations_expert: '#10B981', // Green
  dispatcher: '#F59E0B',     // Amber
  contingency_planner: '#EC4899', // Pink
  quarantine_specialist: '#06B6D4', // Cyan
};

export default function WorldMap({ cities, players, onCityClick, currentPlayerId }: WorldMapProps) {
  const citiesWithPositions = useMemo(() => {
    return cities.map(city => ({
      ...city,
      ...CITY_POSITIONS[city.name] || { x: 50, y: 50 }, // Default center if not found
    }));
  }, [cities]);

  const playersAtCities = useMemo(() => {
    const cityMap: Record<string, Player[]> = {};
    players.forEach(player => {
      if (player.current_city_id) {
        if (!cityMap[player.current_city_id]) {
          cityMap[player.current_city_id] = [];
        }
        cityMap[player.current_city_id].push(player);
      }
    });
    return cityMap;
  }, [players]);

  return (
    <div className="relative w-full bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg shadow-lg overflow-hidden">
      <svg viewBox="0 0 100 70" className="w-full" style={{ aspectRatio: '100/70' }}>
        {/* Simplified world map background - continents as rough shapes */}
        <g opacity="0.2" fill="#1F2937">
          {/* North America */}
          <path d="M 10,25 Q 15,20 20,25 L 25,30 Q 28,35 25,40 Q 22,45 18,48 L 12,45 Q 8,40 10,35 Z" />

          {/* South America */}
          <path d="M 20,50 L 25,52 Q 28,58 26,65 L 22,68 Q 18,66 20,60 Z" />

          {/* Europe */}
          <path d="M 42,28 Q 48,25 52,28 L 54,32 Q 52,36 48,35 L 43,33 Z" />

          {/* Africa */}
          <path d="M 45,40 Q 50,38 54,42 L 55,55 Q 52,65 48,62 L 46,50 Z" />

          {/* Asia */}
          <path d="M 56,25 Q 65,22 75,28 L 78,35 Q 80,45 75,50 L 68,52 Q 60,48 58,40 L 56,32 Z" />

          {/* Australia */}
          <path d="M 78,62 Q 83,60 86,64 L 84,68 Q 80,70 78,66 Z" />
        </g>

        {/* Connection lines between cities (simplified - just showing major routes) */}
        <g stroke="#94A3B8" strokeWidth="0.2" opacity="0.3" fill="none">
          {citiesWithPositions.map((city, i) => {
            const nearestCity = citiesWithPositions.find((c, j) =>
              i !== j && Math.abs(c.x - city.x) < 15 && Math.abs(c.y - city.y) < 10
            );
            if (nearestCity) {
              return (
                <line
                  key={`${city.name}-${nearestCity.name}`}
                  x1={city.x}
                  y1={city.y}
                  x2={nearestCity.x}
                  y2={nearestCity.y}
                />
              );
            }
            return null;
          })}
        </g>

        {/* Cities */}
        {citiesWithPositions.map((city) => {
          const hasInfections = city.infections && Object.values(city.infections).some(count => count > 0);

          return (
            <g key={city.name}>
              {/* City circle */}
              <circle
                cx={city.x}
                cy={city.y}
                r={hasInfections ? 1.5 : 1}
                fill={COLOR_MAP[city.color] || '#6B7280'}
                stroke="white"
                strokeWidth="0.3"
                className={onCityClick ? 'cursor-pointer hover:opacity-80' : ''}
                onClick={() => onCityClick?.(city.name)}
              />

              {/* City name */}
              <text
                x={city.x}
                y={city.y - 2}
                fontSize="1.5"
                fill="#1F2937"
                textAnchor="middle"
                className="font-semibold select-none pointer-events-none"
                style={{ textShadow: '0 0 2px white' }}
              >
                {city.name}
              </text>

              {/* Research Station */}
              {city.hasResearchStation && (
                <g>
                  {/* White square background */}
                  <rect
                    x={city.x - 0.8}
                    y={city.y - 0.8}
                    width="1.6"
                    height="1.6"
                    fill="white"
                    stroke="#1F2937"
                    strokeWidth="0.15"
                    rx="0.2"
                  />
                  {/* Red cross */}
                  <g fill="#DC2626">
                    <rect x={city.x - 0.5} y={city.y - 0.15} width="1" height="0.3" />
                    <rect x={city.x - 0.15} y={city.y - 0.5} width="0.3" height="1" />
                  </g>
                </g>
              )}

              {/* Disease cubes */}
              {city.infections && Object.entries(city.infections).map(([color, count], idx) => {
                if (count === 0) return null;
                return (
                  <g key={color}>
                    <circle
                      cx={city.x + (idx - 1.5) * 0.8}
                      cy={city.y + 2.2}
                      r={0.5}
                      fill={COLOR_MAP[color]}
                      stroke="white"
                      strokeWidth="0.1"
                    />
                    {count > 1 && (
                      <text
                        x={city.x + (idx - 1.5) * 0.8}
                        y={city.y + 2.5}
                        fontSize="0.8"
                        fill="white"
                        textAnchor="middle"
                        className="font-bold pointer-events-none"
                      >
                        {count}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Players at this city - Enhanced pawns */}
              {playersAtCities[city.name]?.map((player, idx) => {
                const isCurrentPlayer = player.id === currentPlayerId;
                const playerColor = player.role ? ROLE_COLORS[player.role] || '#3B82F6' : '#3B82F6';
                const xOffset = city.x + (idx - playersAtCities[city.name].length / 2 + 0.5) * 2;
                const yOffset = city.y + 4;

                return (
                  <g key={player.id}>
                    {/* Active player glow effect */}
                    {isCurrentPlayer && (
                      <circle
                        cx={xOffset}
                        cy={yOffset}
                        r={1.2}
                        fill={playerColor}
                        opacity="0.3"
                        className="animate-pulse"
                      />
                    )}

                    {/* Player pawn - larger and more visible */}
                    <g transform={`translate(${xOffset}, ${yOffset})`}>
                      {/* Pawn base */}
                      <circle
                        r={0.8}
                        fill={playerColor}
                        stroke={isCurrentPlayer ? '#FBBF24' : 'white'}
                        strokeWidth={isCurrentPlayer ? '0.25' : '0.15'}
                      />

                      {/* Player number */}
                      <text
                        y={0.3}
                        fontSize="0.9"
                        fill="white"
                        textAnchor="middle"
                        className="font-bold pointer-events-none"
                      >
                        {player.turn_order + 1}
                      </text>
                    </g>

                    {/* Role label on hover */}
                    {player.role && (
                      <title>{player.role.replace('_', ' ')}</title>
                    )}
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="absolute bottom-2 right-2 bg-white bg-opacity-95 rounded-lg p-3 shadow-lg text-xs max-w-xs">
        <div className="font-bold mb-2 text-gray-800 border-b pb-1">Map Legend</div>
        <div className="space-y-1.5">
          {/* Cities */}
          <div className="text-xs font-semibold text-gray-600 mt-1">Cities</div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span className="text-xs">Blue</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <span className="text-xs">Yellow</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-gray-800"></div>
              <span className="text-xs">Black</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span className="text-xs">Red</span>
            </div>
          </div>

          {/* Game Elements */}
          <div className="text-xs font-semibold text-gray-600 mt-2 pt-1 border-t">Elements</div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-white border-2 border-gray-700 rounded flex items-center justify-center">
              <div className="w-2 h-0.5 bg-red-600"></div>
              <div className="w-0.5 h-2 bg-red-600 absolute"></div>
            </div>
            <span>Research Station</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span>Disease Cubes</span>
          </div>

          {/* Players */}
          <div className="text-xs font-semibold text-gray-600 mt-2 pt-1 border-t">Players</div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-white flex items-center justify-center text-white text-[8px] font-bold">1</div>
            <span>Player Pawn</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-green-500 border-2 border-yellow-400 flex items-center justify-center text-white text-[8px] font-bold">1</div>
            <span>Active Player</span>
          </div>
        </div>
      </div>
    </div>
  );
}
