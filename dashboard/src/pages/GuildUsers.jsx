import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import toast from 'react-hot-toast'
import Loading from '../components/Loading'
import EmptyState from '../components/EmptyState'

const PAGE_SIZE = 50

function formatDate(isoStr) {
  if (!isoStr) return '-'
  const d = new Date(isoStr)
  if (isNaN(d.getTime())) return '-'
  return d.toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export default function GuildUsers() {
  const { guildId } = useParams()
  const navigate = useNavigate()

  const [members, setMembers] = useState([])
  const [roles, setRoles] = useState([])
  const [guildInfo, setGuildInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [searchDebounced, setSearchDebounced] = useState('')
  const [page, setPage] = useState(0)

  // İşlemler state
  const [actionLoading, setActionLoading] = useState(false)
  const [activeModal, setActiveModal] = useState(null) // 'role' | 'ban' | 'kick' | 'timeout' | 'money'
  const [modalMember, setModalMember] = useState(null)
  const [formData, setFormData] = useState({})

  // Search debounce
  useEffect(() => {
    const t = setTimeout(() => {
      setSearchDebounced(search)
      setPage(0)
    }, 400)
    return () => clearTimeout(t)
  }, [search])

  // Ana veri çekme
  const fetchData = async () => {
    try {
      setLoading(true)
      const [guildsRes, membersRes, rolesRes] = await Promise.all([
        api.getGuilds(),
        api.getGuildMembers(guildId, {
          limit: PAGE_SIZE,
          offset: page * PAGE_SIZE,
          search: searchDebounced
        }),
        api.getGuildRoles(guildId)
      ])

      const guild = guildsRes.data.find(g => g.id === guildId) || null
      setGuildInfo(guild)
      setMembers(membersRes.data.members || [])
      setTotal(membersRes.data.total || 0)
      setRoles(rolesRes.data || [])
    } catch (error) {
      toast.error('Kullanıcılar yüklenemedi: ' + (error.response?.data?.error || error.message))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (guildId) fetchData()
    // eslint-disable-next-line
  }, [guildId, page, searchDebounced])

  const openModal = (type, member) => {
    setActiveModal(type)
    setModalMember(member)
    if (type === 'role') setFormData({ roleId: '' })
    if (type === 'ban') setFormData({ reason: 'Web panel üzerinden banlama' })
    if (type === 'kick') setFormData({ reason: 'Web panel üzerinden kickleme' })
    if (type === 'timeout') setFormData({ durationMinutes: 60, reason: 'Web panel üzerinden timeout' })
    if (type === 'money') setFormData({ amount: 0 })
  }

  const closeModal = () => {
    setActiveModal(null)
    setModalMember(null)
    setFormData({})
  }

  const handleRoleAction = async (action) => {
    if (!modalMember || !formData.roleId) {
      toast.error('Lütfen bir rol seçin')
      return
    }
    try {
      setActionLoading(true)
      if (action === 'add') {
        await api.addRoleToUser(guildId, modalMember.id, formData.roleId)
        toast.success('Rol başarıyla eklendi')
      } else {
        await api.removeRoleFromUser(guildId, modalMember.id, formData.roleId)
        toast.success('Rol başarıyla kaldırıldı')
      }
      closeModal()
      await fetchData()
    } catch (error) {
      toast.error('İşlem başarısız: ' + (error.response?.data?.error || error.message))
    } finally {
      setActionLoading(false)
    }
  }

  const handleBan = async () => {
    if (!modalMember) return
    if (!window.confirm(`${modalMember.displayName || modalMember.username} kullanıcısını banlamak istediğinden emin misin?`)) return
    try {
      setActionLoading(true)
      await api.banUser(guildId, modalMember.id, formData.reason)
      toast.success('Kullanıcı banlandı')
      closeModal()
      await fetchData()
    } catch (error) {
      toast.error('Banlanamadı: ' + (error.response?.data?.error || error.message))
    } finally {
      setActionLoading(false)
    }
  }

  const handleKick = async () => {
    if (!modalMember) return
    if (!window.confirm(`${modalMember.displayName || modalMember.username} kullanıcısını atmak istediğinden emin misin?`)) return
    try {
      setActionLoading(true)
      await api.kickUser(guildId, modalMember.id, formData.reason)
      toast.success('Kullanıcı sunucudan atıldı')
      closeModal()
      await fetchData()
    } catch (error) {
      toast.error('Atılamadı: ' + (error.response?.data?.error || error.message))
    } finally {
      setActionLoading(false)
    }
  }

  const handleTimeout = async (action) => {
    if (!modalMember) return
    try {
      setActionLoading(true)
      if (action === 'apply') {
        const mins = parseInt(formData.durationMinutes)
        if (!mins || mins <= 0) {
          toast.error('Geçerli bir dakika girin')
          return
        }
        await api.timeoutUser(guildId, modalMember.id, mins, formData.reason)
        toast.success(`Başarıyla ${mins} dakika timeout edildi`)
      } else {
        await api.untimeoutUser(guildId, modalMember.id)
        toast.success('Timeout kaldırıldı')
      }
      closeModal()
      await fetchData()
    } catch (error) {
      toast.error('Timeout işlemi başarısız: ' + (error.response?.data?.error || error.message))
    } finally {
      setActionLoading(false)
    }
  }

  const handleMoneyAction = async (action) => {
    if (!modalMember) return
    const amount = parseInt(formData.amount)
    if (isNaN(amount)) {
      toast.error('Geçerli bir tutar girin')
      return
    }
    try {
      setActionLoading(true)
      const actualAmount = action === 'remove' ? -Math.abs(amount) : Math.abs(amount)
      const res = await api.updateUserMoney(modalMember.id, actualAmount)
      toast.success(res.data.message)
      closeModal()
    } catch (error) {
      toast.error('Para işlemi başarısız: ' + (error.response?.data?.error || error.message))
    } finally {
      setActionLoading(false)
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  if (loading && members.length === 0) return <Loading />

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 rounded-lg bg-midnight-light hover:bg-midnight-base transition-colors"
          >
            ← Geri
          </button>
          {guildInfo?.icon ? (
            <img src={guildInfo.icon} alt="" className="w-14 h-14 rounded-full" />
          ) : (
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-midnight-purple to-midnight-pink flex items-center justify-center text-xl font-bold">
              {(guildInfo?.name || 'G').charAt(0)}
            </div>
          )}
          <div>
            <h1 className="text-3xl font-bold">
              {guildInfo?.name || 'Sunucu'} - Kullanıcılar
            </h1>
            <p className="text-gray-400">
              {total.toLocaleString()} üye • Sayfa {page + 1} / {totalPages}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <input
              type="text"
              placeholder="Ara: isim, id, tag..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-72 bg-midnight-base border border-midnight-light rounded-lg px-4 py-2 focus:outline-none focus:border-midnight-purple"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-midnight-base hover:bg-midnight-light rounded-lg transition-colors"
          >
            🔄 Yenile
          </button>
        </div>
      </div>

      {/* Tablo */}
      {members.length === 0 ? (
        <EmptyState
          icon="👥"
          title="Kullanıcı Bulunamadı"
          description={search ? 'Aramanızla eşleşen kullanıcı yok.' : 'Bu sunucuda üye bulunmamaktadır.'}
        />
      ) : (
        <div className="glass rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-midnight-base text-gray-300">
                <tr>
                  <th className="text-left p-4">Kullanıcı</th>
                  <th className="text-left p-4">ID</th>
                  <th className="text-left p-4">En Yüksek Rol</th>
                  <th className="text-left p-4">Roller</th>
                  <th className="text-left p-4">Katılım Tarihi</th>
                  <th className="text-left p-4">Durum</th>
                  <th className="text-left p-4">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-midnight-light">
                {members.map(m => (
                  <tr key={m.id} className="hover:bg-midnight-base/50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3 min-w-[200px]">
                        <img
                          src={m.guildAvatar || m.avatar || 'https://cdn.discordapp.com/embed/avatars/0.png'}
                          alt=""
                          className="w-10 h-10 rounded-full"
                        />
                        <div className="min-w-0">
                          <div className="font-semibold truncate">
                            {m.displayName || m.globalName || m.username}
                          </div>
                          <div className="text-xs text-gray-400 truncate">{m.username}#{m.discriminator || '0000'}</div>
                          <div className="flex gap-1 mt-0.5 flex-wrap">
                            {m.isOwner && <span className="px-1.5 py-0.5 text-[10px] rounded bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">👑 SAHİP</span>}
                            {!m.isOwner && m.isAdmin && <span className="px-1.5 py-0.5 text-[10px] rounded bg-red-500/20 text-red-400 border border-red-500/30">ADMİN</span>}
                            {!m.isOwner && !m.isAdmin && m.isModerator && <span className="px-1.5 py-0.5 text-[10px] rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">MOD</span>}
                            {m.timedOutUntil && Date.now() < m.timedOutUntil && <span className="px-1.5 py-0.5 text-[10px] rounded bg-orange-500/20 text-orange-400 border border-orange-500/30">⏸️ SUSTURULDU</span>}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 font-mono text-xs text-gray-400">
                      <code className="select-all">{m.id}</code>
                    </td>
                    <td className="p-4">
                      {m.highestRole ? (
                        <div className="flex items-center gap-2">
                          <span
                            className="inline-block w-3 h-3 rounded-full"
                            style={{ background: m.highestRole.hexColor || '#666' }}
                          />
                          <span className="truncate max-w-[120px]">{m.highestRole.name}</span>
                        </div>
                      ) : (
                        <span className="text-gray-500">—</span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1 max-w-[220px]">
                        {m.roles && m.roles.slice(0, 4).map(r => (
                          <span
                            key={r.id}
                            className="px-1.5 py-0.5 rounded text-xs"
                            style={{
                              background: `${r.hexColor || '#666'}20`,
                              color: r.hexColor || '#ccc',
                              border: `1px solid ${r.hexColor || '#666'}50`
                            }}
                          >
                            {r.name}
                          </span>
                        ))}
                        {m.roles && m.roles.length > 4 && (
                          <span className="px-1.5 py-0.5 rounded text-xs bg-midnight-base text-gray-300">
                            +{m.roles.length - 4}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-gray-300 whitespace-nowrap">{formatDate(m.joinedAt)}</td>
                    <td className="p-4">
                      <span className="inline-block w-2.5 h-2.5 rounded-full bg-green-500" title="Üye" />
                      <span className="ml-2 text-gray-400 text-xs">Aktif</span>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1">
                        <ActionBtn label="Rol" icon="🎭" onClick={() => openModal('role', m)} />
                        <ActionBtn label="Ban" icon="🔨" onClick={() => openModal('ban', m)} danger />
                        <ActionBtn label="Kick" icon="👢" onClick={() => openModal('kick', m)} />
                        <ActionBtn label="Timeout" icon="⏱️" onClick={() => openModal('timeout', m)} />
                        <ActionBtn label="Para" icon="💰" onClick={() => openModal('money', m)} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Sayfalama */}
          <div className="p-4 flex flex-wrap items-center justify-between gap-3 bg-midnight-base/40 border-t border-midnight-light">
            <div className="text-sm text-gray-400">
              {(page * PAGE_SIZE) + 1} - {Math.min((page + 1) * PAGE_SIZE, total)} / {total.toLocaleString()}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(0)}
                disabled={page === 0}
                className="px-3 py-1.5 rounded-lg bg-midnight-base hover:bg-midnight-light disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ⏮️ İlk
              </button>
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-3 py-1.5 rounded-lg bg-midnight-base hover:bg-midnight-light disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ← Önceki
              </button>
              <span className="px-3">
                {page + 1} / {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="px-3 py-1.5 rounded-lg bg-midnight-base hover:bg-midnight-light disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Sonraki →
              </button>
              <button
                onClick={() => setPage(totalPages - 1)}
                disabled={page >= totalPages - 1}
                className="px-3 py-1.5 rounded-lg bg-midnight-base hover:bg-midnight-light disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Son ⏭️
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modallar */}
      {activeModal && modalMember && (
        <ModalOverlay onClose={closeModal}>
          <div className="glass rounded-2xl p-6 w-full max-w-md">
            {activeModal === 'role' && (
              <ModalRole
                member={modalMember}
                roles={roles}
                formData={formData}
                setFormData={setFormData}
                actionLoading={actionLoading}
                onAdd={() => handleRoleAction('add')}
                onRemove={() => handleRoleAction('remove')}
                onCancel={closeModal}
              />
            )}
            {activeModal === 'ban' && (
              <ModalSingleInput
                title="🔨 Kullanıcı Banla"
                member={modalMember}
                label="Sebep"
                field="reason"
                formData={formData}
                setFormData={setFormData}
                actionLoading={actionLoading}
                confirmText="Banla"
                confirmColor="bg-red-500 hover:bg-red-600"
                onConfirm={handleBan}
                onCancel={closeModal}
              />
            )}
            {activeModal === 'kick' && (
              <ModalSingleInput
                title="👢 Kullanıcıyı At (Kick)"
                member={modalMember}
                label="Sebep"
                field="reason"
                formData={formData}
                setFormData={setFormData}
                actionLoading={actionLoading}
                confirmText="At"
                confirmColor="bg-orange-500 hover:bg-orange-600"
                onConfirm={handleKick}
                onCancel={closeModal}
              />
            )}
            {activeModal === 'timeout' && (
              <ModalTimeout
                member={modalMember}
                formData={formData}
                setFormData={setFormData}
                actionLoading={actionLoading}
                memberRoles={modalMember.roles || []}
                onApply={() => handleTimeout('apply')}
                onRemove={() => handleTimeout('remove')}
                onCancel={closeModal}
                isCurrentlyTimedOut={!!modalMember.timedOutUntil && Date.now() < modalMember.timedOutUntil}
              />
            )}
            {activeModal === 'money' && (
              <ModalMoney
                member={modalMember}
                formData={formData}
                setFormData={setFormData}
                actionLoading={actionLoading}
                onAdd={() => handleMoneyAction('add')}
                onRemove={() => handleMoneyAction('remove')}
                onCancel={closeModal}
              />
            )}
          </div>
        </ModalOverlay>
      )}
    </div>
  )
}

/* ================= YARDIMCI BİLEŞENLER ================= */

function ActionBtn({ label, icon, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      className={
        'px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ' +
        (danger
          ? 'bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30'
          : 'bg-midnight-light hover:bg-midnight-base text-gray-200 border border-midnight-light')
      }
    >
      <span className="mr-1">{icon}</span>
      {label}
    </button>
  )
}

function ModalOverlay({ children, onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md">
        {children}
      </div>
    </div>
  )
}

function MemberHeader({ member }) {
  return (
    <div className="flex items-center gap-3 mb-4 p-3 rounded-xl bg-midnight-base/60 border border-midnight-light">
      <img
        src={member.guildAvatar || member.avatar || 'https://cdn.discordapp.com/embed/avatars/0.png'}
        alt=""
        className="w-12 h-12 rounded-full"
      />
      <div className="min-w-0 flex-1">
        <div className="font-semibold truncate">{member.displayName || member.username}</div>
        <div className="text-xs text-gray-400 truncate">{member.username}#{member.discriminator || '0000'}</div>
        <code className="text-[10px] text-gray-500 font-mono">{member.id}</code>
      </div>
    </div>
  )
}

function ModalRole({ member, roles, formData, setFormData, actionLoading, onAdd, onRemove, onCancel }) {
  const userRoleIds = new Set((member.roles || []).map(r => r.id))
  const hasRole = formData.roleId && userRoleIds.has(formData.roleId)

  return (
    <div>
      <h3 className="text-xl font-bold mb-1">🎭 Rol İşlemleri</h3>
      <p className="text-sm text-gray-400 mb-4">Rol seç ve ekle/çıkar butonuna bas.</p>
      <MemberHeader member={member} />
      <label className="block text-sm text-gray-300 mb-2">Rol</label>
      <select
        value={formData.roleId}
        onChange={(e) => setFormData(d => ({ ...d, roleId: e.target.value }))}
        className="w-full bg-midnight-base border border-midnight-light rounded-lg px-3 py-2.5 mb-5 focus:outline-none focus:border-midnight-purple"
      >
        <option value="">Bir rol seçin...</option>
        {roles.map(r => (
          <option key={r.id} value={r.id}>
            {r.name} {userRoleIds.has(r.id) ? '(sahip)' : ''}
          </option>
        ))}
      </select>
      {formData.roleId && hasRole && (
        <div className="mb-3 text-xs text-yellow-400/90 bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-2">
          ℹ️ Kullanıcı bu role zaten sahip. Çıkarmak için "Rolü Kaldır" butonuna basın.
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={onAdd}
          disabled={actionLoading || !formData.roleId}
          className="px-4 py-2.5 rounded-lg bg-green-500 hover:bg-green-600 disabled:opacity-40 disabled:cursor-not-allowed font-medium"
        >
          ➕ Rol Ekle
        </button>
        <button
          onClick={onRemove}
          disabled={actionLoading || !formData.roleId}
          className="px-4 py-2.5 rounded-lg bg-red-500 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed font-medium"
        >
          ➖ Rol Kaldır
        </button>
      </div>
      <button onClick={onCancel} className="w-full mt-3 text-sm text-gray-400 hover:text-white py-2">
        İptal
      </button>
    </div>
  )
}

function ModalSingleInput({ title, member, label, field, formData, setFormData, actionLoading, confirmText, confirmColor, onConfirm, onCancel }) {
  return (
    <div>
      <h3 className="text-xl font-bold mb-1">{title}</h3>
      <p className="text-sm text-gray-400 mb-4">İşleme devam ediyorsunuz.</p>
      <MemberHeader member={member} />
      <label className="block text-sm text-gray-300 mb-2">{label}</label>
      <input
        type="text"
        value={formData[field] || ''}
        onChange={(e) => setFormData(d => ({ ...d, [field]: e.target.value }))}
        className="w-full bg-midnight-base border border-midnight-light rounded-lg px-3 py-2.5 mb-5 focus:outline-none focus:border-midnight-purple"
      />
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={onCancel}
          className="px-4 py-2.5 rounded-lg bg-midnight-light hover:bg-midnight-base font-medium"
        >
          İptal
        </button>
        <button
          onClick={onConfirm}
          disabled={actionLoading}
          className={`px-4 py-2.5 rounded-lg ${confirmColor} font-medium disabled:opacity-40 disabled:cursor-not-allowed`}
        >
          {actionLoading ? 'İşleniyor...' : confirmText}
        </button>
      </div>
    </div>
  )
}

function ModalTimeout({ member, formData, setFormData, actionLoading, onApply, onRemove, onCancel, isCurrentlyTimedOut }) {
  const quick = [5, 15, 30, 60, 360, 1440, 10080]
  return (
    <div>
      <h3 className="text-xl font-bold mb-1">⏱️ Timeout İşlemleri</h3>
      <p className="text-sm text-gray-400 mb-4">Süreyi (dakika) belirle ve uygula.</p>
      <MemberHeader member={member} />
      {isCurrentlyTimedOut && (
        <div className="mb-3 text-xs bg-orange-500/10 text-orange-300 border border-orange-500/20 rounded-lg p-2.5">
          ⚠️ Kullanıcı şu anda timeoutta. Aşağıdan "Timeout Kaldır" butonuna basabilirsin.
        </div>
      )}
      <label className="block text-sm text-gray-300 mb-2">Süre (dakika)</label>
      <input
        type="number"
        min={1}
        max={40320}
        value={formData.durationMinutes ?? ''}
        onChange={(e) => setFormData(d => ({ ...d, durationMinutes: e.target.value }))}
        className="w-full bg-midnight-base border border-midnight-light rounded-lg px-3 py-2.5 mb-2 focus:outline-none focus:border-midnight-purple"
      />
      <div className="flex flex-wrap gap-2 mb-4">
        {quick.map(mins => (
          <button
            key={mins}
            onClick={() => setFormData(d => ({ ...d, durationMinutes: mins }))}
            className="px-2.5 py-1 text-xs rounded-md bg-midnight-light hover:bg-midnight-base border border-midnight-light"
          >
            {mins < 60 ? `${mins}dk` : mins < 1440 ? `${mins / 60}sa` : `${mins / 1440}gün`}
          </button>
        ))}
      </div>
      <label className="block text-sm text-gray-300 mb-2">Sebep</label>
      <input
        type="text"
        value={formData.reason || ''}
        onChange={(e) => setFormData(d => ({ ...d, reason: e.target.value }))}
        className="w-full bg-midnight-base border border-midnight-light rounded-lg px-3 py-2.5 mb-5 focus:outline-none focus:border-midnight-purple"
      />
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={onRemove}
          disabled={actionLoading}
          className="px-4 py-2.5 rounded-lg bg-gray-600 hover:bg-gray-700 font-medium disabled:opacity-40"
        >
          ⏺️ Kaldır
        </button>
        <button
          onClick={onApply}
          disabled={actionLoading}
          className="px-4 py-2.5 rounded-lg bg-orange-500 hover:bg-orange-600 font-medium disabled:opacity-40 disabled:cursor-not-allowed"
        >
          ▶️ Uygula
        </button>
      </div>
      <button onClick={onCancel} className="w-full mt-3 text-sm text-gray-400 hover:text-white py-2">
        İptal
      </button>
    </div>
  )
}

function ModalMoney({ member, formData, setFormData, actionLoading, onAdd, onRemove, onCancel }) {
  const quick = [100, 500, 1000, 5000, 10000, 50000]
  return (
    <div>
      <h3 className="text-xl font-bold mb-1">💰 Para İşlemleri</h3>
      <p className="text-sm text-gray-400 mb-4">Kullanıcının cüzdanına ekle/çıkar.</p>
      <MemberHeader member={member} />
      <label className="block text-sm text-gray-300 mb-2">Tutar</label>
      <input
        type="number"
        value={formData.amount ?? ''}
        onChange={(e) => setFormData(d => ({ ...d, amount: e.target.value }))}
        className="w-full bg-midnight-base border border-midnight-light rounded-lg px-3 py-2.5 mb-2 focus:outline-none focus:border-midnight-purple"
      />
      <div className="flex flex-wrap gap-2 mb-5">
        {quick.map(a => (
          <button
            key={a}
            onClick={() => setFormData(d => ({ ...d, amount: a }))}
            className="px-2.5 py-1 text-xs rounded-md bg-midnight-light hover:bg-midnight-base border border-midnight-light"
          >
            +{a.toLocaleString()}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={onAdd}
          disabled={actionLoading}
          className="px-4 py-2.5 rounded-lg bg-green-500 hover:bg-green-600 font-medium disabled:opacity-40"
        >
          ➕ Para Ekle
        </button>
        <button
          onClick={onRemove}
          disabled={actionLoading}
          className="px-4 py-2.5 rounded-lg bg-red-500 hover:bg-red-600 font-medium disabled:opacity-40 disabled:cursor-not-allowed"
        >
          ➖ Para Çıkar
        </button>
      </div>
      <button onClick={onCancel} className="w-full mt-3 text-sm text-gray-400 hover:text-white py-2">
        İptal
      </button>
    </div>
  )
}
