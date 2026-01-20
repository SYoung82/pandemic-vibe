import type { Card } from '../lib/useGameChannel';

interface PlayerCardProps {
  card: Card;
  size?: 'small' | 'medium' | 'large';
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  showDetails?: boolean;
}

const colorStyles = {
  blue: {
    bg: 'bg-blue-900/60',
    border: 'border-blue-500',
    text: 'text-blue-200',
    accent: 'bg-blue-500',
  },
  yellow: {
    bg: 'bg-yellow-900/60',
    border: 'border-yellow-500',
    text: 'text-yellow-200',
    accent: 'bg-yellow-500',
  },
  black: {
    bg: 'bg-slate-700/60',
    border: 'border-slate-400',
    text: 'text-slate-200',
    accent: 'bg-slate-400',
  },
  red: {
    bg: 'bg-red-900/60',
    border: 'border-red-500',
    text: 'text-red-200',
    accent: 'bg-red-500',
  },
  epidemic: {
    bg: 'bg-purple-900/60',
    border: 'border-purple-500',
    text: 'text-purple-200',
    accent: 'bg-purple-500',
  },
  default: {
    bg: 'bg-slate-700/60',
    border: 'border-slate-500',
    text: 'text-slate-200',
    accent: 'bg-slate-500',
  },
};

const sizeStyles = {
  small: {
    container: 'px-2 py-1 rounded',
    text: 'text-xs',
    icon: 'hidden',
  },
  medium: {
    container: 'px-3 py-2 rounded-lg',
    text: 'text-sm',
    icon: 'w-2 h-2',
  },
  large: {
    container: 'p-4 rounded-lg',
    text: 'text-base',
    icon: 'w-3 h-3',
  },
};

export default function PlayerCard({
  card,
  size = 'small',
  selected = false,
  disabled = false,
  onClick,
  showDetails = false,
}: PlayerCardProps) {
  const isEpidemic = card.card_type === 'epidemic';
  const colorKey = isEpidemic ? 'epidemic' : (card.planet_color as keyof typeof colorStyles) || 'default';
  const colors = colorStyles[colorKey] || colorStyles.default;
  const sizes = sizeStyles[size];

  const baseClasses = `
    ${sizes.container}
    ${colors.bg}
    ${colors.text}
    border
    ${selected ? 'border-cyan-400 ring-2 ring-cyan-400/50' : colors.border}
    ${disabled ? 'opacity-50 cursor-not-allowed' : onClick ? 'cursor-pointer hover:brightness-110' : ''}
    transition-all
    font-medium
    shadow-sm
  `;

  const content = (
    <>
      <div className="flex items-center gap-1.5">
        {size !== 'small' && (
          <div className={`${sizes.icon} rounded-full ${colors.accent}`} />
        )}
        <span className={sizes.text}>
          {isEpidemic ? 'SPREAD' : card.planet_name || 'Unknown'}
        </span>
      </div>
      {showDetails && !isEpidemic && card.planet_color && (
        <div className="text-xs opacity-75 capitalize mt-1">
          {card.planet_color} sector
        </div>
      )}
      {selected && (
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-cyan-400 rounded-full flex items-center justify-center text-slate-900 text-xs font-bold">
          ✓
        </div>
      )}
    </>
  );

  if (onClick) {
    return (
      <button
        onClick={onClick}
        disabled={disabled}
        className={`${baseClasses} relative text-left`}
      >
        {content}
      </button>
    );
  }

  return (
    <div className={`${baseClasses} relative`}>
      {content}
    </div>
  );
}

// Card back component for showing hidden cards (other players' hands)
export function CardBack({ count }: { count: number }) {
  return (
    <div className="flex items-center flex-wrap gap-0.5">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="w-4 h-6 bg-gradient-to-br from-slate-600 to-slate-700 rounded border border-slate-500 shadow-sm"
        />
      ))}
    </div>
  );
}
