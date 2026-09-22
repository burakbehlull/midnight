import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import Economy from '../models/Economy.js';
import UserStats from '../models/UserStats.js';
import Staff from '../models/Staff.js';
import Punishment from '../models/Punishment.js';
import InviteModel from '../models/InviteModel.js';
import Level from '../models/Level.js';
import DeletedMessage from '../models/DeletedMessage.js';
import { errorHandler, notFoundHandler, requestLogger } from './middleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'bot-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Sadece resim dosyaları yüklenebilir!'));
    }
  }
});

class MidnightAPI {
  constructor(client) {
    this.client = client;
    this.app = express();
    this.port = process.env.API_PORT || 3001;

    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  async fetchUserSmart(guild, userId) {
    try {
      const member = await guild.members.fetch(userId).catch(() => null);
      if (member) {
        return {
          username: member.user.username,
          globalName: member.user.globalName || null,
          avatar: member.user.displayAvatarURL({ size: 64 }),
          user: member.user
        };
      }
    } catch (error) {
    }

    try {
      const user = await this.client.users.fetch(userId).catch(() => null);
      if (user) {
        return {
          username: user.username,
          globalName: user.globalName || null,
          avatar: user.displayAvatarURL({ size: 64 }),
          user: user
        };
      }
    } catch (error) {
    }

    return {
      username: 'Unknown User',
      globalName: null,
      avatar: null,
      user: null
    };
  }

  setupMiddleware() {
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(requestLogger);
    
    this.app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
  }

  setupRoutes() {
    this.app.get('/api/health', (req, res) => {
      res.json({ 
        status: 'online', 
        guilds: this.client.guilds.cache.size,
        users: this.client.users.cache.size 
      });
    });

    this.app.get('/api/guilds', (req, res) => {
      const guilds = this.client.guilds.cache.map(guild => ({
        id: guild.id,
        name: guild.name,
        icon: guild.iconURL({ dynamic: true, size: 256 }),
        memberCount: guild.memberCount,
        ownerId: guild.ownerId
      }));
      res.json(guilds);
    });

    this.app.get('/api/guilds/:guildId/channels', (req, res) => {
      const { guildId } = req.params;
      const guild = this.client.guilds.cache.get(guildId);

      if (!guild) {
        return res.status(404).json({ error: 'Guild not found' });
      }

      const channels = guild.channels.cache
        .filter(ch => ch.isTextBased())
        .map(channel => ({
          id: channel.id,
          name: channel.name,
          type: channel.type,
          parentId: channel.parentId
        }));

      res.json(channels);
    });

    this.app.get('/api/guilds/:guildId/roles', (req, res) => {
      const { guildId } = req.params;
      const guild = this.client.guilds.cache.get(guildId);

      if (!guild) {
        return res.status(404).json({ error: 'Guild not found' });
      }

      const roles = guild.roles.cache
        .filter(role => role.id !== guildId)
        .sort((a, b) => b.position - a.position)
        .map(role => ({
          id: role.id,
          name: role.name,
          color: role.color,
          position: role.position,
          members: role.members.size,
          permissions: role.permissions.toArray(),
          hexColor: role.hexColor,
          hoist: role.hoist,
          mentionable: role.mentionable
        }));

      res.json(roles);
    });

    this.app.post('/api/message/send', async (req, res) => {
      try {
        const { guildId, channelId, content, embed } = req.body;

        if (!guildId || !channelId) {
          return res.status(400).json({ error: 'guildId and channelId are required' });
        }

        const guild = this.client.guilds.cache.get(guildId);
        if (!guild) {
          return res.status(404).json({ error: 'Guild not found' });
        }

        const channel = guild.channels.cache.get(channelId);
        if (!channel || !channel.isTextBased()) {
          return res.status(404).json({ error: 'Channel not found or not text-based' });
        }

        const messageOptions = {};
        if (content) messageOptions.content = content;
        if (embed) messageOptions.embeds = [embed];

        const sentMessage = await channel.send(messageOptions);

        res.json({ 
          success: true, 
          messageId: sentMessage.id,
          channelId: channel.id,
          channelName: channel.name
        });

      } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ error: error.message });
      }
    });

    
    this.app.post('/api/guilds/:guildId/members/:userId/roles/add', async (req, res) => {
      try {
        const { guildId, userId } = req.params;
        const { roleId } = req.body;

        const guild = this.client.guilds.cache.get(guildId);
        if (!guild) {
          return res.status(404).json({ error: 'Guild not found' });
        }

        const member = await guild.members.fetch(userId).catch(() => null);
        if (!member) {
          return res.status(404).json({ error: 'Member not found' });
        }

        const role = guild.roles.cache.get(roleId);
        if (!role) {
          return res.status(404).json({ error: 'Role not found' });
        }

        await member.roles.add(role);

        res.json({ 
          success: true, 
          message: `${role.name} rolü ${member.user.username} kullanıcısına verildi`
        });

      } catch (error) {
        console.error('Error adding role:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Remove role from user
    this.app.post('/api/guilds/:guildId/members/:userId/roles/remove', async (req, res) => {
      try {
        const { guildId, userId } = req.params;
        const { roleId } = req.body;

        const guild = this.client.guilds.cache.get(guildId);
        if (!guild) {
          return res.status(404).json({ error: 'Guild not found' });
        }

        const member = await guild.members.fetch(userId).catch(() => null);
        if (!member) {
          return res.status(404).json({ error: 'Member not found' });
        }

        const role = guild.roles.cache.get(roleId);
        if (!role) {
          return res.status(404).json({ error: 'Role not found' });
        }

        await member.roles.remove(role);

        res.json({ 
          success: true, 
          message: `${role.name} rolü ${member.user.username} kullanıcısından alındı`
        });

      } catch (error) {
        console.error('Error removing role:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Ban user
    this.app.post('/api/guilds/:guildId/members/:userId/ban', async (req, res) => {
      try {
        const { guildId, userId } = req.params;
        const { reason } = req.body;

        const guild = this.client.guilds.cache.get(guildId);
        if (!guild) {
          return res.status(404).json({ error: 'Guild not found' });
        }

        const user = await this.client.users.fetch(userId).catch(() => null);
        const username = user?.username || userId;

        await guild.members.ban(userId, { reason: reason || 'Web panel üzerinden banlama' });

        res.json({ 
          success: true, 
          message: `${username} kullanıcısı banlandı`
        });

      } catch (error) {
        console.error('Error banning user:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Update user money
    this.app.post('/api/users/:userId/money/update', async (req, res) => {
      try {
        const { userId } = req.params;
        const { amount } = req.body;

        if (typeof amount !== 'number') {
          return res.status(400).json({ error: 'Amount must be a number' });
        }

        let economy = await Economy.findOne({ userId });
        
        if (!economy) {
          economy = new Economy({ userId, money: 0 });
        }

        economy.money += amount;
        
        // Negatif olmasın
        if (economy.money < 0) economy.money = 0;
        
        await economy.save();

        res.json({ 
          success: true, 
          newBalance: economy.money,
          message: `Para güncellendi: ${amount > 0 ? '+' : ''}${amount} (Yeni bakiye: ${economy.money})`
        });

      } catch (error) {
        console.error('Error updating money:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Get guild statistics
    this.app.get('/api/guilds/:guildId/stats', async (req, res) => {
      try {
        const { guildId } = req.params;
        const { type = 'economy', limit = 50 } = req.query;

        const guild = this.client.guilds.cache.get(guildId);
        if (!guild) {
          return res.status(404).json({ error: 'Guild not found' });
        }

        if (type === 'economy') {
          // Get all economy data sorted by money
          const economyData = await Economy.find({})
            .sort({ money: -1 });

          // Filter and map in one go to avoid rate limits
          const economyWithUsers = [];
          
          for (const data of economyData) {
            // Check if user is in guild (using cache only, no API calls)
            const member = guild.members.cache.get(data.userId);
            
            if (member) {
              // User is in guild, add to results
              economyWithUsers.push({
                userId: data.userId,
                username: member.user.username,
                avatar: member.user.displayAvatarURL({ size: 64 }),
                money: data.money,
                cookies: data.cookies,
                hearts: data.hearts,
                level: data.level,
                xp: data.xp,
                marriedTo: data.marriedTo,
                subtitle: data.subtitle
              });
              
              // Stop when we reach the limit
              if (economyWithUsers.length >= parseInt(limit)) {
                break;
              }
            }
          }

          return res.json(economyWithUsers);
        }

        if (type === 'levels') {
          // Get stats for this guild - Level modelinden çek
          const levelData = await Level.find({ guildId })
            .sort({ messageLevel: -1, messageXP: -1 }) // Önce level, sonra XP'ye göre sırala
            .limit(parseInt(limit));


          const levelWithUsers = await Promise.all(
            levelData.map(async (data) => {
              const userInfo = await this.fetchUserSmart(guild, data.userId);
              
              // UserStats'tan kanal bilgilerini al
              const userStats = await UserStats.findOne({ guildId, userId: data.userId });
              
              const topMessageChannels = userStats?.messageChannels 
                ? userStats.messageChannels.sort((a, b) => b.count - a.count).slice(0, 3)
                : [];
              
              const topVoiceChannels = userStats?.voiceChannels
                ? userStats.voiceChannels.sort((a, b) => b.duration - a.duration).slice(0, 3)
                : [];
              
              // Rolleri düzgün şekilde al
              let userRoles = [];
              if (userInfo.user) {
                try {
                  const member = await guild.members.fetch(data.userId).catch(() => null);
                  if (member?.roles?.cache) {
                    userRoles = Array.from(member.roles.cache.values())
                      .filter(r => r.id !== guild.id) // @everyone'ı çıkar
                      .sort((a, b) => b.position - a.position)
                      .slice(0, 5)
                      .map(r => ({
                        id: r.id,
                        name: r.name,
                        color: r.color,
                        position: r.position
                      }));
                  }
                } catch (e) {
                  // Member değilse rol yok
                }
              }
              
              return {
                userId: data.userId,
                username: userInfo.username,
                avatar: userInfo.avatar,
                messageXP: data.messageXP || 0,
                voiceXP: data.voiceXP || 0,
                messageLevel: data.messageLevel || 0,
                voiceLevel: data.voiceLevel || 0,
                totalMessages: userStats?.totalMessages || 0,
                totalVoice: userStats?.totalVoice || 0,
                messageChannels: topMessageChannels,
                voiceChannels: topVoiceChannels,
                roles: userRoles
              };
            })
          );

          return res.json(levelWithUsers);
        }

        if (type === 'invites') {
          const inviteData = await InviteModel.find({ guildId })
            .sort({ invitesCount: -1 })
            .limit(parseInt(limit));

          const invitesWithUsers = await Promise.all(
            inviteData.map(async (data) => {
              const userInfo = await this.fetchUserSmart(guild, data.userId);
              return {
                userId: data.userId,
                username: userInfo.username,
                avatar: userInfo.avatar,
                invitesCount: data.invitesCount
              };
            })
          );

          return res.json(invitesWithUsers);
        }

        if (type === 'staff') {
          const staffData = await Staff.find({ guildId })
            .sort({ registerCount: -1 })
            .limit(parseInt(limit));

          const staffWithUsers = await Promise.all(
            staffData.map(async (data) => {
              const userInfo = await this.fetchUserSmart(guild, data.userId);
              return {
                userId: data.userId,
                username: userInfo.username,
                avatar: userInfo.avatar,
                registerCount: data.registerCount,
                startedStaffCount: data.startedStaffCount,
                startedAt: data.startedAt
              };
            })
          );

          return res.json(staffWithUsers);
        }

        res.status(400).json({ error: 'Invalid type parameter' });

      } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Get guild top leaderboards
    this.app.get('/api/guilds/:guildId/leaderboard', async (req, res) => {
      try {
        const { guildId } = req.params;

        const guild = this.client.guilds.cache.get(guildId);
        if (!guild) {
          return res.status(404).json({ error: 'Guild not found' });
        }

        // Get all stats for this guild
        const allStats = await UserStats.find({ guildId });
        const allLevels = await Level.find({ guildId });

        // Top 10 Voice
        const topVoice = await Promise.all(
          allStats
            .sort((a, b) => (b.totalVoice || 0) - (a.totalVoice || 0))
            .slice(0, 10)
            .map(async (data, index) => {
              const userInfo = await this.fetchUserSmart(guild, data.userId);
              return {
                rank: index + 1,
                userId: data.userId,
                username: userInfo.username,
                avatar: userInfo.avatar,
                value: data.totalVoice || 0
              };
            })
        );

        // Top 10 Messages
        const topMessages = await Promise.all(
          allStats
            .sort((a, b) => (b.totalMessages || 0) - (a.totalMessages || 0))
            .slice(0, 10)
            .map(async (data, index) => {
              const userInfo = await this.fetchUserSmart(guild, data.userId);
              return {
                rank: index + 1,
                userId: data.userId,
                username: userInfo.username,
                avatar: userInfo.avatar,
                value: data.totalMessages || 0
              };
            })
        );

        // Top 10 Camera (Level modelinden)
        const topCamera = await Promise.all(
          allLevels
            .filter(data => (data.totalCameraOpens || 0) > 0)
            .sort((a, b) => (b.totalCameraOpens || 0) - (a.totalCameraOpens || 0))
            .slice(0, 10)
            .map(async (data, index) => {
              const userInfo = await this.fetchUserSmart(guild, data.userId);
              return {
                rank: index + 1,
                userId: data.userId,
                username: userInfo.username,
                avatar: userInfo.avatar,
                value: data.totalCameraOpens || 0
              };
            })
        );

        // Top 10 Stream (Level modelinden)
        const topStream = await Promise.all(
          allLevels
            .filter(data => (data.totalStreams || 0) > 0)
            .sort((a, b) => (b.totalStreams || 0) - (a.totalStreams || 0))
            .slice(0, 10)
            .map(async (data, index) => {
              const userInfo = await this.fetchUserSmart(guild, data.userId);
              return {
                rank: index + 1,
                userId: data.userId,
                username: userInfo.username,
                avatar: userInfo.avatar,
                value: data.totalStreams || 0
              };
            })
        );

        res.json({
          voice: topVoice,
          messages: topMessages,
          camera: topCamera,
          stream: topStream
        });

      } catch (error) {
        console.error('Error fetching leaderboard:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Get guild punishments for a guild
    this.app.get('/api/guilds/:guildId/punishments', async (req, res) => {
      try {
        const { guildId } = req.params;
        const { limit = 50 } = req.query;

        const guild = this.client.guilds.cache.get(guildId);
        if (!guild) {
          return res.status(404).json({ error: 'Guild not found' });
        }

        const punishments = await Punishment.find({ guildId })
          .sort({ date: -1 })
          .limit(parseInt(limit));

        const punishmentsWithUsers = await Promise.all(
          punishments.map(async (p) => {
            const user = await this.client.users.fetch(p.userId).catch(() => null);
            const staff = await this.client.users.fetch(p.staffId).catch(() => null);
            
            return {
              id: p._id,
              userId: p.userId,
              username: user?.username || 'Unknown User',
              type: p.type,
              reason: p.reason,
              date: p.date,
              duration: p.duration,
              staffId: p.staffId,
              staffName: staff?.username || 'Unknown Staff'
            };
          })
        );

        res.json(punishmentsWithUsers);

      } catch (error) {
        console.error('Error fetching punishments:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Get guild bans
    this.app.get('/api/guilds/:guildId/bans', async (req, res) => {
      try {
        const { guildId } = req.params;

        const guild = this.client.guilds.cache.get(guildId);
        if (!guild) {
          return res.status(404).json({ error: 'Guild not found' });
        }

        const bans = await guild.bans.fetch();
        
        const banList = Array.from(bans.values())
          .filter(ban => {
            const isBot = ban.user.bot;
            return !isBot;
          })
          .map((ban) => {
            return {
              userId: ban.user.id,
              username: ban.user.username,
              avatar: ban.user.displayAvatarURL({ size: 128 }) || null,
              reason: ban.reason || 'Sebep belirtilmemiş',
              tag: ban.user.tag
            };
          });

        res.json(banList);

      } catch (error) {
        console.error('Error fetching bans:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Get deleted messages for a guild
    this.app.get('/api/guilds/:guildId/deleted-messages', async (req, res) => {
      try {
        const { guildId } = req.params;
        const { limit = 100 } = req.query;

        const guild = this.client.guilds.cache.get(guildId);
        if (!guild) {
          return res.status(404).json({ error: 'Guild not found' });
        }

        const deletedMessages = await DeletedMessage.find({ guildId })
          .sort({ deletedAt: -1 })
          .limit(parseInt(limit));

        res.json(deletedMessages);

      } catch (error) {
        console.error('Error fetching deleted messages:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Get channel messages
    this.app.get('/api/guilds/:guildId/channels/:channelId/messages', async (req, res) => {
      try {
        const { guildId, channelId } = req.params;
        const { limit = 50 } = req.query;

        const guild = this.client.guilds.cache.get(guildId);
        if (!guild) {
          return res.status(404).json({ error: 'Guild not found' });
        }

        const channel = guild.channels.cache.get(channelId);
        if (!channel || !channel.isTextBased()) {
          return res.status(404).json({ error: 'Channel not found or not text-based' });
        }

        const messages = await channel.messages.fetch({ limit: parseInt(limit) });
        
        const formattedMessages = messages.map(msg => ({
          id: msg.id,
          content: msg.content,
          author: {
            id: msg.author.id,
            username: msg.author.username,
            globalName: msg.author.globalName || null,
            avatar: msg.author.displayAvatarURL({ size: 128 }),
            bot: msg.author.bot
          },
          createdAt: msg.createdTimestamp,
          attachments: msg.attachments.map(att => ({
            url: att.url,
            proxyUrl: att.proxyURL,
            filename: att.name,
            contentType: att.contentType,
            size: att.size
          })),
          embeds: msg.embeds.map(e => e.toJSON()),
          reactions: msg.reactions.cache.map(r => ({
            emoji: r.emoji.name,
            count: r.count
          }))
        }));

        res.json(formattedMessages.reverse()); // Chronological order

      } catch (error) {
        console.error('Error fetching channel messages:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Get global economy (all users)
    this.app.get('/api/economy/global', async (req, res) => {
      try {
        const { limit = 100 } = req.query;

        const economyData = await Economy.find({})
          .sort({ money: -1 })
          .limit(parseInt(limit));

        const economyWithUsers = await Promise.all(
          economyData.map(async (data) => {
            const user = await this.client.users.fetch(data.userId).catch(() => null);
            return {
              userId: data.userId,
              username: user?.username || 'Unknown User',
              avatar: user?.displayAvatarURL({ size: 64 }) || null,
              money: data.money,
              cookies: data.cookies,
              hearts: data.hearts,
              level: data.level,
              xp: data.xp,
              marriedTo: data.marriedTo,
              subtitle: data.subtitle
            };
          })
        );

        res.json(economyWithUsers);

      } catch (error) {
        console.error('Error fetching global economy:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Get bot info
    this.app.get('/api/bot/info', (req, res) => {
      try {
        const bot = this.client.user;
        res.json({
          id: bot.id,
          username: bot.username,
          discriminator: bot.discriminator,
          avatar: bot.displayAvatarURL({ size: 256, dynamic: true }),
          banner: bot.bannerURL({ size: 1024 }) || null,
          tag: bot.tag
        });
      } catch (error) {
        console.error('Error fetching bot info:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Get guilds with invite links
    this.app.get('/api/bot/guilds/invites', async (req, res) => {
      try {
        const guilds = this.client.guilds.cache.map(async (guild) => {
          // Her sunucu için davet linki oluştur veya mevcut olanı al
          let inviteUrl = null;

          try {
            // Önce mevcut davet linklerini kontrol et
            const invites = await guild.invites.fetch();
            const permanentInvite = invites.find(inv => !inv.expiresAt && inv.maxUses === 0);

            if (permanentInvite) {
              inviteUrl = `https://discord.gg/${permanentInvite.code}`;
            } else {
              // Yoksa yeni bir sınırsız davet linki oluştur
              const channels = guild.channels.cache.filter(ch => 
                ch.isTextBased() && 
                ch.permissionsFor(guild.members.me).has('CreateInstantInvite')
              );

              if (channels.size > 0) {
                const channel = channels.first();
                const invite = await channel.createInvite({
                  maxAge: 0, // Sınırsız süre
                  maxUses: 0, // Sınırsız kullanım
                  reason: 'Web panel için davet linki'
                });
                inviteUrl = `https://discord.gg/${invite.code}`;
              }
            }
          } catch (error) {
            console.error(`Failed to create invite for guild ${guild.name}:`, error.message);
          }

          return {
            id: guild.id,
            name: guild.name,
            icon: guild.iconURL({ dynamic: true, size: 128 }),
            memberCount: guild.memberCount,
            inviteUrl: inviteUrl || 'Davet linki oluşturulamadı'
          };
        });

        const guildsWithInvites = await Promise.all(guilds);
        res.json(guildsWithInvites);

      } catch (error) {
        console.error('Error fetching guilds with invites:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Update bot avatar
    this.app.post('/api/bot/avatar', async (req, res) => {
      try {
        const { avatarUrl } = req.body;

        if (!avatarUrl) {
          return res.status(400).json({ error: 'Avatar URL gerekli' });
        }

        await this.client.user.setAvatar(avatarUrl);

        res.json({ 
          success: true, 
          message: 'Avatar başarıyla güncellendi',
          newAvatar: this.client.user.displayAvatarURL({ size: 256, dynamic: true })
        });

      } catch (error) {
        console.error('Error updating avatar:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Upload and update bot avatar
    this.app.post('/api/bot/avatar/upload', upload.single('avatar'), async (req, res) => {
      try {
        if (!req.file) {
          return res.status(400).json({ error: 'Dosya yüklenmedi' });
        }

        const filePath = path.join(__dirname, '../uploads', req.file.filename);
        await this.client.user.setAvatar(filePath);

        res.json({ 
          success: true, 
          message: 'Avatar başarıyla güncellendi',
          newAvatar: this.client.user.displayAvatarURL({ size: 256, dynamic: true })
        });

      } catch (error) {
        console.error('Error uploading avatar:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Update bot banner
    this.app.post('/api/bot/banner', async (req, res) => {
      try {
        const { bannerUrl } = req.body;

        if (!bannerUrl) {
          return res.status(400).json({ error: 'Banner URL gerekli' });
        }

        await this.client.user.setBanner(bannerUrl);

        res.json({ 
          success: true, 
          message: 'Banner başarıyla güncellendi',
          newBanner: this.client.user.bannerURL({ size: 1024 }) || null
        });

      } catch (error) {
        console.error('Error updating banner:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Upload and update bot banner
    this.app.post('/api/bot/banner/upload', upload.single('banner'), async (req, res) => {
      try {
        if (!req.file) {
          return res.status(400).json({ error: 'Dosya yüklenmedi' });
        }

        const filePath = path.join(__dirname, '../uploads', req.file.filename);
        await this.client.user.setBanner(filePath);

        res.json({ 
          success: true, 
          message: 'Banner başarıyla güncellendi',
          newBanner: this.client.user.bannerURL({ size: 1024 }) || null
        });

      } catch (error) {
        console.error('Error uploading banner:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Get bot DMs - grouped by user
    this.app.get('/api/bot/dms', async (req, res) => {
      try {
        const DirectMessage = (await import('../models/DirectMessage.js')).default;
        
        // Tüm DM'leri kullanıcıya göre grupla
        const messages = await DirectMessage.find().sort({ createdAt: -1 });
        
        // Kullanıcıya göre grupla
        const groupedByUser = {};
        messages.forEach(msg => {
          if (!groupedByUser[msg.userId]) {
            groupedByUser[msg.userId] = {
              userId: msg.userId,
              username: msg.username,
              globalName: msg.globalName,
              avatar: msg.avatar,
              messages: [],
              lastMessage: msg.createdAt,
              unreadCount: 0
            };
          }
          
          groupedByUser[msg.userId].messages.push({
            id: msg.messageId,
            content: msg.messageContent,
            createdAt: msg.createdAt,
            replied: msg.replied,
            replyContent: msg.replyContent,
            repliedAt: msg.repliedAt
          });
          
          // Cevap verilmemiş mesaj sayısı
          if (!msg.replied) {
            groupedByUser[msg.userId].unreadCount++;
          }
        });

        // Array'e çevir ve son mesaja göre sırala
        const users = Object.values(groupedByUser).sort((a, b) => 
          new Date(b.lastMessage) - new Date(a.lastMessage)
        );

        res.json(users);

      } catch (error) {
        console.error('Error fetching DMs:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Get user by ID
    this.app.get('/api/users/:userId', async (req, res) => {
      try {
        const { userId } = req.params;
        
        const user = await this.client.users.fetch(userId);
        if (!user) {
          return res.status(404).json({ error: 'User not found' });
        }

        res.json({
          id: user.id,
          username: user.username,
          globalName: user.globalName || null,
          avatar: user.displayAvatarURL({ size: 128 }),
          bot: user.bot,
          discriminator: user.discriminator
        });

      } catch (error) {
        console.error('Error fetching user:', error);
        res.status(404).json({ error: 'User not found' });
      }
    });

    // Reply to a DM
    this.app.post('/api/bot/dms/:userId/reply', async (req, res) => {
      try {
        const { userId } = req.params;
        const { content, messageIds } = req.body;

        if (!content) {
          return res.status(400).json({ error: 'Mesaj içeriği gerekli' });
        }

        // Kullanıcıya DM gönder
        const user = await this.client.users.fetch(userId);
        if (!user) {
          return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
        }

        await user.send(content);

        // Veritabanında cevap verildi olarak işaretle
        const DirectMessage = (await import('../models/DirectMessage.js')).default;
        
        if (messageIds && messageIds.length > 0) {
          await DirectMessage.updateMany(
            { messageId: { $in: messageIds }, userId: userId },
            { 
              $set: { 
                replied: true, 
                replyContent: content,
                repliedAt: new Date()
              } 
            }
          );
        } else {
          // Tüm cevaplanmamış mesajları işaretle
          await DirectMessage.updateMany(
            { userId: userId, replied: false },
            { 
              $set: { 
                replied: true, 
                replyContent: content,
                repliedAt: new Date()
              } 
            }
          );
        }

        res.json({ 
          success: true, 
          message: 'Mesaj başarıyla gönderildi' 
        });

      } catch (error) {
        console.error('Error replying to DM:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Unban user
    this.app.post('/api/guilds/:guildId/members/:userId/unban', async (req, res) => {
      try {
        const { guildId, userId } = req.params;

        const guild = this.client.guilds.cache.get(guildId);
        if (!guild) {
          return res.status(404).json({ error: 'Guild not found' });
        }

        const user = await this.client.users.fetch(userId).catch(() => null);
        const username = user?.username || userId;

        await guild.members.unban(userId);

        res.json({ 
          success: true, 
          message: `${username} kullanıcısının banı kaldırıldı`
        });

      } catch (error) {
        console.error('Error unbanning user:', error);
        res.status(500).json({ error: error.message });
      }
    });
  }

  setupErrorHandling() {
    this.app.use(notFoundHandler);
    
    this.app.use(errorHandler);
  }

  start() {
    this.app.listen(this.port, () => {
      console.log(`Midnight Web Panel API Server: http://localhost:${this.port}`);
      /*
      console.log(`\n╔════════════════════════════════════════╗`);
      console.log(`║   🌐 Midnight Web Panel API Server   ║`);
      console.log(`╠════════════════════════════════════════╣`);
      console.log(`║  Status: ✅ Online                     ║`);
      console.log(`║  Port: ${this.port}                           ║`);
      console.log(`║  URL: http://localhost:${this.port}         ║`);
      console.log(`╠════════════════════════════════════════╣`);
      console.log(`║  Endpoints:                            ║`);
      console.log(`║  • GET  /api/health                    ║`);
      console.log(`║  • GET  /api/guilds                    ║`);
      console.log(`║  • GET  /api/guilds/:id/channels       ║`);
      console.log(`║  • GET  /api/guilds/:id/roles          ║`);
      console.log(`║  • GET  /api/guilds/:id/stats          ║`);
      console.log(`║  • GET  /api/guilds/:id/leaderboard    ║`);
      console.log(`║  • POST /api/message/send              ║`);
      console.log(`║  • GET  /api/guilds/:id/bans           ║`);
      console.log(`║  • GET  /api/economy/global            ║`);
      console.log(`║  • POST /api/guilds/:id/members/...    ║`);
      console.log(`║         /roles/add                     ║`);
      console.log(`║         /roles/remove                  ║`);
      console.log(`║         /ban                           ║`);
      console.log(`║         /unban                         ║`);
      console.log(`║  • POST /api/users/:id/money/update    ║`);
      console.log(`╚════════════════════════════════════════╝\n`);
      */
    });
  }
}

export default MidnightAPI;
