import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import UserProfileModal from '../components/UserProfileModal'

const GlobalEconomy = () => {
  const navigate = useNavigate()
  const [economy, setEconomy] = useState([])
  const [loading, setLoading] = useState(true)
  const [limit, setLimit] = useState(100)
  const [profileModalOpen, setProfileModalOpen] = useState(false)
  const [selectedProfile, setSelectedProfile] = useState(null)

  useEffect(() => {
    fetchGlobalEconomy()
  }, [limit])

  const fetchGlobalEconomy = async () => {
    setLoading(true)
    try {
      const res = await api.getGlobalEconomy(limit)
      setEconomy(res.data)
    } catch (error) {
      console.error('Global ekonomi yüklenemedi:', error)
      setEconomy([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={() => navigate('/')}
            className="p-2 hover:bg-midnight-light rounded-lg transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <div className="flex-1">
            <h1 className="text-4xl font-bold">💰 Global Ekonomi</h1>
            <p className="text-gray-400">Tüm kullanıcıların ekonomi sıralaması</p>
          </div>
        </div>
      </div>

      {/* Limit Selector */}
      <div className="mb-6 flex justify-between items-center">
        <div className="glass rounded-xl px-6 py-3">
          <span className="text-gray-400">Toplam: </span>
          <span className="font-bold text-xl">{economy.length} kullanıcı</span>
        </div>
        <select
          value={limit}
          onChange={(e) => setLimit(Number(e.target.value))}
          className="bg-midnight-base border border-midnight-light rounded-lg px-4 py-2 focus:outline-none focus:border-midnight-purple"
        >
          <option value={50}>İlk 50</option>
          <option value={100}>İlk 100</option>
          <option value={250}>İlk 250</option>
          <option value={500}>İlk 500</option>
        </select>
      </div>

      {/* Economy Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-midnight-purple"></div>
        </div>
      ) : economy.length === 0 ? (
        <div className="glass rounded-xl p-12 text-center">
          <p className="text-gray-400 text-lg">Henüz veri bulunmuyor</p>
        </div>
      ) : (
        <div className="glass rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-midnight-base">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold">#</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Kullanıcı</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold">Para</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold">Seviye</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold">XP</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold">Kurabiye</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold">Kalp</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Evlilik</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-midnight-light">
                {economy.map((user, index) => {
                  // Medal for top 3
                  let medal = ''
                  if (index === 0) medal = '🥇'
                  else if (index === 1) medal = '🥈'
                  else if (index === 2) medal = '🥉'

                  return (
                    <tr key={user.userId} className="hover:bg-midnight-base transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {medal && <span className="text-2xl">{medal}</span>}
                          <span className="text-gray-400">#{index + 1}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div 
                          className="flex items-center gap-3 cursor-pointer hover:bg-midnight-light p-2 rounded-lg transition-colors"
                          onClick={() => {
                            setSelectedProfile(user)
                            setProfileModalOpen(true)
                          }}
                        >
                          {user.avatar ? (
                            <img 
                              src={user.avatar} 
                              alt={user.username}
                              className="w-12 h-12 rounded-full"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-midnight-purple to-midnight-pink flex items-center justify-center font-bold text-lg">
                              {user.username?.charAt(0) || '?'}
                            </div>
                          )}
                          <div>
                            <div className="font-medium text-lg">{user.username || 'Unknown'}</div>
                            {user.subtitle && (
                              <div className="text-xs text-gray-400">{user.subtitle}</div>
                            )}
                            <div className="text-xs text-purple-400">Tıkla → Profil</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-xl text-green-400">
                        {(user.money || 0).toLocaleString()} 💵
                      </td>
                      <td className="px-6 py-4 text-right font-semibold">
                        Lvl {user.level || 0}
                      </td>
                      <td className="px-6 py-4 text-right text-gray-400">
                        {(user.xp || 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-center text-lg">
                        {user.cookies || 0} 🍪
                      </td>
                      <td className="px-6 py-4 text-center text-lg">
                        {user.hearts || 0} ❤️
                      </td>
                      <td className="px-6 py-4">
                        {user.marriedTo ? (
                          <span className="text-pink-400 flex items-center gap-1">
                            💑 Evli
                          </span>
                        ) : (
                          <span className="text-gray-500">Bekar</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* User Profile Modal */}
      <UserProfileModal
        isOpen={profileModalOpen}
        onClose={() => {
          setProfileModalOpen(false)
          setSelectedProfile(null)
        }}
        user={selectedProfile}
      />
    </div>
  )
}

export default GlobalEconomy
