const fs = require('fs')
const twitch = require('twitch-m3u8')
const https = require('https')
const tmi = require('tmi.js')
const config = require("./config.json");


// Define configuration options
const options = {
    identity: {
      username: (config.botusr),
      password: (config.oauth),
    },
    channels: [config.channel]
  };

var strimmeronline = false;
var disconnected = false;
const prevBWStats = {populated:false,win:0,loss:0}
const currentSession = {win:0, loss:0, get:function(){return `${currentSession.win}:${currentSession.loss}`}}

const client = new tmi.client(options);

// Called every time a message comes in
function onMessageHandler (target, context, msg, self) {
    if (self) { return; } // Ignore messages from the bot
  
    // Remove whitespace from chat message
    const commandName = msg.trim();
  
    // If the command is known, let's execute it
    if (commandName === '~wl') {

      client.say(target, `The current W/L is ${currentSession.get()}`);
      console.log(`* Executed ${commandName} command`);
    } else {
      console.log(`* Unknown command ${commandName}`);
    }
  }


// Register our event handlers (defined below)
client.on('message', onMessageHandler);
client.on('connected', function(){


console.log("Connected to Twitch")

client.say(config.channel, `Successfully connected to Hypixel!`)

});


// Connect to Twitch:
client.connect().catch(e => {console.error(e)});

if(typeof process.argv[2] != "string") {
    console.error("Please provide the username of a Twitch user.");
    process.exit(1)
}

function checkStreamOnline() {
    console.log("Checking if online...")
    twitch.getStream(process.argv[2])
    .then(data => {
        strimmeronline = true;
        console.log(`${new Date().toUTCString()}: ${process.argv[2]} is online!`)
        return
    })
    .catch(err => { // TO-DO: make date.now an actual date instead of epoch
        
        if(err == "TypeError: Cannot read property 'value' of null" || 
           err == "Error: Transcode does not exist - the stream is probably offline") {
            console.debug(`${new Date().toUTCString()}: ${process.argv[2]} is offline or does not exist.`)
            strimmeronline = false;
        }
        else
            console.error(err);
            return 
    })
}


async function start(){
    while(true){
        if(strimmeronline){
            
            // do stats check and start comparing against
            // previous stats to check for win/lose

            const options = {
                hostname: 'api.hypixel.net',
                port: 443,
                path: `/player?key=${config.key}&uuid=${config.uuid}`,
                method: 'GET'
            }

            var resBody = "";
            const req = https.request(options, res => {
                if(res.statusCode != 200) {
                    console.log("API returned "+res.statusCode+". Aborting this iteration.");
                    return;
                }

                res.on('data', data => {
                    resBody += data;
                    resBody.replace("<html>",'')
                });

                res.on('end', function(){
                    try {
//                         console.debug(uuid + " got from hypixel")
                        const data = JSON.parse(resBody);
                        if (!data["success"]) {
                            console.error("(Hypixel) [ERROR] Request did not succeed from hypixel's side.");
                            return;
                        }
                        const bwStats = data['player']['stats']['Bedwars'];
                        
                        //first check if this is the first time checking
                        // TO-DO: do this on first run instead of every time we are checking
                        if(!prevBWStats.populated) {
                            console.debug("first data recieved")
                            prevBWStats.populated = true;
                            prevBWStats.win = bwStats["wins_bedwars"];
                            prevBWStats.loss = bwStats["losses_bedwars"];
                            return
                        }

                        console.debug(prevBWStats, "\n\n", bwStats["wins_bedwars"], "\n", bwStats["losses_bedwars"])
    
                        // send the console.log()s to twitch as well
                        if (bwStats["wins_bedwars"] > prevBWStats.wins) {
                            // victory
                            currentSession.win++;
                            prevBWStats.wins = bwStats["wins_bedwars"];
                            console.log(`Victory! Current W/L: ${currentSession.get()} <3`)
                            client.action(config.channel, `Victory! Current W/L: ${currentSession.get()} PogChamp <3`)
                            
                        } else if (bwStats["losses_bedwars"] > prevBWStats.loss) {
                            // game over
                            currentSession.loss++;
                            prevBWStats.loss = bwStats["losses_bedwars"];
                            console.log(`Game Over! Current W/L: ${currentSession.get()} <3`)
                            client.action(config.channel, `Game Over! Current W/L: ${currentSession.get()} NotLikeThis <3`)
                        } else console.debug('no change')
                    } catch(e){
                        console.warn("Received malformed information. Aborting this iteration.")
                    }
                });
            });
            req.end();
            await new Promise(r => setTimeout(r, 5000));
            continue
        } else await new Promise(r => setTimeout(r, 10000)); // TO-DO: figure out when disconnected 
    }
}

checkStreamOnline();
setInterval(function(){checkStreamOnline()}, 300000);
start();