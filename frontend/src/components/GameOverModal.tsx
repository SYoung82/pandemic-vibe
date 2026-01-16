import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

interface GameOverModalProps {
  status: 'won' | 'lost';
  loseReason?: 'too_many_outbreaks' | 'infestation_spread' | 'time_ran_out';
  gameStats: {
    turnNumber: number;
    outbreakCount: number;
    containmentsAchieved: number;
    difficulty: string;
  };
  onClose: () => void;
}

export default function GameOverModal({ status, loseReason, gameStats, onClose }: GameOverModalProps) {
  const navigate = useNavigate();

  // Show confetti for victory
  const showConfetti = status === 'won';

  // Generate stable confetti properties
  const confettiPieces = useMemo(() => {
    const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#6c5ce7', '#a29bfe'];
    // Using index-based deterministic positioning instead of Math.random()
    return [...Array(50)].map((_, i) => ({
      left: (i * 7.3) % 100, // Deterministic spread across screen
      animationDelay: (i * 0.1) % 3,
      animationDuration: 3 + ((i * 0.05) % 2),
      color: colors[i % colors.length],
      rotation: (i * 37) % 360 // Prime number for varied rotation
    }));
  }, []);

  const handleBackToGames = () => {
    navigate('/games');
  };

  const getLoseMessage = () => {
    switch (loseReason) {
      case 'too_many_outbreaks':
        return {
          title: 'Too Many Outbreaks!',
          description: 'The infestations have spread too rapidly. 8 outbreaks have occurred and the galaxy has fallen into chaos.',
          icon: '💥'
        };
      case 'infestation_spread':
        return {
          title: 'Infestation Spread Too Fast!',
          description: 'An infestation has spread beyond control. There are no more infestation markers available.',
          icon: '🦠'
        };
      case 'time_ran_out':
        return {
          title: 'Time Ran Out!',
          description: 'The team ran out of time. The player deck has been exhausted.',
          icon: '⏰'
        };
      default:
        return {
          title: 'Game Over',
          description: 'The team was unable to save the galaxy.',
          icon: '❌'
        };
    }
  };

  return (
    <>
      {/* Confetti overlay */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-[60] overflow-hidden">
          {confettiPieces.map((piece, i) => (
            <div
              key={i}
              className="absolute animate-confetti"
              style={{
                left: `${piece.left}%`,
                top: '-10px',
                animationDelay: `${piece.animationDelay}s`,
                animationDuration: `${piece.animationDuration}s`
              }}
            >
              <div
                className="w-3 h-3 rounded-sm"
                style={{
                  backgroundColor: piece.color,
                  transform: `rotate(${piece.rotation}deg)`
                }}
              />
            </div>
          ))}
        </div>
      )}

      {/* Modal backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className={`p-8 text-center ${
            status === 'won'
              ? 'bg-gradient-to-r from-green-400 to-emerald-500'
              : 'bg-gradient-to-r from-red-400 to-rose-500'
          } text-white rounded-t-2xl`}>
            {status === 'won' ? (
              <>
                <div className="text-7xl mb-4 animate-bounce">🎉</div>
                <h1 className="text-4xl font-bold mb-2">Victory!</h1>
                <p className="text-xl opacity-90">The galaxy has been saved!</p>
              </>
            ) : (
              <>
                <div className="text-7xl mb-4">{getLoseMessage().icon}</div>
                <h1 className="text-4xl font-bold mb-2">{getLoseMessage().title}</h1>
                <p className="text-xl opacity-90">{getLoseMessage().description}</p>
              </>
            )}
          </div>

          {/* Game Stats */}
          <div className="p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Game Summary</h2>

            <div className="grid grid-cols-2 gap-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-3xl font-bold text-gray-800">{gameStats.turnNumber}</div>
                <div className="text-sm text-gray-600 mt-1">Turns Played</div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-3xl font-bold text-gray-800">{gameStats.outbreakCount}</div>
                <div className="text-sm text-gray-600 mt-1">Outbreaks</div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-3xl font-bold text-gray-800">{gameStats.containmentsAchieved}</div>
                <div className="text-sm text-gray-600 mt-1">Containments Achieved</div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-3xl font-bold text-gray-800 capitalize">{gameStats.difficulty}</div>
                <div className="text-sm text-gray-600 mt-1">Difficulty</div>
              </div>
            </div>

            {status === 'won' && (
              <div className="mt-6 p-4 bg-green-50 border-2 border-green-200 rounded-lg">
                <p className="text-green-800 font-semibold text-center">
                  🏆 All four infestations have been contained!
                </p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="p-6 bg-gray-50 rounded-b-2xl flex gap-4">
            <button
              onClick={handleBackToGames}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              Back to Games
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              View Board
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes confetti {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
        .animate-confetti {
          animation: confetti linear forwards;
        }
      `}</style>
    </>
  );
}
