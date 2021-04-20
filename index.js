const fs = require('fs')
const chokidar = require('chokidar')
const twitch = require('twitch-m3u8')
const img = require('image-clipper')
img.configure('canvas', require('canvas'));
const { createWorker } = require('tesseract.js');
const child_process = require('child_process');
const worker = createWorker({logger: m => console.debug(m)});
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

async function recognise(path){
    // need to crop and resize to make stuff faster.
    img(path, function(){
        this.resize(640,360)
        .crop(170,110,300,65)
        .quality(50)
        .toFile('./new.jpg', function(){})
        .toDataURL(async function(dataURL){
            const { data: { text } } = await worker.recognize(dataURL);
            console.log(text)
            // doesnt recognise anything
            // maybe separate all other colors from the gold or red of the text
        })
        ;
    })
    
}

async function watchFolder(){
    console.log("Listening for folder changes...");
    // init tesseract
    await worker.load();
    await worker.loadLanguage('eng');
    await worker.initialize('eng');
    chokidar.watch('./images/').on('add', (path, evt) => {recognise(path)});
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
watchFolder()