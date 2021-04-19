const fs = require('fs')
const twitch = require('twitch-m3u8')
const tesseract = require('tesseract.js');
var strimmeronline = false;
var availableStreams = [];

if(typeof process.argv[2] != "string") {
    console.error("Please provide the username of a Twitch user.");
    process.exit(1)
}

// check if the stream is online
function checkStream() {
twitch.getStream(process.argv[2])
    .then(data => {
        data.forEach(stream => {
            console.log(stream["quality"])
        });

        
    })
    .catch(err => { // TO-DO: make date.now an actual date instead of epoch
        console.debug(`${Date.now()}: ${process.argv[2]} is offline or does not exist.`)
    })
}








checkStream();
setInterval(function(){checkStream()}, 300000);