const fs = require('fs')
const twitch = require('twitch-m3u8')
const https = require('https')
const { key } = require("./key.json");
var strimmeronline = false;
var disconnected = false;
const prevBWStats = {populated:false,win:0,loss:0}
const currentSession = {win:0, loss:0, get:function(){return `${currentSession.win}:${currentSession.loss}`}}


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
            const uuid = "59642e63027244afbd0fca4bd89b25e3";

//            console.debug("getting "+ uuid);
            const options = {
                hostname: 'api.hypixel.net',
                port: 443,
                path: `/player?key=${key}&uuid=${uuid}`,
                method: 'GET'
              }
              
                https.request(options, res => {
                    console.log(`(Hypixel) [INFO] statusCode: ${res.statusCode}`)
                    res.on('data', html => {
//                      console.debug(uuid + " got from hypixel")
                        const data = JSON.parse(html);
                        if (!data["success"]) {
                            console.error("(Hypixel) [ERROR] Request did not succeed from hypixel's side.");
                            return;
                        }
                        const bwStats = data['stats']['Bedwars'];
                        
                        //first check if this is the first time checking
                        // TO-DO: do this on first run instead of every time we are checking
                        if(!prevBWStats.populated) {
                            prevBWStats.populated = true;
                            prevBWStats.win = bwStats["wins_bedwars"];
                            prevBWStats.loss = bwStats["losses_bedwars"];
                            return
                        }
    
                        // send the console.log()s to twitch as well
                        if (bwStats["wins_bedwars"] > prevBWStats.wins) {
                            // victory
                            currentSession.win++;
                            console.log(`Victory! Current W/L: ${currentSession.get()} @Xadreco <3`)
                            
                        } else if (bwStats["losses_bedwars"] > prevBWStats.loss) {
                            // game over
                            currentSession.loss++;
                            console.log(`Game Over! Current W/L: ${currentSession.get()} @Xadreco <3`)
                            
                        }
                    })
                })
            await new Promise(r => setTimeout(r, 2000));
            continue
        } else await new Promise(r => setTimeout(r, 300000)); // TO-DO: figure out when disconnected 
    }
}

checkStreamOnline();
setInterval(function(){checkStreamOnline()}, 300000);
start();