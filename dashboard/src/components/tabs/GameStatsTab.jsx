import { useState, useEffect } from 'react'
import { api } from '../../api/client'
import toast from 'react-hot-toast'
import Loading from '../Loading'

const rankColor = (index) => {
  if (index === 0) return 'text-yellow-400'
  if (index === 1) return 'text-gray-300'
  if (index === 2) return 'text-orange-400'
  return 'text-gray-500'
}

const GameStatsTab = ({ guildId }) => {
  const [games, setGames] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedGame, setSelectedGame] = useState('all')

  useEffect(() => {
    const fetchGameStats = async () => {
      setLoading(true)
      try {
        const res = await api.getGuildGameStats(guildId)
        setGames(res.data || [])
      } catch (error) {
        console.error('Oyun istatistikleri yüklenemedi:', error)
        toast.error('Oyun istatistikleri yüklenemedi!')
        setGames([])
      } finally {
        setLoading(false)
      }
    }

    fetchGameStats()
  }, [guildId])

  if (loading) {
    return <Loading message="Oyun istatistikleri yükleniyor..." />
  }

  if (games.length === 0) {
    return (
      <div className="glass rounded-xl p-12 text-center">
        <p className="text-gray-400 text-lg">Henüz oyun istatistiği bulunmuyor</p>
      </div>
    )
  }

  const visibleGames = selectedGame === 'all'
    ? games
    : games.filter((g) => g.value === selectedGame)

  const totalPlayers = games.reduce((sum, g) => sum + g.top.length, 0)

  return (
    <div>
      {/* Game Filter Chips */}
      <div className="glass rounded-xl p-3 mb-6 flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedGame('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            selectedGame === 'all'
              ? 'bg-gradient-to-r from-midnight-purple to-midnight-pink'
              : 'bg-midnight-base hover:bg-midnight-light'
          }`}
        >
          🎮 Tümü
        </button>
        {games.map((game) => (
          <button
            key={game.value}
            onClick={() => setSelectedGame(game.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedGame === game.value
                ? 'bg-gradient-to-r from-midnight-purple to-midnight-pink'
                : 'bg-midnight-base hover:bg-midnight-light'
            }`}
          >
            {game.icon} {game.label}
          </button>
        ))}
      </div>

      <div className="mb-4 text-sm text-gray-400">
        {games.length} oyun • toplam {totalPlayers} sıralama kaydı
      </div>

      {/* Game Cards */}
      <div className={`grid gap-6 ${selectedGame === 'all' ? 'grid-cols-1 lg:grid-cols-2 xl:grid-cols-3' : 'grid-cols-1'}`}>
        {visibleGames.map((game) => (
          <div key={game.value} className="glass rounded-xl overflow-hidden">
            <div className="px-5 py-4 bg-midnight-base flex items-center gap-3">
              <span className="text-2xl">{game.icon}</span>
              <div>
                <h3 className="font-bold text-lg">{game.label}</h3>
                <p className="text-xs text-gray-400">
                  {game.word ? 'En çok kelime yazanlar (İlk 10)' : 'En çok kazananlar (İlk 10)'}
                </p>
              </div>
            </div>

            {game.top.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-8">Henüz veri yok</p>
            ) : (
              <div className="divide-y divide-midnight-light">
                {game.top.map((user, index) => (
                  <div key={user.userId} className="flex items-center gap-3 px-5 py-3">
                    <span className={`w-6 text-center font-bold ${rankColor(index)}`}>
                      {index + 1}
                    </span>
                    {user.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.username}
                        className="w-9 h-9 rounded-full"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-midnight-purple to-midnight-pink flex items-center justify-center font-bold text-sm">
                        {user.username?.charAt(0) || '?'}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{user.username}</div>
                    </div>
                    <div className="text-right">
                      {game.word ? (
                        <div className="font-semibold text-midnight-purple">
                          {user.words.toLocaleString('tr-TR')} <span className="text-xs text-gray-400">kelime</span>
                        </div>
                      ) : (
                        <>
                          <div className="font-semibold text-green-400">
                            {user.wins.toLocaleString('tr-TR')} <span className="text-xs text-gray-400">galibiyet</span>
                          </div>
                          <div className="text-xs text-gray-400">
                            {user.losses} mağlubiyet • {user.plays} maç
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default GameStatsTab
