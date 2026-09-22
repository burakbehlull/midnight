import { useState, useEffect } from 'react'
import { api } from '../../api/client'
import toast from 'react-hot-toast'

const ChannelsTab = ({ guildId }) => {
  const [channels, setChannels] = useState([])
  const [selectedChannel, setSelectedChannel] = useState(null)
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [messagesLoading, setMessagesLoading] = useState(false)

  useEffect(() => {
    fetchChannels()
  }, [guildId])

  const fetchChannels = async () => {
    try {
      setLoading(true)
      const res = await api.getGuildChannels(guildId)
      const textChannels = res.data.filter(ch => ch.type === 0 || ch.type === 'GUILD_TEXT')
      setChannels(textChannels)
    } catch (error) {
      console.error('Kanallar yüklenirken hata:', error)
      toast.error('Kanallar yüklenemedi!')
    } finally {
      setLoading(false)
    }
  }

  const fetchMessages = async (channelId) => {
    try {
      setMessagesLoading(true)
      const res = await api.getGuildChannelMessages(guildId, channelId, 50)
      setMessages(res.data)
      toast.success('Mesajlar yüklendi!')
    } catch (error) {
      console.error('Mesajlar yüklenirken hata:', error)
      toast.error('Mesajlar yüklenemedi!')
      setMessages([])
    } finally {
      setMessagesLoading(false)
    }
  }

  const handleChannelSelect = (channel) => {
    setSelectedChannel(channel)
    fetchMessages(channel.id)
  }

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-midnight-purple mb-4"></div>
        <p className="text-gray-400">Kanallar yükleniyor...</p>
      </div>
    )
  }

  if (channels.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">📺</div>
        <p className="text-gray-400 text-lg">Hiç text kanalı bulunamadı</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Channels List */}
      <div className="lg:col-span-1 space-y-2 max-h-[700px] overflow-y-auto custom-scrollbar">
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-2">📺 Kanallar ({channels.length})</h3>
          <p className="text-sm text-gray-400">Bir kanal seç ve mesajları gör</p>
        </div>
        
        {channels.map(channel => (
          <div
            key={channel.id}
            onClick={() => handleChannelSelect(channel)}
            className={`p-4 rounded-lg cursor-pointer transition-all ${
              selectedChannel?.id === channel.id
                ? 'bg-midnight-purple/20 border-2 border-midnight-purple'
                : 'bg-white/5 hover:bg-white/10 border-2 border-transparent'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">#</span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{channel.name}</p>
                {channel.topic && (
                  <p className="text-xs text-gray-400 truncate mt-1">{channel.topic}</p>
                )}
              </div>
              {selectedChannel?.id === channel.id && (
                <span className="text-midnight-purple">✓</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Messages View */}
      <div className="lg:col-span-2">
        {selectedChannel ? (
          <div className="bg-white/5 rounded-lg border border-white/10 overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-white/10 bg-gradient-to-r from-midnight-purple/10 to-pink-500/10">
              <div className="flex items-center gap-3">
                <span className="text-2xl">#</span>
                <div>
                  <p className="font-semibold text-lg">{selectedChannel.name}</p>
                  {selectedChannel.topic && (
                    <p className="text-sm text-gray-400">{selectedChannel.topic}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Messages */}
            {messagesLoading ? (
              <div className="p-12 text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-midnight-purple mb-4"></div>
                <p className="text-gray-400">Mesajlar yükleniyor...</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="p-12 text-center">
                <div className="text-6xl mb-4">💬</div>
                <p className="text-gray-400">Bu kanalda henüz mesaj yok</p>
              </div>
            ) : (
              <div className="p-4 space-y-4 max-h-[600px] overflow-y-auto custom-scrollbar">
                {messages.map((msg) => (
                  <div key={msg.id} className="flex gap-3">
                    <img
                      src={msg.author.avatar || `https://cdn.discordapp.com/embed/avatars/${parseInt(msg.author.id) % 5}.png`}
                      alt={msg.author.username}
                      className="w-10 h-10 rounded-full flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold">
                          {msg.author.globalName || msg.author.username}
                        </span>
                        {msg.author.bot && (
                          <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 text-xs">
                            BOT
                          </span>
                        )}
                        <span className="text-xs text-gray-500">
                          {formatDate(msg.createdAt)}
                        </span>
                      </div>

                      {/* Message Content */}
                      {msg.content && (
                        <div className="text-gray-200 break-words">
                          {msg.content}
                        </div>
                      )}

                      {/* Attachments */}
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className="mt-2 space-y-2">
                          {msg.attachments.map((att, idx) => (
                            <div key={idx}>
                              {att.contentType?.startsWith('image/') ? (
                                <img
                                  src={att.url}
                                  alt={att.filename}
                                  className="max-w-md rounded-lg border border-white/10"
                                />
                              ) : att.contentType?.startsWith('video/') ? (
                                <video
                                  src={att.url}
                                  controls
                                  className="max-w-md rounded-lg border border-white/10"
                                />
                              ) : (
                                <a
                                  href={att.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-2 px-3 py-2 rounded bg-white/10 hover:bg-white/20 transition-colors"
                                >
                                  <span>📎</span>
                                  <span className="text-sm">{att.filename}</span>
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Embeds */}
                      {msg.embeds && msg.embeds.length > 0 && (
                        <div className="mt-2 space-y-2">
                          {msg.embeds.map((embed, idx) => (
                            <div
                              key={idx}
                              className="border-l-4 border-midnight-purple bg-white/5 p-3 rounded"
                            >
                              {embed.title && (
                                <p className="font-semibold mb-1">{embed.title}</p>
                              )}
                              {embed.description && (
                                <p className="text-sm text-gray-300">{embed.description}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Reactions */}
                      {msg.reactions && msg.reactions.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {msg.reactions.map((reaction, idx) => (
                            <div
                              key={idx}
                              className="px-2 py-1 rounded bg-white/5 text-sm flex items-center gap-1"
                            >
                              <span>{reaction.emoji}</span>
                              <span className="text-gray-400">{reaction.count}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white/5 rounded-lg border border-white/10 h-[680px] flex items-center justify-center">
            <div className="text-center">
              <div className="text-6xl mb-4">👈</div>
              <p className="text-gray-400">Mesajları görmek için bir kanal seç</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ChannelsTab
