import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import toast from 'react-hot-toast';
import { 
  PlusIcon, 
  TrashIcon, 
  PencilIcon, 
  RocketLaunchIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  SparklesIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

export default function Actions() {
  const { guildId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState([]);
  const [channels, setChannels] = useState([]);
  const [roles, setRoles] = useState([]);
  const [expandedGroup, setExpandedGroup] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddEntryModal, setShowAddEntryModal] = useState(false);
  const [showSetupModal, setShowSetupModal] = useState(false);

  // Form states
  const [newGroupName, setNewGroupName] = useState('');
  const [editFormData, setEditFormData] = useState({});
  const [entryFormData, setEntryFormData] = useState({
    roleId: '',
    emojiName: '',
    buttonStyle: 'secondary',
    buttonLabel: ''
  });
  const [setupFormData, setSetupFormData] = useState({
    channelId: '',
    setupText: '',
    roleMode: 'multi'
  });

  useEffect(() => {
    fetchData();
  }, [guildId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [groupsRes, channelsRes, rolesRes] = await Promise.all([
        api.getActionGroups(guildId),
        api.getGuildChannels(guildId),
        api.getGuildRoles(guildId)
      ]);
      setGroups(groupsRes.data);
      setChannels(channelsRes.data);
      setRoles(rolesRes.data);
    } catch (error) {
      toast.error('Veriler yüklenirken hata oluştu');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      toast.error('Grup adı boş olamaz');
      return;
    }

    try {
      await api.createActionGroup(guildId, newGroupName);
      toast.success('Grup oluşturuldu');
      setShowCreateModal(false);
      setNewGroupName('');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Grup oluşturulamadı');
    }
  };

  const handleUpdateGroup = async () => {
    try {
      await api.updateActionGroup(guildId, selectedGroup.groupId, editFormData);
      toast.success('Grup güncellendi');
      setShowEditModal(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Grup güncellenemedi');
    }
  };

  const handleDeleteGroup = async (groupId) => {
    if (!confirm('Bu grubu silmek istediğinize emin misiniz?')) return;

    try {
      await api.deleteActionGroup(guildId, groupId);
      toast.success('Grup silindi');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Grup silinemedi');
    }
  };

  const handleAddEntry = async () => {
    if (!entryFormData.roleId) {
      toast.error('Rol seçmelisiniz');
      return;
    }

    try {
      const data = { roleId: entryFormData.roleId };
      
      if (selectedGroup.type === 'emoji') {
        if (!entryFormData.emojiName) {
          toast.error('Emoji girmelisiniz');
          return;
        }
        data.emojiName = entryFormData.emojiName;
        data.emojiRaw = entryFormData.emojiName;
      } else if (selectedGroup.type === 'button') {
        data.buttonStyle = entryFormData.buttonStyle;
        data.buttonLabel = entryFormData.buttonLabel || roles.find(r => r.id === entryFormData.roleId)?.name || 'Rol';
      }

      await api.addActionEntry(guildId, selectedGroup.groupId, data);
      toast.success('Entry eklendi');
      setShowAddEntryModal(false);
      setEntryFormData({ roleId: '', emojiName: '', buttonStyle: 'secondary', buttonLabel: '' });
      fetchGroupDetail(selectedGroup.groupId);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Entry eklenemedi');
    }
  };

  const handleDeleteEntry = async (groupId, entryId) => {
    if (!confirm('Bu entry\'yi silmek istediğinize emin misiniz?')) return;

    try {
      await api.deleteActionEntry(guildId, groupId, entryId);
      toast.success('Entry silindi');
      fetchGroupDetail(groupId);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Entry silinemedi');
    }
  };

  const handleSetup = async () => {
    if (!setupFormData.channelId) {
      toast.error('Kanal seçmelisiniz');
      return;
    }

    try {
      const response = await api.setupActionGroup(guildId, selectedGroup.groupId, setupFormData);
      toast.success('Setup tamamlandı!');
      setShowSetupModal(false);
      setSetupFormData({ channelId: '', setupText: '', roleMode: 'multi' });
      fetchData();
      
      if (response.data.messageUrl) {
        window.open(response.data.messageUrl, '_blank');
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Setup başarısız');
    }
  };

  const fetchGroupDetail = async (groupId) => {
    try {
      const response = await api.getActionGroup(guildId, groupId);
      const updatedGroups = groups.map(g => 
        g.groupId === groupId ? { ...g, ...response.data.group, entries: response.data.entries } : g
      );
      setGroups(updatedGroups);
      setSelectedGroup(response.data.group);
    } catch (error) {
      console.error(error);
    }
  };

  const toggleExpand = async (groupId) => {
    if (expandedGroup === groupId) {
      setExpandedGroup(null);
    } else {
      setExpandedGroup(groupId);
      await fetchGroupDetail(groupId);
    }
  };

  const openEditModal = (group) => {
    setSelectedGroup(group);
    setEditFormData({
      groupName: group.groupName,
      type: group.type,
      roleMode: group.roleMode || 'multi',
      description: group.description || '',
      setupText: group.setupText || ''
    });
    setShowEditModal(true);
  };

  const openAddEntryModal = (group) => {
    setSelectedGroup(group);
    setShowAddEntryModal(true);
  };

  const openSetupModal = (group) => {
    setSelectedGroup(group);
    setSetupFormData({
      channelId: '',
      setupText: group.setupText || `Aşağıdaki ${group.type === 'emoji' ? 'emojilere' : 'butonlara'} tıklayarak rollerini alabilirsin!`,
      roleMode: group.roleMode || 'multi'
    });
    setShowSetupModal(true);
  };

  const getTypeIcon = (type) => {
    if (type === 'emoji') return '🎯';
    if (type === 'button') return '🔘';
    return '❓';
  };

  const getRoleModeLabel = (mode) => {
    if (mode === 'single') return '🎯 Tek Rol';
    return '✅ Çoklu Rol';
  };

  const getButtonStyleColor = (style) => {
    const colors = {
      primary: 'bg-blue-500',
      secondary: 'bg-gray-500',
      success: 'bg-green-500',
      danger: 'bg-red-500',
      warning: 'bg-yellow-500'
    };
    return colors[style] || 'bg-gray-500';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <SparklesIcon className="w-8 h-8" />
            Actions (Rol Menüleri)
          </h1>
          <p className="text-gray-400 mt-2">
            Emoji veya buton ile otomatik rol verme sistemlerini yönetin
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <PlusIcon className="w-5 h-5" />
          Yeni Grup Oluştur
        </button>
      </div>

      {/* Groups List */}
      <div className="grid gap-4">
        {groups.length === 0 ? (
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-8 text-center">
            <p className="text-gray-400">Henüz hiç action grubu yok. Yeni bir grup oluşturarak başlayın!</p>
          </div>
        ) : (
          groups.map((group) => (
            <div
              key={group.groupId}
              className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden"
            >
              {/* Group Header */}
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  <button
                    onClick={() => toggleExpand(group.groupId)}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    {expandedGroup === group.groupId ? (
                      <ChevronUpIcon className="w-5 h-5" />
                    ) : (
                      <ChevronDownIcon className="w-5 h-5" />
                    )}
                  </button>

                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{getTypeIcon(group.type)}</span>
                      <div>
                        <h3 className="text-lg font-semibold text-white">{group.groupName}</h3>
                        <div className="flex items-center gap-4 text-sm text-gray-400 mt-1">
                          <span>ID: <code className="text-indigo-400">{group.groupId}</code></span>
                          <span>•</span>
                          <span>{getRoleModeLabel(group.roleMode)}</span>
                          <span>•</span>
                          <span>{group.entryCount || 0} kayıt</span>
                          {group.setupMessageId && (
                            <>
                              <span>•</span>
                              <span className="text-green-400">✅ Kurulmuş</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {group.type && (
                    <button
                      onClick={() => openSetupModal(group)}
                      className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      title="Setup / Yayınla"
                    >
                      <RocketLaunchIcon className="w-5 h-5" />
                    </button>
                  )}
                  <button
                    onClick={() => openEditModal(group)}
                    className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    title="Düzenle"
                  >
                    <PencilIcon className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDeleteGroup(group.groupId)}
                    className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    title="Sil"
                  >
                    <TrashIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Expanded Content */}
              {expandedGroup === group.groupId && (
                <div className="border-t border-white/10 p-4 bg-black/20">
                  {!group.type ? (
                    <div className="text-center py-8">
                      <p className="text-gray-400 mb-4">Önce grubun tipini seçin</p>
                      <div className="flex items-center justify-center gap-4">
                        <button
                          onClick={async () => {
                            await api.updateActionGroup(guildId, group.groupId, { type: 'emoji' });
                            toast.success('Grup tipi: Emoji olarak ayarlandı');
                            fetchData();
                          }}
                          className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                        >
                          🎯 Emoji Grubu
                        </button>
                        <button
                          onClick={async () => {
                            await api.updateActionGroup(guildId, group.groupId, { type: 'button' });
                            toast.success('Grup tipi: Button olarak ayarlandı');
                            fetchData();
                          }}
                          className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                          🔘 Buton Grubu
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-white font-semibold">
                          {group.type === 'emoji' ? '🎯 Emojiler' : '🔘 Butonlar'}
                        </h4>
                        <button
                          onClick={() => openAddEntryModal(group)}
                          className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                        >
                          <PlusIcon className="w-4 h-4" />
                          {group.type === 'emoji' ? 'Emoji Ekle' : 'Buton Ekle'}
                        </button>
                      </div>

                      {group.entries && group.entries.length > 0 ? (
                        <div className="grid gap-2">
                          {group.entries.map((entry) => (
                            <div
                              key={entry.entryId}
                              className="flex items-center justify-between p-3 bg-white/5 rounded-lg"
                            >
                              <div className="flex items-center gap-3">
                                <span className="text-gray-400 text-sm font-mono">#{entry.entryId}</span>
                                {entry.type === 'emoji' ? (
                                  <span className="text-2xl">{entry.emojiName}</span>
                                ) : (
                                  <span className={`px-3 py-1 rounded text-white text-sm ${getButtonStyleColor(entry.buttonStyle)}`}>
                                    {entry.buttonLabel}
                                  </span>
                                )}
                                <span className="text-gray-400">→</span>
                                <span 
                                  className="px-2 py-1 rounded text-sm"
                                  style={{ backgroundColor: entry.roleColor + '20', color: entry.roleColor }}
                                >
                                  {entry.roleName}
                                </span>
                              </div>
                              <button
                                onClick={() => handleDeleteEntry(group.groupId, entry.entryId)}
                                className="p-1.5 text-red-400 hover:text-red-300 transition-colors"
                              >
                                <TrashIcon className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-400 text-center py-4">
                          Henüz hiç {group.type === 'emoji' ? 'emoji' : 'buton'} eklenmemiş
                        </p>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Create Group Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-xl border border-white/10 p-6 max-w-md w-full">
            <h2 className="text-xl font-bold text-white mb-4">Yeni Action Grubu</h2>
            <input
              type="text"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="Grup adı girin..."
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 mb-4"
              onKeyPress={(e) => e.key === 'Enter' && handleCreateGroup()}
            />
            <div className="flex gap-2">
              <button
                onClick={handleCreateGroup}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Oluştur
              </button>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewGroupName('');
                }}
                className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                İptal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Group Modal */}
      {showEditModal && selectedGroup && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-xl border border-white/10 p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-white mb-4">Grup Düzenle</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Grup Adı</label>
                <input
                  type="text"
                  value={editFormData.groupName || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, groupName: e.target.value })}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Rol Modu</label>
                <select
                  value={editFormData.roleMode || 'multi'}
                  onChange={(e) => setEditFormData({ ...editFormData, roleMode: e.target.value })}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                >
                  <option value="multi">✅ Çoklu Rol (Checkbox)</option>
                  <option value="single">🎯 Tek Rol (Radio)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Açıklama (Opsiyonel)</label>
                <textarea
                  value={editFormData.description || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white resize-none"
                  placeholder="Grup hakkında açıklama..."
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Setup Metni (Opsiyonel)</label>
                <textarea
                  value={editFormData.setupText || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, setupText: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white resize-none"
                  placeholder="Setup sırasında gösterilecek metin..."
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={handleUpdateGroup}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Kaydet
              </button>
              <button
                onClick={() => setShowEditModal(false)}
                className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                İptal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Entry Modal */}
      {showAddEntryModal && selectedGroup && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-xl border border-white/10 p-6 max-w-md w-full">
            <h2 className="text-xl font-bold text-white mb-4">
              {selectedGroup.type === 'emoji' ? '🎯 Emoji Ekle' : '🔘 Buton Ekle'}
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Rol Seç *</label>
                <select
                  value={entryFormData.roleId}
                  onChange={(e) => setEntryFormData({ ...entryFormData, roleId: e.target.value })}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                >
                  <option value="">Rol seçin...</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </div>

              {selectedGroup.type === 'emoji' ? (
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Emoji *</label>
                  <input
                    type="text"
                    value={entryFormData.emojiName}
                    onChange={(e) => setEntryFormData({ ...entryFormData, emojiName: e.target.value })}
                    placeholder="😀 veya :emoji: veya <:name:id>"
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                  />
                  <p className="text-xs text-gray-500 mt-1">Unicode emoji veya custom emoji girebilirsiniz</p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Buton Stili</label>
                    <select
                      value={entryFormData.buttonStyle}
                      onChange={(e) => setEntryFormData({ ...entryFormData, buttonStyle: e.target.value })}
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                    >
                      <option value="primary">Mavi (Primary)</option>
                      <option value="secondary">Gri (Secondary)</option>
                      <option value="success">Yeşil (Success)</option>
                      <option value="danger">Kırmızı (Danger)</option>
                      <option value="warning">Sarı (Warning)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Buton Yazısı (Opsiyonel)</label>
                    <input
                      type="text"
                      value={entryFormData.buttonLabel}
                      onChange={(e) => setEntryFormData({ ...entryFormData, buttonLabel: e.target.value })}
                      placeholder="Boş bırakılırsa rol adı kullanılır"
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={handleAddEntry}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Ekle
              </button>
              <button
                onClick={() => {
                  setShowAddEntryModal(false);
                  setEntryFormData({ roleId: '', emojiName: '', buttonStyle: 'secondary', buttonLabel: '' });
                }}
                className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                İptal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Setup Modal */}
      {showSetupModal && selectedGroup && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-xl border border-white/10 p-6 max-w-md w-full">
            <h2 className="text-xl font-bold text-white mb-4">🚀 Setup / Yayınla</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Kanal Seç *</label>
                <select
                  value={setupFormData.channelId}
                  onChange={(e) => setSetupFormData({ ...setupFormData, channelId: e.target.value })}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                >
                  <option value="">Kanal seçin...</option>
                  {channels.filter(c => c.type === 0).map((channel) => (
                    <option key={channel.id} value={channel.id}>
                      # {channel.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Mesaj Metni *</label>
                <textarea
                  value={setupFormData.setupText}
                  onChange={(e) => setSetupFormData({ ...setupFormData, setupText: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white resize-none"
                  placeholder="Kullanıcılara gösterilecek açıklama metni..."
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Rol Alma Modu</label>
                <select
                  value={setupFormData.roleMode}
                  onChange={(e) => setSetupFormData({ ...setupFormData, roleMode: e.target.value })}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                >
                  <option value="multi">✅ Çoklu Rol - Tüm rolleri alabilir</option>
                  <option value="single">🎯 Tek Rol - Sadece 1 rol alabilir</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {setupFormData.roleMode === 'single' 
                    ? 'Kullanıcı sadece 1 rol alabilir, yeni rol aldığında eskisi silinir' 
                    : 'Kullanıcı istediği kadar rol alabilir'}
                </p>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={handleSetup}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
              >
                <RocketLaunchIcon className="w-5 h-5" />
                Yayınla
              </button>
              <button
                onClick={() => setShowSetupModal(false)}
                className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                İptal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
