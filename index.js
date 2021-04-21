const fs = require('fs')
const twitch = require('twitch-m3u8')
const { key } = require("./key.json");
var strimmeronline = false;
var disconnected = false;
var streamURL = null;


if(typeof process.argv[2] != "string") {
    console.error("Please provide the username of a Twitch user.");
    process.exit(1)
}

function checkStreamOnline() {
    console.log("Checking if online...")
    twitch.getStream(process.argv[2])
    .then(data => {
        strimmeronline = true;
        return
    })
    .catch(err => { // TO-DO: make date.now an actual date instead of epoch
        if(err == "TypeError: Cannot read property 'value' of null") {
            console.debug(`${Date.now()}: ${process.argv[2]} is offline or does not exist.`)
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
            // uuid = 59642e63027244afbd0fca4bd89b25e3



            continue
        } else await new Promise(r => setTimeout(r, 300000));
    }
}

checkStreamOnline();
setInterval(function(){checkStreamOnline()}, 300000);
start();