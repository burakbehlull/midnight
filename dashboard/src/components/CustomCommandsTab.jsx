import { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import Modal from './Modal';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function CustomCommandsTab({ guildId }) {
  const [commands, setCommands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState([]);

  // Dialog states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedCommand, setSelectedCommand] = useState(null);

  // Feature selection
  const [enabledFeatures, setEnabledFeatures] = useState({
    text: false,
    embed: false,
    roles: false
  });

  // Form states
  const [formData, setFormData] = useState({
    commandName: '',
    description: '',
    responseText: '',
    embedTitle: '',
    embedDescription: '',
    embedColor: '#5865F2',
    roleActions: []
  });

  const [roleFormData, setRoleFormData] = useState({
    roleId: '',
    action: 'add'
  });

  useEffect(() => {
    loadCommands();
    loadRoles();
  }, [guildId]);

  const loadCommands = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/custom-commands/list/${guildId}`);
      setCommands(response.data.commands || []);
    } catch (err) {
      console.error('Failed to load commands:', err);
      toast.error('Komutlar yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const loadRoles = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/guilds/${guildId}/roles`);
      setRoles(response.data || []);
    } catch (err) {
      console.error('Failed to load roles:', err);
    }
  };

  const handleCreateCommand = async () => {
    try {
      const createData = {
        guildId,
        commandName: formData.commandName,
        description: formData.description
      };

      // Add enabled features
      if (enabledFeatures.text && formData.responseText) {
        createData.responseText = formData.responseText;
      }

      if (enabledFeatures.embed && formData.embedDescription) {
        createData.embedData = {
          title: formData.embedTitle || undefined,
          description: formData.embedDescription,
          color: formData.embedColor
        };
      }

      if (enabledFeatures.roles && formData.roleActions.length > 0) {
        createData.roleActions = formData.roleActions;
      }

      await axios.post(`${API_URL}/api/custom-commands/create`, createData);

      toast.success('Komut oluşturuldu!');
      setShowCreateModal(false);
      resetForm();
      loadCommands();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Komut oluşturulurken hata oluştu');
    }
  };

  const resetForm = () => {
    setFormData({ 
      commandName: '', 
      description: '', 
      responseText: '', 
      embedTitle: '', 
      embedDescription: '', 
      embedColor: '#5865F2',
      roleActions: []
    });
    setEnabledFeatures({ text: false, embed: false, roles: false });
    setRoleFormData({ roleId: '', action: 'add' });
  };

  const handleAddRoleAction = () => {
    if (!roleFormData.roleId) {
      toast.error('Lütfen bir rol seçin');
      return;
    }

    const role = roles.find(r => r.id === roleFormData.roleId);
    if (!role) return;

    // Check if role already exists
    if (formData.roleActions.some(r => r.roleId === roleFormData.roleId)) {
      toast.error('Bu rol zaten eklenmiş');
      return;
    }

    setFormData({
      ...formData,
      roleActions: [...formData.roleActions, {
        roleId: roleFormData.roleId,
        roleName: role.name,
        action: roleFormData.action
      }]
    });

    setRoleFormData({ roleId: '', action: 'add' });
  };

  const handleRemoveRoleAction = (roleId) => {
    setFormData({
      ...formData,
      roleActions: formData.roleActions.filter(r => r.roleId !== roleId)
    });
  };

  const handleUpdateCommand = async () => {
    try {
      const updateData = { description: formData.description };

      if (formData.responseText) {
        updateData.responseText = formData.responseText;
      }

      if (formData.embedDescription) {
        updateData.embedData = {
          title: formData.embedTitle || undefined,
          description: formData.embedDescription,
          color: formData.embedColor
        };
      }

      if (formData.roleActions && formData.roleActions.length > 0) {
        updateData.roleActions = formData.roleActions;
      }

      await axios.put(`${API_URL}/api/custom-commands/update/${selectedCommand.id}`, updateData);

      toast.success('Komut güncellendi!');
      setShowEditModal(false);
      setSelectedCommand(null);
      loadCommands();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Komut güncellenirken hata oluştu');
    }
  };

  const handleDeleteCommand = async () => {
    try {
      await axios.delete(`${API_URL}/api/custom-commands/${selectedCommand.id}`);
      toast.success('Komut silindi!');
      setShowDeleteModal(false);
      setSelectedCommand(null);
      loadCommands();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Komut silinirken hata oluştu');
    }
  };

  const handleToggleCommand = async (command) => {
    try {
      await axios.put(`${API_URL}/api/custom-commands/toggle/${command.id}`);
      toast.success(`Komut ${!command.enabled ? 'aktif' : 'pasif'} edildi!`);
      loadCommands();
    } catch (err) {
      toast.error('Komut durumu değiştirilirken hata oluştu');
    }
  };

  const openEditDialog = async (command) => {
    try {
      const response = await axios.get(`${API_URL}/api/custom-commands/${guildId}/${command.commandName}`);
      const cmd = response.data.command;

      setSelectedCommand(cmd);
      setFormData({
        commandName: cmd.commandName,
        description: cmd.description || '',
        responseText: cmd.responseText || '',
        embedTitle: cmd.embedData?.title || '',
        embedDescription: cmd.embedData?.description || '',
        embedColor: cmd.embedData?.color || '#5865F2',
        roleActions: cmd.roleActions || []
      });
      setShowEditModal(true);
    } catch (err) {
      toast.error('Komut detayları yüklenirken hata oluştu');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-midnight-purple mb-4"></div>
          <p className="text-gray-400">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold mb-1">Özel Komutlar</h2>
          <p className="text-gray-400 text-sm">Sunucunuz için özel komutlar oluşturun ve yönetin</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-gradient-to-r from-midnight-purple to-midnight-pink rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2"
        >
          <span>+</span> Yeni Komut
        </button>
      </div>

      {/* Commands List */}
      {commands.length === 0 ? (
        <div className="text-center py-12 bg-midnight-base rounded-xl">
          <div className="text-6xl mb-4">📝</div>
          <h3 className="text-xl font-semibold mb-2">Henüz özel komut oluşturulmamış</h3>
          <p className="text-gray-400 mb-4">Yeni bir özel komut ekleyerek başlayın</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 bg-gradient-to-r from-midnight-purple to-midnight-pink rounded-lg hover:opacity-90 transition-opacity"
          >
            İlk Komutunu Oluştur
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {commands.map((command) => (
            <div key={command.id} className="bg-midnight-base rounded-xl p-5 hover:bg-midnight-light transition-colors">
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <h3 className="text-lg font-bold mb-1">.{command.commandName}</h3>
                  <p className="text-gray-400 text-sm">{command.description}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={command.enabled}
                    onChange={() => handleToggleCommand(command)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-midnight-purple"></div>
                </label>
              </div>

              <div className="flex gap-2 mb-3 flex-wrap">
                {command.hasText && (
                  <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs flex items-center gap-1">
                    📝 Metin
                  </span>
                )}
                {command.hasEmbed && (
                  <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-xs flex items-center gap-1">
                    📋 Embed
                  </span>
                )}
                {command.hasRoles && (
                  <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs flex items-center gap-1">
                    👤 {command.roleCount} Rol
                  </span>
                )}
              </div>

              <p className="text-gray-500 text-xs mb-3">Kullanım: {command.usageCount || 0} kez</p>

              <div className="flex gap-2">
                <button
                  onClick={() => openEditDialog(command)}
                  className="flex-1 px-3 py-2 bg-midnight-light hover:bg-midnight-base rounded-lg transition-colors text-sm"
                >
                  ✏️ Düzenle
                </button>
                <button
                  onClick={() => { setSelectedCommand(command); setShowDeleteModal(true); }}
                  className="px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors text-sm"
                >
                  🗑️ Sil
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal isOpen={showCreateModal} onClose={() => { setShowCreateModal(false); resetForm(); }} className="p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <h3 className="text-2xl font-bold mb-6">🆕 Yeni Özel Komut</h3>
            
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Komut Adı *</label>
                  <input
                    type="text"
                    placeholder="örn: burak"
                    value={formData.commandName}
                    onChange={(e) => setFormData({ ...formData, commandName: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '') })}
                    className="w-full px-4 py-2 bg-midnight-base rounded-lg focus:ring-2 focus:ring-midnight-purple outline-none"
                  />
                  <p className="text-xs text-gray-500 mt-1">Kullanım: .{formData.commandName || 'komutadı'}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Açıklama *</label>
                  <input
                    type="text"
                    placeholder="Bu komutun açıklaması"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2 bg-midnight-base rounded-lg focus:ring-2 focus:ring-midnight-purple outline-none"
                  />
                </div>
              </div>

              {/* Feature Selection */}
              <div className="border-t border-midnight-light pt-4">
                <h4 className="font-semibold mb-3">Bu komut ne yapacak?</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setEnabledFeatures({ ...enabledFeatures, text: !enabledFeatures.text })}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      enabledFeatures.text 
                        ? 'border-blue-500 bg-blue-500/20' 
                        : 'border-midnight-light hover:border-blue-500/50'
                    }`}
                  >
                    <div className="text-3xl mb-2">📝</div>
                    <div className="font-semibold">Metin Mesajı</div>
                    <div className="text-xs text-gray-400 mt-1">Normal mesaj gönder</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEnabledFeatures({ ...enabledFeatures, embed: !enabledFeatures.embed })}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      enabledFeatures.embed 
                        ? 'border-purple-500 bg-purple-500/20' 
                        : 'border-midnight-light hover:border-purple-500/50'
                    }`}
                  >
                    <div className="text-3xl mb-2">📋</div>
                    <div className="font-semibold">Embed Mesajı</div>
                    <div className="text-xs text-gray-400 mt-1">Özel tasarım mesaj</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEnabledFeatures({ ...enabledFeatures, roles: !enabledFeatures.roles })}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      enabledFeatures.roles 
                        ? 'border-green-500 bg-green-500/20' 
                        : 'border-midnight-light hover:border-green-500/50'
                    }`}
                  >
                    <div className="text-3xl mb-2">👤</div>
                    <div className="font-semibold">Rol İşlemi</div>
                    <div className="text-xs text-gray-400 mt-1">Rol ekle/çıkar/değiştir</div>
                  </button>
                </div>
              </div>

              {/* Text Message */}
              {enabledFeatures.text && (
                <div className="border-t border-midnight-light pt-4">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <span>📝</span> Metin Mesajı
                  </h4>
                  <textarea
                    placeholder="Komut çalıştığında gönderilecek mesaj..."
                    value={formData.responseText}
                    onChange={(e) => setFormData({ ...formData, responseText: e.target.value })}
                    rows="3"
                    className="w-full px-4 py-2 bg-midnight-base rounded-lg focus:ring-2 focus:ring-midnight-purple outline-none resize-none"
                  />
                </div>
              )}

              {/* Embed Message */}
              {enabledFeatures.embed && (
                <div className="border-t border-midnight-light pt-4">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <span>📋</span> Embed Mesajı
                  </h4>
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Embed Başlığı (Opsiyonel)"
                      value={formData.embedTitle}
                      onChange={(e) => setFormData({ ...formData, embedTitle: e.target.value })}
                      className="w-full px-4 py-2 bg-midnight-base rounded-lg focus:ring-2 focus:ring-midnight-purple outline-none"
                    />
                    <textarea
                      placeholder="Embed Açıklaması *"
                      value={formData.embedDescription}
                      onChange={(e) => setFormData({ ...formData, embedDescription: e.target.value })}
                      rows="4"
                      className="w-full px-4 py-2 bg-midnight-base rounded-lg focus:ring-2 focus:ring-midnight-purple outline-none resize-none"
                    />
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium">Renk:</label>
                      <input
                        type="color"
                        value={formData.embedColor}
                        onChange={(e) => setFormData({ ...formData, embedColor: e.target.value })}
                        className="w-20 h-10 bg-midnight-base rounded cursor-pointer"
                      />
                      <span className="text-sm text-gray-400">{formData.embedColor}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Role Actions */}
              {enabledFeatures.roles && (
                <div className="border-t border-midnight-light pt-4">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <span>👤</span> Rol İşlemleri
                  </h4>
                  
                  <div className="space-y-3">
                    {/* Add Role Action */}
                    <div className="flex gap-2">
                      <select
                        value={roleFormData.roleId}
                        onChange={(e) => setRoleFormData({ ...roleFormData, roleId: e.target.value })}
                        className="flex-1 px-4 py-2 bg-midnight-base rounded-lg focus:ring-2 focus:ring-midnight-purple outline-none"
                      >
                        <option value="">Rol seçin...</option>
                        {roles.map(role => (
                          <option key={role.id} value={role.id}>{role.name}</option>
                        ))}
                      </select>

                      <select
                        value={roleFormData.action}
                        onChange={(e) => setRoleFormData({ ...roleFormData, action: e.target.value })}
                        className="w-32 px-4 py-2 bg-midnight-base rounded-lg focus:ring-2 focus:ring-midnight-purple outline-none"
                      >
                        <option value="add">➕ Ekle</option>
                        <option value="remove">➖ Çıkar</option>
                        <option value="toggle">🔄 Değiştir</option>
                      </select>

                      <button
                        type="button"
                        onClick={handleAddRoleAction}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
                      >
                        Ekle
                      </button>
                    </div>

                    {/* Role Actions List */}
                    {formData.roleActions.length > 0 && (
                      <div className="space-y-2">
                        {formData.roleActions.map((roleAction, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-midnight-base rounded-lg">
                            <div className="flex items-center gap-3">
                              <span className="text-2xl">
                                {roleAction.action === 'add' ? '➕' : roleAction.action === 'remove' ? '➖' : '🔄'}
                              </span>
                              <div>
                                <div className="font-medium">{roleAction.roleName}</div>
                                <div className="text-xs text-gray-400">
                                  {roleAction.action === 'add' ? 'Rol eklenecek' : 
                                   roleAction.action === 'remove' ? 'Rol çıkarılacak' : 
                                   'Rol varsa çıkar, yoksa ekle'}
                                </div>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveRoleAction(roleAction.roleId)}
                              className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded transition-colors text-sm"
                            >
                              Kaldır
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-6">
              <button
                type="button"
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
                className="flex-1 px-4 py-2 bg-midnight-base hover:bg-midnight-light rounded-lg transition-colors"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={handleCreateCommand}
                disabled={!formData.commandName || formData.commandName.length < 2 || !formData.description}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-midnight-purple to-midnight-pink rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Oluştur
              </button>
            </div>
        </Modal>

      {/* Edit Modal */}
      <Modal isOpen={showEditModal} onClose={() => { setShowEditModal(false); setSelectedCommand(null); }} className="p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <h3 className="text-2xl font-bold mb-6">✏️ Komutu Düzenle: .{formData.commandName}</h3>
        
        <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">Açıklama</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 bg-midnight-base rounded-lg focus:ring-2 focus:ring-midnight-purple outline-none"
                />
              </div>

              <div className="border-t border-midnight-light pt-4">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <span>📝</span> Metin Mesajı
                </h4>
                <textarea
                  placeholder="Komut çalıştığında gönderilecek mesaj... (Boş bırakılırsa gönderilmez)"
                  value={formData.responseText}
                  onChange={(e) => setFormData({ ...formData, responseText: e.target.value })}
                  rows="3"
                  className="w-full px-4 py-2 bg-midnight-base rounded-lg focus:ring-2 focus:ring-midnight-purple outline-none resize-none"
                />
              </div>

              <div className="border-t border-midnight-light pt-4">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <span>📋</span> Embed Mesajı
                </h4>
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Embed Başlığı (Opsiyonel)"
                    value={formData.embedTitle}
                    onChange={(e) => setFormData({ ...formData, embedTitle: e.target.value })}
                    className="w-full px-4 py-2 bg-midnight-base rounded-lg focus:ring-2 focus:ring-midnight-purple outline-none"
                  />
                  <textarea
                    placeholder="Embed Açıklaması (Boş bırakılırsa embed gönderilmez)"
                    value={formData.embedDescription}
                    onChange={(e) => setFormData({ ...formData, embedDescription: e.target.value })}
                    rows="4"
                    className="w-full px-4 py-2 bg-midnight-base rounded-lg focus:ring-2 focus:ring-midnight-purple outline-none resize-none"
                  />
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium">Renk:</label>
                    <input
                      type="color"
                      value={formData.embedColor}
                      onChange={(e) => setFormData({ ...formData, embedColor: e.target.value })}
                      className="w-20 h-10 bg-midnight-base rounded cursor-pointer"
                    />
                    <span className="text-sm text-gray-400">{formData.embedColor}</span>
                  </div>
                </div>
              </div>

              <div className="border-t border-midnight-light pt-4">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <span>👤</span> Rol İşlemleri
                </h4>
                
                <div className="space-y-3">
                  {/* Add Role Action */}
                  <div className="flex gap-2">
                    <select
                      value={roleFormData.roleId}
                      onChange={(e) => setRoleFormData({ ...roleFormData, roleId: e.target.value })}
                      className="flex-1 px-4 py-2 bg-midnight-base rounded-lg focus:ring-2 focus:ring-midnight-purple outline-none"
                    >
                      <option value="">Rol seçin...</option>
                      {roles.map(role => (
                        <option key={role.id} value={role.id}>{role.name}</option>
                      ))}
                    </select>

                    <select
                      value={roleFormData.action}
                      onChange={(e) => setRoleFormData({ ...roleFormData, action: e.target.value })}
                      className="w-32 px-4 py-2 bg-midnight-base rounded-lg focus:ring-2 focus:ring-midnight-purple outline-none"
                    >
                      <option value="add">➕ Ekle</option>
                      <option value="remove">➖ Çıkar</option>
                      <option value="toggle">🔄 Değiştir</option>
                    </select>

                    <button
                      type="button"
                      onClick={handleAddRoleAction}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
                    >
                      Ekle
                    </button>
                  </div>

                  {/* Role Actions List */}
                  {formData.roleActions && formData.roleActions.length > 0 ? (
                    <div className="space-y-2">
                      {formData.roleActions.map((roleAction, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-midnight-base rounded-lg">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">
                              {roleAction.action === 'add' ? '➕' : roleAction.action === 'remove' ? '➖' : '🔄'}
                            </span>
                            <div>
                              <div className="font-medium">{roleAction.roleName}</div>
                              <div className="text-xs text-gray-400">
                                {roleAction.action === 'add' ? 'Rol eklenecek' : 
                                 roleAction.action === 'remove' ? 'Rol çıkarılacak' : 
                                 'Rol varsa çıkar, yoksa ekle'}
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveRoleAction(roleAction.roleId)}
                            className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded transition-colors text-sm"
                          >
                            Kaldır
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-gray-500 text-sm">
                      Henüz rol işlemi eklenmemiş
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                type="button"
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedCommand(null);
                }}
                className="flex-1 px-4 py-2 bg-midnight-base hover:bg-midnight-light rounded-lg transition-colors"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={handleUpdateCommand}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-midnight-purple to-midnight-pink rounded-lg hover:opacity-90 transition-opacity"
              >
                Kaydet
              </button>
            </div>
        </Modal>

      {/* Delete Modal */}
      <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} className="p-6 max-w-md w-full">
        <h3 className="text-2xl font-bold mb-4">🗑️ Komutu Sil</h3>
        <p className="text-gray-300 mb-2">
          <strong>.{selectedCommand?.commandName}</strong> komutunu silmek istediğinizden emin misiniz?
        </p>
        <p className="text-gray-500 text-sm mb-6">Bu işlem geri alınamaz.</p>

        <div className="flex gap-2">
          <button
            onClick={() => setShowDeleteModal(false)}
            className="flex-1 px-4 py-2 bg-midnight-base hover:bg-midnight-light rounded-lg transition-colors"
          >
            İptal
          </button>
          <button
            onClick={handleDeleteCommand}
            className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
          >
            Sil
          </button>
        </div>
      </Modal>
    </div>
  );
}
