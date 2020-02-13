import { ScreenCheck } from "./ScreenCheck";

let init = false
module.exports = (function() {
    let func = ScreenCheck.screencheck
    // @ts-ignore
    func.init = ScreenCheck.init
    // @ts-ignore
    func.exec = ScreenCheck.exec
    return func
})()