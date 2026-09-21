import { useState } from 'react'
import { api } from '../api/client'

const UserManagementModal = ({ isOpen, onClose, user, guildId, roles, onSuccess, showUnban = false }) => {
  const [activeAction, setActiveAction] = useState(null) // 'addRole', 'removeRole', 'ban', 'unban', 'money'
  const [selectedRole, setSelectedRole] = useState('')
  const [banReason, setBanReason] = useState('')
  const [moneyAmount, setMoneyAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)

  if (!isOpen || !user) return null

  const handleAction = async () => {
    setLoading(true)
    setResult(null)

    try {
      let response

      switch (activeAction) {
        case 'addRole':
          if (!selectedRole) {
            setResult({ success: false, message: 'Lütfen bir rol seçin' })
            setLoading(false)
            return
          }
          response = await api.addRoleToUser(guildId, user.userId, selectedRole)
          break

        case 'removeRole':
          if (!selectedRole) {
            setResult({ success: false, message: 'Lütfen bir rol seçin' })
            setLoading(false)
            return
          }
          response = await api.removeRoleFromUser(guildId, user.userId, selectedRole)
          break

        case 'ban':
          response = await api.banUser(guildId, user.userId, banReason || 'Web panel üzerinden banlama')
          break

        case 'unban':
          response = await api.unbanUser(guildId, user.userId)
          break

        case 'money':
          const amount = parseInt(moneyAmount)
          if (isNaN(amount)) {
            setResult({ success: false, message: 'Geçerli bir sayı girin' })
            setLoading(false)
            return
          }
          response = await api.updateUserMoney(user.userId, amount)
          break

        default:
          setLoading(false)
          return
      }

      setResult({ success: true, message: response.data.message })
      
      // Reset form
      setSelectedRole('')
      setBanReason('')
      setMoneyAmount('')
      setActiveAction(null)
      
      // Notify parent to refresh
      if (onSuccess) onSuccess()

    } catch (error) {
      setResult({ 
        success: false, 
        message: error.response?.data?.error || 'İşlem başarısız oldu' 
      })
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setActiveAction(null)
    setSelectedRole('')
    setBanReason('')
    setMoneyAmount('')
    setResult(null)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="glass rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              {user.avatar ? (
                <img 
                  src={user.avatar} 
                  alt={user.username}
                  className="w-16 h-16 rounded-full"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-midnight-purple to-midnight-pink flex items-center justify-center text-2xl font-bold">
                  {user.username?.charAt(0) || '?'}
                </div>
              )}
              <div>
                <h2 className="text-2xl font-bold">{user.username}</h2>
                <p className="text-sm text-gray-400">Kullanıcı Yönetimi</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-midnight-light rounded-lg transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Action Buttons */}
          <div className={`grid gap-4 mb-6 ${showUnban ? 'grid-cols-2' : 'grid-cols-2'}`}>
            {!showUnban && (
              <>
                <button
                  onClick={() => setActiveAction('addRole')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    activeAction === 'addRole'
                      ? 'border-midnight-purple bg-midnight-purple bg-opacity-20'
                      : 'border-midnight-light hover:border-midnight-purple'
                  }`}
                >
                  <div className="text-2xl mb-2">➕</div>
                  <div className="font-semibold">Rol Ver</div>
                </button>

                <button
                  onClick={() => setActiveAction('removeRole')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    activeAction === 'removeRole'
                      ? 'border-midnight-pink bg-midnight-pink bg-opacity-20'
                      : 'border-midnight-light hover:border-midnight-pink'
                  }`}
                >
                  <div className="text-2xl mb-2">➖</div>
                  <div className="font-semibold">Rol Al</div>
                </button>

                <button
                  onClick={() => setActiveAction('ban')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    activeAction === 'ban'
                      ? 'border-red-500 bg-red-500 bg-opacity-20'
                      : 'border-midnight-light hover:border-red-500'
                  }`}
                >
                  <div className="text-2xl mb-2">🔨</div>
                  <div className="font-semibold">Banla</div>
                </button>

                <button
                  onClick={() => setActiveAction('money')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    activeAction === 'money'
                      ? 'border-green-500 bg-green-500 bg-opacity-20'
                      : 'border-midnight-light hover:border-green-500'
                  }`}
                >
                  <div className="text-2xl mb-2">💰</div>
                  <div className="font-semibold">Para Ekle/Çıkar</div>
                </button>
              </>
            )}

            {showUnban && (
              <button
                onClick={() => setActiveAction('unban')}
                className={`p-4 rounded-lg border-2 transition-all col-span-2 ${
                  activeAction === 'unban'
                    ? 'border-green-500 bg-green-500 bg-opacity-20'
                    : 'border-midnight-light hover:border-green-500'
                }`}
              >
                <div className="text-2xl mb-2">🔓</div>
                <div className="font-semibold">Banı Kaldır</div>
              </button>
            )}
          </div>

          {/* Action Form */}
          {activeAction && (
            <div className="bg-midnight-base rounded-lg p-6 mb-6">
              {(activeAction === 'addRole' || activeAction === 'removeRole') && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {activeAction === 'addRole' ? 'Verilecek Rol' : 'Alınacak Rol'}
                  </label>
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    className="w-full bg-midnight-dark border border-midnight-light rounded-lg px-4 py-3 focus:outline-none focus:border-midnight-purple"
                  >
                    <option value="">Rol seçin...</option>
                    {roles.map(role => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {activeAction === 'ban' && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Ban Sebebi (Opsiyonel)
                  </label>
                  <textarea
                    value={banReason}
                    onChange={(e) => setBanReason(e.target.value)}
                    placeholder="Ban sebebini yazın..."
                    rows="3"
                    className="w-full bg-midnight-dark border border-midnight-light rounded-lg px-4 py-3 focus:outline-none focus:border-red-500 resize-none"
                  />
                  <p className="text-xs text-gray-400 mt-2">
                    ⚠️ Bu işlem geri alınamaz! Kullanıcı sunucudan yasaklanacak.
                  </p>
                </div>
              )}

              {activeAction === 'unban' && (
                <div>
                  <p className="text-sm text-gray-300 mb-2">
                    Bu kullanıcının banını kaldırmak istediğinize emin misiniz?
                  </p>
                  <p className="text-xs text-gray-400">
                    ✅ Kullanıcı tekrar sunucuya katılabilecek.
                  </p>
                </div>
              )}

              {activeAction === 'money' && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Para Miktarı (+ veya -)
                  </label>
                  <input
                    type="number"
                    value={moneyAmount}
                    onChange={(e) => setMoneyAmount(e.target.value)}
                    placeholder="Örn: 1000 veya -500"
                    className="w-full bg-midnight-dark border border-midnight-light rounded-lg px-4 py-3 focus:outline-none focus:border-green-500"
                  />
                  <p className="text-xs text-gray-400 mt-2">
                    💡 Pozitif sayı para ekler, negatif sayı para çıkarır
                  </p>
                </div>
              )}

              <button
                onClick={handleAction}
                disabled={loading}
                className="w-full mt-4 bg-gradient-to-r from-midnight-purple to-midnight-pink px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'İşlem yapılıyor...' : 'İşlemi Gerçekleştir'}
              </button>
            </div>
          )}

          {/* Result Message */}
          {result && (
            <div className={`p-4 rounded-lg ${
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
    </div>
  )
}

export default UserManagementModal
