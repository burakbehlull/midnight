import { useState, useEffect } from 'react'
import { api } from '../api/client'

const DMPanel = () => {
  const [users, setUsers] = useState([])
  const [selectedUser, setSelectedUser] = useState(null)
  const [replyText, setReplyText] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    fetchDMs()
  }, [refreshKey])

  const fetchDMs = async () => {
    try {
      setLoading(true)
      const res = await api.getBotDMs()
      setUsers(res.data)
    } catch (error) {
      console.error('DM\'ler yüklenirken hata:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleReply = async () => {
    if (!replyText.trim() || !selectedUser) return

    try {
      setSending(true)
      await api.replyToDM(selectedUser.userId, replyText)
      
      setReplyText('')
      setRefreshKey(prev => prev + 1) // Refresh DMs
      
      // Show success message
      alert('Mesaj başarıyla gönderildi!')
    } catch (error) {
      console.error('Mesaj gönderilirken hata:', error)
      alert('Mesaj gönderilemedi: ' + error.message)
    } finally {
      setSending(false)
    }
  }

  const formatDate = (date) => {
    const d = new Date(date)
    const now = new Date()
    const diff = now - d
    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) return `${days} gün önce`
    if (hours > 0) return `${hours} saat önce`
    if (minutes > 0) return `${minutes} dakika önce`
    return 'Az önce'
  }

  if (loading) {
    return (
      <div className="glass rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <span className="text-2xl">💬</span>
          <h2 className="text-2xl font-bold">Bot DM'leri</h2>
        </div>
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-midnight-purple mb-4"></div>
          <p className="text-gray-400">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  if (users.length === 0) {
    return (
      <div className="glass rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <span className="text-2xl">💬</span>
          <h2 className="text-2xl font-bold">Bot DM'leri</h2>
        </div>
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📭</div>
          <p className="text-gray-400 text-lg">Henüz hiç mesaj yok</p>
          <p className="text-gray-500 text-sm mt-2">Kullanıcılar bota mesaj attığında burada görünecek</p>
        </div>
      </div>
    )
  }

  return (
    <div className="glass rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className="text-2xl">💬</span>
          <h2 className="text-2xl font-bold">Bot DM'leri</h2>
          <span className="px-3 py-1 rounded-full bg-midnight-purple/20 text-midnight-purple text-sm font-semibold">
            {users.length} kullanıcı
          </span>
        </div>
        <button
          onClick={() => setRefreshKey(prev => prev + 1)}
          className="px-4 py-2 rounded-lg bg-midnight-purple/10 hover:bg-midnight-purple/20 transition-colors text-sm font-medium"
        >
          🔄 Yenile
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User List */}
        <div className="lg:col-span-1 space-y-2 max-h-[600px] overflow-y-auto custom-scrollbar">
          {users.map(user => (
            <div
              key={user.userId}
              onClick={() => setSelectedUser(user)}
              className={`p-4 rounded-lg cursor-pointer transition-all ${
                selectedUser?.userId === user.userId
                  ? 'bg-midnight-purple/20 border-2 border-midnight-purple'
                  : 'bg-white/5 hover:bg-white/10 border-2 border-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="relative">
                  <img
                    src={user.avatar || `https://cdn.discordapp.com/embed/avatars/${parseInt(user.userId) % 5}.png`}
                    alt={user.username}
                    className="w-12 h-12 rounded-full"
                  />
                  {user.unreadCount > 0 && (
                    <div className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-xs font-bold">
                      {user.unreadCount}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">
                    {user.globalName || user.username}
                  </p>
                  <p className="text-sm text-gray-400 truncate">
                    {user.messages[0]?.content.substring(0, 30)}...
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatDate(user.lastMessage)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Message Thread */}
        <div className="lg:col-span-2">
          {selectedUser ? (
            <div className="bg-white/5 rounded-lg border border-white/10 overflow-hidden">
              {/* Header */}
              <div className="p-4 border-b border-white/10 bg-gradient-to-r from-midnight-purple/10 to-pink-500/10">
                <div className="flex items-center gap-3">
                  <img
                    src={selectedUser.avatar || `https://cdn.discordapp.com/embed/avatars/${parseInt(selectedUser.userId) % 5}.png`}
                    alt={selectedUser.username}
                    className="w-10 h-10 rounded-full"
                  />
                  <div>
                    <p className="font-semibold">
                      {selectedUser.globalName || selectedUser.username}
                    </p>
                    <p className="text-xs text-gray-400">
                      @{selectedUser.username} • {selectedUser.messages.length} mesaj
                    </p>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="p-4 space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar">
                {selectedUser.messages.map((msg, idx) => (
                  <div key={idx} className="space-y-2">
                    {/* User Message */}
                    <div className="flex gap-3">
                      <img
                        src={selectedUser.avatar || `https://cdn.discordapp.com/embed/avatars/${parseInt(selectedUser.userId) % 5}.png`}
                        alt={selectedUser.username}
                        className="w-8 h-8 rounded-full flex-shrink-0"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-sm">
                            {selectedUser.globalName || selectedUser.username}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(msg.createdAt).toLocaleString('tr-TR')}
                          </span>
                        </div>
                        <div className="bg-white/5 rounded-lg p-3 inline-block max-w-full break-words">
                          {msg.content}
                        </div>
                      </div>
                    </div>

                    {/* Bot Reply */}
                    {msg.replied && msg.replyContent && (
                      <div className="flex gap-3 ml-11">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-midnight-purple to-pink-500 flex items-center justify-center text-xs font-bold flex-shrink-0">
                          🤖
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-sm text-midnight-purple">
                              Bot (Sen)
                            </span>
                            <span className="text-xs text-gray-500">
                              {new Date(msg.repliedAt).toLocaleString('tr-TR')}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-green-500/20 text-green-400 text-xs">
                              ✓ Cevaplandı
                            </span>
                          </div>
                          <div className="bg-gradient-to-r from-midnight-purple/20 to-pink-500/20 rounded-lg p-3 inline-block max-w-full break-words border border-midnight-purple/30">
                            {msg.replyContent}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Reply Input */}
              <div className="p-4 border-t border-white/10 bg-white/5">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !sending && handleReply()}
                    placeholder={`${selectedUser.globalName || selectedUser.username} kullanıcısına mesaj gönder...`}
                    className="flex-1 px-4 py-2 rounded-lg bg-white/10 border border-white/20 focus:border-midnight-purple focus:outline-none transition-colors"
                    disabled={sending}
                  />
                  <button
                    onClick={handleReply}
                    disabled={!replyText.trim() || sending}
                    className="px-6 py-2 rounded-lg bg-gradient-to-r from-midnight-purple to-pink-500 hover:from-midnight-purple/80 hover:to-pink-500/80 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold"
                  >
                    {sending ? '⏳' : '📤'} Gönder
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  💡 Enter tuşuna basarak da gönderebilirsin
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-white/5 rounded-lg border border-white/10 h-[580px] flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl mb-4">👈</div>
                <p className="text-gray-400">Mesajları görmek için bir kullanıcı seç</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default DMPanel
