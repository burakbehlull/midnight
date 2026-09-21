import { useState, useEffect } from 'react'
import { api } from '../api/client'

const AdminPanel = () => {
  const [guilds, setGuilds] = useState([])
  const [selectedGuild, setSelectedGuild] = useState('')
  const [channels, setChannels] = useState([])
  const [selectedChannel, setSelectedChannel] = useState('')
  const [messageContent, setMessageContent] = useState('')
  const [useEmbed, setUseEmbed] = useState(false)
  const [embedData, setEmbedData] = useState({
    title: '',
    description: '',
    color: 0x9333ea,
    footer: ''
  })
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState(null)

  useEffect(() => {
    fetchGuilds()
  }, [])

  useEffect(() => {
    if (selectedGuild) {
      fetchChannels()
    } else {
      setChannels([])
      setSelectedChannel('')
    }
  }, [selectedGuild])

  const fetchGuilds = async () => {
    try {
      const res = await api.getGuilds()
      setGuilds(res.data)
    } catch (error) {
      console.error('Sunucular yüklenemedi:', error)
    }
  }

  const fetchChannels = async () => {
    try {
      const res = await api.getGuildChannels(selectedGuild)
      setChannels(res.data)
    } catch (error) {
      console.error('Kanallar yüklenemedi:', error)
    }
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    
    if (!selectedGuild || !selectedChannel) {
      setResult({ success: false, message: 'Sunucu ve kanal seçmelisin!' })
      return
    }

    if (!messageContent && !useEmbed) {
      setResult({ success: false, message: 'Mesaj içeriği boş olamaz!' })
      return
    }

    setSending(true)
    setResult(null)

    try {
      const payload = {
        guildId: selectedGuild,
        channelId: selectedChannel
      }

      if (useEmbed) {
        payload.embed = {
          title: embedData.title || undefined,
          description: embedData.description || messageContent,
          color: embedData.color,
          footer: embedData.footer ? { text: embedData.footer } : undefined
        }
      } else {
        payload.content = messageContent
      }

      const res = await api.sendMessage(payload)
      setResult({ 
        success: true, 
        message: `Mesaj başarıyla #${res.data.channelName} kanalına gönderildi!` 
      })
      
      // Clear form
      setMessageContent('')
      setEmbedData({ title: '', description: '', color: 0x9333ea, footer: '' })
      
    } catch (error) {
      setResult({ 
        success: false, 
        message: error.response?.data?.error || 'Mesaj gönderilirken hata oluştu!' 
      })
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Admin Panel ⚙️</h1>
        <p className="text-gray-400">Bot üzerinden sunucu kanallarına mesaj gönder</p>
      </div>

      {/* Message Sender Card */}
      <div className="glass rounded-xl p-8">
        <h2 className="text-2xl font-semibold mb-6 gradient-text">Mesaj Gönder</h2>

        <form onSubmit={handleSendMessage} className="space-y-6">
          {/* Guild Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">Sunucu Seç</label>
            <select
              value={selectedGuild}
              onChange={(e) => setSelectedGuild(e.target.value)}
              className="w-full bg-midnight-base border border-midnight-light rounded-lg px-4 py-3 focus:outline-none focus:border-midnight-purple transition-colors"
            >
              <option value="">Sunucu seçin...</option>
              {guilds.map(guild => (
                <option key={guild.id} value={guild.id}>
                  {guild.name}
                </option>
              ))}
            </select>
          </div>

          {/* Channel Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">Kanal Seç</label>
            <select
              value={selectedChannel}
              onChange={(e) => setSelectedChannel(e.target.value)}
              disabled={!selectedGuild}
              className="w-full bg-midnight-base border border-midnight-light rounded-lg px-4 py-3 focus:outline-none focus:border-midnight-purple transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">Kanal seçin...</option>
              {channels.map(channel => (
                <option key={channel.id} value={channel.id}>
                  # {channel.name}
                </option>
              ))}
            </select>
          </div>

          {/* Embed Toggle */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="useEmbed"
              checked={useEmbed}
              onChange={(e) => setUseEmbed(e.target.checked)}
              className="w-5 h-5 accent-midnight-purple cursor-pointer"
            />
            <label htmlFor="useEmbed" className="cursor-pointer">
              Renkli Embed Mesajı Gönder
            </label>
          </div>

          {/* Message Content */}
          {!useEmbed ? (
            <div>
              <label className="block text-sm font-medium mb-2">Mesaj İçeriği</label>
              <textarea
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                placeholder="Göndermek istediğin mesajı yaz..."
                rows="6"
                className="w-full bg-midnight-base border border-midnight-light rounded-lg px-4 py-3 focus:outline-none focus:border-midnight-purple transition-colors resize-none"
              />
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Embed Başlık (İsteğe bağlı)</label>
                <input
                  type="text"
                  value={embedData.title}
                  onChange={(e) => setEmbedData({...embedData, title: e.target.value})}
                  placeholder="Başlık..."
                  className="w-full bg-midnight-base border border-midnight-light rounded-lg px-4 py-3 focus:outline-none focus:border-midnight-purple transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Embed Açıklama</label>
                <textarea
                  value={embedData.description || messageContent}
                  onChange={(e) => {
                    setEmbedData({...embedData, description: e.target.value})
                    setMessageContent(e.target.value)
                  }}
                  placeholder="Mesaj içeriği..."
                  rows="6"
                  className="w-full bg-midnight-base border border-midnight-light rounded-lg px-4 py-3 focus:outline-none focus:border-midnight-purple transition-colors resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Embed Alt Yazı (İsteğe bağlı)</label>
                <input
                  type="text"
                  value={embedData.footer}
                  onChange={(e) => setEmbedData({...embedData, footer: e.target.value})}
                  placeholder="Alt yazı..."
                  className="w-full bg-midnight-base border border-midnight-light rounded-lg px-4 py-3 focus:outline-none focus:border-midnight-purple transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Embed Rengi</label>
                <div className="flex gap-2">
                  {[
                    { name: 'Mor', color: 0x9333ea },
                    { name: 'Pembe', color: 0xec4899 },
                    { name: 'Yeşil', color: 0x10b981 },
                    { name: 'Kırmızı', color: 0xef4444 },
                    { name: 'Mavi', color: 0x3b82f6 }
                  ].map(({ name, color }) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setEmbedData({...embedData, color})}
                      className={`px-4 py-2 rounded-lg transition-colors ${
                        embedData.color === color 
                          ? 'bg-gradient-to-r from-midnight-purple to-midnight-pink' 
                          : 'bg-midnight-base hover:bg-midnight-light'
                      }`}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={sending}
            className="w-full bg-gradient-to-r from-midnight-purple to-midnight-pink px-6 py-4 rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? 'Gönderiliyor...' : 'Mesajı Gönder'}
          </button>
        </form>

        {/* Result Message */}
        {result && (
          <div className={`mt-6 p-4 rounded-lg ${
            result.success 
              ? 'bg-green-500 bg-opacity-20 border border-green-500' 
              : 'bg-red-500 bg-opacity-20 border border-red-500'
          }`}>
            <p className={result.success ? 'text-green-400' : 'text-red-400'}>
              {result.message}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminPanel
