import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { api } from '../api/client'

const fmt = (n) => Math.floor(Number(n) || 0).toLocaleString('tr-TR')

const pad = (n) => String(n).padStart(2, '0')
const fmtDate = (d) => {
  if (!d) return '—'
  const x = new Date(d)
  if (Number.isNaN(x.getTime())) return '—'
  return `${pad(x.getDate())}.${pad(x.getMonth() + 1)}.${x.getFullYear()} ${pad(x.getHours())}:${pad(x.getMinutes())}`
}

const dayLabel = (d) => (d === 30 ? '1 Ay' : `${d} Gün`)

const TYPE_LABELS = {
  deposit: '💰 Vadesiz Yatırma',
  withdraw: '💸 Vadesiz Çekme',
  term_open: '📈 Vadeli Açılış',
  term_close: '🏁 Vadeli Kapanış',
  loan_take: '💳 Kredi Çekimi',
  loan_pay: '✅ Kredi Ödemesi'
}

const RATE_FIELDS = [
  { key: 'd7', label: '7 Gün Vadeli', suffix: '%' },
  { key: 'd14', label: '14 Gün Vadeli', suffix: '%' },
  { key: 'd21', label: '21 Gün Vadeli', suffix: '%' },
  { key: 'd30', label: '1 Ay (30 Gün) Vadeli', suffix: '%' },
  { key: 'loan', label: 'Kredi (günlük)', suffix: '%' },
  { key: 'overdueMultiplier', label: 'Gecikme Çarpanı', suffix: '×' }
]

const StatCard = ({ icon, label, value, accent = 'text-white' }) => (
  <div className="glass rounded-xl p-5">
    <div className="flex items-center gap-3 mb-2">
      <span className="text-2xl">{icon}</span>
      <span className="text-gray-400 text-sm">{label}</span>
    </div>
    <div className={`text-2xl font-bold ${accent}`}>{value}</div>
  </div>
)

const Banks = () => {
  const navigate = useNavigate()
  const [banks, setBanks] = useState([])
  const [loading, setLoading] = useState(true)

  const [selectedId, setSelectedId] = useState(null)
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [rateForm, setRateForm] = useState(null)
  const [savingRates, setSavingRates] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const fetchBanks = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.getBanks()
      setBanks(res.data)
    } catch (error) {
      console.error('Bankalar yüklenemedi:', error)
      toast.error('Bankalar yüklenemedi')
      setBanks([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchBanks()
  }, [fetchBanks])

  const openBank = async (bankId) => {
    setSelectedId(bankId)
    setDetail(null)
    setConfirmDelete(false)
    setDetailLoading(true)
    try {
      const res = await api.getBankDetail(bankId)
      setDetail(res.data)
      setRateForm({ ...res.data.bank.rates })
    } catch (error) {
      console.error('Banka detayı yüklenemedi:', error)
      toast.error('Banka detayı yüklenemedi')
      setSelectedId(null)
    } finally {
      setDetailLoading(false)
    }
  }

  const closeDetail = () => {
    setSelectedId(null)
    setDetail(null)
    setRateForm(null)
    setConfirmDelete(false)
  }

  const saveRates = async () => {
    if (!rateForm) return
    setSavingRates(true)
    try {
      const res = await api.updateBankRates(selectedId, rateForm)
      const rates = res.data.rates
      toast.success('Faiz oranları güncellendi')
      setRateForm({ ...rates })
      setDetail((d) => (d ? { ...d, bank: { ...d.bank, rates } } : d))
      fetchBanks()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Faiz oranları kaydedilemedi')
    } finally {
      setSavingRates(false)
    }
  }

  const deleteBank = async () => {
    setDeleting(true)
    try {
      const res = await api.deleteBank(selectedId)
      toast.success(res.data.message || 'Banka silindi')
      closeDetail()
      fetchBanks()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Banka silinemedi')
    } finally {
      setDeleting(false)
    }
  }

  const summary = banks.reduce(
    (acc, b) => ({
      reserve: acc.reserve + (b.reserve || 0),
      deposits: acc.deposits + (b.depositTotal || 0) + (b.termTotal || 0),
      loans: acc.loans + (b.loanTotal || 0),
      accounts: acc.accounts + (b.accountCount || 0)
    }),
    { reserve: 0, deposits: 0, loans: 0, accounts: 0 }
  )

  /* ------------------------- DETAIL VIEW ------------------------- */
  if (selectedId) {
    if (detailLoading || !detail) {
      return (
        <div className="flex items-center justify-center py-24">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-midnight-purple"></div>
        </div>
      )
    }

    const { bank, totals, flow, accounts, loans, transactions } = detail
    const isEditable = bank.isCentral

    return (
      <div>
        <div className="mb-8 flex items-center gap-4 flex-wrap">
          <button
            onClick={closeDetail}
            className="p-2 hover:bg-midnight-light rounded-lg transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-4xl font-bold">{bank.emoji} {bank.name}</h1>
              {bank.isCentral && (
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-midnight-purple to-midnight-pink">
                  MERKEZ BANKASI
                </span>
              )}
            </div>
            <p className="text-gray-400 mt-1">
              Kuruluş: {fmtDate(bank.createdAt)} · Sahip (CEO): <span className="text-purple-400">{bank.ownerName || 'Yok'}</span>
            </p>
          </div>

          {!bank.isCentral && (
            <button
              onClick={() => setConfirmDelete(true)}
              className="px-5 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 transition-colors font-semibold"
            >
              🗑️ Bankayı Sil
            </button>
          )}
        </div>

        {confirmDelete && (
          <div className="glass rounded-xl p-5 mb-8 border border-red-500/50">
            <p className="text-lg font-semibold mb-3">
              ⚠️ <span className="text-red-400">{bank.name}</span> kalıcı olarak silinecek.
            </p>
            <p className="text-gray-400 text-sm mb-4">
              Bankadaki vadesiz bakiyeler ve vadeli anaparalar kullanıcıların cüzdanına iade edilir, krediler iptal edilir.
            </p>
            <div className="flex gap-3">
              <button
                onClick={deleteBank}
                disabled={deleting}
                className="px-5 py-2 rounded-lg bg-red-600 hover:bg-red-700 transition-colors font-semibold disabled:opacity-50"
              >
                {deleting ? 'Siliniyor...' : 'Evet, Sil'}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="px-5 py-2 rounded-lg bg-midnight-light hover:bg-midnight-base transition-colors"
              >
                Vazgeç
              </button>
            </div>
          </div>
        )}

        {/* Totals */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard icon="💰" label="Banka Rezervi" value={`${fmt(bank.reserve)}`} accent="text-yellow-400" />
          <StatCard icon="🏦" label="Banka Değeri" value={`${fmt(detail.value.value)}`} accent="text-green-400" />
          <StatCard icon="📥" label="Vadesiz Mevduat" value={`${fmt(totals.depositTotal)}`} accent="text-blue-400" />
          <StatCard icon="📈" label="Vadeli Mevduat" value={`${fmt(totals.termTotal)}`} accent="text-purple-400" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Flow */}
          <div className="glass rounded-xl p-6">
            <h2 className="text-xl font-bold mb-4">💸 Para Akışı</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Vadesiz Yatırılan</span>
                <span className="font-semibold text-green-400">+{fmt(flow.depositIn)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Vadesiz Çekilen</span>
                <span className="font-semibold text-red-400">-{fmt(flow.withdrawOut)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Vadeliye Yatırılan</span>
                <span className="font-semibold text-purple-400">{fmt(flow.termIn)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Verilen Kredi</span>
                <span className="font-semibold text-orange-400">{fmt(flow.loanOut)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Tahsil Edilen Kredi</span>
                <span className="font-semibold text-green-400">{fmt(flow.loanRepaid)}</span>
              </div>
              <div className="flex justify-between border-t border-midnight-light pt-3">
                <span className="text-gray-400">Aktif Kredi ({totals.loanCount})</span>
                <span className="font-semibold text-red-400">{fmt(totals.loanTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Hesap Sayısı</span>
                <span className="font-semibold">{totals.accountCount}</span>
              </div>
            </div>
          </div>

          {/* Rates */}
          <div className="glass rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">📊 Faiz Oranları</h2>
              {isEditable && <span className="text-xs text-purple-400">Düzenlenebilir</span>}
            </div>

            {isEditable && rateForm ? (
              <div className="space-y-3">
                {RATE_FIELDS.map((f) => (
                  <div key={f.key} className="flex items-center justify-between gap-3">
                    <span className="text-gray-400 text-sm">{f.label}</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step={f.key === 'overdueMultiplier' ? 1 : 0.1}
                        min={f.key === 'overdueMultiplier' ? 1 : 0}
                        max={f.key === 'overdueMultiplier' ? 20 : 100}
                        value={rateForm[f.key] ?? 0}
                        onChange={(e) =>
                          setRateForm((prev) => ({ ...prev, [f.key]: e.target.value }))
                        }
                        className="w-24 bg-midnight-base border border-midnight-light rounded-lg px-3 py-1.5 text-right focus:outline-none focus:border-midnight-purple"
                      />
                      <span className="text-gray-500 w-4">{f.suffix}</span>
                    </div>
                  </div>
                ))}
                <button
                  onClick={saveRates}
                  disabled={savingRates}
                  className="w-full mt-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-midnight-purple to-midnight-pink font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {savingRates ? 'Kaydediliyor...' : 'Faiz Oranlarını Kaydet'}
                </button>
              </div>
            ) : (
              <div className="space-y-3 text-sm">
                {RATE_FIELDS.map((f) => (
                  <div key={f.key} className="flex justify-between">
                    <span className="text-gray-400">{f.label}</span>
                    <span className="font-semibold">
                      {f.suffix === '%' ? `%${bank.rates[f.key] ?? 0}` : `×${bank.rates[f.key] ?? 0}`}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Accounts */}
        <div className="glass rounded-xl overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-midnight-light">
            <h2 className="text-xl font-bold">👥 Hesaplar ({accounts.length})</h2>
          </div>
          {accounts.length === 0 ? (
            <p className="px-6 py-8 text-center text-gray-400">Henüz hesap yok</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-midnight-base">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Kullanıcı</th>
                    <th className="px-6 py-3 text-right text-sm font-semibold">Vadesiz</th>
                    <th className="px-6 py-3 text-right text-sm font-semibold">Vadeli</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Vadeli Detay</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-midnight-light">
                  {accounts.map((a) => (
                    <tr key={a.userId} className="hover:bg-midnight-base transition-colors">
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-3">
                          {a.avatar ? (
                            <img src={a.avatar} alt={a.displayName} className="w-9 h-9 rounded-full" />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-midnight-purple to-midnight-pink flex items-center justify-center text-sm font-bold">
                              {a.displayName?.charAt(0) || '?'}
                            </div>
                          )}
                          <div>
                            <div className="font-medium">{a.displayName}</div>
                            <div className="text-xs text-gray-500">{a.userId}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-right font-semibold text-green-400">{fmt(a.balance)}</td>
                      <td className="px-6 py-3 text-right font-semibold text-purple-400">{fmt(a.termTotal)}</td>
                      <td className="px-6 py-3 text-xs text-gray-400">
                        {a.deposits.length === 0
                          ? '—'
                          : a.deposits
                              .map((d) => `${fmt(d.amount)} · ${dayLabel(d.days)} · %${d.dailyRate}/gün → ${fmt(d.payout)} (${fmtDate(d.maturesAt)})`)
                              .join('\n')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Loans */}
        <div className="glass rounded-xl overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-midnight-light">
            <h2 className="text-xl font-bold">💳 Aktif Krediler ({loans.length})</h2>
          </div>
          {loans.length === 0 ? (
            <p className="px-6 py-8 text-center text-gray-400">Aktif kredi yok</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-midnight-base">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Kullanıcı</th>
                    <th className="px-6 py-3 text-right text-sm font-semibold">Anapara</th>
                    <th className="px-6 py-3 text-right text-sm font-semibold">Güncel Borç</th>
                    <th className="px-6 py-3 text-center text-sm font-semibold">Faiz</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Vade</th>
                    <th className="px-6 py-3 text-center text-sm font-semibold">Durum</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-midnight-light">
                  {loans.map((l) => (
                    <tr key={l.loanId} className="hover:bg-midnight-base transition-colors">
                      <td className="px-6 py-3 font-medium">{l.displayName}</td>
                      <td className="px-6 py-3 text-right">{fmt(l.principal)}</td>
                      <td className="px-6 py-3 text-right font-semibold text-red-400">{fmt(l.owed)}</td>
                      <td className="px-6 py-3 text-center">%{l.dailyRate}/gün</td>
                      <td className="px-6 py-3 text-gray-400">{fmtDate(l.dueDate)}</td>
                      <td className="px-6 py-3 text-center">
                        {l.overdue ? (
                          <span className="text-red-400 font-semibold">⚠️ Gecikmiş</span>
                        ) : (
                          <span className="text-green-400">Aktif</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Transactions */}
        <div className="glass rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-midnight-light">
            <h2 className="text-xl font-bold">📜 İşlem Geçmişi ({transactions.length})</h2>
          </div>
          {transactions.length === 0 ? (
            <p className="px-6 py-8 text-center text-gray-400">Henüz işlem yok</p>
          ) : (
            <div className="divide-y divide-midnight-light max-h-[600px] overflow-y-auto custom-scrollbar">
              {transactions.map((t, i) => (
                <div key={i} className="px-6 py-3 flex items-center justify-between gap-4 hover:bg-midnight-base transition-colors">
                  <div className="min-w-0">
                    <div className="font-medium truncate">
                      {TYPE_LABELS[t.type] || t.type} · <span className="text-gray-400">{t.displayName}</span>
                    </div>
                    {t.note && <div className="text-xs text-gray-500 truncate">{t.note}</div>}
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-semibold text-yellow-400">{fmt(t.amount)}</div>
                    <div className="text-xs text-gray-500">{fmtDate(t.time)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  /* ------------------------- LIST VIEW ------------------------- */
  return (
    <div>
      <div className="mb-8 flex items-center gap-4 flex-wrap">
        <button
          onClick={() => navigate('/')}
          className="p-2 hover:bg-midnight-light rounded-lg transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="flex-1">
          <h1 className="text-4xl font-bold">🏦 Bankalar</h1>
          <p className="text-gray-400">Sunucudaki tüm bankalar, mevduatlar ve krediler</p>
        </div>

        <button
          onClick={fetchBanks}
          className="px-5 py-2.5 rounded-lg bg-midnight-light hover:bg-midnight-base transition-colors font-semibold"
        >
          🔄 Yenile
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon="🏦" label="Toplam Banka" value={banks.length} />
        <StatCard icon="💰" label="Toplam Rezerv" value={fmt(summary.reserve)} accent="text-yellow-400" />
        <StatCard icon="📥" label="Toplam Mevduat" value={fmt(summary.deposits)} accent="text-blue-400" />
        <StatCard icon="💳" label="Toplam Kredi" value={fmt(summary.loans)} accent="text-red-400" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-midnight-purple"></div>
        </div>
      ) : banks.length === 0 ? (
        <div className="glass rounded-xl p-12 text-center">
          <p className="text-gray-400 text-lg">Henüz banka bulunmuyor</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {banks.map((b) => (
            <div key={b.bankId} className="glass rounded-xl p-6 flex flex-col">
              <div className="flex items-start gap-3 mb-4">
                <span className="text-4xl">{b.emoji}</span>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl font-bold truncate">{b.name}</h3>
                  <p className="text-sm text-gray-400 truncate">
                    👑 {b.ownerName || 'Sahipsiz'}
                  </p>
                </div>
                {b.isCentral && (
                  <span className="px-2 py-1 rounded-full text-[10px] font-semibold bg-gradient-to-r from-midnight-purple to-midnight-pink whitespace-nowrap">
                    MERKEZ
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                <div className="bg-midnight-base rounded-lg p-3">
                  <div className="text-gray-500 text-xs">Rezerv</div>
                  <div className="font-bold text-yellow-400">{fmt(b.reserve)}</div>
                </div>
                <div className="bg-midnight-base rounded-lg p-3">
                  <div className="text-gray-500 text-xs">Değer</div>
                  <div className="font-bold text-green-400">{fmt(b.value)}</div>
                </div>
                <div className="bg-midnight-base rounded-lg p-3">
                  <div className="text-gray-500 text-xs">Mevduat</div>
                  <div className="font-bold text-blue-400">{fmt((b.depositTotal || 0) + (b.termTotal || 0))}</div>
                </div>
                <div className="bg-midnight-base rounded-lg p-3">
                  <div className="text-gray-500 text-xs">Kredi ({b.loanCount})</div>
                  <div className="font-bold text-red-400">{fmt(b.loanTotal)}</div>
                </div>
              </div>

              <div className="text-xs text-gray-400 mb-4">
                Vadeli: %{b.rates?.d7 ?? 0} / %{b.rates?.d14 ?? 0} / %{b.rates?.d21 ?? 0} / %{b.rates?.d30 ?? 0}
                {' · '}Kredi: %{b.rates?.loan ?? 0} · Gecikme ×{b.rates?.overdueMultiplier ?? 4}
              </div>

              <div className="mt-auto flex gap-3">
                <button
                  onClick={() => openBank(b.bankId)}
                  className="flex-1 px-4 py-2 rounded-lg bg-gradient-to-r from-midnight-purple to-midnight-pink font-semibold transition-opacity hover:opacity-90"
                >
                  İncele
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Banks
