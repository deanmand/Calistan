const fs = require('fs')
const twitch = require('twitch-m3u8')
const tesseract = require('tesseract.js')
const child_process = require('child_process');
var strimmeronline = false;
var disconnected = false;
var ffmpegActive = false;
var streamURL = null;


if(typeof process.argv[2] != "string") {
    console.error("Please provide the username of a Twitch user.");
    process.exit(1)
}


let getStreamURL = new Promise(async function(urlAquired, offline) {
    console.log("Getting stream URLs...")
    twitch.getStream(process.argv[2])
    .then(data => {
        console.log("Found URLs.")
        strimmeronline = true;
        var found360p = false,
        i;
        for (i = 0; i < data.length; i++) {
            //console.debug(data[i]["quality"])
            //favor 360p 
            if(data[i]['quality'] == "360p"){
                found360p = true
                break
            }
        }
        if(found360p) { console.log("360p resolution found."); streamURL = data[i]['url']; }
        else streamURL = data[0]['url'];
        urlAquired(); return
    })
    .catch(err => { // TO-DO: make date.now an actual date instead of epoch
        if(err == "TypeError: Cannot read property 'value' of null") {
            console.debug(`${Date.now()}: ${process.argv[2]} is offline or does not exist.`)
            strimmeronline = false;
        }
        else
            console.error(err)
        offline(); return 
    })
})

async function startffmpeg(){
    //console.log("Starting ffmpeg with streamURL: "+streamURL)

    // first check if the images folder exists
    if(!fs.existsSync(process.cwd()+"/images/")){
        child_process.execSync("mkdir images");
    }
    const ffmpeg = child_process.spawn('ffmpeg', // -r = fps
    ["-i", streamURL, "-y", "-an", "-r", "1", "-f", "image2", "-vcodec", "mjpeg", "%03d.jpg"],
    { cwd: "./images/", stdio: 'ignore' })

    ffmpegActive = true;

    ffmpeg.on("exit", (exit) => {
        disconnected = true;
        ffmpegActive = false;
        console.warn(`EXIT: ${exit}`)
    });

    ffmpeg.on("error", (data) => {
        console.error(`New ERROR: ${data}`)
    });
}

var l = true;
async function checkStatus() {
    while (l) { // do individual checks
        console.debug("checking status...")

        if( disconnected ) { // was online but ffmpeg said no
            for (i = 1; i < 11; i++) {
                console.warn("Disconnected. Retrying... x"+i)

                await getStreamURL.then(async function(){
                    // stream is up
                    console.log("Stream is up again. Restarting...")
                    startffmpeg()
                    while (!ffmpegActive){ // TO-DO: do something if it doesnt become active
                    await new Promise(r => setTimeout(r, 2000));
                    console.warn("Still waiting on ffmpeg to start...")
                   }
                   break;
        
                }).catch(async function(){
                    // stream is down
                    console.log("Stream is still down...")
                    await new Promise(r => setTimeout(r, 10000));
                })

            }
        }
    
        if( strimmeronline && ffmpegActive ) {
            console.log("All good..."); 
            await new Promise(r => setTimeout(r, 10000)); 
            continue
        }
    
        // check to see if stream is up
        await getStreamURL.then(async function(){
            // stream is up
            console.log("Stream is up. Starting...")
            startffmpeg()
            while (!ffmpegActive){ // TO-DO: do something if it doesnt become active
            await new Promise(r => setTimeout(r, 2000));
            console.warn("Still waiting on ffmpeg to start...")
           }

        }).catch(async function(){
            // stream is down
            console.log("Stream is down...")
            await new Promise(r => setTimeout(r, 300000));
        })
    }
}

checkStatus()