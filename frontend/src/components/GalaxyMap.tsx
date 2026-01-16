import { useMemo } from 'react';

interface Planet {
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
  current_planet_id?: string | null;
}

interface GalaxyMapProps {
  cities: Planet[];
  players: Player[];
  onCityClick?: (cityName: string) => void;
  currentPlayerId?: string;
}

// Infestation game planets with approximate galaxy map positions (percentage-based)
const PLANET_POSITIONS: Record<string, { x: number; y: number }> = {
  // Orion Sector (Blue) - 12 planets
  'Kepler Prime': { x: 10, y: 35 },
  'Zenith Station': { x: 15, y: 30 },
  'Cryos': { x: 20, y: 28 },
  'Titan City': { x: 24, y: 33 },
  'Command Central': { x: 22, y: 38 },
  'Nova Haven': { x: 18, y: 40 }, // Starting planet
  'Avalon': { x: 42, y: 28 },
  'Solara': { x: 45, y: 32 },
  'Lumina': { x: 48, y: 30 },
  'Forge World': { x: 50, y: 27 },
  'Crystallis': { x: 52, y: 33 },
  'Polaris': { x: 55, y: 26 },

  // Hydra Sector (Yellow) - 12 planets
  'Star Harbor': { x: 12, y: 45 },
  'Azteca Prime': { x: 16, y: 50 },
  'Coral Station': { x: 20, y: 48 },
  'Emerald Ridge': { x: 22, y: 55 },
  'Condor Peak': { x: 18, y: 58 },
  'Sierra Nova': { x: 22, y: 62 },
  'Pampas Prime': { x: 26, y: 65 },
  'Amazon Station': { x: 28, y: 60 },
  'Savanna Prime': { x: 45, y: 50 },
  'Oasis Station': { x: 50, y: 48 },
  'Congo Nexus': { x: 48, y: 56 },
  'Diamond World': { x: 52, y: 60 },

  // Nebula Sector (Black) - 12 planets
  'Atlas Base': { x: 47, y: 40 },
  'Pyramid Station': { x: 52, y: 42 },
  'Crossroads Prime': { x: 55, y: 38 },
  'Crimson Reach': { x: 58, y: 40 },
  'Persia Nova': { x: 60, y: 42 },
  'Babylon Station': { x: 58, y: 45 },
  'Dune World': { x: 62, y: 48 },
  'Indus Prime': { x: 64, y: 44 },
  'Monsoon Station': { x: 66, y: 46 },
  'Ganges Nexus': { x: 68, y: 48 },
  'Spice World': { x: 70, y: 50 },
  'Bengal Station': { x: 67, y: 52 },

  // Phoenix Sector (Red) - 12 planets
  'Dragon\'s Reach': { x: 72, y: 36 },
  'Techno Prime': { x: 76, y: 38 },
  'Pearl Harbor': { x: 74, y: 42 },
  'Sakura Station': { x: 78, y: 40 },
  'Neon City': { x: 80, y: 38 },
  'Jade World': { x: 75, y: 45 },
  'Harbor Prime': { x: 73, y: 48 },
  'Temple Station': { x: 71, y: 52 },
  'Mekong Nexus': { x: 74, y: 54 },
  'Archipelago Prime': { x: 77, y: 50 },
  'Equator Station': { x: 79, y: 56 },
  'Southern Cross': { x: 82, y: 65 },
};

const COLOR_MAP: Record<string, string> = {
  blue: '#3B82F6',
  yellow: '#EAB308',
  black: '#1F2937',
  red: '#EF4444',
};

const ROLE_COLORS: Record<string, string> = {
  combat_medic: '#EF4444',          // Red
  xenobiologist: '#8B5CF6',         // Purple
  field_researcher: '#3B82F6',      // Blue
  operations_commander: '#10B981',  // Green
  fleet_commander: '#F59E0B',       // Amber
  tactical_officer: '#EC4899',      // Pink
  containment_specialist: '#06B6D4', // Cyan
};

export default function GalaxyMap({ cities, players, onCityClick, currentPlayerId }: GalaxyMapProps) {
  const planetsWithPositions = useMemo(() => {
    return cities.map(planet => ({
      ...planet,
      ...PLANET_POSITIONS[planet.name] || { x: 50, y: 50 }, // Default center if not found
    }));
  }, [cities]);

  const playersAtPlanets = useMemo(() => {
    const planetMap: Record<string, Player[]> = {};
    players.forEach(player => {
      if (player.current_planet_id) {
        if (!planetMap[player.current_planet_id]) {
          planetMap[player.current_planet_id] = [];
        }
        planetMap[player.current_planet_id].push(player);
      }
    });
    return planetMap;
  }, [players]);

  return (
    <div className="relative w-full bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg shadow-lg overflow-hidden">
      <svg viewBox="0 0 100 70" className="w-full" style={{ aspectRatio: '100/70' }}>
        {/* Simplified galaxy map background - star systems as rough shapes */}
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

        {/* Connection lines between planets (simplified - just showing major routes) */}
        <g stroke="#94A3B8" strokeWidth="0.2" opacity="0.3" fill="none">
          {planetsWithPositions.map((city, i) => {
            const nearestCity = planetsWithPositions.find((c, j) =>
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

        {/* Planets */}
        {planetsWithPositions.map((planet) => {
          const hasInfections = planet.infections && Object.values(planet.infections).some(count => count > 0);

          return (
            <g key={planet.name}>
              {/* Planet circle */}
              <circle
                cx={planet.x}
                cy={planet.y}
                r={hasInfections ? 1.5 : 1}
                fill={COLOR_MAP[planet.color] || '#6B7280'}
                stroke="white"
                strokeWidth="0.3"
                className={onCityClick ? 'cursor-pointer hover:opacity-80' : ''}
                onClick={() => onCityClick?.(planet.name)}
              />

              {/* Planet name */}
              <text
                x={planet.x}
                y={planet.y - 2}
                fontSize="1.5"
                fill="#1F2937"
                textAnchor="middle"
                className="font-semibold select-none pointer-events-none"
                style={{ textShadow: '0 0 2px white' }}
              >
                {planet.name}
              </text>

              {/* Command Base */}
              {planet.hasResearchStation && (
                <g>
                  {/* White square background */}
                  <rect
                    x={planet.x - 0.8}
                    y={planet.y - 0.8}
                    width="1.6"
                    height="1.6"
                    fill="white"
                    stroke="#1F2937"
                    strokeWidth="0.15"
                    rx="0.2"
                  />
                  {/* Red cross */}
                  <g fill="#DC2626">
                    <rect x={planet.x - 0.5} y={planet.y - 0.15} width="1" height="0.3" />
                    <rect x={planet.x - 0.15} y={planet.y - 0.5} width="0.3" height="1" />
                  </g>
                </g>
              )}

              {/* Infestation markers */}
              {planet.infections && Object.entries(planet.infections).map(([color, count], idx) => {
                if (count === 0) return null;
                return (
                  <g key={color}>
                    <circle
                      cx={planet.x + (idx - 1.5) * 0.8}
                      cy={planet.y + 2.2}
                      r={0.5}
                      fill={COLOR_MAP[color]}
                      stroke="white"
                      strokeWidth="0.1"
                    />
                    {count > 1 && (
                      <text
                        x={planet.x + (idx - 1.5) * 0.8}
                        y={planet.y + 2.5}
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

              {/* Players at this planet - Enhanced pawns */}
              {playersAtPlanets[planet.name]?.map((player, idx) => {
                const isCurrentPlayer = player.id === currentPlayerId;
                const playerColor = player.role ? ROLE_COLORS[player.role] || '#3B82F6' : '#3B82F6';
                const xOffset = planet.x + (idx - playersAtPlanets[planet.name].length / 2 + 0.5) * 2;
                const yOffset = planet.y + 4;

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
          {/* Planets */}
          <div className="text-xs font-semibold text-gray-600 mt-1">Planets</div>
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
            <span>Command Base</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span>Infestation Markers</span>
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
