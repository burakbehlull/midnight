import { useState, useEffect } from 'react'
import { api } from '../../api/client'

const DeletedMessagesTab = ({ guildId }) => {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDeletedMessages()
  }, [guildId])

  const fetchDeletedMessages = async () => {
    setLoading(true)
    try {
      const res = await api.getGuildDeletedMessages(guildId, 100)
      setMessages(res.data)
    } catch (error) {
      console.error('Silinen mesajlar yüklenemedi:', error)
      setMessages([])
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-midnight-purple"></div>
      </div>
    )
  }

  if (messages.length === 0) {
    return (
      <div className="glass rounded-xl p-12 text-center">
        <p className="text-gray-400 text-lg">Henüz silinen mesaj bulunmuyor</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {messages.map((msg, index) => {
        const deletedDate = msg.deletedAt ? new Date(msg.deletedAt) : null
        const createdDate = msg.createdAt ? new Date(msg.createdAt) : null
        
        return (
          <div 
            key={msg._id || index} 
            className="glass rounded-xl p-6 border border-midnight-light hover:border-red-500/50 transition-colors"
            style={{ animation: 'slideUp 0.3s ease-out', animationDelay: `${index * 30}ms` }}
          >
            <div className="flex items-start gap-4">
              {/* Avatar */}
              <div className="flex-shrink-0">
                {msg.avatar ? (
                  <img 
                    src={msg.avatar} 
                    alt={msg.username || 'User'}
                    className="w-12 h-12 rounded-full border-2 border-midnight-light"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-midnight-purple to-midnight-pink flex items-center justify-center font-bold text-lg">
                    {(msg.username || msg.globalName || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              {/* Message Content */}
              <div className="flex-1 min-w-0">
                {/* Header */}
                <div className="flex items-baseline gap-2 mb-2 flex-wrap">
                  <span className="font-semibold text-lg text-white">
                    {msg.globalName || msg.username || 'Bilinmeyen Kullanıcı'}
                  </span>
                  {msg.globalName && msg.username && (
                    <span className="text-sm text-gray-500">@{msg.username}</span>
                  )}
                  <span className="text-xs text-purple-400">
                    #{msg.channelName || 'bilinmeyen-kanal'}
                  </span>
                  {deletedDate && !isNaN(deletedDate.getTime()) && (
                    <span className="text-xs text-gray-400">
                      {deletedDate.toLocaleString('tr-TR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  )}
                </div>

                {/* Message Text with Code Block Support */}
                {msg.content && (
                  <div className="mb-3">
                    {msg.content.includes('```') ? (
                      msg.content.split(/(```[\s\S]*?```)/g).map((part, i) => {
                        if (part.startsWith('```') && part.endsWith('```')) {
                          const codeContent = part.slice(3, -3).trim()
                          const lines = codeContent.split('\n')
                          const language = lines[0].trim()
                          const code = lines.length > 1 ? lines.slice(1).join('\n') : codeContent
                          
                          return (
                            <div key={i} className="bg-[#2b2d31] rounded-lg p-4 my-2 border border-[#1e1f22] font-mono text-sm overflow-x-auto">
                              {language && !code.includes('\n') ? (
                                <>
                                  <div className="text-xs text-gray-500 mb-2">{language}</div>
                                  <pre className="text-gray-300 whitespace-pre-wrap break-words">{codeContent}</pre>
                                </>
                              ) : (
                                <pre className="text-gray-300 whitespace-pre-wrap break-words">{code}</pre>
                              )}
                            </div>
                          )
                        } else if (part.trim()) {
                          return (
                            <div key={i} className="bg-midnight-base rounded-lg p-3 my-2 border border-midnight-light">
                              <p className="text-gray-300 whitespace-pre-wrap break-words">{part}</p>
                            </div>
                          )
                        }
                        return null
                      })
                    ) : (
                      <div className="bg-midnight-base rounded-lg p-3 border border-midnight-light">
                        <p className="text-gray-300 whitespace-pre-wrap break-words">{msg.content}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Attachments */}
                {msg.attachments && msg.attachments.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                    {msg.attachments.map((att, i) => {
                      const isImage = att.contentType?.startsWith('image/')
                      const isVideo = att.contentType?.startsWith('video/')
                      
                      return (
                        <div key={i} className="border border-midnight-light rounded-lg overflow-hidden bg-midnight-base">
                          {isImage ? (
                            <a href={att.url} target="_blank" rel="noopener noreferrer" className="block">
                              <img 
                                src={att.proxyUrl || att.url} 
                                alt={att.filename || 'Image'}
                                className="w-full h-auto hover:opacity-80 transition-opacity"
                                onError={(e) => {
                                  e.target.style.display = 'none'
                                  e.target.parentElement.innerHTML = '<div class="p-4 text-gray-400 text-sm">🖼️ Resim yüklenemedi</div>'
                                }}
                              />
                            </a>
                          ) : isVideo ? (
                            <video 
                              src={att.url} 
                              controls
                              className="w-full h-auto"
                            >
                              Tarayıcınız video oynatmayı desteklemiyor.
                            </video>
                          ) : (
                            <a 
                              href={att.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center gap-3 p-3 hover:bg-midnight-light transition-colors"
                            >
                              <div className="w-10 h-10 rounded bg-midnight-purple flex items-center justify-center">
                                📎
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm truncate text-gray-300">{att.filename || 'Dosya'}</div>
                                {att.size && (
                                  <div className="text-xs text-gray-500">
                                    {(att.size / 1024).toFixed(2)} KB
                                  </div>
                                )}
                              </div>
                            </a>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Embeds */}
                {msg.embeds && msg.embeds.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {msg.embeds.map((embed, i) => (
                      <div key={i} className="border-l-4 border-midnight-purple bg-midnight-base rounded-r-lg p-4">
                        {embed.title && (
                          <div className="font-bold text-white mb-2">{embed.title}</div>
                        )}
                        {embed.description && (
                          <div className="text-sm text-gray-300 mb-2 whitespace-pre-wrap">{embed.description}</div>
                        )}
                        {embed.fields && embed.fields.length > 0 && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                            {embed.fields.map((field, fi) => (
                              <div key={fi} className={field.inline ? '' : 'col-span-full'}>
                                <div className="text-xs font-semibold text-gray-400 mb-1">{field.name}</div>
                                <div className="text-sm text-gray-300">{field.value}</div>
                              </div>
                            ))}
                          </div>
                        )}
                        {embed.image?.url && (
                          <div className="mt-3">
                            <img 
                              src={embed.image.url} 
                              alt="Embed"
                              className="rounded max-w-full h-auto"
                            />
                          </div>
                        )}
                        {embed.thumbnail?.url && (
                          <div className="mt-3">
                            <img 
                              src={embed.thumbnail.url} 
                              alt="Thumbnail"
                              className="rounded max-w-[80px] h-auto"
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Info Footer */}
                <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <span>🗑️</span>
                    <span>Silindi</span>
                  </span>
                  {createdDate && !isNaN(createdDate.getTime()) && (
                    <span className="flex items-center gap-1">
                      <span>📝</span>
                      <span>Oluşturuldu: {createdDate.toLocaleString('tr-TR', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default DeletedMessagesTab
