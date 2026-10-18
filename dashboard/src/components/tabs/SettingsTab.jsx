import { useState, useEffect } from 'react'
import { api } from '../../api/client'
import CommandPanelTab from './CommandPanelTab'

const SettingsTab = ({ guildId }) => {
  const [activeSection, setActiveSection] = useState('settings')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  // Settings state
  const [settings, setSettings] = useState(null)
  const [authority, setAuthority] = useState(null)
  const [modlog, setModlog] = useState(null)
  
  const [roles, setRoles] = useState([])
  const [channels, setChannels] = useState([])

  useEffect(() => {
    fetchData()
  }, [guildId, activeSection])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [rolesRes, channelsRes] = await Promise.all([
        api.getGuildRoles(guildId),
        api.getGuildChannels(guildId)
      ])
      
      setRoles(rolesRes.data)
      setChannels(channelsRes.data)

      // Fetch settings based on active section
      if (activeSection === 'settings') {
        const res = await api.getSettings(guildId)
        setSettings(res.data || {})
      } else if (activeSection === 'authority') {
        const res = await api.getAuthority(guildId)
        setAuthority(res.data || {})
      } else if (activeSection === 'modlog') {
        const res = await api.getModlog(guildId)
        setModlog(res.data || {})
      }
    } catch (error) {
      console.error('Ayarlar yüklenemedi:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveSettings = async () => {
    setSaving(true)
    try {
      if (activeSection === 'settings') {
        await api.updateSettings(guildId, settings)
      } else if (activeSection === 'authority') {
        await api.updateAuthority(guildId, authority)
      } else if (activeSection === 'modlog') {
        await api.updateModlog(guildId, modlog)
      }
      alert('✅ Ayarlar başarıyla kaydedildi!')
    } catch (error) {
      console.error('Kayıt hatası:', error)
      alert('❌ Hata: ' + (error.response?.data?.error || error.message))
    } finally {
      setSaving(false)
    }
  }

  const sections = [
    { id: 'settings', label: 'Genel Ayarlar', icon: '⚙️' },
    { id: 'authority', label: 'Yetki Ayarları', icon: '👮' },
    { id: 'modlog', label: 'Log Ayarları', icon: '📝' },
    { id: 'commands', label: 'Komut Paneli', icon: '🎮' }
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-midnight-purple"></div>
      </div>
    )
  }

  return (
    <div>
      {/* Section Tabs */}
      <div className="glass rounded-xl p-2 mb-6 flex gap-2">
        {sections.map(section => (
          <button
            key={section.id}
            onClick={() => setActiveSection(section.id)}
            className={`flex-1 px-6 py-3 rounded-lg font-medium transition-colors ${
              activeSection === section.id
                ? 'bg-gradient-to-r from-midnight-purple to-midnight-pink'
                : 'hover:bg-midnight-light'
            }`}
          >
            <span className="mr-2">{section.icon}</span>
            {section.label}
          </button>
        ))}
      </div>

      {/* Settings Content */}
      <div className="glass rounded-xl p-6">
        {activeSection === 'commands' ? (
          /* Command Panel - Full width without inner padding */
          <div className="-m-6">
            <CommandPanelTab guildId={guildId} />
          </div>
        ) : (
          <>
            {activeSection === 'settings' && settings && (
              <SettingsSection 
                settings={settings} 
                setSettings={setSettings}
                roles={roles}
                channels={channels}
              />
            )}
            
            {activeSection === 'authority' && authority && (
              <AuthoritySection 
                authority={authority} 
                setAuthority={setAuthority}
                roles={roles}
                guildId={guildId}
              />
            )}
            
            {activeSection === 'modlog' && modlog && (
              <ModlogSection 
                modlog={modlog} 
                setModlog={setModlog}
                channels={channels}
              />
            )}

            {/* Save Button - Only for non-command sections */}
            <div className="mt-8 flex justify-end gap-4">
              <button
                onClick={fetchData}
                className="px-6 py-3 bg-midnight-light rounded-lg font-semibold hover:bg-midnight-base transition-colors"
              >
                🔄 Yenile
              </button>
              <button
                onClick={handleSaveSettings}
                disabled={saving}
                className="px-8 py-3 bg-gradient-to-r from-midnight-purple to-midnight-pink rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
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
          </>
        )}
      </div>
    </div>
  )
}

// =====================
// SETTINGS SECTION
// =====================
const SettingsSection = ({ settings, setSettings, roles, channels }) => {
  const registerFormats = [
    { value: null, label: 'Yok' },
    { value: 'isim_yas', label: 'İsim Yaş' },
    { value: 'tag_isim_yas', label: 'Tag İsim Yaş' },
    { value: 'isim', label: 'İsim' },
    { value: 'tag_isim', label: 'Tag İsim' },
    { value: 'none', label: 'Format Yok' }
  ]

  const registerModes = [
    { value: 'gender', label: 'Cinsiyet (Erkek/Kız)' },
    { value: 'single', label: 'Tek Rol' }
  ]

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold mb-6">⚙️ Genel Ayarlar</h2>
      
      {/* Prefix */}
      <div className="glass-inner rounded-lg p-4">
        <label className="block text-lg font-semibold mb-2">🔤 Komut Prefix</label>
        <p className="text-sm text-gray-400 mb-3">Botun komut prefix'i (örnek: . veya !)</p>
        <input
          type="text"
          value={settings.prefix || '.'}
          onChange={(e) => setSettings({ ...settings, prefix: e.target.value })}
          className="w-full bg-midnight-base border border-midnight-light rounded-lg px-4 py-2 focus:outline-none focus:border-midnight-purple"
          placeholder="."
          maxLength={5}
        />
      </div>

      {/* Tag */}
      <div className="glass-inner rounded-lg p-4">
        <label className="block text-lg font-semibold mb-2">🏷️ Sunucu Tag'ı</label>
        <p className="text-sm text-gray-400 mb-3">Sunucunuzun tag'ı (örnek: ★)</p>
        <input
          type="text"
          value={settings.tag || ''}
          onChange={(e) => setSettings({ ...settings, tag: e.target.value })}
          className="w-full bg-midnight-base border border-midnight-light rounded-lg px-4 py-2 focus:outline-none focus:border-midnight-purple"
          placeholder="★"
        />
      </div>

      {/* Tag System */}
      <div className="glass-inner rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <label className="block text-lg font-semibold">🎯 Tag Sistemi</label>
            <p className="text-sm text-gray-400">Tag alanlar için otomatik rol verme</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.tagRoleStatus || false}
              onChange={(e) => setSettings({ ...settings, tagRoleStatus: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-midnight-purple rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-midnight-purple"></div>
          </label>
        </div>
        {settings.tagRoleStatus && (
          <div className="mt-3">
            <label className="block text-sm font-medium mb-2">Tag Rolü</label>
            <select
              value={settings.tagRoleId || ''}
              onChange={(e) => setSettings({ ...settings, tagRoleId: e.target.value })}
              className="w-full bg-midnight-base border border-midnight-light rounded-lg px-4 py-2 focus:outline-none focus:border-midnight-purple"
            >
              <option value="">Rol Seçiniz</option>
              {roles.map(role => (
                <option key={role.id} value={role.id}>{role.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Spotify Match System */}
      <div className="glass-inner rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <label className="block text-lg font-semibold">🎵 Spotify Eşleşme Sistemi</label>
            <p className="text-sm text-gray-400">Spotify dinleme eşleşmesi bildirimi</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.spotifyMatchEnabled || false}
              onChange={(e) => setSettings({ ...settings, spotifyMatchEnabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-midnight-purple rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-midnight-purple"></div>
          </label>
        </div>
        {settings.spotifyMatchEnabled && (
          <div className="mt-3">
            <label className="block text-sm font-medium mb-2">Eşleşme Kanalı</label>
            <select
              value={settings.spotifyMatchChannelId || ''}
              onChange={(e) => setSettings({ ...settings, spotifyMatchChannelId: e.target.value })}
              className="w-full bg-midnight-base border border-midnight-light rounded-lg px-4 py-2 focus:outline-none focus:border-midnight-purple"
            >
              <option value="">Kanal Seçiniz</option>
              {channels.map(channel => (
                <option key={channel.id} value={channel.id}>#{channel.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Register Format */}
      <div className="glass-inner rounded-lg p-4">
        <label className="block text-lg font-semibold mb-2">📝 Kayıt Sistemi Formatı</label>
        <p className="text-sm text-gray-400 mb-3">Kayıt sırasında kullanılacak format</p>
        <select
          value={settings.registerFormat || ''}
          onChange={(e) => setSettings({ ...settings, registerFormat: e.target.value || null })}
          className="w-full bg-midnight-base border border-midnight-light rounded-lg px-4 py-2 focus:outline-none focus:border-midnight-purple"
        >
          {registerFormats.map(format => (
            <option key={format.value || 'none'} value={format.value || ''}>{format.label}</option>
          ))}
        </select>
      </div>

      {/* Register Mode */}
      <div className="glass-inner rounded-lg p-4">
        <label className="block text-lg font-semibold mb-2">🎭 Kayıt Modu</label>
        <p className="text-sm text-gray-400 mb-3">Cinsiyet bazlı mı yoksa tek rol mü?</p>
        <select
          value={settings.registerMode || 'gender'}
          onChange={(e) => setSettings({ ...settings, registerMode: e.target.value })}
          className="w-full bg-midnight-base border border-midnight-light rounded-lg px-4 py-2 focus:outline-none focus:border-midnight-purple"
        >
          {registerModes.map(mode => (
            <option key={mode.value} value={mode.value}>{mode.label}</option>
          ))}
        </select>
      </div>

      {/* Register Roles */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Erkek Rol */}
        <div className="glass-inner rounded-lg p-4">
          <label className="block text-sm font-semibold mb-2">👨 Erkek Kayıt Rolü</label>
          <select
            value={settings.erkekRoleId || ''}
            onChange={(e) => setSettings({ ...settings, erkekRoleId: e.target.value })}
            className="w-full bg-midnight-base border border-midnight-light rounded-lg px-4 py-2 focus:outline-none focus:border-midnight-purple"
          >
            <option value="">Rol Seçiniz</option>
            {roles.map(role => (
              <option key={role.id} value={role.id}>{role.name}</option>
            ))}
          </select>
        </div>

        {/* Kız Rol */}
        <div className="glass-inner rounded-lg p-4">
          <label className="block text-sm font-semibold mb-2">👩 Kız Kayıt Rolü</label>
          <select
            value={settings.kizRoleId || ''}
            onChange={(e) => setSettings({ ...settings, kizRoleId: e.target.value })}
            className="w-full bg-midnight-base border border-midnight-light rounded-lg px-4 py-2 focus:outline-none focus:border-midnight-purple"
          >
            <option value="">Rol Seçiniz</option>
            {roles.map(role => (
              <option key={role.id} value={role.id}>{role.name}</option>
            ))}
          </select>
        </div>

        {/* Kayıtsız Rol */}
        <div className="glass-inner rounded-lg p-4">
          <label className="block text-sm font-semibold mb-2">❓ Kayıtsız Rolü</label>
          <select
            value={settings.kayitsizRoleId || ''}
            onChange={(e) => setSettings({ ...settings, kayitsizRoleId: e.target.value })}
            className="w-full bg-midnight-base border border-midnight-light rounded-lg px-4 py-2 focus:outline-none focus:border-midnight-purple"
          >
            <option value="">Rol Seçiniz</option>
            {roles.map(role => (
              <option key={role.id} value={role.id}>{role.name}</option>
            ))}
          </select>
        </div>

        {/* Staff Rol */}
        <div className="glass-inner rounded-lg p-4">
          <label className="block text-sm font-semibold mb-2">👮 Staff Rolü</label>
          <select
            value={settings.staffRole || ''}
            onChange={(e) => setSettings({ ...settings, staffRole: e.target.value })}
            className="w-full bg-midnight-base border border-midnight-light rounded-lg px-4 py-2 focus:outline-none focus:border-midnight-purple"
          >
            <option value="">Rol Seçiniz</option>
            {roles.map(role => (
              <option key={role.id} value={role.id}>{role.name}</option>
            ))}
          </select>
        </div>

        {/* VIP Rol */}
        <div className="glass-inner rounded-lg p-4">
          <label className="block text-sm font-semibold mb-2">⭐ VIP Rolü</label>
          <select
            value={settings.vipRoleId || ''}
            onChange={(e) => setSettings({ ...settings, vipRoleId: e.target.value })}
            className="w-full bg-midnight-base border border-midnight-light rounded-lg px-4 py-2 focus:outline-none focus:border-midnight-purple"
          >
            <option value="">Rol Seçiniz</option>
            {roles.map(role => (
              <option key={role.id} value={role.id}>{role.name}</option>
            ))}
          </select>
        </div>

        {/* Streamer Rol */}
        <div className="glass-inner rounded-lg p-4">
          <label className="block text-sm font-semibold mb-2">📺 Streamer Rolü</label>
          <select
            value={settings.streamerRoleId || ''}
            onChange={(e) => setSettings({ ...settings, streamerRoleId: e.target.value })}
            className="w-full bg-midnight-base border border-midnight-light rounded-lg px-4 py-2 focus:outline-none focus:border-midnight-purple"
          >
            <option value="">Rol Seçiniz</option>
            {roles.map(role => (
              <option key={role.id} value={role.id}>{role.name}</option>
            ))}
          </select>
        </div>

        {/* Photo Rol */}
        <div className="glass-inner rounded-lg p-4">
          <label className="block text-sm font-semibold mb-2">📸 Photo Rolü</label>
          <select
            value={settings.photoRoleId || ''}
            onChange={(e) => setSettings({ ...settings, photoRoleId: e.target.value })}
            className="w-full bg-midnight-base border border-midnight-light rounded-lg px-4 py-2 focus:outline-none focus:border-midnight-purple"
          >
            <option value="">Rol Seçiniz</option>
            {roles.map(role => (
              <option key={role.id} value={role.id}>{role.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Otorol System */}
      <div className="glass-inner rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <label className="block text-lg font-semibold">🤖 Otorol Sistemi</label>
            <p className="text-sm text-gray-400">Sunucuya giren herkese otomatik rol</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.otorolStatus || false}
              onChange={(e) => setSettings({ ...settings, otorolStatus: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-midnight-purple rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-midnight-purple"></div>
          </label>
        </div>
        {settings.otorolStatus && (
          <div className="mt-3">
            <label className="block text-sm font-medium mb-2">Otorol Rolü</label>
            <select
              value={settings.autoRoleId || ''}
              onChange={(e) => setSettings({ ...settings, autoRoleId: e.target.value })}
              className="w-full bg-midnight-base border border-midnight-light rounded-lg px-4 py-2 focus:outline-none focus:border-midnight-purple"
            >
              <option value="">Rol Seçiniz</option>
              {roles.map(role => (
                <option key={role.id} value={role.id}>{role.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Level System */}
      <div className="glass-inner rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <label className="block text-lg font-semibold">📊 Level Sistemi</label>
            <p className="text-sm text-gray-400">Mesaj ve ses aktivitesine göre seviye atlama</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.levelSystemStatus || false}
              onChange={(e) => setSettings({ ...settings, levelSystemStatus: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-midnight-purple rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-midnight-purple"></div>
          </label>
        </div>
      </div>

      {/* Invite System */}
      <div className="glass-inner rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <label className="block text-lg font-semibold">🎟️ Davet Sistemi</label>
            <p className="text-sm text-gray-400">Davet takip ve log sistemi</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.inviteLogStatus || false}
              onChange={(e) => setSettings({ ...settings, inviteLogStatus: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-midnight-purple rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-midnight-purple"></div>
          </label>
        </div>
        {settings.inviteLogStatus && (
          <div className="mt-3">
            <label className="block text-sm font-medium mb-2">Davet Log Kanalı</label>
            <select
              value={settings.inviteLogChannelId || ''}
              onChange={(e) => setSettings({ ...settings, inviteLogChannelId: e.target.value })}
              className="w-full bg-midnight-base border border-midnight-light rounded-lg px-4 py-2 focus:outline-none focus:border-midnight-purple"
            >
              <option value="">Kanal Seçiniz</option>
              {channels.map(channel => (
                <option key={channel.id} value={channel.id}>#{channel.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Stat System */}
      <div className="glass-inner rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <label className="block text-lg font-semibold">📈 İstatistik Sistemi</label>
            <p className="text-sm text-gray-400">Kullanıcı aktivite istatistikleri</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.statSystemStatus || false}
              onChange={(e) => setSettings({ ...settings, statSystemStatus: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-midnight-purple rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-midnight-purple"></div>
          </label>
        </div>
      </div>

      {/* Word Building Channel */}
      <div className="glass-inner rounded-lg p-4">
        <label className="block text-lg font-semibold mb-2">🎮 Kelime Türetme Kanalı</label>
        <p className="text-sm text-gray-400 mb-3">Kelime türetme oyunu için kanal</p>
        <select
          value={settings.wordBuildingChannelId || ''}
          onChange={(e) => setSettings({ ...settings, wordBuildingChannelId: e.target.value })}
          className="w-full bg-midnight-base border border-midnight-light rounded-lg px-4 py-2 focus:outline-none focus:border-midnight-purple"
        >
          <option value="">Kanal Seçiniz</option>
          {channels.map(channel => (
            <option key={channel.id} value={channel.id}>#{channel.name}</option>
          ))}
        </select>
      </div>
    </div>
  )
}

// =====================
// AUTHORITY SECTION
// =====================
const AuthoritySection = ({ authority, setAuthority, roles, guildId }) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [safeRoleInput, setSafeRoleInput] = useState('')

  const handleSearchUser = async () => {
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

  const addOwner = (userId) => {
    if (!authority.owners) authority.owners = []
    if (!authority.owners.includes(userId)) {
      setAuthority({
        ...authority,
        owners: [...authority.owners, userId]
      })
    }
    setSearchQuery('')
    setSearchResults([])
  }

  const removeOwner = (userId) => {
    setAuthority({
      ...authority,
      owners: (authority.owners || []).filter(id => id !== userId)
    })
  }

  const addRoleToRoles = (roleId) => {
    if (!authority.roles) authority.roles = []
    if (!authority.roles.includes(roleId)) {
      setAuthority({
        ...authority,
        roles: [...authority.roles, roleId]
      })
    }
  }

  const removeRoleFromRoles = (roleId) => {
    setAuthority({
      ...authority,
      roles: (authority.roles || []).filter(id => id !== roleId)
    })
  }

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold mb-6">👮 Yetki Ayarları</h2>
      
      {/* Authority System Toggle */}
      <div className="glass-inner rounded-lg p-4 border-2 border-midnight-purple border-opacity-30">
        <div className="flex items-center justify-between">
          <div>
            <label className="block text-xl font-bold">🔐 Belirlenmiş Yetki Sistemi</label>
            <p className="text-sm text-gray-400 mt-1">Güvenli kullanıcı ve rol sistemlerini kullan</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={authority.isAuthority !== undefined ? authority.isAuthority : true}
              onChange={(e) => setAuthority({ ...authority, isAuthority: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-14 h-7 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-midnight-purple rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-midnight-purple"></div>
          </label>
        </div>
      </div>

      {/* Owners System Toggle */}
      <div className="glass-inner rounded-lg p-4 border-2 border-green-500 border-opacity-20">
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1">
            <label className="block text-xl font-bold flex items-center gap-2">
              <span>👑</span>
              <span>Güvenli Kullanıcı Sistemi</span>
            </label>
            <p className="text-sm text-gray-400 mt-1">Bu kullanıcılara hiçbir yetki kontrolü uygulanmaz</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer ml-4">
            <input
              type="checkbox"
              checked={authority.isOwners || false}
              onChange={(e) => setAuthority({ ...authority, isOwners: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-14 h-7 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-green-500"></div>
          </label>
        </div>

        {authority.isOwners && (
          <div className="mt-4 pt-4 border-t border-midnight-light">
            <label className="block text-md font-semibold mb-2">📋 Güvenli Kullanıcı Listesi</label>
            <p className="text-xs text-gray-400 mb-3">Aşağıdaki kişiler tüm yetkilerden muaf tutulur</p>
            
            {/* Search Box */}
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchUser()}
                placeholder="Kullanıcı adı ara..."
                className="flex-1 bg-midnight-base border border-midnight-light rounded-lg px-4 py-2 focus:outline-none focus:border-midnight-purple"
              />
              <button
                onClick={handleSearchUser}
                disabled={searching}
                className="px-4 py-2 bg-midnight-purple bg-opacity-20 border border-midnight-purple rounded-lg hover:bg-opacity-30 transition-colors disabled:opacity-50"
              >
                {searching ? '⏳' : '🔍'}
              </button>
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="mb-3 bg-midnight-base border border-midnight-light rounded-lg p-2 max-h-[200px] overflow-y-auto">
                {searchResults.map(member => (
                  <div
                    key={member.userId}
                    className="flex items-center justify-between p-2 hover:bg-midnight-light rounded cursor-pointer"
                    onClick={() => addOwner(member.userId)}
                  >
                    <div className="flex items-center gap-2">
                      <img src={member.avatar} alt={member.username} className="w-8 h-8 rounded-full" />
                      <span>{member.username}</span>
                    </div>
                    <button className="text-green-400">+ Ekle</button>
                  </div>
                ))}
              </div>
            )}

            {/* Owners List */}
            <div className="space-y-2">
              {(authority.owners || []).map(userId => (
                <div
                  key={userId}
                  className="flex items-center justify-between bg-midnight-base border border-midnight-light rounded-lg p-3"
                >
                  <code className="text-sm">{userId}</code>
                  <button
                    onClick={() => removeOwner(userId)}
                    className="text-red-400 hover:text-red-300"
                  >
                    🗑️ Kaldır
                  </button>
                </div>
              ))}
              {(!authority.owners || authority.owners.length === 0) && (
                <p className="text-gray-500 text-center py-4 bg-midnight-base rounded-lg border border-dashed border-gray-600">Henüz güvenli kullanıcı eklenmemiş</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Role System Toggle */}
      <div className="glass-inner rounded-lg p-4 border-2 border-blue-500 border-opacity-20">
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1">
            <label className="block text-xl font-bold flex items-center gap-2">
              <span>🛡️</span>
              <span>Güvenli Rol Sistemi</span>
            </label>
            <p className="text-sm text-gray-400 mt-1">Bu rollere sahip kişiler hiçbir yetki kontrolünden muaf olur</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer ml-4">
            <input
              type="checkbox"
              checked={authority.isRole || false}
              onChange={(e) => setAuthority({ ...authority, isRole: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-14 h-7 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-500"></div>
          </label>
        </div>

        {authority.isRole && (
          <div className="mt-4 pt-4 border-t border-midnight-light">
            <label className="block text-md font-semibold mb-2">📋 Güvenli Rol Listesi</label>
            <p className="text-xs text-gray-400 mb-3">Aşağıdaki rollere sahip kullanıcılar tüm yetkilerden muaf tutulur</p>
            
            {/* Role Selector */}
            <div className="flex gap-2 mb-3">
              <select
                value={safeRoleInput}
                onChange={(e) => setSafeRoleInput(e.target.value)}
                className="flex-1 bg-midnight-base border border-midnight-light rounded-lg px-4 py-2 focus:outline-none focus:border-midnight-purple"
              >
                <option value="">Güvenli Rol Seçiniz</option>
                {roles.filter(role => !(authority.roles || []).includes(role.id)).map(role => (
                  <option key={role.id} value={role.id}>{role.name}</option>
                ))}
              </select>
              <button
                onClick={() => {
                  if (safeRoleInput) {
                    addRoleToRoles(safeRoleInput)
                    setSafeRoleInput('')
                  }
                }}
                disabled={!safeRoleInput}
                className="px-4 py-2 bg-green-500 bg-opacity-20 border border-green-500 rounded-lg hover:bg-opacity-30 transition-colors disabled:opacity-50"
              >
                + Ekle
              </button>
            </div>

            {/* Roles List */}
            <div className="space-y-2">
              {(authority.roles || []).map(roleId => {
                const role = roles.find(r => r.id === roleId)
                return (
                  <div
                    key={roleId}
                    className="flex items-center justify-between bg-midnight-base border border-midnight-light rounded-lg p-3"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: role?.hexColor || '#99AAB5' }}
                      ></div>
                      <span>{role?.name || roleId}</span>
                    </div>
                    <button
                      onClick={() => removeRoleFromRoles(roleId)}
                      className="text-red-400 hover:text-red-300"
                    >
                      🗑️ Kaldır
                    </button>
                  </div>
                )
              })}
              {(!authority.roles || authority.roles.length === 0) && (
                <p className="text-gray-500 text-center py-4 bg-midnight-base rounded-lg border border-dashed border-gray-600">Henüz güvenli rol eklenmemiş</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// =====================
// MODLOG SECTION
// =====================
const ModlogSection = ({ modlog, setModlog, channels }) => {
  const resetChannel = (field) => {
    setModlog({ ...modlog, [field]: null })
  }

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold mb-6">📝 Log Ayarları</h2>
      
      {/* Log System Toggle */}
      <div className="glass-inner rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <label className="block text-lg font-semibold">📋 Log Sistemi</label>
            <p className="text-sm text-gray-400">Tüm log sistemini aktif/pasif yap</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={modlog.modLogStatus || false}
              onChange={(e) => setModlog({ ...modlog, modLogStatus: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-midnight-purple rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-midnight-purple"></div>
          </label>
        </div>
      </div>

      {/* General Log Channel */}
      <div className="glass-inner rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <label className="block text-lg font-semibold">🌐 Genel Log Kanalı</label>
            <p className="text-sm text-gray-400">Tüm loglar için varsayılan kanal</p>
          </div>
          {modlog.generalLogChannel && (
            <button
              onClick={() => resetChannel('generalLogChannel')}
              className="px-3 py-1 text-sm bg-red-500 bg-opacity-20 border border-red-500 rounded-lg hover:bg-opacity-30 transition-colors text-red-400"
            >
              🗑️ Sıfırla
            </button>
          )}
        </div>
        <select
          value={modlog.generalLogChannel || ''}
          onChange={(e) => setModlog({ ...modlog, generalLogChannel: e.target.value || null })}
          className="w-full bg-midnight-base border border-midnight-light rounded-lg px-4 py-2 focus:outline-none focus:border-midnight-purple"
        >
          <option value="">Kanal Seçiniz</option>
          {channels.map(channel => (
            <option key={channel.id} value={channel.id}>#{channel.name}</option>
          ))}
        </select>
      </div>

      {/* Specific Log Channels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Command Log */}
        <div className="glass-inner rounded-lg p-4">
          <label className="block text-sm font-semibold mb-2">⚙️ Komut Log Kanalı</label>
          <select
            value={modlog.logs?.command || ''}
            onChange={(e) => setModlog({ 
              ...modlog, 
              logs: { ...modlog.logs, command: e.target.value || null }
            })}
            className="w-full bg-midnight-base border border-midnight-light rounded-lg px-4 py-2 focus:outline-none focus:border-midnight-purple text-sm"
          >
            <option value="">Kanal Seçiniz</option>
            {channels.map(channel => (
              <option key={channel.id} value={channel.id}>#{channel.name}</option>
            ))}
          </select>
        </div>

        {/* Join/Leave Log */}
        <div className="glass-inner rounded-lg p-4">
          <label className="block text-sm font-semibold mb-2">🚪 Join/Leave Log Kanalı</label>
          <select
            value={modlog.logs?.joinLeave || ''}
            onChange={(e) => setModlog({ 
              ...modlog, 
              logs: { ...modlog.logs, joinLeave: e.target.value || null }
            })}
            className="w-full bg-midnight-base border border-midnight-light rounded-lg px-4 py-2 focus:outline-none focus:border-midnight-purple text-sm"
          >
            <option value="">Kanal Seçiniz</option>
            {channels.map(channel => (
              <option key={channel.id} value={channel.id}>#{channel.name}</option>
            ))}
          </select>
        </div>

        {/* Message Log */}
        <div className="glass-inner rounded-lg p-4">
          <label className="block text-sm font-semibold mb-2">💬 Mesaj Log Kanalı</label>
          <select
            value={modlog.logs?.message || ''}
            onChange={(e) => setModlog({ 
              ...modlog, 
              logs: { ...modlog.logs, message: e.target.value || null }
            })}
            className="w-full bg-midnight-base border border-midnight-light rounded-lg px-4 py-2 focus:outline-none focus:border-midnight-purple text-sm"
          >
            <option value="">Kanal Seçiniz</option>
            {channels.map(channel => (
              <option key={channel.id} value={channel.id}>#{channel.name}</option>
            ))}
          </select>
        </div>

        {/* Voice Log */}
        <div className="glass-inner rounded-lg p-4">
          <label className="block text-sm font-semibold mb-2">🎤 Ses Log Kanalı</label>
          <select
            value={modlog.logs?.voice || ''}
            onChange={(e) => setModlog({ 
              ...modlog, 
              logs: { ...modlog.logs, voice: e.target.value || null }
            })}
            className="w-full bg-midnight-base border border-midnight-light rounded-lg px-4 py-2 focus:outline-none focus:border-midnight-purple text-sm"
          >
            <option value="">Kanal Seçiniz</option>
            {channels.map(channel => (
              <option key={channel.id} value={channel.id}>#{channel.name}</option>
            ))}
          </select>
        </div>

        {/* Kick/Ban Log */}
        <div className="glass-inner rounded-lg p-4">
          <label className="block text-sm font-semibold mb-2">🔨 Kick/Ban Log Kanalı</label>
          <select
            value={modlog.logs?.kickBan || ''}
            onChange={(e) => setModlog({ 
              ...modlog, 
              logs: { ...modlog.logs, kickBan: e.target.value || null }
            })}
            className="w-full bg-midnight-base border border-midnight-light rounded-lg px-4 py-2 focus:outline-none focus:border-midnight-purple text-sm"
          >
            <option value="">Kanal Seçiniz</option>
            {channels.map(channel => (
              <option key={channel.id} value={channel.id}>#{channel.name}</option>
            ))}
          </select>
        </div>

        {/* Role Log */}
        <div className="glass-inner rounded-lg p-4">
          <label className="block text-sm font-semibold mb-2">🎭 Rol Log Kanalı</label>
          <select
            value={modlog.logs?.role || ''}
            onChange={(e) => setModlog({ 
              ...modlog, 
              logs: { ...modlog.logs, role: e.target.value || null }
            })}
            className="w-full bg-midnight-base border border-midnight-light rounded-lg px-4 py-2 focus:outline-none focus:border-midnight-purple text-sm"
          >
            <option value="">Kanal Seçiniz</option>
            {channels.map(channel => (
              <option key={channel.id} value={channel.id}>#{channel.name}</option>
            ))}
          </select>
        </div>

        {/* Channel Log */}
        <div className="glass-inner rounded-lg p-4">
          <label className="block text-sm font-semibold mb-2">📺 Kanal Log Kanalı</label>
          <select
            value={modlog.logs?.channel || ''}
            onChange={(e) => setModlog({ 
              ...modlog, 
              logs: { ...modlog.logs, channel: e.target.value || null }
            })}
            className="w-full bg-midnight-base border border-midnight-light rounded-lg px-4 py-2 focus:outline-none focus:border-midnight-purple text-sm"
          >
            <option value="">Kanal Seçiniz</option>
            {channels.map(channel => (
              <option key={channel.id} value={channel.id}>#{channel.name}</option>
            ))}
          </select>
        </div>

        {/* Moderation Log */}
        <div className="glass-inner rounded-lg p-4">
          <label className="block text-sm font-semibold mb-2">👮 Moderasyon Log Kanalı</label>
          <select
            value={modlog.logs?.moderation || ''}
            onChange={(e) => setModlog({ 
              ...modlog, 
              logs: { ...modlog.logs, moderation: e.target.value || null }
            })}
            className="w-full bg-midnight-base border border-midnight-light rounded-lg px-4 py-2 focus:outline-none focus:border-midnight-purple text-sm"
          >
            <option value="">Kanal Seçiniz</option>
            {channels.map(channel => (
              <option key={channel.id} value={channel.id}>#{channel.name}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}

export default SettingsTab
