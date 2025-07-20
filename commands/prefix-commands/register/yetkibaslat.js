import { Settings, Staff } from "#models";
import { messageSender } from "#helpers";
import { PermissionsManager } from '#managers';

export default {
  name: "yetkibaslat",
  aliases: ["yetkibaşlat", "authorizedstart"],
  description: "Bir kullanıcıyı yetkili olarak başlatır.",
  usage: ".yetkibaşlat @kullanıcı",
  category: "register",

  async execute(client, message, args) {
	  const sender = new messageSender(message);
	  const PM = new PermissionsManager(message);

	  const target =
		  message.mentions.members.first() ||
		  message.guild.members.cache.get(args[0]) ||
		  message.member;
		  
	  // const isSelf = !target || message.author.id === target.id;

	  const ctrl = await PM.control(PM.flags.Administrator);
	  if (!ctrl) return sender.reply(sender.errorEmbed("❌ Yetkin yok."));

	  if (!target) {
		return sender.reply(sender.errorEmbed("❌ Lütfen bir kullanıcı etiketleyin. Kendinizi başlatamazsınız."));
	  }
		
		/*
	  if (isSelf) {
		return sender.reply(sender.errorEmbed("❌ Kendinizi yetkili olarak başlatamazsınız. Lütfen birini etiketleyin."));
	  }*/

	  const settings = await Settings.findOne({ guildId: message.guild.id });
	  if (!settings?.staffRole) {
		return sender.reply(
		  sender.errorEmbed("❌ `StaffRole` ayarlanmamış. `/settings` komutunu kullan.")
		);
	  }
	  /*
	  const alreadyHasRole = target.roles.cache.has(settings.staffRole);
	  if (alreadyHasRole) {
		return sender.reply(
		  sender.errorEmbed(`${target} zaten <@&${settings.staffRole}> rolüne sahip.`)
		);
	  }
	  */

	  const existingStaff = await Staff.findOne({ userId: target.id, guildId: message.guild.id });
	  if (existingStaff) {
		return sender.reply(
		  sender.errorEmbed(`${target} zaten veritabanında yetkili olarak kayıtlı.`)
		);
	  }

	  const now = new Date();

	  await Staff.findOneAndUpdate(
		{ userId: message.author.id, guildId: message.guild.id },
		{
		  $inc: { startedStaffCount: 1 },
		  $addToSet: { startedUsers: target.id },
		  $set: { [`startedAt.${target.id}`]: now },
		},
		{ upsert: true, new: true }
	  );

	  try {
		await target.roles.add(settings.staffRole);
	  } catch (err) {
		console.error(err);
		return sender.reply(
		  sender.errorEmbed("❌ Rol verilirken bir hata oluştu. Botun rolü alttaysa rol veremez.")
		);
	  }

	  const formattedDate = now.toLocaleDateString("tr-TR", {
		year: "numeric",
		month: "long",
		day: "numeric",
	  });

	  sender.reply(
		sender.classic(
		  `${target} adlı kullanıcıya <@&${settings.staffRole}> rolü verildi ve **${formattedDate}** tarihinde yetkili olarak başlatıldı.`
		)
	  );
	}

};
