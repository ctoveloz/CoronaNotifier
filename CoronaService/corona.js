require('dotenv').config()
const async = require('async');
const fs = require('fs');
const moment = require('moment')
moment.locale('pt-br');
const {
    Tabletojson: tabletojson
} = require('tabletojson');
const fetch = require('node-fetch');

const mqtt = require('mqtt')
const client = mqtt.connect('mqtt://test.mosquitto.org')

client.on('connect', () => {
    client.subscribe(process.env.MQTT_TOPIC, function (err) {
        if (!err) {
            console.log(`[ ${moment().format('HH:mm:ss')} ] Mqtt topic [${process.env.MQTT_TOPIC}] subscribed!`)
        }
    })
})

async function GetImage(url, path) {
    const res = await fetch(url);
    const fileStream = fs.createWriteStream(path);
    await new Promise((resolve, reject) => {
        res.body.pipe(fileStream);
        res.body.on("error", (err) => {
            reject(err);
        });
        fileStream.on("finish", function () {
            resolve();
        });
    });
};

async.forever(
    function (corona) {
        GetImage('https://covid19.mathdro.id/api/og?width=1024&height=1024','./CoronaService/corona.png')
        tabletojson.convertUrl('https://www.worldometers.info/coronavirus/', {
                useFirstRowForHeadings: true
            },
            function (tablesAsJson) {
                var jsonData = JSON.parse(JSON.stringify(tablesAsJson).split('"Country,Other":').join('"Country":'));
                jsonData = JSON.parse(JSON.stringify(jsonData).split('"Serious,Critical":').join('"Critical":'));
                var search = jsonData[0].filter(x => x.Country === "Brazil");
                const result = search[0]
                delete result.Critical
                delete result['Tot Cases/1M pop']
                fs.readFile('./CoronaService/data.json', 'utf-8', function (err, data) {
                    if (err) throw err
                    const localData = JSON.parse(data)
                    var recover = result.TotalRecovered - localData.TotalRecovered
                    result.NewRecovered = `+${recover}`
                    result.NewCases === '' ? result.NewCases = `+0`: result.NewCases
                    result.NewDeaths === '' ? result.NewDeaths = `+0`: result.NewDeaths
                    if (result.TotalCases !== localData.TotalCases || result.TotalDeaths !== localData.TotalDeaths || result.TotalRecovered !== localData.TotalRecovered) {
                        result.lastUpdate = `${moment().format('LLLL')}`
                        fs.writeFile('./CoronaService/data.json', JSON.stringify(result), 'utf-8', function (err) {
                            if (err) throw err
                            console.log(`[ ${moment().format('HH:mm:ss')} ] New Update on Data.json`)
                            client.publish(process.env.MQTT_TOPIC, 'New Update!')
                        })
                    } else {
                        result.lastUpdate = localData.lastUpdate
                        fs.writeFile('./CoronaService/data.json', JSON.stringify(result), 'utf-8', function (err) {
                            if (err) throw err
                            console.log(`[ ${moment().format('HH:mm:ss')} ] No Update on Data.json`)
                        })

                    }
                })
                setTimeout(function () {
                    corona();
                }, 300000)
                // Delay for 5 minutes.
            }
        );

    },
    function (err) {
        console.log(`[ ${moment().format('HH:mm:ss')} ] Error: ${err}`)
    });