import { useState, useEffect } from 'react'
import { api } from '../../api/client'

const CommandPanelTab = ({ guildId }) => {
  const [commands, setCommands] = useState({})
  const [selectedCommand, setSelectedCommand] = useState(null)
  const [commandSettings, setCommandSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  
  const [roles, setRoles] = useState([])
  const [channels, setChannels] = useState([])
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [userSearchQuery, setUserSearchQuery] = useState('')

  useEffect(() => {
    fetchData()
  }, [guildId])

  useEffect(() => {
    if (selectedCommand) {
      fetchCommandSettings()
    }
  }, [selectedCommand])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [commandsRes, rolesRes, channelsRes] = await Promise.all([
        api.getCommandsList(),
        api.getGuildRoles(guildId),
        api.getGuildChannels(guildId)
      ])
      
      console.log('✅ Komutlar yüklendi:', commandsRes.data)
      console.log('📊 Toplam kategori:', Object.keys(commandsRes.data).length)
      console.log('📊 Toplam komut:', Object.values(commandsRes.data).flat().length)
      
      setCommands(commandsRes.data)
      setRoles(rolesRes.data)
      setChannels(channelsRes.data)
    } catch (error) {
      console.error('❌ Komutlar yüklenemedi:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchCommandSettings = async () => {
    if (!selectedCommand) return
    try {
      const res = await api.getCommandSettings(guildId, selectedCommand.name)
      setCommandSettings(res.data)
    } catch (error) {
      console.error('Komut ayarları yüklenemedi:', error)
    }
  }

  const handleSave = async () => {
    if (!selectedCommand || !commandSettings) return
    setSaving(true)
    try {
      await api.updateCommandSettings(guildId, selectedCommand.name, commandSettings)
      alert('✅ Komut ayarları başarıyla kaydedildi!')
    } catch (error) {
      console.error('Kayıt hatası:', error)
      alert('❌ Hata: ' + (error.response?.data?.error || error.message))
    } finally {
      setSaving(false)
    }
  }

  const handleReset = async () => {
    if (!selectedCommand) return
    if (!confirm(`${selectedCommand.name} komutunun ayarlarını sıfırlamak istediğinize emin misiniz?`)) return
    
    try {
      await api.deleteCommandSettings(guildId, selectedCommand.name)
      alert('✅ Komut ayarları sıfırlandı!')
      fetchCommandSettings()
    } catch (error) {
      console.error('Sıfırlama hatası:', error)
      alert('❌ Hata: ' + (error.response?.data?.error || error.message))
    }
  }

  const handleSearchUser = async () => {
    if (!userSearchQuery.trim()) return
    setSearching(true)
    try {
      const res = await api.getGuildMembers(guildId, { search: userSearchQuery, limit: 10 })
      setSearchResults(res.data.members)
    } catch (error) {
      console.error('Arama hatası:', error)
    } finally {
      setSearching(false)
    }
  }

  const addToList = (listName, value) => {
    if (!commandSettings[listName]) commandSettings[listName] = []
    if (!commandSettings[listName].includes(value)) {
      setCommandSettings({
        ...commandSettings,
        [listName]: [...commandSettings[listName], value]
      })
    }
  }

  const removeFromList = (listName, value) => {
    setCommandSettings({
      ...commandSettings,
      [listName]: (commandSettings[listName] || []).filter(v => v !== value)
    })
  }

  const filteredCommands = Object.entries(commands).reduce((acc, [category, cmds]) => {
    const filtered = cmds.filter(cmd => 
      cmd.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cmd.description.toLowerCase().includes(searchQuery.toLowerCase())
    )
    if (filtered.length > 0) {
      acc[category] = filtered
    }
    return acc
  }, {})

  const categoryIcons = {
    'economy': '💰',
    'fun': '🎉',
    'games': '🎮',
    'general': '📋',
    'moderation': '🛡️',
    'staff': '👮',
    'guild': '🏰',
    'client': '🤖',
    'other': '📦'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-midnight-purple"></div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Panel - Command List */}
      <div className="lg:col-span-1">
        <div className="glass rounded-xl p-4 sticky top-4">
          <h2 className="text-2xl font-bold mb-4">⚙️ Komutlar</h2>
          
          {/* Search */}
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Komut ara..."
            className="w-full bg-midnight-base border border-midnight-light rounded-lg px-4 py-2 mb-4 focus:outline-none focus:border-midnight-purple"
          />

          {/* Commands List */}
          <div className="space-y-4 max-h-[calc(100vh-250px)] overflow-y-auto custom-scrollbar">
            {Object.keys(filteredCommands).length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-3">📭</div>
                <p className="text-gray-400 text-sm">
                  {searchQuery ? 'Komut bulunamadı' : 'Komut yükleniyor...'}
                </p>
              </div>
            ) : (
              Object.entries(filteredCommands).map(([category, cmds]) => (
              <div key={category}>
                <h3 className="text-sm font-semibold text-gray-400 mb-2 flex items-center gap-2">
                  <span>{categoryIcons[category] || '📦'}</span>
                  <span className="uppercase">{category}</span>
                </h3>
                <div className="space-y-1">
                  {cmds.map(cmd => (
                    <button
                      key={cmd.name}
                      onClick={() => {
                        setSelectedCommand(cmd)
                        setSearchResults([])
                        setUserSearchQuery('')
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                        selectedCommand?.name === cmd.name
                          ? 'bg-gradient-to-r from-midnight-purple to-midnight-pink'
                          : 'bg-midnight-base hover:bg-midnight-light'
                      }`}
                    >
                      <div className="font-medium">{cmd.name}</div>
                      <div className="text-xs text-gray-400 truncate">{cmd.description}</div>
                    </button>
                  ))}
                </div>
              </div>
            ))
            )}
          </div>
        </div>
      </div>

      {/* Right Panel - Command Settings */}
      <div className="lg:col-span-2">
        {!selectedCommand ? (
          <div className="glass rounded-xl p-12 text-center">
            <div className="text-6xl mb-4">🎯</div>
            <h3 className="text-2xl font-bold mb-2">Komut Seçin</h3>
            <p className="text-gray-400">Ayarlamak için sol taraftan bir komut seçin</p>
          </div>
        ) : !commandSettings ? (
          <div className="flex items-center justify-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-midnight-purple"></div>
          </div>
        ) : (
          <div className="glass rounded-xl p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-midnight-light pb-4">
              <div>
                <h2 className="text-2xl font-bold">{selectedCommand.name}</h2>
                <p className="text-sm text-gray-400">{selectedCommand.description}</p>
                {selectedCommand.aliases.length > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    Alternatifler: {selectedCommand.aliases.join(', ')}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleReset}
                  className="px-4 py-2 bg-red-500 bg-opacity-20 border border-red-500 rounded-lg hover:bg-opacity-30 transition-colors text-red-400 text-sm"
                >
                  🔄 Sıfırla
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-6 py-2 bg-gradient-to-r from-midnight-purple to-midnight-pink rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                      <span>Kaydediliyor...</span>
                    </>
                  ) : (
                    <>
                      <span>💾</span>
                      <span>Kaydet</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Enabled Toggle */}
            <div className="glass-inner rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-lg font-semibold">Komut Durumu</label>
                  <p className="text-sm text-gray-400">Komutu aktif/pasif yap</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={commandSettings.enabled !== false}
                    onChange={(e) => setCommandSettings({ ...commandSettings, enabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-midnight-purple rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-midnight-purple"></div>
                </label>
              </div>
            </div>

            {/* Channel Restrictions */}
            <ChannelRestrictions
              settings={commandSettings}
              setSettings={setCommandSettings}
              channels={channels}
              addToList={addToList}
              removeFromList={removeFromList}
            />

            {/* Role Restrictions */}
            <RoleRestrictions
              settings={commandSettings}
              setSettings={setCommandSettings}
              roles={roles}
              addToList={addToList}
              removeFromList={removeFromList}
            />

            {/* User Restrictions */}
            <UserRestrictions
              settings={commandSettings}
              setSettings={setCommandSettings}
              guildId={guildId}
              searchQuery={userSearchQuery}
              setSearchQuery={setUserSearchQuery}
              searchResults={searchResults}
              searching={searching}
              handleSearch={handleSearchUser}
              addToList={addToList}
              removeFromList={removeFromList}
            />

            {/* Exempt Users & Roles */}
            <ExemptSettings
              settings={commandSettings}
              setSettings={setCommandSettings}
              roles={roles}
              guildId={guildId}
              addToList={addToList}
              removeFromList={removeFromList}
            />

            {/* Auto Delete */}
            <AutoDeleteSettings
              settings={commandSettings}
              setSettings={setCommandSettings}
            />

            {/* Custom Cooldown */}
            <CooldownSettings
              settings={commandSettings}
              setSettings={setCommandSettings}
            />
          </div>
        )}
      </div>
    </div>
  )
}

// Channel Restrictions Component
const ChannelRestrictions = ({ settings, setSettings, channels, addToList, removeFromList }) => {
  const [selectedChannel, setSelectedChannel] = useState('')

  return (
    <div className="glass-inner rounded-lg p-4">
      <h3 className="text-lg font-semibold mb-3">📺 Kanal Kısıtlamaları</h3>
      
      {/* Mode Selector */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Mod</label>
        <select
          value={settings.channelMode || 'off'}
          onChange={(e) => setSettings({ ...settings, channelMode: e.target.value })}
          className="w-full bg-midnight-base border border-midnight-light rounded-lg px-4 py-2 focus:outline-none focus:border-midnight-purple"
        >
          <option value="off">Kapalı (Kısıtlama Yok)</option>
          <option value="whitelist">Whitelist (Sadece İzin Verilenler)</option>
          <option value="blacklist">Blacklist (İzin Verilmeyenler)</option>
        </select>
      </div>

      {settings.channelMode === 'whitelist' && (
        <div>
          <label className="block text-sm font-medium mb-2">İzin Verilen Kanallar</label>
          <div className="flex gap-2 mb-2">
            <select
              value={selectedChannel}
              onChange={(e) => setSelectedChannel(e.target.value)}
              className="flex-1 bg-midnight-base border border-midnight-light rounded-lg px-4 py-2 focus:outline-none focus:border-midnight-purple"
            >
              <option value="">Kanal Seçiniz</option>
              {channels.filter(ch => !settings.allowedChannels?.includes(ch.id)).map(channel => (
                <option key={channel.id} value={channel.id}>#{channel.name}</option>
              ))}
            </select>
            <button
              onClick={() => {
                if (selectedChannel) {
                  addToList('allowedChannels', selectedChannel)
                  setSelectedChannel('')
                }
              }}
              disabled={!selectedChannel}
              className="px-4 py-2 bg-green-500 bg-opacity-20 border border-green-500 rounded-lg hover:bg-opacity-30 transition-colors disabled:opacity-50"
            >
              + Ekle
            </button>
          </div>
          <div className="space-y-1">
            {(settings.allowedChannels || []).map(channelId => {
              const channel = channels.find(ch => ch.id === channelId)
              return (
                <div key={channelId} className="flex items-center justify-between bg-midnight-base rounded-lg p-2">
                  <span className="text-sm">#{channel?.name || channelId}</span>
                  <button
                    onClick={() => removeFromList('allowedChannels', channelId)}
                    className="text-red-400 hover:text-red-300 text-sm"
                  >
                    🗑️
                  </button>
                </div>
              )
            })}
            {(!settings.allowedChannels || settings.allowedChannels.length === 0) && (
              <p className="text-gray-500 text-center py-2 text-sm">Kanal eklenmemiş</p>
            )}
          </div>
        </div>
      )}

      {settings.channelMode === 'blacklist' && (
        <div>
          <label className="block text-sm font-medium mb-2">Engellenmiş Kanallar</label>
          <div className="flex gap-2 mb-2">
            <select
              value={selectedChannel}
              onChange={(e) => setSelectedChannel(e.target.value)}
              className="flex-1 bg-midnight-base border border-midnight-light rounded-lg px-4 py-2 focus:outline-none focus:border-midnight-purple"
            >
              <option value="">Kanal Seçiniz</option>
              {channels.filter(ch => !settings.blockedChannels?.includes(ch.id)).map(channel => (
                <option key={channel.id} value={channel.id}>#{channel.name}</option>
              ))}
            </select>
            <button
              onClick={() => {
                if (selectedChannel) {
                  addToList('blockedChannels', selectedChannel)
                  setSelectedChannel('')
                }
              }}
              disabled={!selectedChannel}
              className="px-4 py-2 bg-red-500 bg-opacity-20 border border-red-500 rounded-lg hover:bg-opacity-30 transition-colors disabled:opacity-50"
            >
              + Ekle
            </button>
          </div>
          <div className="space-y-1">
            {(settings.blockedChannels || []).map(channelId => {
              const channel = channels.find(ch => ch.id === channelId)
              return (
                <div key={channelId} className="flex items-center justify-between bg-midnight-base rounded-lg p-2">
                  <span className="text-sm">#{channel?.name || channelId}</span>
                  <button
                    onClick={() => removeFromList('blockedChannels', channelId)}
                    className="text-red-400 hover:text-red-300 text-sm"
                  >
                    🗑️
                  </button>
                </div>
              )
            })}
            {(!settings.blockedChannels || settings.blockedChannels.length === 0) && (
              <p className="text-gray-500 text-center py-2 text-sm">Kanal eklenmemiş</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// Role Restrictions Component
const RoleRestrictions = ({ settings, setSettings, roles, addToList, removeFromList }) => {
  const [selectedRole, setSelectedRole] = useState('')

  return (
    <div className="glass-inner rounded-lg p-4">
      <h3 className="text-lg font-semibold mb-3">🎭 Rol Kısıtlamaları</h3>
      
      {/* Mode Selector */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Mod</label>
        <select
          value={settings.roleMode || 'off'}
          onChange={(e) => setSettings({ ...settings, roleMode: e.target.value })}
          className="w-full bg-midnight-base border border-midnight-light rounded-lg px-4 py-2 focus:outline-none focus:border-midnight-purple"
        >
          <option value="off">Kapalı (Kısıtlama Yok)</option>
          <option value="whitelist">Whitelist (Sadece İzin Verilenler)</option>
          <option value="blacklist">Blacklist (İzin Verilmeyenler)</option>
        </select>
      </div>

      {settings.roleMode === 'whitelist' && (
        <div>
          <label className="block text-sm font-medium mb-2">İzin Verilen Roller</label>
          <div className="flex gap-2 mb-2">
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="flex-1 bg-midnight-base border border-midnight-light rounded-lg px-4 py-2 focus:outline-none focus:border-midnight-purple"
            >
              <option value="">Rol Seçiniz</option>
              {roles.filter(r => !settings.allowedRoles?.includes(r.id)).map(role => (
                <option key={role.id} value={role.id}>{role.name}</option>
              ))}
            </select>
            <button
              onClick={() => {
                if (selectedRole) {
                  addToList('allowedRoles', selectedRole)
                  setSelectedRole('')
                }
              }}
              disabled={!selectedRole}
              className="px-4 py-2 bg-green-500 bg-opacity-20 border border-green-500 rounded-lg hover:bg-opacity-30 transition-colors disabled:opacity-50"
            >
              + Ekle
            </button>
          </div>
          <div className="space-y-1">
            {(settings.allowedRoles || []).map(roleId => {
              const role = roles.find(r => r.id === roleId)
              return (
                <div key={roleId} className="flex items-center justify-between bg-midnight-base rounded-lg p-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: role?.hexColor || '#99AAB5' }}
                    ></div>
                    <span className="text-sm">{role?.name || roleId}</span>
                  </div>
                  <button
                    onClick={() => removeFromList('allowedRoles', roleId)}
                    className="text-red-400 hover:text-red-300 text-sm"
                  >
                    🗑️
                  </button>
                </div>
              )
            })}
            {(!settings.allowedRoles || settings.allowedRoles.length === 0) && (
              <p className="text-gray-500 text-center py-2 text-sm">Rol eklenmemiş</p>
            )}
          </div>
        </div>
      )}

      {settings.roleMode === 'blacklist' && (
        <div>
          <label className="block text-sm font-medium mb-2">Engellenmiş Roller</label>
          <div className="flex gap-2 mb-2">
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="flex-1 bg-midnight-base border border-midnight-light rounded-lg px-4 py-2 focus:outline-none focus:border-midnight-purple"
            >
              <option value="">Rol Seçiniz</option>
              {roles.filter(r => !settings.blockedRoles?.includes(r.id)).map(role => (
                <option key={role.id} value={role.id}>{role.name}</option>
              ))}
            </select>
            <button
              onClick={() => {
                if (selectedRole) {
                  addToList('blockedRoles', selectedRole)
                  setSelectedRole('')
                }
              }}
              disabled={!selectedRole}
              className="px-4 py-2 bg-red-500 bg-opacity-20 border border-red-500 rounded-lg hover:bg-opacity-30 transition-colors disabled:opacity-50"
            >
              + Ekle
            </button>
          </div>
          <div className="space-y-1">
            {(settings.blockedRoles || []).map(roleId => {
              const role = roles.find(r => r.id === roleId)
              return (
                <div key={roleId} className="flex items-center justify-between bg-midnight-base rounded-lg p-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: role?.hexColor || '#99AAB5' }}
                    ></div>
                    <span className="text-sm">{role?.name || roleId}</span>
                  </div>
                  <button
                    onClick={() => removeFromList('blockedRoles', roleId)}
                    className="text-red-400 hover:text-red-300 text-sm"
                  >
                    🗑️
                  </button>
                </div>
              )
            })}
            {(!settings.blockedRoles || settings.blockedRoles.length === 0) && (
              <p className="text-gray-500 text-center py-2 text-sm">Rol eklenmemiş</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// User Restrictions Component
const UserRestrictions = ({ 
  settings, 
  setSettings, 
  guildId, 
  searchQuery, 
  setSearchQuery, 
  searchResults, 
  searching, 
  handleSearch,
  addToList,
  removeFromList
}) => {
  return (
    <div className="glass-inner rounded-lg p-4">
      <h3 className="text-lg font-semibold mb-3">👤 Kullanıcı Kısıtlamaları</h3>
      
      {/* Mode Selector */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Mod</label>
        <select
          value={settings.userMode || 'off'}
          onChange={(e) => setSettings({ ...settings, userMode: e.target.value })}
          className="w-full bg-midnight-base border border-midnight-light rounded-lg px-4 py-2 focus:outline-none focus:border-midnight-purple"
        >
          <option value="off">Kapalı (Kısıtlama Yok)</option>
          <option value="whitelist">Whitelist (Sadece İzin Verilenler)</option>
          <option value="blacklist">Blacklist (İzin Verilmeyenler)</option>
        </select>
      </div>

      {(settings.userMode === 'whitelist' || settings.userMode === 'blacklist') && (
        <div>
          <label className="block text-sm font-medium mb-2">
            {settings.userMode === 'whitelist' ? 'İzin Verilen Kullanıcılar' : 'Engellenmiş Kullanıcılar'}
          </label>
          
          {/* Search Box */}
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Kullanıcı ara..."
              className="flex-1 bg-midnight-base border border-midnight-light rounded-lg px-4 py-2 focus:outline-none focus:border-midnight-purple text-sm"
            />
            <button
              onClick={handleSearch}
              disabled={searching}
              className="px-4 py-2 bg-midnight-purple bg-opacity-20 border border-midnight-purple rounded-lg hover:bg-opacity-30 transition-colors disabled:opacity-50"
            >
              {searching ? '⏳' : '🔍'}
            </button>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="mb-2 bg-midnight-base border border-midnight-light rounded-lg p-2 max-h-[150px] overflow-y-auto">
              {searchResults.map(member => (
                <div
                  key={member.userId}
                  className="flex items-center justify-between p-2 hover:bg-midnight-light rounded cursor-pointer"
                  onClick={() => {
                    const listName = settings.userMode === 'whitelist' ? 'allowedUsers' : 'blockedUsers'
                    addToList(listName, member.userId)
                  }}
                >
                  <div className="flex items-center gap-2">
                    <img src={member.avatar} alt={member.username} className="w-6 h-6 rounded-full" />
                    <span className="text-sm">{member.username}</span>
                  </div>
                  <button className="text-green-400 text-sm">+ Ekle</button>
                </div>
              ))}
            </div>
          )}

          {/* Users List */}
          <div className="space-y-1">
            {((settings.userMode === 'whitelist' ? settings.allowedUsers : settings.blockedUsers) || []).map(userId => (
              <div key={userId} className="flex items-center justify-between bg-midnight-base rounded-lg p-2">
                <code className="text-xs">{userId}</code>
                <button
                  onClick={() => removeFromList(settings.userMode === 'whitelist' ? 'allowedUsers' : 'blockedUsers', userId)}
                  className="text-red-400 hover:text-red-300 text-sm"
                >
                  🗑️
                </button>
              </div>
            ))}
            {(!(settings.userMode === 'whitelist' ? settings.allowedUsers : settings.blockedUsers) || 
              (settings.userMode === 'whitelist' ? settings.allowedUsers : settings.blockedUsers).length === 0) && (
              <p className="text-gray-500 text-center py-2 text-sm">Kullanıcı eklenmemiş</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// Exempt Settings Component
const ExemptSettings = ({ settings, setSettings, roles, guildId, addToList, removeFromList }) => {
  const [selectedRole, setSelectedRole] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)

  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    setSearching(true)
    try {
      const res = await api.getGuildMembers(guildId, { search: searchQuery, limit: 10 })
      setSearchResults(res.data.members)
    } catch (error) {
      console.error('Arama hatası:', error)
    } finally {
      setSearching(false)
    }
  }

  return (
    <div className="glass-inner rounded-lg p-4">
      <h3 className="text-lg font-semibold mb-3">🛡️ İstisna Ayarları</h3>
      <p className="text-xs text-gray-400 mb-4">Bu kullanıcılar ve roller tüm kısıtlamalardan muaf olur</p>
      
      {/* Exempt Roles */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">İstisna Roller</label>
        <div className="flex gap-2 mb-2">
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="flex-1 bg-midnight-base border border-midnight-light rounded-lg px-4 py-2 focus:outline-none focus:border-midnight-purple text-sm"
          >
            <option value="">Rol Seçiniz</option>
            {roles.filter(r => !settings.exemptRoles?.includes(r.id)).map(role => (
              <option key={role.id} value={role.id}>{role.name}</option>
            ))}
          </select>
          <button
            onClick={() => {
              if (selectedRole) {
                addToList('exemptRoles', selectedRole)
                setSelectedRole('')
              }
            }}
            disabled={!selectedRole}
            className="px-4 py-2 bg-green-500 bg-opacity-20 border border-green-500 rounded-lg hover:bg-opacity-30 transition-colors disabled:opacity-50 text-sm"
          >
            + Ekle
          </button>
        </div>
        <div className="space-y-1">
          {(settings.exemptRoles || []).map(roleId => {
            const role = roles.find(r => r.id === roleId)
            return (
              <div key={roleId} className="flex items-center justify-between bg-midnight-base rounded-lg p-2">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: role?.hexColor || '#99AAB5' }}
                  ></div>
                  <span className="text-sm">{role?.name || roleId}</span>
                </div>
                <button
                  onClick={() => removeFromList('exemptRoles', roleId)}
                  className="text-red-400 hover:text-red-300 text-sm"
                >
                  🗑️
                </button>
              </div>
            )
          })}
          {(!settings.exemptRoles || settings.exemptRoles.length === 0) && (
            <p className="text-gray-500 text-center py-2 text-sm">Rol eklenmemiş</p>
          )}
        </div>
      </div>

      {/* Exempt Users */}
      <div>
        <label className="block text-sm font-medium mb-2">İstisna Kullanıcılar</label>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Kullanıcı ara..."
            className="flex-1 bg-midnight-base border border-midnight-light rounded-lg px-4 py-2 focus:outline-none focus:border-midnight-purple text-sm"
          />
          <button
            onClick={handleSearch}
            disabled={searching}
            className="px-4 py-2 bg-midnight-purple bg-opacity-20 border border-midnight-purple rounded-lg hover:bg-opacity-30 transition-colors disabled:opacity-50"
          >
            {searching ? '⏳' : '🔍'}
          </button>
        </div>

        {searchResults.length > 0 && (
          <div className="mb-2 bg-midnight-base border border-midnight-light rounded-lg p-2 max-h-[120px] overflow-y-auto">
            {searchResults.map(member => (
              <div
                key={member.userId}
                className="flex items-center justify-between p-2 hover:bg-midnight-light rounded cursor-pointer"
                onClick={() => {
                  addToList('exemptUsers', member.userId)
                  setSearchResults([])
                  setSearchQuery('')
                }}
              >
                <div className="flex items-center gap-2">
                  <img src={member.avatar} alt={member.username} className="w-6 h-6 rounded-full" />
                  <span className="text-sm">{member.username}</span>
                </div>
                <button className="text-green-400 text-sm">+ Ekle</button>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-1">
          {(settings.exemptUsers || []).map(userId => (
            <div key={userId} className="flex items-center justify-between bg-midnight-base rounded-lg p-2">
              <code className="text-xs">{userId}</code>
              <button
                onClick={() => removeFromList('exemptUsers', userId)}
                className="text-red-400 hover:text-red-300 text-sm"
              >
                🗑️
              </button>
            </div>
          ))}
          {(!settings.exemptUsers || settings.exemptUsers.length === 0) && (
            <p className="text-gray-500 text-center py-2 text-sm">Kullanıcı eklenmemiş</p>
          )}
        </div>
      </div>
    </div>
  )
}

// Auto Delete Settings Component
const AutoDeleteSettings = ({ settings, setSettings }) => {
  return (
    <div className="glass-inner rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold">🗑️ Otomatik Silme</h3>
          <p className="text-xs text-gray-400">Komut kullanıldıktan sonra otomatik sil</p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={settings.autoDelete || false}
            onChange={(e) => setSettings({ ...settings, autoDelete: e.target.checked })}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-midnight-purple rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-midnight-purple"></div>
        </label>
      </div>

      {settings.autoDelete && (
        <div>
          <label className="block text-sm font-medium mb-2">Silme Süresi (saniye)</label>
          <input
            type="number"
            value={settings.deleteAfter || 0}
            onChange={(e) => setSettings({ ...settings, deleteAfter: parseInt(e.target.value) || 0 })}
            min="0"
            className="w-full bg-midnight-base border border-midnight-light rounded-lg px-4 py-2 focus:outline-none focus:border-midnight-purple"
          />
        </div>
      )}
    </div>
  )
}

// Cooldown Settings Component
const CooldownSettings = ({ settings, setSettings }) => {
  return (
    <div className="glass-inner rounded-lg p-4">
      <h3 className="text-lg font-semibold mb-3">⏱️ Özel Cooldown</h3>
      <p className="text-xs text-gray-400 mb-4">Bu komut için özel bekleme süresi (saniye)</p>
      
      <input
        type="number"
        value={settings.customCooldown || ''}
        onChange={(e) => setSettings({ ...settings, customCooldown: e.target.value ? parseInt(e.target.value) : null })}
        placeholder="Varsayılan cooldown kullanılacak"
        min="0"
        className="w-full bg-midnight-base border border-midnight-light rounded-lg px-4 py-2 focus:outline-none focus:border-midnight-purple"
      />
    </div>
  )
}

export default CommandPanelTab
