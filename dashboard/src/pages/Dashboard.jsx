import { useState, useEffect } from 'react'
import { api } from '../api/client'
import GuildCard from '../components/GuildCard'
import DMPanel from '../components/DMPanel'

const Dashboard = () => {
  const [guilds, setGuilds] = useState([])
  const [botStatus, setBotStatus] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [healthRes, guildsRes] = await Promise.all([
        api.health(),
        api.getGuilds()
      ])
      
      setBotStatus(healthRes.data)
      setGuilds(guildsRes.data)
    } catch (error) {
      console.error('Veri yüklenirken hata:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
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
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Hoş Geldin! 👋</h1>
        <p className="text-gray-400">Midnight bot kontrol paneline hoş geldin</p>
      </div>

      {/* Bot Status Card */}
      {botStatus && (
        <div className="glass rounded-xl p-6 mb-8">
          <div className="flex items-center gap-6">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <div>
              <h3 className="text-lg font-semibold mb-1">Bot Durumu: Çevrimiçi</h3>
              <p className="text-gray-400 text-sm">
                {botStatus.guilds} sunucu • {botStatus.users.toLocaleString()} kullanıcı
              </p>
            </div>
          </div>
        </div>
      )}

      {/* DM Panel */}
      <div className="mb-8">
        <DMPanel />
      </div>

      {/* Guilds Grid */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-4">Sunucular ({guilds.length})</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {guilds.map(guild => (
          <GuildCard key={guild.id} guild={guild} />
        ))}
      </div>

      {guilds.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-400 text-lg">Henüz hiç sunucu bulunamadı</p>
        </div>
      )}
    </div>
  )
}

export default Dashboard
