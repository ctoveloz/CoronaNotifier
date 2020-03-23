require('dotenv').config()
const fs = require('fs');
const moment = require('moment')
const qrcode = require('qrcode-terminal');
const {
    Client,
    Location,
    MessageMedia
} = require('whatsapp-web.js');
const mqtt = require('mqtt')
const listen = mqtt.connect('mqtt://test.mosquitto.org')
const User = require('./user.js')
// const corona = require('./CoronaService/covid19.js')

const SESSION_FILE_PATH = './session.json';
let sessionCfg;
if (fs.existsSync(SESSION_FILE_PATH)) {
    sessionCfg = require(SESSION_FILE_PATH);
}

const client = new Client({
    puppeteer: {
        args: [
            '--headless',
            '--log-level=3', // fatal only
            '--start-maximized',
            '--no-default-browser-check',
            '--disable-infobars',
            '--disable-web-security',
            '--disable-site-isolation-trials',
            '--no-experiments',
            '--ignore-gpu-blacklist',
            '--ignore-certificate-errors',
            '--ignore-certificate-errors-spki-list',
            '--disable-gpu',
            '--disable-extensions',
            '--disable-default-apps',
            '--enable-features=NetworkService',
            '--disable-setuid-sandbox',
            '--no-sandbox',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote'
        ]
    },
    session: sessionCfg
});
// You can use an existing session and avoid scanning a QR code by adding a "session" object to the client options.

client.initialize();

// ======================= Begin initialize WAbot

client.on('qr', (qr) => {
    // NOTE: This event will not be fired if a session is specified.
    qrcode.generate(qr, {
        small: true
    });
    console.log(`[ ${moment().format('HH:mm:ss')} ] Please Scan QR with app!`)
});

client.on('authenticated', (session) => {
    console.log(`[ ${moment().format('HH:mm:ss')} ] Authenticated Success!`)
    // console.log(session);
    sessionCfg = session;
    fs.writeFile(SESSION_FILE_PATH, JSON.stringify(session), function (err) {
        if (err) {
            console.error(err);
        }
    });
});

client.on('auth_failure', msg => {
    // Fired if session restore was unsuccessfull
    console.log(`[ ${moment().format('HH:mm:ss')} ] AUTHENTICATION FAILURE \n ${msg}`)
    fs.unlink('./session.json', function (err) {
        if (err) return console.log(err);
        console.log(`[ ${moment().format('HH:mm:ss')} ] Session Deleted, Please Restart!`)
        process.exit(1);
    });
});

client.on('ready', () => {
    console.log(`[ ${moment().format('HH:mm:ss')} ] Whatsapp bot ready!`)
});

// ======================= Begin initialize mqtt broker

listen.on('connect', () => {
    listen.subscribe(process.env.MQTT_TOPIC, function (err) {
        if (!err) {
            console.log(`[ ${moment().format('HH:mm:ss')} ] Mqtt topic [${process.env.MQTT_TOPIC}] subscribed!`)
        }
    })
})

listen.on('message', (topic, message) => {
    console.log(`[ ${moment().format('HH:mm:ss')} ] Message: ${message.toString()}`)
})
// ======================= WaBot Listen on Event

client.on('message_create', (msg) => {
    // Fired on all message creations, including your own
    if (msg.fromMe) {
        // do stuff here
    }
});

client.on('message_revoke_everyone', async (after, before) => {
    // Fired whenever a message is deleted by anyone (including you)
    // console.log(after); // message after it was deleted.
    if (before) {
        console.log(`[ ${moment().format('HH:mm:ss')} ] Revoked: ${before.body}`); // message before it was deleted.
    }
});

client.on('message_revoke_me', async (msg) => {
    // Fired whenever a message is only deleted in your own view.
    // console.log(msg.body); // message before it was deleted.
});

client.on('message_ack', (msg, ack) => {
    /*
        == ACK VALUES ==
        ACK_ERROR: -1
        ACK_PENDING: 0
        ACK_SERVER: 1
        ACK_DEVICE: 2
        ACK_READ: 3
        ACK_PLAYED: 4
    */

    if (ack == 3) {
        // The message was read
    }
});

client.on('group_join', (notification) => {
    // User has joined or been added to the group.
    console.log('join', notification);
    notification.reply('User joined.');
});

client.on('group_leave', (notification) => {
    // User has left or been kicked from the group.
    console.log('leave', notification);
    notification.reply('User left.');
});

client.on('group_update', (notification) => {
    // Group picture, subject or description has been updated.
    console.log('update', notification);
});

client.on('disconnected', (reason) => {
    console.log('Client was logged out', reason);
});

// ======================= WaBot Listen on message 

client.on('message', async msg => {
    msg.body = msg.body.toLowerCase()
    msg.from.includes('@c.us') ? console.log(`[ ${moment().format('HH:mm:ss')} ] Message:`, msg.from.replace('@c.us', ''), `| ${msg.type}`, msg.body ? `| ${msg.body}` : '') : ''
    msg.from.includes('@g.us') ? console.log(`[ ${moment().format('HH:mm:ss')} ] Message:`, msg.from.replace('@g.us', ''), `| ${msg.type}`, msg.body ? `| ${msg.body}` : '') : ''

    if (msg.type == 'ciphertext' || msg.body == 'menu' || msg.body == 'info' || msg.body == 'corona' ) {
        let chat = await msg.getChat();
        if (!chat.isGroup) {
            msg.reply('kirim !menu atau !help untuk melihat menu honk!.');
        }
        // Send a new message as a reply to the current one

    } else if (msg.body == 'halo' || msg.body == 'hai' || msg.body == 'hallo') {
        // Send a new message as a reply to the current one
        msg.reply('hi 😃');

    } else if (msg.body == '!msg') {
        // Send a new message as a reply to the current one
        var kontak = await await msg.getContact();
        console.log(kontak)
        console.log(msg)

    } else if (msg.body == '!ping' || msg.body == 'ping' || msg.body == 'p') {
        // Send a new message to the same chat
        client.sendMessage(msg.from, 'pong');

    } else if (msg.body == '!honk' || msg.body == 'honk!' || msg.body == 'honk') {
        // Send a new message to the same chat
        client.sendMessage(msg.from, 'Honk Honk!!');

    } else if (msg.body.startsWith('!sendto ')) {
        // Direct send a new message to specific id
        let number = msg.body.split(' ')[1];
        let messageIndex = msg.body.indexOf(number) + number.length;
        let message = msg.body.slice(messageIndex, msg.body.length);
        if (number.includes('@g.us')) {
            let group = await client.getChatById(number);
            group.sendMessage(message)
        } else if (!number.includes('@c.us') && !number.includes('@g.us')) {
            number = number.includes('@c.us') ? number : `${number}@c.us`;
            let chat = await msg.getChat();
            chat.sendSeen();
            client.sendMessage(number, message);
        }

    } else if (msg.body == '!chats') {
        const chats = await client.getChats();
        fs.readFile('./CoronaService/user.json', 'utf-8', function (err, data) {
            if (err) throw err
            const userData = JSON.parse(data)
            client.sendMessage(msg.from, `The bot has ${chats.length} chats open and ${userData.length} users.`);
        })

    } else if (msg.body == '!info' || msg.body == '!ajuda' || msg.body == '!menu') {
        var contact = await await msg.getContact();
        var nama = contact.pushname !== undefined ? `Oi, ${contact.pushname} 😃` : 'Oi 😃'
        client.sendMessage(msg.from, `
${nama}
 Bot fornecera informações sobre o COVID-19 no Brasil.

*COMANDOS*
!info/!ajuda  =>  Menu
!ping  =>  Teste bot

*COVID-19* 
!corona  =>  Informações sobre Covid-19 no Brasil
!ativar  =>  Ativar notificações
!desativar  =>  Desativar Notificações

`);

    } else if (msg.body == '!localdata') {
        let localData = client.localData;
        console.log(localData);
        client.sendMessage(msg.from, `
            *Connection localData*
            User name: ${localData.pushname}
            My number: ${localData.me.user}
            Device: ${localData.phone.device_manufacturer} | ${localData.phone.device_model}
            Platform: ${localData.platform} ${localData.phone.os_version} 
            WhatsApp version: ${localData.phone.wa_version}
        `);

    } else if (msg.body == '!medialocaldata' && msg.hasMedia) {
        const attachmentData = await msg.downloadMedia();
        // console.log(attachmentData)
        msg.reply(`
            *Media localData*
            MimeType: ${attachmentData.mimetype}
            Filename: ${attachmentData.filename}
            Data (length): ${attachmentData.data.length}
        `);

    } else if (msg.body == '!quotelocaldata' && msg.hasQuotedMsg) {
        const quotedMsg = await msg.getQuotedMessage();

        quotedMsg.reply(`
            ID: ${quotedMsg.id._serialized}
            Type: ${quotedMsg.type}
            Author: ${quotedMsg.author || quotedMsg.from}
            Timestamp: ${quotedMsg.timestamp}
            Has Media? ${quotedMsg.hasMedia}
        `);

    } else if (msg.body == '!resendmedia' && msg.hasQuotedMsg) {
        const quotedMsg = await msg.getQuotedMessage();
        if (quotedMsg.hasMedia) {
            const attachmentData = await quotedMsg.downloadMedia();
            client.sendMessage(msg.from, attachmentData, {
                caption: 'Here\'s your requested media.'
            });
        }

    } else if (msg.body == '!location') {
        msg.reply(new Location(37.422, -122.084, 'Googleplex\nGoogle Headquarters'));

    } else if (msg.body.startsWith('!status ')) {
        const newStatus = msg.body.split(' ')[1];
        await client.setStatus(newStatus);
        msg.reply(`Status was updated to *${newStatus}*`);

    } else if (msg.body == '!mention') {
        const contact = await msg.getContact();
        const chat = await msg.getChat();
        chat.sendMessage(`Hi @${contact.number}!`, {
            mentions: [contact]
        });

    } else if (msg.body == '!delete' && msg.hasQuotedMsg) {
        const quotedMsg = await msg.getQuotedMessage();
        if (quotedMsg.fromMe) {
            quotedMsg.delete(true);
        } else {
            msg.reply('I can only delete my own messages');
        }

    } else if (msg.body === '!archive') {
        const chat = await msg.getChat();
        chat.archive();

    } else if (msg.body === '!typing') {
        const chat = await msg.getChat();
        // simulates typing in the chat
        chat.sendStateTyping();

    } else if (msg.body === '!recording') {
        const chat = await msg.getChat();
        // simulates recording audio in the chat
        chat.sendStateRecording();

    } else if (msg.body === '!clearstate') {
        const chat = await msg.getChat();
        // stops typing or recording in the chat
        chat.clearState();

    } else if (msg.body === '!desativar') {
        let chat = await msg.getChat();
        if (chat.isGroup) {
            msg.reply('Desculpe, esse comando não pode ser usado em grupos envie no pv para desativar as notificações.');
        } else {
            User.checkUser(msg.from).then(result => {
                if (result) {
                    User.removeUser(msg.from)
                        .then(result => {
                            if (result) {
                                client.sendMessage(msg.from,
                                    'Desativado com êxito, você não receberá mais notificações.'
                                );
                            } else {
                                client.sendMessage(msg.from,
                                    'Falha ao desativar, número não registrado.'
                                );
                            }
                        })
                } else {
                    client.sendMessage(msg.from,
                        'Falha ao desativar, número não registrado.'
                    );
                }
            })
        }


    } else if (msg.body === '!ativar') {
        let chat = await msg.getChat();
        if (chat.isGroup) {
            msg.reply('Desculpe, esse comando não pode ser usado em grupos envie no pv para ativar as notificações.');
        } else {
            User.addUser(msg.from)
                .then(result => {
                    if (!result) {
                        client.sendMessage(msg.from,
                            'Notificações ativadas.'
                        );
                    } else {
                        client.sendMessage(msg.from,
                            'Notificações ativada, você receberá uma notificação quando houver atualização de dados.'
                        );
                    }
                })
        }

    } else if (msg.body === '!corona' || msg.body === '!covid') {
        fs.readFile('./CoronaService/data.json', 'utf-8', function (err, data) {
            if (err) throw err
            const localData = JSON.parse(data)
            const newCases = localData.NewCases === '' ? 0 : localData.NewCases;
            const newDeaths = localData.NewDeaths === '' ? 0 : localData.NewDeaths;
            const NewRecovered = localData.NewRecovered === '' ? 0 : localData.NewRecovered;
            client.sendMessage(msg.from, `
                    *COVID-19 Atualizado!!*

País: ${localData.Country}
Casos Totais: ${localData.TotalCases}

Casos Totais Ativos: ${localData.ActiveCases}
*Novos Casos: ${newCases}*

Mortes Totais: ${localData.TotalDeaths}
*Novas Mortes: ${newDeaths}*

Recuperados Totais: ${localData.TotalRecovered}
*Novos Recuperados: ${NewRecovered}*

Ultima Atualização: ${localData.lastUpdate}
            `);
            var imageAsBase64 = fs.readFileSync('./CoronaService/corona.png', 'base64');
            var CoronaImage = new MessageMedia("image/png", imageAsBase64);
            client.sendMessage(msg.from, CoronaImage);
        })

//     } else if (msg.body === '!coronaOld') {
//         corona.getAll()
//             .then(result => {
//                 var aktifIndo = result[0].confirmed - result[0].recovered - result[0].deaths
//                 // var aktifGlob = result[1].confirmed - result[1].recovered - result[1].
//                 // Kasus *Global*
//                 // Total Kasus: ${result[1].confirmed}
//                 // Kasus aktif: ${aktifGlob}
//                 // Sembuh: ${result[1].recovered}
//                 // Meninggal: ${result[1].deaths}
//                 // Update Pada: 
//                 // ${result[1].lastUpdate}
//                 client.sendMessage(msg.from, `
//                     *COVID-19 Update!!*

// Kasus *Indonesia*
// Total Kasus: ${result[0].confirmed}
// Kasus aktif: ${aktifIndo}
// Sembuh: ${result[0].recovered}
// Meninggal: ${result[0].deaths}

// Update Pada: 
// ${result[0].lastUpdate.replace("pukul","|")} WIB
//         `);
//                 var imageAsBase64 = fs.readFileSync('./CoronaService/corona.png', 'base64');
//                 var CoronaImage = new MessageMedia("image/png", imageAsBase64);
//                 client.sendMessage(msg.from, CoronaImage);
//             })

        // ============================================= Groups

    } else if (msg.body.startsWith('!subject ')) {
        // Change the group subject
        let chat = await msg.getChat();
        if (chat.isGroup) {
            let newSubject = msg.body.slice(9);
            chat.setSubject(newSubject);
        } else {
            msg.reply('This command can only be used in a group!');
        }

    } else if (msg.body.startsWith('!echo ')) {
        // Replies with the same message
        msg.reply(msg.body.slice(6));

    } else if (msg.body.startsWith('!desc ')) {
        // Change the group description
        let chat = await msg.getChat();
        if (chat.isGroup) {
            let newDescription = msg.body.slice(6);
            chat.setDescription(newDescription);
        } else {
            msg.reply('This command can only be used in a group!');
        }

    } else if (msg.body == '!leave') {
        // Leave the group
        let chat = await msg.getChat();
        if (chat.isGroup) {
            chat.leave();
        } else {
            msg.reply('This command can only be used in a group!');
        }

    } else if (msg.body.startsWith('!join ')) {
        const inviteCode = msg.body.split(' ')[1];
        try {
            await client.acceptInvite(inviteCode);
            msg.reply('Joined the group!');
        } catch (e) {
            msg.reply('That invite code seems to be invalid.');
        }

    } else if (msg.body == '!grouplocaldata') {
        let chat = await msg.getChat();
        if (chat.isGroup) {
            msg.reply(`
                *Group Details*
                Name: ${chat.name}
                Description: ${chat.description}
                Created At: ${chat.createdAt.toString()}
                Created By: ${chat.owner.user}
                Participant count: ${chat.participants.length}
            `);
        } else {
            msg.reply('This command can only be used in a group!');
        }

    } else if (msg.body == '!broadcast' && msg.from == '6282324937376@c.us') {
        fs.readFile('./CoronaService/user.json', 'utf-8', function (err, data) {
            if (err) throw err
            const userData = JSON.parse(data)
            for (var i = 0; i < userData.length; i++) {
                let number = userData[i].user;
                setTimeout(function () {
                    // console.log(`[ ${moment().format('HH:mm:ss')} ] Send Broadcast to ${number}`)
                    // client.sendMessage(number, `Maaf jika terjadi kesalahan data/double pengiriman, sedang ada perbaikan sistem.`);

                    // Delay 2 Sec
                }, i * 2000)

            }

        })
    }
});

listen.on('message', (topic, message) => {
    console.log(`[ ${moment().format('HH:mm:ss')} ] MQTT: ${message.toString()}`)
    fs.readFile('./CoronaService/user.json', 'utf-8', function (err, data) {
        if (err) throw err
        const userData = JSON.parse(data)
        for (var i = 0; i < userData.length; i++) {
            let number = userData[i].user;
            // number = number.includes('@c.us') ? number : `${number}@c.us`;
            setTimeout(function () {
                console.log(`[ ${moment().format('HH:mm:ss')} ] Enviar Atualização Corona para ${number}`)
                if (message.toString() === 'Nova atualização!') {
                    fs.readFile('./CoronaService/data.json', 'utf-8', function (err, data) {
                        if (err) throw err
                        const localData = JSON.parse(data)
                        const newCases = localData.NewCases === '' ? 0 : localData.NewCases;
                        const newDeaths = localData.NewDeaths === '' ? 0 : localData.NewDeaths;
                        const NewRecovered = localData.NewRecovered === '' ? 0 : localData.NewRecovered;
                        client.sendMessage(number, `
                    *COVID-19 Atualizado!!*
País: ${localData.Country}
Casos Totais: ${localData.TotalCases}

Casos Totais Ativos: ${localData.ActiveCases}
*Novos Casos: ${newCases}*

Mortes Totais: ${localData.TotalDeaths}
*Novas Mortes: ${newDeaths}*

Recuperados Totais: ${localData.TotalRecovered}
*Novos Recuperados: ${NewRecovered}*

Ultima Atualização: ${localData.lastUpdate}
Fonte: 
_www.worldometers.info/coronavirus/_
                    `);

                    })
                }
                // Delay 2 Sec
            }, i * 1750)

        }

    })


})