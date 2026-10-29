import { Router } from 'express';
import { CustomCommand } from '#models';

const router = Router();

/**
 * GET /api/custom-commands/list/:guildId
 * Sunucunun tüm özel komutlarını listele
 */
router.get('/list/:guildId', async (req, res) => {
  try {
    const { guildId } = req.params;

    const commands = await CustomCommand.find({ guildId })
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      commands: commands.map(cmd => ({
        id: cmd._id,
        commandName: cmd.commandName,
        description: cmd.description,
        enabled: cmd.enabled,
        actionType: cmd.actionType,
        hasText: !!cmd.responseText,
        hasEmbed: !!cmd.embedData?.description,
        hasRoles: (cmd.roleActions?.length || 0) > 0,
        roleCount: cmd.roleActions?.length || 0,
        usageCount: cmd.usageCount || 0,
        lastUsed: cmd.lastUsed,
        createdAt: cmd.createdAt,
        createdBy: cmd.createdBy
      }))
    });
  } catch (error) {
    console.error('[API] Custom commands list error:', error);
    res.status(500).json({
      success: false,
      error: 'Komutlar yüklenirken hata oluştu'
    });
  }
});

/**
 * GET /api/custom-commands/:guildId/:commandName
 * Belirli bir komutun detaylarını getir
 */
router.get('/:guildId/:commandName', async (req, res) => {
  try {
    const { guildId, commandName } = req.params;

    const command = await CustomCommand.findOne({ 
      guildId, 
      commandName: commandName.toLowerCase() 
    }).lean();

    if (!command) {
      return res.status(404).json({
        success: false,
        error: 'Komut bulunamadı'
      });
    }

    res.json({
      success: true,
      command: {
        id: command._id,
        commandName: command.commandName,
        description: command.description,
        enabled: command.enabled,
        actionType: command.actionType,
        responseText: command.responseText,
        embedData: command.embedData,
        roleActions: command.roleActions,
        usageCount: command.usageCount || 0,
        lastUsed: command.lastUsed,
        requiredRoles: command.requiredRoles,
        requiredPermissions: command.requiredPermissions,
        allowedChannels: command.allowedChannels,
        cooldown: command.cooldown,
        createdAt: command.createdAt,
        createdBy: command.createdBy
      }
    });
  } catch (error) {
    console.error('[API] Custom command detail error:', error);
    res.status(500).json({
      success: false,
      error: 'Komut yüklenirken hata oluştu'
    });
  }
});

/**
 * POST /api/custom-commands/create
 * Yeni özel komut oluştur
 */
router.post('/create', async (req, res) => {
  try {
    const { guildId, commandName, description, responseText, embedData, roleActions } = req.body;

    if (!guildId || !commandName) {
      return res.status(400).json({
        success: false,
        error: 'Guild ID ve komut adı gerekli'
      });
    }

    // Komut zaten var mı?
    const existing = await CustomCommand.findOne({ 
      guildId, 
      commandName: commandName.toLowerCase() 
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        error: 'Bu komut adı zaten kullanılıyor'
      });
    }

    const commandData = {
      guildId,
      commandName: commandName.toLowerCase(),
      description: description || 'Özel komut',
      actionType: 'multi',
      createdBy: req.body.userId || 'web-panel',
      enabled: true
    };

    // Add optional fields
    if (responseText) {
      commandData.responseText = responseText;
    }

    if (embedData) {
      commandData.embedData = embedData;
    }

    if (roleActions && roleActions.length > 0) {
      commandData.roleActions = roleActions;
    }

    const newCommand = await CustomCommand.create(commandData);

    res.json({
      success: true,
      command: {
        id: newCommand._id,
        commandName: newCommand.commandName,
        description: newCommand.description
      }
    });
  } catch (error) {
    console.error('[API] Custom command create error:', error);
    res.status(500).json({
      success: false,
      error: 'Komut oluşturulurken hata oluştu'
    });
  }
});

/**
 * PUT /api/custom-commands/update/:commandId
 * Komutu güncelle
 */
router.put('/update/:commandId', async (req, res) => {
  try {
    const { commandId } = req.params;
    const updates = req.body;

    // Güvenli güncelleme - sadece belirli alanları güncelle
    const allowedUpdates = [
      'description',
      'enabled',
      'responseText',
      'embedData',
      'roleActions',
      'requiredRoles',
      'requiredPermissions',
      'allowedChannels',
      'cooldown'
    ];

    const updateData = {};
    for (const key of allowedUpdates) {
      if (updates[key] !== undefined) {
        updateData[key] = updates[key];
      }
    }

    updateData.updatedAt = new Date();

    const command = await CustomCommand.findByIdAndUpdate(
      commandId,
      { $set: updateData },
      { new: true }
    );

    if (!command) {
      return res.status(404).json({
        success: false,
        error: 'Komut bulunamadı'
      });
    }

    res.json({
      success: true,
      command: {
        id: command._id,
        commandName: command.commandName,
        description: command.description,
        enabled: command.enabled
      }
    });
  } catch (error) {
    console.error('[API] Custom command update error:', error);
    res.status(500).json({
      success: false,
      error: 'Komut güncellenirken hata oluştu'
    });
  }
});

/**
 * DELETE /api/custom-commands/:commandId
 * Komutu sil
 */
router.delete('/:commandId', async (req, res) => {
  try {
    const { commandId } = req.params;

    const command = await CustomCommand.findByIdAndDelete(commandId);

    if (!command) {
      return res.status(404).json({
        success: false,
        error: 'Komut bulunamadı'
      });
    }

    res.json({
      success: true,
      message: 'Komut silindi'
    });
  } catch (error) {
    console.error('[API] Custom command delete error:', error);
    res.status(500).json({
      success: false,
      error: 'Komut silinirken hata oluştu'
    });
  }
});

/**
 * PUT /api/custom-commands/toggle/:commandId
 * Komutu aktif/pasif yap
 */
router.put('/toggle/:commandId', async (req, res) => {
  try {
    const { commandId } = req.params;

    const command = await CustomCommand.findById(commandId);

    if (!command) {
      return res.status(404).json({
        success: false,
        error: 'Komut bulunamadı'
      });
    }

    command.enabled = !command.enabled;
    await command.save();

    res.json({
      success: true,
      enabled: command.enabled
    });
  } catch (error) {
    console.error('[API] Custom command toggle error:', error);
    res.status(500).json({
      success: false,
      error: 'Komut durumu değiştirilirken hata oluştu'
    });
  }
});

export default router;
