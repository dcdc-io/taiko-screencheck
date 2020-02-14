const { openBrowser, goto, screencheck, closeBrowser } = require('taiko');
(async () => {
    try {
        await openBrowser();
        await goto("google.com");
        const screen = await screencheck();
    } catch (error) {
        console.error(error);
    } finally {
        await closeBrowser();
    }
})();