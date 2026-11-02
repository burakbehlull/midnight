import express from 'express';
import { CommandSettings } from '../../models/index.js';

const router = express.Router();


router.get('/:guildId', async (req, res) => {
  try {
    const { guildId } = req.params;

    const settings = await CommandSettings.find({ guildId }).sort({ commandName: 1 });

    res.json({
      success: true,
      count: settings.length,
      settings
    });
  } catch (error) {
    console.error('Error fetching command settings:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});


router.get('/:guildId/disabled', async (req, res) => {
  try {
    const { guildId } = req.params;

    const disabledCommands = await CommandSettings.find({ 
      guildId, 
      enabled: false 
    }).sort({ commandName: 1 });

    res.json({
      success: true,
      count: disabledCommands.length,
      commands: disabledCommands.map(cmd => cmd.commandName)
    });
  } catch (error) {
    console.error('Error fetching disabled commands:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});


router.get('/:guildId/commands/:commandName', async (req, res) => {
  try {
    const { guildId, commandName } = req.params;

    const setting = await CommandSettings.findOne({ guildId, commandName });

    if (!setting) {
      
      return res.json({
        success: true,
        setting: {
          guildId,
          commandName,
          enabled: true,
          channelMode: 'off',
          allowedChannels: [],
          blockedChannels: [],
          roleMode: 'off',
          allowedRoles: [],
          blockedRoles: [],
          userMode: 'off',
          allowedUsers: [],
          blockedUsers: [],
          autoDelete: false,
          deleteAfter: 0,
          customCooldown: null,
          exemptUsers: [],
          exemptRoles: []
        },
        isDefault: true
      });
    }

    res.json({
      success: true,
      setting,
      isDefault: false
    });
  } catch (error) {
    console.error('Error fetching command setting:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/:guildId/commands/:commandName/enable', async (req, res) => {
  try {
    const { guildId, commandName } = req.params;

    const setting = await CommandSettings.findOneAndUpdate(
      { guildId, commandName },
      { enabled: true, updatedAt: new Date() },
      { upsert: true, new: true }
    );

    res.json({
      success: true,
      message: `${commandName} komutu açıldı`,
      setting
    });
  } catch (error) {
    console.error('Error enabling command:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/command-settings/:guildId/commands/:commandName/disable
 * Komutu kapat
 */
router.post('/:guildId/commands/:commandName/disable', async (req, res) => {
  try {
    const { guildId, commandName } = req.params;

    // Kritik komutları koruma
    const protectedCommands = ['command', 'cmd', 'komut', 'help', 'yardım'];
    if (protectedCommands.includes(commandName.toLowerCase())) {
      return res.status(400).json({
        success: false,
        error: 'Bu komut güvenlik nedeniyle kapatılamaz'
      });
    }

    const setting = await CommandSettings.findOneAndUpdate(
      { guildId, commandName },
      { enabled: false, updatedAt: new Date() },
      { upsert: true, new: true }
    );

    res.json({
      success: true,
      message: `${commandName} komutu kapatıldı`,
      setting
    });
  } catch (error) {
    console.error('Error disabling command:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/command-settings/:guildId/commands/:commandName
 * Komut ayarlarını güncelle (tüm ayarlar)
 */
router.put('/:guildId/commands/:commandName', async (req, res) => {
  try {
    const { guildId, commandName } = req.params;
    const {
      enabled,
      channelMode,
      allowedChannels,
      blockedChannels,
      roleMode,
      allowedRoles,
      blockedRoles,
      userMode,
      allowedUsers,
      blockedUsers,
      autoDelete,
      deleteAfter,
      customCooldown,
      exemptUsers,
      exemptRoles
    } = req.body;

    const updateData = { updatedAt: new Date() };

    if (typeof enabled === 'boolean') updateData.enabled = enabled;
    if (channelMode) updateData.channelMode = channelMode;
    if (Array.isArray(allowedChannels)) updateData.allowedChannels = allowedChannels;
    if (Array.isArray(blockedChannels)) updateData.blockedChannels = blockedChannels;
    if (roleMode) updateData.roleMode = roleMode;
    if (Array.isArray(allowedRoles)) updateData.allowedRoles = allowedRoles;
    if (Array.isArray(blockedRoles)) updateData.blockedRoles = blockedRoles;
    if (userMode) updateData.userMode = userMode;
    if (Array.isArray(allowedUsers)) updateData.allowedUsers = allowedUsers;
    if (Array.isArray(blockedUsers)) updateData.blockedUsers = blockedUsers;
    if (typeof autoDelete === 'boolean') updateData.autoDelete = autoDelete;
    if (typeof deleteAfter === 'number') updateData.deleteAfter = deleteAfter;
    if (customCooldown !== undefined) updateData.customCooldown = customCooldown;
    if (Array.isArray(exemptUsers)) updateData.exemptUsers = exemptUsers;
    if (Array.isArray(exemptRoles)) updateData.exemptRoles = exemptRoles;

    const setting = await CommandSettings.findOneAndUpdate(
      { guildId, commandName },
      updateData,
      { upsert: true, new: true }
    );

    res.json({
      success: true,
      message: 'Komut ayarları güncellendi',
      setting
    });
  } catch (error) {
    console.error('Error updating command settings:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/command-settings/:guildId/commands/:commandName
 * Komut ayarlarını sıfırla (veritabanından sil)
 */
router.delete('/:guildId/commands/:commandName', async (req, res) => {
  try {
    const { guildId, commandName } = req.params;

    const result = await CommandSettings.findOneAndDelete({ guildId, commandName });

    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'Komut ayarı bulunamadı'
      });
    }

    res.json({
      success: true,
      message: `${commandName} komutu ayarları sıfırlandı`
    });
  } catch (error) {
    console.error('Error resetting command settings:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/command-settings/:guildId/commands/:commandName/channels
 * Kanal kısıtlaması ekle/güncelle
 */
router.post('/:guildId/commands/:commandName/channels', async (req, res) => {
  try {
    const { guildId, commandName } = req.params;
    const { mode, channels } = req.body;

    if (!['off', 'whitelist', 'blacklist'].includes(mode)) {
      return res.status(400).json({
        success: false,
        error: 'Geçersiz mod. off, whitelist veya blacklist olmalı'
      });
    }

    const updateData = { channelMode: mode, updatedAt: new Date() };

    if (mode === 'whitelist') {
      updateData.allowedChannels = channels || [];
      updateData.blockedChannels = [];
    } else if (mode === 'blacklist') {
      updateData.blockedChannels = channels || [];
      updateData.allowedChannels = [];
    } else {
      updateData.allowedChannels = [];
      updateData.blockedChannels = [];
    }

    const setting = await CommandSettings.findOneAndUpdate(
      { guildId, commandName },
      updateData,
      { upsert: true, new: true }
    );

    res.json({
      success: true,
      message: 'Kanal kısıtlamaları güncellendi',
      setting
    });
  } catch (error) {
    console.error('Error updating channel restrictions:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/command-settings/:guildId/commands/:commandName/roles
 * Rol kısıtlaması ekle/güncelle
 */
router.post('/:guildId/commands/:commandName/roles', async (req, res) => {
  try {
    const { guildId, commandName } = req.params;
    const { mode, roles } = req.body;

    if (!['off', 'whitelist', 'blacklist'].includes(mode)) {
      return res.status(400).json({
        success: false,
        error: 'Geçersiz mod. off, whitelist veya blacklist olmalı'
      });
    }

    const updateData = { roleMode: mode, updatedAt: new Date() };

    if (mode === 'whitelist') {
      updateData.allowedRoles = roles || [];
      updateData.blockedRoles = [];
    } else if (mode === 'blacklist') {
      updateData.blockedRoles = roles || [];
      updateData.allowedRoles = [];
    } else {
      updateData.allowedRoles = [];
      updateData.blockedRoles = [];
    }

    const setting = await CommandSettings.findOneAndUpdate(
      { guildId, commandName },
      updateData,
      { upsert: true, new: true }
    );

    res.json({
      success: true,
      message: 'Rol kısıtlamaları güncellendi',
      setting
    });
  } catch (error) {
    console.error('Error updating role restrictions:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/command-settings/:guildId/bulk-disable
 * Toplu komut kapatma
 */
router.post('/:guildId/bulk-disable', async (req, res) => {
  try {
    const { guildId } = req.params;
    const { commands } = req.body;

    if (!Array.isArray(commands) || commands.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Komut listesi gerekli'
      });
    }

    const results = await Promise.all(
      commands.map(async (commandName) => {
        return await CommandSettings.findOneAndUpdate(
          { guildId, commandName },
          { enabled: false, updatedAt: new Date() },
          { upsert: true, new: true }
        );
      })
    );

    res.json({
      success: true,
      message: `${results.length} komut kapatıldı`,
      commands: results.map(r => r.commandName)
    });
  } catch (error) {
    console.error('Error bulk disabling commands:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/command-settings/:guildId/bulk-enable
 * Toplu komut açma
 */
router.post('/:guildId/bulk-enable', async (req, res) => {
  try {
    const { guildId } = req.params;
    const { commands } = req.body;

    if (!Array.isArray(commands) || commands.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Komut listesi gerekli'
      });
    }

    const results = await Promise.all(
      commands.map(async (commandName) => {
        return await CommandSettings.findOneAndUpdate(
          { guildId, commandName },
          { enabled: true, updatedAt: new Date() },
          { upsert: true, new: true }
        );
      })
    );

    res.json({
      success: true,
      message: `${results.length} komut açıldı`,
      commands: results.map(r => r.commandName)
    });
  } catch (error) {
    console.error('Error bulk enabling commands:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
