import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import UserManagementModal from '../components/UserManagementModal'
import UserProfileModal from '../components/UserProfileModal'
import DeletedMessagesTab from '../components/tabs/DeletedMessagesTab'
import ChannelsTab from '../components/tabs/ChannelsTab'
import SettingsTab from '../components/tabs/SettingsTab'

const ServerStats = () => {
  const { guildId } = useParams()
  const navigate = useNavigate()
  const [guild, setGuild] = useState(null)
  const [activeTab, setActiveTab] = useState('economy')
  const [stats, setStats] = useState([])
  const [loading, setLoading] = useState(true)
  const [limit, setLimit] = useState(50)
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [roles, setRoles] = useState([])
  const [actionLoading, setActionLoading] = useState(false)
  const [actionResult, setActionResult] = useState(null)
  const [profileModalOpen, setProfileModalOpen] = useState(false)
  const [selectedProfile, setSelectedProfile] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [membersData, setMembersData] = useState({ total: 0, members: [] })
  const [membersLoading, setMembersLoading] = useState(false)
  const [membersOffset, setMembersOffset] = useState(0)
  const [leaveModalOpen, setLeaveModalOpen] = useState(false)
  const [leaveLoading, setLeaveLoading] = useState(false)

  useEffect(() => {
    fetchGuildData()
  }, [guildId])

  useEffect(() => {
    if (guild) {
      fetchStats()
    }
  }, [activeTab, limit, guild])

  const fetchGuildData = async () => {
    try {
      const res = await api.getGuilds()
      const foundGuild = res.data.find(g => g.id === guildId)
      if (foundGuild) {
        setGuild(foundGuild)
      } else {
        navigate('/')
      }
    } catch (error) {
      console.error('Sunucu bilgileri yüklenemedi:', error)
      navigate('/')
    }
  }

  const fetchStats = async () => {
    setLoading(true)
    try {
      if (activeTab === 'roles') {
        const res = await api.getGuildRoles(guildId)
        setStats(res.data)
      } else if (activeTab === 'bans') {
        const res = await api.getGuildBans(guildId)
        setStats(res.data)
      } else if (activeTab === 'siciller') {
        const res = await api.getSiciller(guildId, limit)
        setStats(res.data.siciller)
      } else if (activeTab === 'members') {
        // Members tab handles its own data
        setStats([])
      } else if (activeTab === 'settings') {
        // Settings tab handles its own data
        setStats([])
      } else if (activeTab === 'deleted') {
        // Deleted messages tab handles its own data
        setStats([])
      } else if (activeTab === 'channels') {
        // Channels tab handles its own data
        setStats([])
      } else {
        const res = await api.getGuildStats(guildId, activeTab, limit)
        setStats(res.data)
      }
    } catch (error) {
      console.error('İstatistikler yüklenemedi:', error)
      setStats([])
    } finally {
      setLoading(false)
    }
  }

  const fetchMembers = async (search = '', offset = 0, append = false) => {
    setMembersLoading(true)
    try {
      const res = await api.getGuildMembers(guildId, { 
        limit: 50, 
        offset, 
        search 
      })
      if (append) {
        setMembersData(prev => ({
          total: res.data.total,
          members: [...prev.members, ...res.data.members]
        }))
      } else {
        setMembersData(res.data)
      }
      setMembersOffset(offset)
    } catch (error) {
      console.error('Kullanıcılar yüklenemedi:', error)
      if (!append) {
        setMembersData({ total: 0, members: [] })
      }
    } finally {
      setMembersLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'members' && guild) {
      setMembersOffset(0)
      fetchMembers(searchQuery, 0, false)
    }
  }, [activeTab, guild])

  const handleSearch = (e) => {
    e.preventDefault()
    if (activeTab === 'members') {
      setMembersOffset(0)
      fetchMembers(searchQuery, 0, false)
    }
  }

  const handleLoadMoreMembers = () => {
    const newOffset = membersOffset + 50
    fetchMembers(searchQuery, newOffset, true)
  }

  const handleLeaveGuild = async () => {
    setLeaveLoading(true)
    try {
      await api.leaveGuild(guildId)
      alert('Sunucudan başarıyla ayrıldı! Ana sayfaya yönlendiriliyorsunuz...')
      navigate('/')
    } catch (error) {
      console.error('Sunucudan ayrılma hatası:', error)
      alert('Hata: ' + (error.response?.data?.error || error.message))
    } finally {
      setLeaveLoading(false)
      setLeaveModalOpen(false)
    }
  }

  const fetchRoles = async () => {
    try {
      const res = await api.getGuildRoles(guildId)
      setRoles(res.data)
    } catch (error) {
      console.error('Roller yüklenemedi:', error)
    }
  }

  useEffect(() => {
    if (guild && modalOpen && activeTab !== 'bans') {
      fetchRoles()
    }
  }, [modalOpen, guild, activeTab])

  const tabs = [
    { id: 'economy', label: 'Ekonomi', icon: '💰' },
    { id: 'levels', label: 'Seviyeler', icon: '📊' },
    { id: 'invites', label: 'Davetler', icon: '🎟️' },
    { id: 'staff', label: 'Yetkililer', icon: '👮' },
    { id: 'siciller', label: 'Siciller', icon: '📋' },
    { id: 'members', label: 'Kullanıcılar', icon: '👥' },
    { id: 'roles', label: 'Roller', icon: '🎭' },
    { id: 'bans', label: 'Banlı Kullanıcılar', icon: '🔨' },
    { id: 'settings', label: 'Ayarlar', icon: '⚙️' },
    { id: 'channels', label: 'Kanallar', icon: '📺' },
    { id: 'deleted', label: 'Silinen Mesajlar', icon: '🗑️' }
  ]

  const formatDuration = (ms) => {
    const hours = Math.floor(ms / 3600000)
    const minutes = Math.floor((ms % 3600000) / 60000)
    return `${hours}s ${minutes}dk`
  }

  if (!guild) {
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
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={() => navigate('/')}
            className="p-2 hover:bg-midnight-light rounded-lg transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <div className="flex items-center gap-4 flex-1">
            {guild.icon && (
              <img 
                src={guild.icon} 
                alt={guild.name}
                className="w-16 h-16 rounded-full"
              />
            )}
            <div className="flex-1">
              <h1 className="text-4xl font-bold">{guild.name}</h1>
              <p className="text-gray-400">👥 {guild.memberCount.toLocaleString()} üye</p>
            </div>

            {/* Quick Nav to Leaderboard */}
            <button
              onClick={() => navigate(`/leaderboard/${guildId}`)}
              className="px-6 py-3 bg-gradient-to-r from-midnight-purple to-midnight-pink rounded-lg font-semibold hover:opacity-90 transition-opacity flex items-center gap-2"
            >
              <span className="text-xl">🏆</span>
              <span>Liderlik Tablosu</span>
            </button>

            {/* Leave Server Button */}
            <button
              onClick={() => setLeaveModalOpen(true)}
              className="px-6 py-3 bg-red-500 bg-opacity-20 border border-red-500 rounded-lg font-semibold hover:bg-opacity-30 transition-colors flex items-center gap-2 text-red-400"
            >
              <span className="text-xl">🚪</span>
              <span>Sunucudan Ayrıl</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="glass rounded-xl p-2 mb-6 flex gap-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-6 py-3 rounded-lg font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-gradient-to-r from-midnight-purple to-midnight-pink'
                : 'hover:bg-midnight-light'
            }`}
          >
            <span className="mr-2">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Limit Selector */}
      {activeTab !== 'bans' && activeTab !== 'deleted' && activeTab !== 'members' && (
        <div className="mb-6 flex justify-end">
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="bg-midnight-base border border-midnight-light rounded-lg px-4 py-2 focus:outline-none focus:border-midnight-purple"
          >
            <option value={10}>İlk 10</option>
            <option value={25}>İlk 25</option>
            <option value={50}>İlk 50</option>
            <option value={100}>İlk 100</option>
          </select>
        </div>
      )}

      {/* Members Search Bar */}
      {activeTab === 'members' && (
        <div className="mb-6 flex gap-4">
          <form onSubmit={handleSearch} className="flex-1 flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Kullanıcı adına göre ara..."
              className="flex-1 bg-midnight-base border border-midnight-light rounded-lg px-4 py-2 focus:outline-none focus:border-midnight-purple"
            />
            <button
              type="submit"
              className="px-6 py-2 bg-gradient-to-r from-midnight-purple to-midnight-pink rounded-lg font-semibold hover:opacity-90 transition-opacity"
            >
              🔍 Ara
            </button>
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('')
                  setMembersOffset(0)
                  fetchMembers('', 0, false)
                }}
                className="px-4 py-2 bg-midnight-light rounded-lg hover:bg-midnight-base transition-colors"
              >
                ✖ Temizle
              </button>
            )}
          </form>
        </div>
      )}

      {/* Stats Content */}
      {activeTab === 'deleted' ? (
        /* Deleted Messages - Separate Component */
        <DeletedMessagesTab guildId={guildId} />
      ) : activeTab === 'channels' ? (
        /* Channels - Separate Component */
        <ChannelsTab guildId={guildId} />
      ) : activeTab === 'settings' ? (
        /* Settings - Separate Component */
        <SettingsTab guildId={guildId} />
      ) : activeTab === 'members' ? (
        /* Members Tab */
        membersLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-midnight-purple"></div>
          </div>
        ) : membersData.members.length === 0 ? (
          <div className="glass rounded-xl p-12 text-center">
            <p className="text-gray-400 text-lg">
              {searchQuery ? `"${searchQuery}" için sonuç bulunamadı` : 'Kullanıcı bulunamadı'}
            </p>
          </div>
        ) : (
          <>
            <div className="glass rounded-xl overflow-hidden mb-4">
              <div className="px-6 py-4 bg-midnight-base">
                <p className="text-gray-400">
                  Toplam {membersData.total} kullanıcıdan {membersData.members.length} tanesi gösteriliyor
                  {searchQuery && <span className="text-midnight-purple"> (Arama: "{searchQuery}")</span>}
                </p>
              </div>
            </div>
            <div className="glass rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-midnight-base">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold">#</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold">Kullanıcı</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold">Kullanıcı ID</th>
                      <th className="px-6 py-4 text-center text-sm font-semibold">Katılma Tarihi</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold">Roller</th>
                      <th className="px-6 py-4 text-center text-sm font-semibold">İşlem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-midnight-light">
                    {membersData.members.map((member, index) => (
                      <tr key={member.userId} className="hover:bg-midnight-base transition-colors">
                        <td className="px-6 py-4 text-gray-400">#{index + 1}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {member.avatar ? (
                              <img 
                                src={member.avatar} 
                                alt={member.username}
                                className="w-10 h-10 rounded-full"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-midnight-purple to-midnight-pink flex items-center justify-center font-bold">
                                {member.username?.charAt(0) || '?'}
                              </div>
                            )}
                            <div>
                              <div className="font-medium">{member.username}</div>
                              {member.globalName && member.globalName !== member.username && (
                                <div className="text-xs text-gray-400">{member.globalName}</div>
                              )}
                              {member.bot && (
                                <span className="inline-block mt-1 px-2 py-0.5 bg-blue-500 bg-opacity-20 border border-blue-500 rounded text-xs text-blue-400">
                                  🤖 BOT
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <code className="text-xs bg-midnight-base px-2 py-1 rounded text-gray-400">
                            {member.userId}
                          </code>
                        </td>
                        <td className="px-6 py-4 text-center text-sm text-gray-400">
                          {member.joinedAt ? new Date(member.joinedAt).toLocaleDateString('tr-TR') : 'Bilinmiyor'}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {member.roles && member.roles.length > 0 ? (
                              <>
                                {member.roles.slice(0, 3).map((role) => (
                                  <span
                                    key={role.id}
                                    className="text-xs px-2 py-1 rounded"
                                    style={{ 
                                      backgroundColor: role.color ? `#${role.color.toString(16).padStart(6, '0')}20` : '#99AAB520',
                                      color: role.color ? `#${role.color.toString(16).padStart(6, '0')}` : '#99AAB5',
                                      border: `1px solid ${role.color ? `#${role.color.toString(16).padStart(6, '0')}` : '#99AAB5'}`
                                    }}
                                  >
                                    {role.name}
                                  </span>
                                ))}
                                {member.roles.length > 3 && (
                                  <span className="text-xs text-gray-400">+{member.roles.length - 3}</span>
                                )}
                              </>
                            ) : (
                              <span className="text-xs text-gray-500">Rol yok</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => {
                              setSelectedUser(member)
                              setModalOpen(true)
                            }}
                            className="px-4 py-2 bg-midnight-purple bg-opacity-20 border border-midnight-purple rounded-lg hover:bg-opacity-30 transition-colors text-midnight-purple font-semibold"
                          >
                            ⚙️ Yönet
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Load More Button */}
            {membersData.members.length < membersData.total && (
              <div className="mt-6 flex justify-center">
                <button
                  onClick={handleLoadMoreMembers}
                  disabled={membersLoading}
                  className="px-8 py-3 bg-gradient-to-r from-midnight-purple to-midnight-pink rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
                >
                  {membersLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                      <span>Yükleniyor...</span>
                    </>
                  ) : (
                    <>
                      <span>📥</span>
                      <span>Daha Fazla Yükle (50 Kullanıcı)</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </>
        )
      ) : loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-midnight-purple"></div>
        </div>
      ) : stats.length === 0 ? (
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
                  <th className="px-6 py-4 text-left text-sm font-semibold">
                    {activeTab === 'roles' ? 'Rol' : activeTab === 'bans' ? 'Kullanıcı' : 'Kullanıcı'}
                  </th>
                  {activeTab === 'roles' && (
                    <th className="px-6 py-4 text-left text-sm font-semibold">Rol ID</th>
                  )}
                  {activeTab === 'bans' && (
                    <>
                      <th className="px-6 py-4 text-left text-sm font-semibold">Kullanıcı Tag</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold">Ban Sebebi</th>
                      <th className="px-6 py-4 text-center text-sm font-semibold">İşlem</th>
                    </>
                  )}
                  {activeTab === 'economy' && (
                    <>
                      <th className="px-6 py-4 text-right text-sm font-semibold">Para</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold">Seviye</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold">XP</th>
                      <th className="px-6 py-4 text-center text-sm font-semibold">Kurabiye</th>
                      <th className="px-6 py-4 text-center text-sm font-semibold">Kalp</th>
                    </>
                  )}
                  {activeTab === 'levels' && (
                    <>
                      <th className="px-6 py-4 text-center text-sm font-semibold">Mesaj Seviyesi</th>
                      <th className="px-6 py-4 text-center text-sm font-semibold">Ses Seviyesi</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold">En Aktif Kanallar</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold">Roller</th>
                    </>
                  )}
                  {activeTab === 'invites' && (
                    <th className="px-6 py-4 text-right text-sm font-semibold">Davet Sayısı</th>
                  )}
                  {activeTab === 'staff' && (
                    <>
                      <th className="px-6 py-4 text-right text-sm font-semibold">Kayıt</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold">Yetkili Başlattı</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold">Taglı Sayısı</th>
                    </>
                  )}
                  {activeTab === 'siciller' && (
                    <>
                      <th className="px-6 py-4 text-center text-sm font-semibold">Ceza No</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold">Ceza Tipi</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold">Yetkili</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold">Sebep</th>
                      <th className="px-6 py-4 text-center text-sm font-semibold">Tarih</th>
                      <th className="px-6 py-4 text-center text-sm font-semibold">Durum</th>
                    </>
                  )}
                  {activeTab === 'roles' && (
                    <>
                      <th className="px-6 py-4 text-center text-sm font-semibold">Üye Sayısı</th>
                      <th className="px-6 py-4 text-center text-sm font-semibold">Hoisted</th>
                      <th className="px-6 py-4 text-center text-sm font-semibold">Etiketlenebilir</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-midnight-light">
                {stats.map((stat, index) => (
                  <tr key={stat.userId || stat.id} className="hover:bg-midnight-base transition-colors">
                    <td className="px-6 py-4 text-gray-400">#{index + 1}</td>
                    <td className="px-6 py-4">
                      {activeTab === 'roles' ? (
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-4 h-4 rounded-full" 
                            style={{ backgroundColor: stat.hexColor || '#99AAB5' }}
                          ></div>
                          <div>
                            <div className="font-medium" style={{ color: stat.hexColor || '#fff' }}>
                              {stat.name}
                            </div>
                            <div className="text-xs text-gray-400">Position: {stat.position}</div>
                          </div>
                        </div>
                      ) : activeTab === 'bans' ? (
                        <div className="flex items-center gap-3">
                          {stat.avatar ? (
                            <img 
                              src={stat.avatar} 
                              alt={stat.username}
                              className="w-10 h-10 rounded-full"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-midnight-purple to-midnight-pink flex items-center justify-center font-bold">
                              {stat.username?.charAt(0) || '?'}
                            </div>
                          )}
                          <div>
                            <div className="font-medium">{stat.username || 'Unknown'}</div>
                            <div className="text-xs text-gray-400">ID: {stat.userId}</div>
                          </div>
                        </div>
                      ) : (
                        <div 
                          className="flex items-center gap-3 cursor-pointer hover:bg-midnight-light p-2 rounded-lg transition-colors"
                          onClick={() => {
                            if (activeTab === 'economy') {
                              setSelectedProfile(stat)
                              setProfileModalOpen(true)
                            } else if (activeTab !== 'roles') {
                              setSelectedUser(stat)
                              setModalOpen(true)
                            }
                          }}
                        >
                          {stat.avatar ? (
                            <img 
                              src={stat.avatar} 
                              alt={stat.username}
                              className="w-10 h-10 rounded-full"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-midnight-purple to-midnight-pink flex items-center justify-center font-bold">
                              {stat.username?.charAt(0) || '?'}
                            </div>
                          )}
                          <div>
                            <div className="font-medium">{stat.username || 'Unknown'}</div>
                            {stat.subtitle && (
                              <div className="text-xs text-gray-400">{stat.subtitle}</div>
                            )}
                            {activeTab !== 'roles' && (
                              <div className="text-xs text-purple-400">
                                {activeTab === 'economy' ? 'Tıkla → Profil' : 'Tıkla → Yönet'}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </td>
                    {activeTab === 'roles' && (
                      <td className="px-6 py-4">
                        <code className="text-xs bg-midnight-base px-2 py-1 rounded text-gray-400">
                          {stat.id}
                        </code>
                      </td>
                    )}
                    {activeTab === 'bans' && (
                      <>
                        <td className="px-6 py-4">
                          <code className="text-xs bg-midnight-base px-2 py-1 rounded text-gray-400">
                            {stat.tag}
                          </code>
                        </td>
                        <td className="px-6 py-4 text-gray-300">
                          {stat.reason || 'Sebep belirtilmemiş'}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => {
                              setSelectedUser(stat)
                              setModalOpen(true)
                            }}
                            className="px-4 py-2 bg-green-500 bg-opacity-20 border border-green-500 rounded-lg hover:bg-opacity-30 transition-colors text-green-400 font-semibold"
                          >
                            🔓 Banı Kaldır
                          </button>
                        </td>
                      </>
                    )}
                    {activeTab === 'economy' && (
                      <>
                        <td className="px-6 py-4 text-right font-semibold text-green-400">
                          {(stat.money || 0).toLocaleString()} 💵
                        </td>
                        <td className="px-6 py-4 text-right">Lvl {stat.level || 0}</td>
                        <td className="px-6 py-4 text-right text-gray-400">{(stat.xp || 0).toLocaleString()}</td>
                        <td className="px-6 py-4 text-center">{stat.cookies || 0} 🍪</td>
                        <td className="px-6 py-4 text-center">{stat.hearts || 0} ❤️</td>
                      </>
                    )}
                    {activeTab === 'levels' && (
                      <>
                        {/* Mesaj Seviyesi */}
                        <td className="px-6 py-4 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <div className="flex items-center gap-2">
                              <div className="px-3 py-1 bg-blue-500 bg-opacity-20 rounded-full border border-blue-500">
                                <span className="text-lg font-bold text-blue-400">
                                  Lvl {stat.messageLevel || 0}
                                </span>
                              </div>
                              <span className="text-xl">💬</span>
                            </div>
                            <div className="text-xs text-gray-400">
                              {(stat.messageXP || 0).toLocaleString()} XP
                            </div>
                            {stat.totalMessages > 0 && (
                              <div className="text-xs text-blue-300">
                                {stat.totalMessages.toLocaleString()} mesaj
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Ses Seviyesi */}
                        <td className="px-6 py-4 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <div className="flex items-center gap-2">
                              <div className="px-3 py-1 bg-purple-500 bg-opacity-20 rounded-full border border-purple-500">
                                <span className="text-lg font-bold text-purple-400">
                                  Lvl {stat.voiceLevel || 0}
                                </span>
                              </div>
                              <span className="text-xl">🎤</span>
                            </div>
                            <div className="text-xs text-gray-400">
                              {(stat.voiceXP || 0).toLocaleString()} XP
                            </div>
                            {stat.totalVoice > 0 && (
                              <div className="text-xs text-purple-300">
                                {formatDuration(stat.totalVoice)}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* En Aktif Kanallar */}
                        <td className="px-6 py-4">
                          <div className="text-xs space-y-1">
                            {stat.messageChannels && stat.messageChannels.length > 0 ? (
                              stat.messageChannels.slice(0, 2).map((ch, i) => (
                                <div key={i} className="text-gray-400">
                                  💬 #{ch.channelName || 'Bilinmeyen'}: {ch.count}
                                </div>
                              ))
                            ) : null}
                            {stat.voiceChannels && stat.voiceChannels.length > 0 ? (
                              stat.voiceChannels.slice(0, 2).map((ch, i) => (
                                <div key={i} className="text-purple-400">
                                  🎤 {ch.channelName || 'Bilinmeyen'}: {formatDuration(ch.duration)}
                                </div>
                              ))
                            ) : null}
                            {(!stat.messageChannels || stat.messageChannels.length === 0) && 
                             (!stat.voiceChannels || stat.voiceChannels.length === 0) && (
                              <div className="text-gray-500 text-center py-2">Kanal verisi yok</div>
                            )}
                          </div>
                        </td>

                        {/* Roller */}
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {stat.roles && stat.roles.length > 0 ? (
                              <>
                                {stat.roles.slice(0, 3).map((role) => (
                                  <span
                                    key={role.id}
                                    className="text-xs px-2 py-1 rounded"
                                    style={{ 
                                      backgroundColor: role.color ? `#${role.color.toString(16).padStart(6, '0')}20` : '#99AAB520',
                                      color: role.color ? `#${role.color.toString(16).padStart(6, '0')}` : '#99AAB5',
                                      border: `1px solid ${role.color ? `#${role.color.toString(16).padStart(6, '0')}` : '#99AAB5'}`
                                    }}
                                  >
                                    {role.name}
                                  </span>
                                ))}
                                {stat.roles.length > 3 && (
                                  <span className="text-xs text-gray-400">+{stat.roles.length - 3}</span>
                                )}
                              </>
                            ) : (
                              <span className="text-xs text-gray-500">Rol yok</span>
                            )}
                          </div>
                        </td>
                      </>
                    )}
                    {activeTab === 'invites' && (
                      <td className="px-6 py-4 text-right font-semibold text-blue-400">
                        {stat.invitesCount || 0} 🎟️
                      </td>
                    )}
                    {activeTab === 'staff' && (
                      <>
                        <td className="px-6 py-4 text-right font-semibold text-yellow-400">
                          {stat.registerCount || 0} 📝
                        </td>
                        <td className="px-6 py-4 text-right text-purple-400">
                          {stat.startedStaffCount || 0} 👮
                        </td>
                        <td className="px-6 py-4 text-right text-blue-400">
                          {stat.taggedCount || 0} 🏷️
                        </td>
                      </>
                    )}
                    {activeTab === 'siciller' && (
                      <>
                        <td className="px-6 py-4 text-center">
                          <span className="px-3 py-1 bg-midnight-purple bg-opacity-20 border border-midnight-purple rounded-full font-bold">
                            #{stat.recordId}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-lg">{stat.typeDisplay}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {stat.staffAvatar ? (
                              <img 
                                src={stat.staffAvatar} 
                                alt={stat.staffName}
                                className="w-6 h-6 rounded-full"
                              />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-midnight-purple to-midnight-pink flex items-center justify-center text-xs font-bold">
                                {stat.staffName?.charAt(0) || '?'}
                              </div>
                            )}
                            <span className="text-sm">{stat.staffName}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-300">
                          {stat.reason?.substring(0, 50)}{stat.reason?.length > 50 ? '...' : ''}
                        </td>
                        <td className="px-6 py-4 text-center text-sm text-gray-400">
                          {new Date(stat.date).toLocaleDateString('tr-TR')}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {stat.active ? (
                            <span className="px-3 py-1 bg-red-500 bg-opacity-20 border border-red-500 rounded-full text-red-400 text-sm font-semibold">
                              🔴 Aktif
                            </span>
                          ) : stat.removedBy ? (
                            <span className="px-3 py-1 bg-green-500 bg-opacity-20 border border-green-500 rounded-full text-green-400 text-sm font-semibold">
                              ✅ Kaldırıldı
                            </span>
                          ) : (
                            <span className="px-3 py-1 bg-gray-500 bg-opacity-20 border border-gray-500 rounded-full text-gray-400 text-sm font-semibold">
                              ⚪ Süresi Doldu
                            </span>
                          )}
                        </td>
                      </>
                    )}
                    {activeTab === 'roles' && (
                      <>
                        <td className="px-6 py-4 text-center font-semibold">
                          {stat.members || 0} 👥
                        </td>
                        <td className="px-6 py-4 text-center">
                          {stat.hoist ? '✅' : '❌'}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {stat.mentionable ? '✅' : '❌'}
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* User Management Modal */}
      <UserManagementModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setSelectedUser(null)
          setActionResult(null)
        }}
        user={selectedUser}
        guildId={guildId}
        roles={roles}
        showUnban={activeTab === 'bans'}
        onSuccess={() => {
          fetchStats() // Refresh stats after action
        }}
      />

      {/* User Profile Modal */}
      <UserProfileModal
        isOpen={profileModalOpen}
        onClose={() => {
          setProfileModalOpen(false)
          setSelectedProfile(null)
        }}
        user={selectedProfile}
      />

      {/* Leave Server Confirmation Modal */}
      {leaveModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="glass rounded-xl p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4 text-red-400">⚠️ Sunucudan Ayrıl</h2>
            <p className="text-gray-300 mb-6">
              <strong className="text-white">{guild.name}</strong> sunucusundan ayrılmak istediğinize emin misiniz?
            </p>
            <p className="text-sm text-gray-400 mb-6">
              Bu işlem geri alınamaz. Bot sunucudan çıkacak ve tekrar davet edilmesi gerekecek.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setLeaveModalOpen(false)}
                disabled={leaveLoading}
                className="flex-1 px-6 py-3 bg-midnight-light rounded-lg font-semibold hover:bg-midnight-base transition-colors disabled:opacity-50"
              >
                İptal
              </button>
              <button
                onClick={handleLeaveGuild}
                disabled={leaveLoading}
                className="flex-1 px-6 py-3 bg-red-500 bg-opacity-20 border border-red-500 rounded-lg font-semibold hover:bg-opacity-30 transition-colors text-red-400 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {leaveLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-red-400"></div>
                    <span>Ayrılıyor...</span>
                  </>
                ) : (
                  <>
                    <span>🚪</span>
                    <span>Ayrıl</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ServerStats
