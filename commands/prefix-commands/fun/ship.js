import { AttachmentBuilder } from 'discord.js';
import { createCanvas, loadImage } from 'canvas';
import Manager from '#managers';

export default {
    name: "ship",
    usage: "ship [@kullanıcı / ID / Random]",
    aliases: ["ships", "kalp"],
    description: 'Ship yapma komutu',
    category: "fun",
    
    permissions: {
        enabled: false
    },

    execute: async (client, message, args) => {
        const manager = new Manager(client, { action: message });
        
        let user = message.mentions.members.first() || 
                   message.guild.members.cache.get(args[0]) || 
                   message.guild.members.cache.random();
        
        if (!user) {
            return manager.sender.reply(manager.sender.errorEmbed("Geçerli bir kullanıcı belirt!"))
                .then(msg => setTimeout(() => msg.delete(), 5000));
        }

        const lovePercentage = Math.floor(Math.random() * 101);
        
        const themes = [
            'Şeker', 'Aşk', 'Tutku', 'Romantik', 'Sevgi', 
            'Kalp', 'Mutluluk', 'Hayal', 'Rüya', 'Sonsuzluk'
        ];
        const theme = themes[Math.floor(Math.random() * themes.length)];

        try {
            const canvas = createCanvas(1000, 450);
            const ctx = canvas.getContext('2d');

            ctx.fillStyle = '#fdeef4';
            ctx.fillRect(0, 0, 1000, 450);

            ctx.fillStyle = '#3a3a3a';
            ctx.font = 'bold 30px "Times New Roman", Georgia, serif';
            ctx.textAlign = 'center';
            ctx.fillText('BÜYÜK AŞK', 500, 45);

            await drawPolaroid(
                ctx, 
                message.author.displayAvatarURL({ extension: 'png', size: 256 }), 
                80, 70, 
                message.author.username, 
                -4
            );

            await drawPolaroid(
                ctx, 
                user.user.displayAvatarURL({ extension: 'png', size: 256 }), 
                660, 70, 
                user.user.username, 
                4
            );

            drawLoveCenter(ctx, 500, 220, lovePercentage);


            ctx.fillStyle = '#555555';
            ctx.font = 'bold 20px "Times New Roman", Georgia, serif';
            ctx.textAlign = 'center';
            ctx.fillText(`Tema: ${theme}`, 500, 425);

            const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'ship.png' });

            message.reply({
                content: `💕 **${message.author.username}** & **${user.user.username}** ${lovePercentage >= 50 ? '❤️' : '💔'}`,
                files: [attachment]
            });

        } catch (error) {
            console.error('[ship] Canvas hatası:', error);
            manager.sender.reply(manager.sender.errorEmbed('❌ Ship oluşturulurken hata oluştu!'));
        }
    }
};

async function drawPolaroid(ctx, avatarURL, x, y, username, rotation) {
    ctx.save();
    

    ctx.translate(x + 130, y + 160);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(-(x + 130), -(y + 160));

    const frameWidth = 260;
    const frameHeight = 310;


    ctx.shadowColor = 'rgba(0, 0, 0, 0.08)';
    ctx.shadowBlur = 15;
    ctx.shadowOffsetY = 8;
    

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x, y, frameWidth, frameHeight);
    

    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.strokeStyle = '#f4dbe4';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x, y, frameWidth, frameHeight);


    try {
        const avatar = await loadImage(avatarURL);
        ctx.drawImage(avatar, x + 15, y + 15, 230, 230);
    } catch (error) {
        ctx.fillStyle = '#eee';
        ctx.fillRect(x + 15, y + 15, 230, 230);
    }


    ctx.fillStyle = '#e59bb2';
    ctx.font = 'bold 22px "Times New Roman", Georgia, serif';
    ctx.textAlign = 'center';
    

    let formattedName = username;
    if (formattedName.length > 15) formattedName = formattedName.substring(0, 13) + '..';
    ctx.fillText(formattedName, x + 130, y + 283);


    const tapeWidth = 100;
    const tapeHeight = 22;
    const tapeX = x + (frameWidth - tapeWidth) / 2;
    const tapeY = y - 10;

    ctx.fillStyle = '#fce2c4';
    ctx.fillRect(tapeX, tapeY, tapeWidth, tapeHeight);


    ctx.strokeStyle = '#eec59f';
    ctx.lineWidth = 1.5;
    for (let i = tapeX + 8; i < tapeX + tapeWidth - 4; i += 8) {
        ctx.beginPath();
        ctx.moveTo(i, tapeY + 2);
        ctx.lineTo(i + 4, tapeY + tapeHeight - 2);
        ctx.stroke();
    }

    ctx.restore();
}


function drawLoveCenter(ctx, x, y, percentage) {
    ctx.save();


    ctx.strokeStyle = '#f6d5e3';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.arc(x, y, 105, 0, Math.PI * 2);
    ctx.stroke();

    drawSparkle(ctx, x + 98, y - 45, 6);
    drawSparkle(ctx, x - 102, y + 35, 5);

    const heartScale = 1.05;
    const heartYOffset = y - 85;

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    createHeartPath(ctx, x, heartYOffset, heartScale);
    ctx.fill();

    ctx.save();
    ctx.beginPath();
    createHeartPath(ctx, x, heartYOffset, heartScale);
    ctx.clip(); 

    const totalHeartHeight = 160;
    const fillHeight = (percentage / 100) * totalHeartHeight;
    const fillY = (heartYOffset + 140) - fillHeight;

    ctx.fillStyle = '#ff4b8b';
    ctx.fillRect(x - 120, fillY, 240, fillHeight + 30);
    ctx.restore();

    ctx.fillStyle = '#2c2c2c';
    ctx.font = 'bold 50px "Times New Roman", Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`%${percentage}`, x, y + 5);

    ctx.restore();
}

function createHeartPath(ctx, x, y, scale) {
    ctx.moveTo(x, y + 35 * scale);
    ctx.bezierCurveTo(x, y + 30 * scale, x - 10 * scale, y, x - 45 * scale, y);
    ctx.bezierCurveTo(x - 85 * scale, y, x - 85 * scale, y + 45 * scale, x - 85 * scale, y + 45 * scale);
    ctx.bezierCurveTo(x - 85 * scale, y + 80 * scale, x - 45 * scale, y + 115 * scale, x, y + 140 * scale);
    ctx.bezierCurveTo(x + 45 * scale, y + 115 * scale, x + 85 * scale, y + 80 * scale, x + 85 * scale, y + 45 * scale);
    ctx.bezierCurveTo(x + 85 * scale, y + 45 * scale, x + 85 * scale, y, x + 45 * scale, y);
    ctx.bezierCurveTo(x + 15 * scale, y, x, y + 30 * scale, x, y + 35 * scale);
}

function drawSparkle(ctx, cx, cy, r) {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
}