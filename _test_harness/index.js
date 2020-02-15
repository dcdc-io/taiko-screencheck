const assert = require("assert")
const { openBrowser, goto, screencheck, closeBrowser } = require('taiko');
(async () => {
    try {
        await openBrowser();
        await goto("dcdc.io");
        const screen = await screencheck();
        assert.ok(screen)
    } catch (error) {
        console.error(error);
    } finally {
        await closeBrowser();
    }
})();