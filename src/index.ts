import { Taiko, TaikoScreenshotOptions, TaikoSearchElement } from "taiko"
import * as fse from "fs-extra"

class ScreenCheck {

    static baseDir:string
    static runId:string
    static getRunDir = () => `${ScreenCheck.baseDir}/${ScreenCheck.runId}`
    static getRefDir = () => `${ScreenCheck.baseDir}/reference`
    static taiko:Taiko

    static async init(taiko:Taiko):Promise<void> {
        ScreenCheck.taiko = taiko

        ScreenCheck.baseDir = "C:/temp/screencheck"
        ScreenCheck.runId = "spaceship-blancmange"

        await fse.mkdirp(ScreenCheck.getRunDir())
    }

    static async screencheck(options?: TaikoScreenshotOptions, ...args: TaikoSearchElement[]):Promise<void> {
        let newOptions = { path: "" }
        if (!options?.path) {
            newOptions.path = ScreenCheck.generateFilename(options?.fullPage, args)
        } else {
            newOptions.path = ScreenCheck.simplifyPath(options.path)
        }

        const result = await ScreenCheck.taiko.screenshot(newOptions, args)
    }

    /**
     * removes structure from a file path to flatten it
     * e.g. /foo/bar/buzz.zip becomes foo-bar-buzz-zip
     * @param path a file path to simplify
     */
    static simplifyPath(path: string): string {
        throw new Error("Method not implemented.")
    }

    /**
     * 
     * @param fullPage 
     * @param args 
     */
    static generateFilename(fullPage: boolean = false, args: TaikoSearchElement[] = []): string {
        
        return `${fullPage ? '-fullpage' : ''}`
    }
}

export const init = ScreenCheck.init
export const screencheck = ScreenCheck.screencheck