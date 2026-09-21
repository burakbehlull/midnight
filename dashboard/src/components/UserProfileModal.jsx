import { useState, useEffect } from 'react'
import { api } from '../api/client'

const UserProfileModal = ({ isOpen, onClose, user }) => {
  const [marriedUser, setMarriedUser] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen && user?.marriedTo) {
      fetchMarriedUser()
    } else {
      setMarriedUser(null)
    }
  }, [isOpen, user])

  const fetchMarriedUser = async () => {
    if (!user.marriedTo) return
    
    setLoading(true)
    try {
      // Evli olduğu kullanıcının bilgilerini çekmek için global economy'den bul
      const res = await api.getGlobalEconomy(1000)
      const married = res.data.find(u => u.userId === user.marriedTo)
      setMarriedUser(married)
    } catch (error) {
      console.error('Evli kullanıcı bilgisi alınamadı:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen || !user) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-hidden animate-slideUp">
        {/* Gradient Background Effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-midnight-purple/20 via-midnight-dark to-midnight-pink/20 rounded-2xl blur-xl"></div>
        
        {/* Main Card */}
        <div className="relative glass-strong rounded-2xl border border-midnight-light/30 shadow-2xl overflow-y-auto max-h-[90vh]">
          {/* Header with Avatar */}
          <div className="relative h-48 bg-gradient-to-br from-midnight-purple via-midnight-pink to-purple-600 overflow-hidden">
            {/* Animated Background Pattern */}
            <div className="absolute inset-0 opacity-20">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent_50%)]"></div>
              <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
              <div className="absolute top-0 -right-4 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 bg-black/30 backdrop-blur-sm hover:bg-black/50 rounded-full transition-all duration-200 z-10 group"
            >
              <svg className="w-5 h-5 group-hover:rotate-90 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Avatar in center bottom */}
            <div className="absolute -bottom-16 left-1/2 transform -translate-x-1/2">
              <div className="relative group">
                {/* Glow effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-midnight-purple to-midnight-pink rounded-full blur-xl opacity-60 group-hover:opacity-80 transition-opacity"></div>
                
                {user.avatar ? (
                  <img 
                    src={user.avatar} 
                    alt={user.username}
                    className="relative w-32 h-32 rounded-full border-4 border-midnight-dark shadow-2xl"
                  />
                ) : (
                  <div className="relative w-32 h-32 rounded-full border-4 border-midnight-dark bg-gradient-to-br from-midnight-purple to-midnight-pink flex items-center justify-center text-5xl font-bold shadow-2xl">
                    {user.username?.charAt(0) || '?'}
                  </div>
                )}

                {/* Level Badge */}
                <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-midnight-purple to-midnight-pink rounded-full text-sm font-bold shadow-lg border border-white/20">
                  Lvl {user.level || 0}
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="pt-20 pb-8 px-8">
            {/* Username & Subtitle */}
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-2 gradient-text">{user.username}</h2>
              {user.subtitle && (
                <p className="text-gray-400 italic">"{user.subtitle}"</p>
              )}
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {/* Money */}
              <div className="glass rounded-xl p-4 text-center hover:scale-105 transition-transform duration-200 border border-green-500/20">
                <div className="text-3xl mb-2">💵</div>
                <div className="text-2xl font-bold text-green-400 mb-1">
                  {(user.money || 0).toLocaleString()}
                </div>
                <div className="text-xs text-gray-400">Para</div>
              </div>

              {/* XP */}
              <div className="glass rounded-xl p-4 text-center hover:scale-105 transition-transform duration-200 border border-purple-500/20">
                <div className="text-3xl mb-2">⭐</div>
                <div className="text-2xl font-bold text-purple-400 mb-1">
                  {(user.xp || 0).toLocaleString()}
                </div>
                <div className="text-xs text-gray-400">Deneyim</div>
              </div>

              {/* Cookies */}
              <div className="glass rounded-xl p-4 text-center hover:scale-105 transition-transform duration-200 border border-yellow-500/20">
                <div className="text-3xl mb-2">🍪</div>
                <div className="text-2xl font-bold text-yellow-400 mb-1">
                  {user.cookies || 0}
                </div>
                <div className="text-xs text-gray-400">Kurabiye</div>
              </div>

              {/* Hearts */}
              <div className="glass rounded-xl p-4 text-center hover:scale-105 transition-transform duration-200 border border-pink-500/20">
                <div className="text-3xl mb-2">❤️</div>
                <div className="text-2xl font-bold text-pink-400 mb-1">
                  {user.hearts || 0}
                </div>
                <div className="text-xs text-gray-400">Kalp</div>
              </div>
            </div>

            {/* Marriage Status */}
            <div className="glass rounded-xl p-6 border border-pink-500/20">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-red-500 flex items-center justify-center text-xl">
                  💑
                </div>
                <h3 className="text-xl font-bold">Evlilik Durumu</h3>
              </div>

              {user.marriedTo ? (
                <div className="space-y-4">
                  {loading ? (
                    <div className="flex items-center justify-center py-4">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-pink-500"></div>
                    </div>
                  ) : marriedUser ? (
                    <div className="flex items-center gap-4 p-4 bg-midnight-base rounded-lg border border-pink-500/30 hover:border-pink-500/50 transition-colors">
                      {marriedUser.avatar ? (
                        <img 
                          src={marriedUser.avatar} 
                          alt={marriedUser.username}
                          className="w-16 h-16 rounded-full border-2 border-pink-500"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-500 to-red-500 flex items-center justify-center text-2xl font-bold border-2 border-pink-500">
                          {marriedUser.username?.charAt(0) || '?'}
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="font-semibold text-lg text-pink-300">{marriedUser.username}</div>
                        <div className="text-sm text-gray-400">Eş</div>
                      </div>
                      <div className="text-3xl">💕</div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 p-4 bg-midnight-base rounded-lg border border-pink-500/30">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-500 to-red-500 flex items-center justify-center text-2xl">
                        👤
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-pink-300">Evli</div>
                        <div className="text-xs text-gray-400">Eş bilgisi yüklenemedi</div>
                      </div>
                    </div>
                  )}

                  {/* Marriage Ring */}
                  {user.marriageRing && (
                    <div className="flex items-center justify-center gap-2 p-3 bg-gradient-to-r from-yellow-500/10 to-pink-500/10 rounded-lg border border-yellow-500/30">
                      <span className="text-2xl">💍</span>
                      <span className="text-sm text-gray-300">
                        Yüzük: <span className="font-semibold text-yellow-400">{user.marriageRing}</span>
                      </span>
                    </div>
                  )}

                  {/* Marriage Date */}
                  {user.marriageSince && (
                    <div className="text-center text-sm text-gray-400">
                      📅 Evlilik Tarihi: {new Date(user.marriageSince).toLocaleDateString('tr-TR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-6">
                  <div className="text-6xl mb-3">💔</div>
                  <p className="text-gray-400">Bekar</p>
                  <p className="text-xs text-gray-500 mt-2">Henüz kimseyle evli değil</p>
                </div>
              )}
            </div>

            {/* Fosterlings Section */}
            {user.fosterlings && user.fosterlings.length > 0 && (
              <div className="glass rounded-xl p-6 mt-6 border border-blue-500/20">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-xl">
                    👶
                  </div>
                  <h3 className="text-xl font-bold">Evlatlıklar</h3>
                  <span className="ml-auto px-3 py-1 bg-blue-500/20 rounded-full text-sm font-semibold">
                    {user.fosterlings.length}
                  </span>
                </div>
                <div className="text-sm text-gray-400 text-center">
                  {user.fosterlings.length} evlatlık bulunuyor
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default UserProfileModal
