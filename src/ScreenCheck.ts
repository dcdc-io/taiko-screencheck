/* we import taiko typings but we don't want the module install */
/// <reference path="taiko.d.ts" />
import { Taiko, TaikoScreenshotOptions, TaikoSearchElement } from "taiko"
import * as fse from "fs-extra"
import PixelMatch from "pixelmatch"
import path from "path"
import { PNG } from "pngjs"
import { inherits } from "util"

// const { uniqueNamesGenerator, adjectives, colors, animals } = require('unique-names-generator')

export class PageSize {
    static default = { width: 1440, height: 900 }
}

export enum ScreenCheckResultType {
    NO_BASE_IMAGE = "NO_BASE_IMAGE",
    SAME = "SAME",
    DIFFERENT = "DIFFERENT"
}

export class ScreenCheckResult {
    result: ScreenCheckResultType
    data: Buffer
    referenceData?: Buffer
    pixelCount: Number
    constructor(result = ScreenCheckResultType.SAME, data:Buffer, referenceData?:Buffer, pixelCount?:number) {
        this.result = result
        this.data = data
        this.referenceData = referenceData
        this.pixelCount = pixelCount || 0
    }
    toString():string {
        return this.result.toString()
    }
}

export class ScreenCheck {

    static isSetup:boolean
    static baseDir:string
    static runId:string
    static refRunId:string
    static getRunDir = () => path.join(ScreenCheck.baseDir || "", ScreenCheck.runId || "")
    static getRefDir = () => path.join(ScreenCheck.baseDir || "", ScreenCheck.refRunId || "")
    static taiko:Taiko
    private static viewPortPatched = false
    static _openBrowser:any

    static async init(taiko:Taiko):Promise<void> {
        ScreenCheck._openBrowser = taiko.openBrowser
        ScreenCheck.taiko = taiko
        ScreenCheck.baseDir = process.cwd()
    }

    static async openBrowser(options: any = {}, useOriginalCall:Boolean = false):Promise<void> {
        if (useOriginalCall) {
            await ScreenCheck._openBrowser(options)
        } else {
            options.args = [...(options.args || []), '--disable-gpu']
            await ScreenCheck._openBrowser(options)
            await ScreenCheck.taiko.setViewPort(PageSize.default)
        }
    }

    static async setup(options?:{baseDir?:string, runId?:string, refRunId?:string}):Promise<void> {
        ScreenCheck.baseDir = options ? options.baseDir! : process.cwd()
        ScreenCheck.runId = options ? options.runId! : await ScreenCheck.nextRunId() // ScreenCheck.generateRunId()
        ScreenCheck.refRunId = options ? options.refRunId! : await ScreenCheck.latestRunId()
        ScreenCheck.isSetup = true
    }

    static async detectLatestRunIdIndex():Promise<number> {
        let current = (await fse.readdir(ScreenCheck.baseDir))
            .filter(name => name.match(/^\d+\./))
            .filter(name => fse.lstatSync(name).isDirectory)
            .sort()
            .map(name => parseInt(name.split(".")[0]))
            .reverse()[0]
            || 0
        return current
    }

    static async latestRunId():Promise<string> {        
        const current = await ScreenCheck.detectLatestRunIdIndex()
        return `${current.toString().padStart(4, "0")}.auto`
    }

    static async nextRunId():Promise<string> {
        const current = await ScreenCheck.detectLatestRunIdIndex()
        let next = current + 1
        return `${next.toString().padStart(4, "0")}.auto`
    }
    
    /* static generateRunId(): string {
        return uniqueNamesGenerator({dictionaries:[adjectives, animals], separator: "-", length:2})
    } */

    static async screencheck(options?: TaikoScreenshotOptions, ...args: TaikoSearchElement[]):Promise<ScreenCheckResult> {
        if (!ScreenCheck.isSetup) 
            ScreenCheck.setup()
        options = options || {}
        const relativeFilename = `${await ScreenCheck.generateName(ScreenCheck.taiko, options.fullPage, ...args)}.png`
        const referenceImage = await ScreenCheck.getReferenceImagePath(relativeFilename)
        options.path = `${ScreenCheck.getRunDir()}/${relativeFilename}`
        await fse.mkdirp(ScreenCheck.getRunDir() + "/")
        await ScreenCheck.taiko.screenshot(options, ...args)
        if (referenceImage) {
            const diff = await ScreenCheck.compareImages(referenceImage, options.path)
            if (diff.missmatching > 0) {
                return new ScreenCheckResult(
                    ScreenCheckResultType.DIFFERENT,
                    fse.readFileSync(options.path),
                    fse.readFileSync(referenceImage),
                    diff.missmatching
                )
            } else {
                return new ScreenCheckResult(
                    ScreenCheckResultType.SAME,
                    fse.readFileSync(options.path)
                )
            }
        } else {
            return new ScreenCheckResult(
                ScreenCheckResultType.NO_BASE_IMAGE,
                fse.readFileSync(options.path)
            )
        }
    }

    static async getReferenceImagePath(current:string):Promise<string | undefined> {
        const absolutePath = path.join(ScreenCheck.getRefDir(), current)
        if (await fse.pathExists(absolutePath)) {
            return absolutePath
        }
        return undefined
    }

    /*
    static async getPreviousImage(current:string):Promise<string> {
        return `${ScreenCheck.baseDir}/reference/${await ScreenCheck.latestRunId()}.png`
    }
    */

    static async compareImages(left:string, right:string):Promise<{missmatching:number, diffImage:PNG}> {
        const leftImage = PNG.sync.read(fse.readFileSync(left))
        const rightImage = PNG.sync.read(fse.readFileSync(right))
        const { width, height } = leftImage
        const diffImage = new PNG({width, height})
        const missmatching = PixelMatch(leftImage.data, rightImage.data, diffImage.data, width, height)
        return {
            missmatching,
            diffImage
        }
    }

    /**
     * removes structure from a file path to flatten it
     * e.g. /foo/bar/buzz.zip becomes foo-bar-buzz-zip
     * @param path a file path to simplify
     */
    static simplifyPath(path: string): string {
        //throw new Error("Method not implemented.")
        return path.replace(/[^a-z0-9_-]+/gi, "-").replace(/^-+/g, "").replace(/-+$/, "")
    }

    /**
     * 
     * @param fullPage 
     * @param args 
     */
    static async generateName(taiko:Taiko, fullPage: boolean = false, ... args: TaikoSearchElement[]): Promise<string> {
        const crypto = require('crypto')
        const url = await taiko.currentURL()
        const urlPart = ScreenCheck.simplifyPath(url.replace(/^\w*\:/gi, ""))
        return `${urlPart}${(args.length ? "-" : "") + args.map(arg => crypto.createHash('md5').update(arg.description).digest("hex").match(/.{6}/)).join("-")}${fullPage ? '-fullpage' : ''}`
    }
}

export default ScreenCheck