import { ScreenCheck } from "./ScreenCheck";

module.exports = (function() {
    let func = ScreenCheck.screencheck
    // @ts-ignore
    func.init = ScreenCheck.init
    return func
})()