import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../api/client'

const Leaderboard = () => {
  const { guildId } = useParams()
  const navigate = useNavigate()
  const [guild, setGuild] = useState(null)
  const [leaderboard, setLeaderboard] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchGuildData()
  }, [guildId])

  useEffect(() => {
    if (guild) {
      fetchLeaderboard()
    }
  }, [guild])

  const fetchGuildData = async () => {
    try {
      const res = await api.getGuilds()
      const foundGuild = res.data.find(g => g.id === guildId)
      if (foundGuild) {
        setGuild(foundGuild)
      } else {
        navigate('/')
      }
    } catch (error) {
      console.error('Sunucu bilgileri yüklenemedi:', error)
      navigate('/')
    }
  }

  const fetchLeaderboard = async () => {
    setLoading(true)
    try {
      const res = await api.getGuildLeaderboard(guildId)
      setLeaderboard(res.data)
    } catch (error) {
      console.error('Liderlik tablosu yüklenemedi:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDuration = (ms) => {
    const hours = Math.floor(ms / 3600000)
    const minutes = Math.floor((ms % 3600000) / 60000)
    return `${hours}s ${minutes}dk`
  }

  const LeaderboardCard = ({ title, icon, data, valueFormatter, emptyMessage }) => (
    <div className="glass rounded-xl p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="text-4xl">{icon}</div>
        <h2 className="text-2xl font-bold gradient-text">{title}</h2>
      </div>

      {data.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          {emptyMessage || 'Henüz veri yok'}
        </div>
      ) : (
        <div className="space-y-3">
          {data.map((user) => (
            <div
              key={user.userId}
              className={`flex items-center gap-4 p-4 rounded-lg transition-all ${
                user.rank === 1
                  ? 'bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 border border-yellow-500'
                  : user.rank === 2
                  ? 'bg-gradient-to-r from-gray-400/20 to-gray-500/20 border border-gray-400'
                  : user.rank === 3
                  ? 'bg-gradient-to-r from-orange-600/20 to-orange-700/20 border border-orange-600'
                  : 'bg-midnight-base hover:bg-midnight-light'
              }`}
            >
              {/* Rank */}
              <div className="w-12 h-12 flex items-center justify-center">
                {user.rank === 1 && <span className="text-3xl">🥇</span>}
                {user.rank === 2 && <span className="text-3xl">🥈</span>}
                {user.rank === 3 && <span className="text-3xl">🥉</span>}
                {user.rank > 3 && (
                  <span className="text-xl font-bold text-gray-400">#{user.rank}</span>
                )}
              </div>

              {/* Avatar */}
              {user.avatar ? (
                <img 
                  src={user.avatar} 
                  alt={user.username}
                  className="w-12 h-12 rounded-full"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-midnight-purple to-midnight-pink flex items-center justify-center font-bold">
                  {user.username.charAt(0)}
                </div>
              )}

              {/* Username */}
              <div className="flex-1">
                <div className="font-semibold">{user.username}</div>
              </div>

              {/* Value */}
              <div className={`text-lg font-bold ${
                user.rank === 1 ? 'text-yellow-400' : 
                user.rank === 2 ? 'text-gray-300' : 
                user.rank === 3 ? 'text-orange-400' : 
                'text-purple-400'
              }`}>
                {valueFormatter(user.value)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  if (!guild || loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-midnight-purple mb-4"></div>
          <p className="text-gray-400">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-center gap-4">
        <button
          onClick={() => navigate('/')}
          className="p-2 hover:bg-midnight-light rounded-lg transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        
        <div className="flex items-center gap-4">
          {guild.icon && (
            <img 
              src={guild.icon} 
              alt={guild.name}
              className="w-16 h-16 rounded-full"
            />
          )}
          <div>
            <h1 className="text-4xl font-bold">{guild.name}</h1>
            <p className="text-gray-400">🏆 Liderlik Tabloları - Top 10</p>
          </div>
        </div>
      </div>

      {/* Leaderboards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ses Aktifliği */}
        <LeaderboardCard
          title="Ses Aktifliği"
          icon="🎤"
          data={leaderboard?.voice || []}
          valueFormatter={formatDuration}
          emptyMessage="Henüz ses aktivitesi yok"
        />

        {/* Mesaj Aktifliği */}
        <LeaderboardCard
          title="Mesaj Aktifliği"
          icon="💬"
          data={leaderboard?.messages || []}
          valueFormatter={(value) => value.toLocaleString() + ' mesaj'}
          emptyMessage="Henüz mesaj aktivitesi yok"
        />

        {/* Kamera Açanlar */}
        <LeaderboardCard
          title="Kamera Açanlar"
          icon="📹"
          data={leaderboard?.camera || []}
          valueFormatter={(value) => value.toLocaleString() + ' kez'}
          emptyMessage="Henüz kamera aktivitesi yok"
        />

        {/* Yayın Açanlar */}
        <LeaderboardCard
          title="Yayın Açanlar"
          icon="📺"
          data={leaderboard?.stream || []}
          valueFormatter={(value) => value.toLocaleString() + ' kez'}
          emptyMessage="Henüz yayın aktivitesi yok"
        />
      </div>

      {/* Legend */}
      <div className="mt-8 glass rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4">📊 Sıralama Açıklamaları</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎤</span>
            <div>
              <div className="font-medium">Ses Aktifliği</div>
              <div className="text-sm text-gray-400">Toplam ses kanallarında geçirilen süre</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-2xl">💬</span>
            <div>
              <div className="font-medium">Mesaj Aktifliği</div>
              <div className="text-sm text-gray-400">Toplam gönderilen mesaj sayısı</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-2xl">📹</span>
            <div>
              <div className="font-medium">Kamera Açanlar</div>
              <div className="text-sm text-gray-400">Toplam kamera açma sayısı</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-2xl">📺</span>
            <div>
              <div className="font-medium">Yayın Açanlar</div>
              <div className="text-sm text-gray-400">Toplam yayın açma (ekran paylaşımı) sayısı</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Leaderboard
