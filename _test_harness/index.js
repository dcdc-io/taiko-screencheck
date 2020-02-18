const assert = require("assert")
const { screenshot, openBrowser, goto, screencheck, closeBrowser, setViewPort } = require('taiko')
const { PNG } = require("pngjs")
const pixelmatch = require("pixelmatch")

const pause = async () => {
    return new Promise((resolve) => {
        setTimeout(resolve, 3000)
    })
}

const capture = async (useTaiko) => {
    /**
     * The --disable-gpu flag is enough to reduce excessive font smoothing on
     * the headless:true render.
     * 
     * You may need to experiment with other chrome flags to ge to a point 
     * where headless and headed renders look alike, although it is recommended 
     * instead that you stick exclusively to one or the other, headless:false
     * or headless:true.
     * 
     * If you need both headless configurations then run this script and ensure
     * you see the expected output: "true 0"
     * 
     * If you get an output "false n" then you will need to tune chromium args
     * until n = 0.
     * 
     * WARNING! openBrowser is being overridden by ScreenCheck to automatically
     * add --disable-gpu and set the correct viewport dimensions. An optional
     * second parameter of "true" selects the original unpatched API.
     */
    if (useTaiko) {
        await openBrowser({headless:false, args:["--disable-gpu"]}, true /* true = use taiko, not ScreenCheck */)
        await setViewPort({width:1440, height:900})
    } else {
        await openBrowser({headless:false})
    }
    await goto("dcdc.io")
    await pause(500)
    const resultHL = await screenshot({encoding:"base64"})
    await closeBrowser()

    if (useTaiko) {
        await openBrowser({headless:true, args:["--disable-gpu"]}, true /* true = use taiko, not ScreenCheck */)
        await setViewPort({width:1440, height:900})
    } else {
        await openBrowser({headless:true})
    }
    await goto("dcdc.io")
    await pause(500)
    const result = await screenshot({encoding:"base64"})
    await closeBrowser()

    const pingHL = PNG.sync.read(Buffer.from(resultHL, "base64"))
    const ping = PNG.sync.read(Buffer.from(result, "base64"))
    
    const pmr = pixelmatch(pingHL.data, ping.data, null, 1440, 900)

    console.log(resultHL === result, pmr)
}

(async () => {
    try {
        // taiko openBrowser
        await capture(true);
        // screencheck openBrowser
        await capture(false);
    } catch (error) {
        console.error(error);
    } finally {
        await closeBrowser();
    }
})();