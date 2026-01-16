import { useMemo, useState } from 'react';

interface Planet {
  name: string;
  color: string;
  x: number;
  y: number;
  infections?: Record<string, number>;
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

// Planet positions (percentage-based)
const PLANET_POSITIONS: Record<string, { x: number; y: number }> = {
  // Orion Sector (Blue) - 12 planets
  'Kepler Prime': { x: 10, y: 35 },
  'Zenith Station': { x: 15, y: 30 },
  'Cryos': { x: 20, y: 28 },
  'Titan City': { x: 24, y: 33 },
  'Command Central': { x: 22, y: 38 },
  'Nova Haven': { x: 18, y: 40 },
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
  "Dragon's Reach": { x: 72, y: 36 },
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

// Color mapping for planets
const COLOR_MAP: Record<string, { primary: string; glow: string; dark: string }> = {
  blue: { primary: '#3B82F6', glow: '#60A5FA', dark: '#1D4ED8' },
  yellow: { primary: '#EAB308', glow: '#FCD34D', dark: '#A16207' },
  black: { primary: '#6B7280', glow: '#9CA3AF', dark: '#374151' },
  red: { primary: '#EF4444', glow: '#F87171', dark: '#B91C1C' },
};

// Role colors for player pawns
const ROLE_COLORS: Record<string, string> = {
  combat_medic: '#EF4444',
  xenobiologist: '#8B5CF6',
  field_researcher: '#3B82F6',
  operations_commander: '#10B981',
  fleet_commander: '#F59E0B',
  tactical_officer: '#EC4899',
  containment_specialist: '#06B6D4',
};

// Generate deterministic star positions
const generateStars = (count: number, seed: number = 42) => {
  const stars: Array<{ x: number; y: number; size: number; opacity: number }> = [];
  let random = seed;
  const nextRandom = () => {
    random = (random * 1103515245 + 12345) & 0x7fffffff;
    return random / 0x7fffffff;
  };

  for (let i = 0; i < count; i++) {
    stars.push({
      x: nextRandom() * 100,
      y: nextRandom() * 70,
      size: 0.1 + nextRandom() * 0.2,
      opacity: 0.3 + nextRandom() * 0.7,
    });
  }
  return stars;
};

const STARS = generateStars(150);

export default function GalaxyMap({ cities, players, onCityClick, currentPlayerId }: GalaxyMapProps) {
  const [hoveredPlanet, setHoveredPlanet] = useState<string | null>(null);

  const planetsWithPositions = useMemo(() => {
    return cities.map(planet => ({
      ...planet,
      ...PLANET_POSITIONS[planet.name] || { x: 50, y: 35 },
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
    <div className="relative w-full rounded-lg shadow-2xl overflow-hidden">
      <svg viewBox="0 0 100 70" className="w-full" style={{ aspectRatio: '100/70' }}>
        {/* Definitions for gradients and filters */}
        <defs>
          {/* Space background gradient */}
          <linearGradient id="space-bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0a0a1a" />
            <stop offset="50%" stopColor="#0f1729" />
            <stop offset="100%" stopColor="#1a1a2e" />
          </linearGradient>

          {/* Planet gradients for each color */}
          <radialGradient id="planet-blue" cx="30%" cy="30%">
            <stop offset="0%" stopColor="#93C5FD" />
            <stop offset="50%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#1D4ED8" />
          </radialGradient>
          <radialGradient id="planet-yellow" cx="30%" cy="30%">
            <stop offset="0%" stopColor="#FDE047" />
            <stop offset="50%" stopColor="#EAB308" />
            <stop offset="100%" stopColor="#A16207" />
          </radialGradient>
          <radialGradient id="planet-black" cx="30%" cy="30%">
            <stop offset="0%" stopColor="#D1D5DB" />
            <stop offset="50%" stopColor="#6B7280" />
            <stop offset="100%" stopColor="#374151" />
          </radialGradient>
          <radialGradient id="planet-red" cx="30%" cy="30%">
            <stop offset="0%" stopColor="#FCA5A5" />
            <stop offset="50%" stopColor="#EF4444" />
            <stop offset="100%" stopColor="#B91C1C" />
          </radialGradient>

          {/* Glow filter for planets */}
          <filter id="planet-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="0.4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Strong glow for hovered planets */}
          <filter id="planet-glow-strong" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="0.8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Infestation pulse glow */}
          <filter id="infestation-glow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="0.3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Player glow */}
          <filter id="player-glow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="0.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Nebula gradients for sector regions */}
          <radialGradient id="nebula-blue" cx="20%" cy="35%">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="nebula-yellow" cx="20%" cy="55%">
            <stop offset="0%" stopColor="#EAB308" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#EAB308" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="nebula-black" cx="60%" cy="45%">
            <stop offset="0%" stopColor="#9CA3AF" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#6B7280" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="nebula-red" cx="80%" cy="45%">
            <stop offset="0%" stopColor="#EF4444" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#EF4444" stopOpacity="0" />
          </radialGradient>

          {/* Station gradient */}
          <linearGradient id="station-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#E5E7EB" />
            <stop offset="50%" stopColor="#9CA3AF" />
            <stop offset="100%" stopColor="#6B7280" />
          </linearGradient>
        </defs>

        {/* Space background */}
        <rect width="100" height="70" fill="url(#space-bg)" />

        {/* Star field */}
        <g className="stars">
          {STARS.map((star, i) => (
            <circle
              key={i}
              cx={star.x}
              cy={star.y}
              r={star.size}
              fill="white"
              opacity={star.opacity}
            />
          ))}
        </g>

        {/* Nebula regions */}
        <g className="nebulae">
          {/* Orion Sector (Blue) - left side */}
          <ellipse cx="25" cy="35" rx="25" ry="18" fill="url(#nebula-blue)" />
          {/* Hydra Sector (Yellow) - bottom left */}
          <ellipse cx="25" cy="55" rx="20" ry="15" fill="url(#nebula-yellow)" />
          {/* Nebula Sector (Black/Gray) - center */}
          <ellipse cx="58" cy="45" rx="18" ry="12" fill="url(#nebula-black)" />
          {/* Phoenix Sector (Red) - right side */}
          <ellipse cx="76" cy="48" rx="18" ry="18" fill="url(#nebula-red)" />
        </g>

        {/* Hyperspace routes (connection lines) */}
        <g className="routes" strokeLinecap="round">
          {planetsWithPositions.map((city, i) => {
            // Find nearby planets to connect
            const connections = planetsWithPositions.filter((c, j) =>
              i !== j && Math.abs(c.x - city.x) < 12 && Math.abs(c.y - city.y) < 10
            );

            return connections.map((nearestCity) => {
              const isHovered = hoveredPlanet === city.name || hoveredPlanet === nearestCity.name;
              return (
                <line
                  key={`${city.name}-${nearestCity.name}`}
                  x1={city.x}
                  y1={city.y}
                  x2={nearestCity.x}
                  y2={nearestCity.y}
                  stroke={isHovered ? '#60A5FA' : '#4B5563'}
                  strokeWidth={isHovered ? 0.2 : 0.12}
                  strokeDasharray="0.6,0.4"
                  opacity={isHovered ? 0.8 : 0.4}
                  style={{ transition: 'all 0.2s ease' }}
                />
              );
            });
          })}
        </g>

        {/* Planets */}
        {planetsWithPositions.map((planet) => {
          const hasInfections = planet.infections && Object.values(planet.infections).some(count => count > 0);
          const isHovered = hoveredPlanet === planet.name;
          const colorKey = planet.color || 'blue';
          const colors = COLOR_MAP[colorKey] || COLOR_MAP.blue;
          const planetRadius = hasInfections ? 1.6 : 1.3;

          return (
            <g key={planet.name}>
              {/* Planet outer glow */}
              <circle
                cx={planet.x}
                cy={planet.y}
                r={planetRadius + 0.5}
                fill={colors.glow}
                opacity={isHovered ? 0.4 : 0.15}
                style={{ transition: 'opacity 0.2s ease' }}
              />

              {/* Planet circle */}
              <circle
                cx={planet.x}
                cy={planet.y}
                r={isHovered ? planetRadius + 0.3 : planetRadius}
                fill={`url(#planet-${colorKey})`}
                filter={isHovered ? 'url(#planet-glow-strong)' : 'url(#planet-glow)'}
                className={onCityClick ? 'cursor-pointer' : ''}
                onClick={() => onCityClick?.(planet.name)}
                onMouseEnter={() => setHoveredPlanet(planet.name)}
                onMouseLeave={() => setHoveredPlanet(null)}
                style={{ transition: 'r 0.2s ease' }}
              />

              {/* Planet name */}
              <text
                x={planet.x}
                y={planet.y - 2.5}
                fontSize="1.4"
                fill="#E5E7EB"
                textAnchor="middle"
                className="font-semibold select-none pointer-events-none"
                style={{
                  textShadow: '0 0 3px rgba(0,0,0,0.8), 0 0 6px rgba(0,0,0,0.5)',
                  fontFamily: 'system-ui, sans-serif'
                }}
              >
                {planet.name}
              </text>

              {/* Command Base (Research Station) */}
              {planet.hasResearchStation && (
                <g transform={`translate(${planet.x}, ${planet.y})`}>
                  {/* Station hexagon */}
                  <polygon
                    points="0,-1.2 1.04,-0.6 1.04,0.6 0,1.2 -1.04,0.6 -1.04,-0.6"
                    fill="url(#station-gradient)"
                    stroke="#60A5FA"
                    strokeWidth="0.15"
                  />
                  {/* Station center */}
                  <circle r="0.4" fill="#60A5FA" />
                  {/* Antenna */}
                  <line x1="0" y1="-1.2" x2="0" y2="-1.8" stroke="#9CA3AF" strokeWidth="0.1" />
                  <circle cx="0" cy="-1.9" r="0.15" fill="#60A5FA" />
                </g>
              )}

              {/* Infestation markers */}
              {planet.infections && Object.entries(planet.infections).map(([color, count], idx) => {
                if (count === 0) return null;
                const infestColors = COLOR_MAP[color] || COLOR_MAP.red;
                const offsetX = planet.x + (idx - 1.5) * 1;
                const offsetY = planet.y + 2.8;

                return (
                  <g key={color} filter="url(#infestation-glow)">
                    {/* Alien organism shape - spiky circle */}
                    <circle
                      cx={offsetX}
                      cy={offsetY}
                      r={0.6}
                      fill={infestColors.primary}
                      stroke={infestColors.glow}
                      strokeWidth="0.1"
                    >
                      <animate
                        attributeName="r"
                        values="0.55;0.65;0.55"
                        dur="2s"
                        repeatCount="indefinite"
                      />
                    </circle>
                    {/* Spiky tendrils */}
                    {[0, 60, 120, 180, 240, 300].map((angle) => (
                      <line
                        key={angle}
                        x1={offsetX + Math.cos(angle * Math.PI / 180) * 0.5}
                        y1={offsetY + Math.sin(angle * Math.PI / 180) * 0.5}
                        x2={offsetX + Math.cos(angle * Math.PI / 180) * 0.85}
                        y2={offsetY + Math.sin(angle * Math.PI / 180) * 0.85}
                        stroke={infestColors.glow}
                        strokeWidth="0.12"
                        strokeLinecap="round"
                      />
                    ))}
                    {/* Count badge */}
                    {count > 1 && (
                      <>
                        <circle
                          cx={offsetX + 0.5}
                          cy={offsetY - 0.5}
                          r={0.35}
                          fill="#1F2937"
                          stroke={infestColors.glow}
                          strokeWidth="0.08"
                        />
                        <text
                          x={offsetX + 0.5}
                          y={offsetY - 0.35}
                          fontSize="0.5"
                          fill="white"
                          textAnchor="middle"
                          className="font-bold pointer-events-none"
                        >
                          {count}
                        </text>
                      </>
                    )}
                  </g>
                );
              })}

              {/* Players at this planet */}
              {playersAtPlanets[planet.name]?.map((player, idx) => {
                const isCurrentPlayer = player.id === currentPlayerId;
                const playerColor = player.role ? ROLE_COLORS[player.role] || '#3B82F6' : '#3B82F6';
                const xOffset = planet.x + (idx - playersAtPlanets[planet.name].length / 2 + 0.5) * 2.2;
                const yOffset = planet.y + 5;

                return (
                  <g key={player.id} filter={isCurrentPlayer ? 'url(#player-glow)' : undefined}>
                    {/* Active player outer glow */}
                    {isCurrentPlayer && (
                      <circle
                        cx={xOffset}
                        cy={yOffset}
                        r={1.4}
                        fill={playerColor}
                        opacity={0.3}
                      >
                        <animate
                          attributeName="r"
                          values="1.2;1.6;1.2"
                          dur="1.5s"
                          repeatCount="indefinite"
                        />
                        <animate
                          attributeName="opacity"
                          values="0.4;0.2;0.4"
                          dur="1.5s"
                          repeatCount="indefinite"
                        />
                      </circle>
                    )}

                    {/* Player ship/pawn */}
                    <g transform={`translate(${xOffset}, ${yOffset})`}>
                      {/* Ship body */}
                      <ellipse
                        rx={0.9}
                        ry={0.6}
                        fill={playerColor}
                        stroke={isCurrentPlayer ? '#FBBF24' : '#E5E7EB'}
                        strokeWidth={isCurrentPlayer ? 0.2 : 0.12}
                      />
                      {/* Ship cockpit */}
                      <ellipse
                        rx={0.4}
                        ry={0.25}
                        fill="#1F2937"
                        opacity={0.5}
                      />
                      {/* Player number */}
                      <text
                        y={0.25}
                        fontSize="0.7"
                        fill="white"
                        textAnchor="middle"
                        className="font-bold pointer-events-none"
                        style={{ textShadow: '0 0 2px rgba(0,0,0,0.8)' }}
                      >
                        {player.turn_order + 1}
                      </text>
                    </g>

                    {/* Role tooltip */}
                    {player.role && (
                      <title>{player.role.replace(/_/g, ' ')}</title>
                    )}
                  </g>
                );
              })}
            </g>
          );
        })}

        {/* Sector labels */}
        <g className="sector-labels" opacity={0.6}>
          <text x="15" y="22" fontSize="2" fill="#60A5FA" textAnchor="middle" fontWeight="bold"
                style={{ textShadow: '0 0 4px rgba(59, 130, 246, 0.5)' }}>
            ORION SECTOR
          </text>
          <text x="20" y="68" fontSize="2" fill="#FCD34D" textAnchor="middle" fontWeight="bold"
                style={{ textShadow: '0 0 4px rgba(234, 179, 8, 0.5)' }}>
            HYDRA SECTOR
          </text>
          <text x="58" y="35" fontSize="2" fill="#9CA3AF" textAnchor="middle" fontWeight="bold"
                style={{ textShadow: '0 0 4px rgba(107, 114, 128, 0.5)' }}>
            NEBULA SECTOR
          </text>
          <text x="78" y="32" fontSize="2" fill="#F87171" textAnchor="middle" fontWeight="bold"
                style={{ textShadow: '0 0 4px rgba(239, 68, 68, 0.5)' }}>
            PHOENIX SECTOR
          </text>
        </g>
      </svg>

      {/* Legend */}
      <div className="absolute bottom-2 right-2 bg-gray-900 bg-opacity-90 rounded-lg p-3 shadow-lg text-xs max-w-xs border border-gray-700">
        <div className="font-bold mb-2 text-gray-100 border-b border-gray-700 pb-1">Galaxy Map</div>
        <div className="space-y-1.5">
          {/* Sectors */}
          <div className="text-xs font-semibold text-gray-400 mt-1">Galactic Sectors</div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_4px_rgba(59,130,246,0.5)]"></div>
              <span className="text-gray-300 text-xs">Orion</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-yellow-500 shadow-[0_0_4px_rgba(234,179,8,0.5)]"></div>
              <span className="text-gray-300 text-xs">Hydra</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-gray-500 shadow-[0_0_4px_rgba(107,114,128,0.5)]"></div>
              <span className="text-gray-300 text-xs">Nebula</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_4px_rgba(239,68,68,0.5)]"></div>
              <span className="text-gray-300 text-xs">Phoenix</span>
            </div>
          </div>

          {/* Elements */}
          <div className="text-xs font-semibold text-gray-400 mt-2 pt-1 border-t border-gray-700">Elements</div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gradient-to-br from-gray-300 to-gray-600 clip-hexagon flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
            </div>
            <span className="text-gray-300">Command Base</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.6)]"></div>
            <span className="text-gray-300">Infestation</span>
          </div>

          {/* Players */}
          <div className="text-xs font-semibold text-gray-400 mt-2 pt-1 border-t border-gray-700">Fleet</div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-3 rounded-full bg-blue-500 border border-gray-300 flex items-center justify-center text-white text-[7px] font-bold">1</div>
            <span className="text-gray-300">Ship</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-3 rounded-full bg-green-500 border-2 border-yellow-400 flex items-center justify-center text-white text-[7px] font-bold shadow-[0_0_8px_rgba(16,185,129,0.5)]">1</div>
            <span className="text-gray-300">Active Ship</span>
          </div>
        </div>
      </div>

      {/* CSS for hexagon clip path */}
      <style>{`
        .clip-hexagon {
          clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
        }
      `}</style>
    </div>
  );
}
