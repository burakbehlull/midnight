import { useState, useEffect, useRef } from 'react'
import { api } from '../api/client'

const BotSettings = () => {
  const [botInfo, setBotInfo] = useState(null)
  const [guilds, setGuilds] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('avatar') // 'avatar', 'banner', 'invites'
  const [avatarUrl, setAvatarUrl] = useState('')
  const [bannerUrl, setBannerUrl] = useState('')
  const [updateLoading, setUpdateLoading] = useState(false)
  const [updateResult, setUpdateResult] = useState(null)
  const [copiedInvite, setCopiedInvite] = useState(null)
  const [avatarFile, setAvatarFile] = useState(null)
  const [bannerFile, setBannerFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [bannerPreview, setBannerPreview] = useState(null)
  
  const avatarInputRef = useRef(null)
  const bannerInputRef = useRef(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [botRes, guildsRes] = await Promise.all([
        api.getBotInfo(),
        api.getGuildsWithInvites()
      ])
      setBotInfo(botRes.data)
      setGuilds(guildsRes.data)
      setAvatarUrl(botRes.data.avatar || '')
      setBannerUrl(botRes.data.banner || '')
    } catch (error) {
      console.error('Veri yüklenemedi:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAvatarFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setAvatarFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setAvatarPreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleBannerFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setBannerFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setBannerPreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleUpdateAvatar = async () => {
    setUpdateLoading(true)
    setUpdateResult(null)

    try {
      let res
      if (avatarFile) {
        // Upload file
        const formData = new FormData()
        formData.append('avatar', avatarFile)
        res = await api.uploadBotAvatar(formData)
      } else if (avatarUrl.trim()) {
        // Use URL
        res = await api.updateBotAvatar(avatarUrl)
      } else {
        setUpdateResult({ success: false, message: 'Avatar URL veya dosya gerekli' })
        setUpdateLoading(false)
        return
      }

      setUpdateResult({ success: true, message: res.data.message })
      setAvatarFile(null)
      setAvatarPreview(null)
      await fetchData()
    } catch (error) {
      setUpdateResult({ 
        success: false, 
        message: error.response?.data?.error || 'Avatar güncellenemedi' 
      })
    } finally {
      setUpdateLoading(false)
    }
  }

  const handleUpdateBanner = async () => {
    setUpdateLoading(true)
    setUpdateResult(null)

    try {
      let res
      if (bannerFile) {
        // Upload file
        const formData = new FormData()
        formData.append('banner', bannerFile)
        res = await api.uploadBotBanner(formData)
      } else if (bannerUrl.trim()) {
        // Use URL
        res = await api.updateBotBanner(bannerUrl)
      } else {
        setUpdateResult({ success: false, message: 'Banner URL veya dosya gerekli' })
        setUpdateLoading(false)
        return
      }

      setUpdateResult({ success: true, message: res.data.message })
      setBannerFile(null)
      setBannerPreview(null)
      await fetchData()
    } catch (error) {
      setUpdateResult({ 
        success: false, 
        message: error.response?.data?.error || 'Banner güncellenemedi' 
      })
    } finally {
      setUpdateLoading(false)
    }
  }

  const copyInviteLink = (guildId, inviteUrl) => {
    navigator.clipboard.writeText(inviteUrl)
    setCopiedInvite(guildId)
    setTimeout(() => setCopiedInvite(null), 2000)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 border-4 border-midnight-purple/30 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-midnight-purple border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-lg text-gray-300">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header with Bot Info */}
      <div className="relative mb-12 overflow-hidden rounded-3xl">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-midnight-purple via-midnight-pink to-purple-900 opacity-20"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(147,51,234,0.3),transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_50%,rgba(236,72,153,0.3),transparent_50%)]"></div>
        
        {/* Content */}
        <div className="relative glass-strong border border-white/10 rounded-3xl p-8 backdrop-blur-xl">
          <div className="flex flex-col md:flex-row items-center gap-8">
            {/* Avatar */}
            <div className="relative group">
              <div className="absolute -inset-4 bg-gradient-to-r from-midnight-purple via-midnight-pink to-purple-600 rounded-full blur-2xl opacity-50 group-hover:opacity-75 transition-all duration-500 animate-blob"></div>
              <div className="relative">
                <img 
                  src={botInfo?.avatar || 'https://cdn.discordapp.com/embed/avatars/0.png'} 
                  alt={botInfo?.username}
                  className="relative w-32 h-32 rounded-full border-4 border-white/20 shadow-2xl"
                />
                <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-green-500 rounded-full border-4 border-midnight-dark flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Bot Info */}
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-5xl font-bold mb-3 gradient-text">{botInfo?.username}</h1>
              <div className="flex flex-wrap items-center gap-4 justify-center md:justify-start mb-4">
                <div className="px-4 py-2 bg-white/5 rounded-full border border-white/10 backdrop-blur-sm">
                  <code className="text-sm text-gray-300">ID: {botInfo?.id}</code>
                </div>
                <div className="px-4 py-2 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-full border border-purple-500/30 backdrop-blur-sm">
                  <span className="text-sm font-semibold text-purple-300">🌐 {guilds.length} Sunucu</span>
                </div>
              </div>
              <p className="text-gray-400 text-lg">Bot'unuzun görünümünü özelleştirin ve yönetin</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm">
                <div className="text-3xl font-bold gradient-text">{guilds.length}</div>
                <div className="text-xs text-gray-400 mt-1">Sunucular</div>
              </div>
              <div className="text-center p-4 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm">
                <div className="text-3xl font-bold text-green-400">●</div>
                <div className="text-xs text-gray-400 mt-1">Online</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-8 p-2 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm">
        <button
          onClick={() => setActiveTab('avatar')}
          className={`flex-1 px-6 py-4 rounded-xl font-semibold transition-all duration-300 ${
            activeTab === 'avatar'
              ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/50'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <span className="text-xl">🖼️</span>
            <span>Avatar</span>
          </div>
        </button>
        <button
          onClick={() => setActiveTab('banner')}
          className={`flex-1 px-6 py-4 rounded-xl font-semibold transition-all duration-300 ${
            activeTab === 'banner'
              ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/50'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <span className="text-xl">🎨</span>
            <span>Banner</span>
          </div>
        </button>
        <button
          onClick={() => setActiveTab('invites')}
          className={`flex-1 px-6 py-4 rounded-xl font-semibold transition-all duration-300 ${
            activeTab === 'invites'
              ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg shadow-green-500/50'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <span className="text-xl">🔗</span>
            <span>Davet Linkleri</span>
          </div>
        </button>
      </div>

      {/* Update Result */}
      {updateResult && (
        <div className={`glass-strong rounded-2xl p-6 mb-8 border-2 animate-slideUp ${
          updateResult.success 
            ? 'border-green-500/50 bg-green-500/10' 
            : 'border-red-500/50 bg-red-500/10'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              updateResult.success ? 'bg-green-500/20' : 'bg-red-500/20'
            }`}>
              <span className="text-2xl">{updateResult.success ? '✓' : '✗'}</span>
            </div>
            <p className={`text-lg font-semibold ${updateResult.success ? 'text-green-400' : 'text-red-400'}`}>
              {updateResult.message}
            </p>
          </div>
        </div>
      )}

      {/* Avatar Tab */}
      {activeTab === 'avatar' && (
        <div className="glass-strong rounded-3xl p-8 border border-white/10">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              <span className="text-2xl">🖼️</span>
            </div>
            <span>Avatar Güncelle</span>
          </h2>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Upload File */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg text-gray-300 mb-4">📁 Dosya Yükle</h3>
              
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarFileChange}
                className="hidden"
              />
              
              <button
                onClick={() => avatarInputRef.current.click()}
                className="w-full p-8 border-2 border-dashed border-gray-600 rounded-2xl hover:border-blue-500 transition-all duration-300 group"
              >
                <div className="text-center">
                  <div className="text-6xl mb-4 group-hover:scale-110 transition-transform">📤</div>
                  <p className="text-gray-300 font-semibold mb-2">Dosya Seç</p>
                  <p className="text-sm text-gray-500">PNG, JPG, GIF (Max 10MB)</p>
                </div>
              </button>

              {(avatarPreview || avatarFile) && (
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl blur-xl opacity-50"></div>
                  <div className="relative bg-midnight-base p-4 rounded-2xl border border-white/10">
                    <img 
                      src={avatarPreview} 
                      alt="Preview"
                      className="w-full aspect-square object-cover rounded-xl"
                    />
                    <button
                      onClick={() => {
                        setAvatarFile(null)
                        setAvatarPreview(null)
                      }}
                      className="absolute top-6 right-6 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Or URL */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg text-gray-300 mb-4">🔗 URL Kullan</h3>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-400">
                  Avatar URL
                </label>
                <input
                  type="url"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://example.com/avatar.png"
                  className="w-full bg-midnight-dark/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              {avatarUrl && !avatarFile && (
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl blur-xl opacity-50"></div>
                  <div className="relative bg-midnight-base p-4 rounded-2xl border border-white/10">
                    <img 
                      src={avatarUrl} 
                      alt="Preview"
                      className="w-full aspect-square object-cover rounded-xl"
                      onError={(e) => {
                        e.target.src = 'https://cdn.discordapp.com/embed/avatars/0.png'
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={handleUpdateAvatar}
            disabled={updateLoading || (!avatarFile && !avatarUrl.trim())}
            className="w-full mt-8 bg-gradient-to-r from-blue-500 to-cyan-500 px-8 py-4 rounded-xl font-bold text-lg hover:shadow-lg hover:shadow-blue-500/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02]"
          >
            {updateLoading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Güncelleniyor...</span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <span>✓</span>
                <span>Avatar'ı Güncelle</span>
              </div>
            )}
          </button>
        </div>
      )}

      {/* Banner Tab */}
      {activeTab === 'banner' && (
        <div className="glass-strong rounded-3xl p-8 border border-white/10">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <span className="text-2xl">🎨</span>
            </div>
            <span>Banner Güncelle</span>
          </h2>

          <div className="space-y-8">
            {/* Upload File */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg text-gray-300 mb-4">📁 Dosya Yükle</h3>
              
              <input
                ref={bannerInputRef}
                type="file"
                accept="image/*"
                onChange={handleBannerFileChange}
                className="hidden"
              />
              
              <button
                onClick={() => bannerInputRef.current.click()}
                className="w-full p-8 border-2 border-dashed border-gray-600 rounded-2xl hover:border-purple-500 transition-all duration-300 group"
              >
                <div className="text-center">
                  <div className="text-6xl mb-4 group-hover:scale-110 transition-transform">📤</div>
                  <p className="text-gray-300 font-semibold mb-2">Dosya Seç</p>
                  <p className="text-sm text-gray-500">PNG, JPG, GIF • 16:9 oran önerilir (Max 10MB)</p>
                </div>
              </button>

              {(bannerPreview || bannerFile) && (
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl blur-xl opacity-50"></div>
                  <div className="relative bg-midnight-base p-4 rounded-2xl border border-white/10">
                    <img 
                      src={bannerPreview} 
                      alt="Preview"
                      className="w-full h-64 object-cover rounded-xl"
                    />
                    <button
                      onClick={() => {
                        setBannerFile(null)
                        setBannerPreview(null)
                      }}
                      className="absolute top-6 right-6 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Or URL */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg text-gray-300 mb-4">🔗 URL Kullan</h3>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-400">
                  Banner URL
                </label>
                <input
                  type="url"
                  value={bannerUrl}
                  onChange={(e) => setBannerUrl(e.target.value)}
                  placeholder="https://example.com/banner.png"
                  className="w-full bg-midnight-dark/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>

              {bannerUrl && !bannerFile && (
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl blur-xl opacity-50"></div>
                  <div className="relative bg-midnight-base p-4 rounded-2xl border border-white/10">
                    <img 
                      src={bannerUrl} 
                      alt="Preview"
                      className="w-full h-64 object-cover rounded-xl"
                      onError={(e) => {
                        e.target.style.display = 'none'
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={handleUpdateBanner}
            disabled={updateLoading || (!bannerFile && !bannerUrl.trim())}
            className="w-full mt-8 bg-gradient-to-r from-purple-500 to-pink-500 px-8 py-4 rounded-xl font-bold text-lg hover:shadow-lg hover:shadow-purple-500/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02]"
          >
            {updateLoading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Güncelleniyor...</span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <span>✓</span>
                <span>Banner'ı Güncelle</span>
              </div>
            )}
          </button>
        </div>
      )}

      {/* Invites Tab */}
      {activeTab === 'invites' && (
        <div className="glass-strong rounded-3xl p-8 border border-white/10">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
              <span className="text-2xl">🔗</span>
            </div>
            <span>Sunucu Davet Linkleri</span>
          </h2>

          <div className="space-y-4">
            {guilds.map((guild, index) => (
              <div 
                key={guild.id}
                className="group relative overflow-hidden rounded-2xl border border-white/10 hover:border-green-500/50 transition-all duration-300"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                
                <div className="relative flex items-center gap-4 p-5">
                  {guild.icon && (
                    <img 
                      src={guild.icon} 
                      alt={guild.name}
                      className="w-16 h-16 rounded-xl border-2 border-white/10 group-hover:border-green-500/50 transition-colors"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-lg mb-1">{guild.name}</div>
                    <code className="text-xs text-gray-400 break-all block bg-midnight-dark/50 px-3 py-2 rounded-lg border border-white/5">
                      {guild.inviteUrl}
                    </code>
                  </div>
                  <button
                    onClick={() => copyInviteLink(guild.id, guild.inviteUrl)}
                    className={`px-6 py-3 rounded-xl font-semibold flex items-center gap-2 whitespace-nowrap transition-all duration-300 ${
                      copiedInvite === guild.id
                        ? 'bg-green-500 text-white scale-105'
                        : 'bg-white/5 hover:bg-green-500 hover:text-white border border-white/10 hover:border-green-500'
                    }`}
                  >
                    {copiedInvite === guild.id ? (
                      <>
                        <span>✓</span>
                        <span>Kopyalandı!</span>
                      </>
                    ) : (
                      <>
                        <span>📋</span>
                        <span>Kopyala</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}

            {guilds.length === 0 && (
              <div className="text-center py-16">
                <div className="text-6xl mb-4">🔍</div>
                <p className="text-xl text-gray-400">Henüz sunucu bulunamadı</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default BotSettings
