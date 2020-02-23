/* we import taiko typings but we don't want the module install */
/// <reference path="taiko.d.ts" />
import { Taiko, TaikoScreenshotOptions, TaikoSearchElement } from "taiko"
import * as fse from "fs-extra"
import PixelMatch from "pixelmatch"
import path from "path"
import { PNG } from "pngjs"
import assert from "assert"
import isDocker from "is-docker"
import { isBuffer } from "util"

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
    constructor(result = ScreenCheckResultType.SAME, data: Buffer, referenceData?: Buffer, pixelCount?: number) {
        this.result = result
        this.data = data
        this.referenceData = referenceData
        this.pixelCount = pixelCount || 0
    }
    async getDiff(): Promise<Buffer | void> {
        if (this.referenceData) {
            return (await ScreenCheck.compareImages(this.referenceData, this.data)).diffImage.data
        }
    }
    toString(): string {
        return this.result.toString()
    }
    isSame(): boolean {
        return this.result === ScreenCheckResultType.SAME
    }
    isDifferent(): boolean {
        return this.result === ScreenCheckResultType.DIFFERENT
    }
    okay(): void {
        assert.equal(this.result, ScreenCheckResultType.SAME, "the screenshot does not match the reference screenshot")
    }
}

const pendingExports: { name: string; value: any }[] = []

function entryPoint(): any {
    return function (target: Object, key: string, descriptor: TypedPropertyDescriptor<(taiko: Taiko) => void>) {
        const init = descriptor.value
        descriptor.value = function (taiko: Taiko): void {
            init!(taiko)
            while (pendingExports.length) {
                let { name, value } = pendingExports.pop()!
                // @ts-ignore
                taiko[name] = value
            }
        }
    }
}

function exportForPlugin(name: string): any {
    return async function (target: Object, key: string, descriptor: PropertyDescriptor) {
        pendingExports.push({ name, value: descriptor.value })
    }
}

function cached(duration:number = NaN): any {
    return function(target: Object, key:string, descriptor: PropertyDescriptor) {
        const func = descriptor.value
        descriptor.value = function():any {
            if (descriptor.value._has_run && descriptor.value._expires <= Date.now()) {
                return descriptor.value._return
            }
            descriptor.value._return = func(...arguments)
            descriptor.value._expires = isNaN(duration) ? 0 : Date.now() + Math.ceil(duration)
            descriptor.value._has_run = true
            return descriptor.value._return
        }
    }
}

export type FilenameGenerator = (options: TaikoScreenshotOptions, ...args: TaikoSearchElement[]) => Promise<string>

export type ScreenCheckSetup = {
    baseDir: string
    runId?: string
    refRunId?: string
    filenameGenerator?: FilenameGenerator
}

export class ScreenCheck {

    static isSetup: boolean
    static baseDir: string
    static runId: string
    static refRunId: string
    static getRunDir = () => path.join(ScreenCheck.baseDir || "", ScreenCheck.runId || "")
    static getRefDir = () => path.join(ScreenCheck.baseDir || "", ScreenCheck.refRunId || "")
    static taiko: Taiko
    static _openBrowser: any
    static filenameGenerator: FilenameGenerator

    @entryPoint()
    static init(taiko: Taiko): void {
        /** hooks */
        ScreenCheck._openBrowser = taiko.openBrowser

        ScreenCheck.filenameGenerator = async (
            options: TaikoScreenshotOptions, ...args: TaikoSearchElement[]
        ) => `${await ScreenCheck.generateName(ScreenCheck.taiko, options.fullPage, ...args)}.png`
        ScreenCheck.taiko = taiko
    }

    /**
     * opens the browser, ensuring renderer pixel ratio is 1:1 to display device
     * @param options taiko openBrowser options
     * @param useOriginalCall use default arguments when launching chromium, otherwise forces 1:1 pixel ratio (default)
     */
    @exportForPlugin("openBrowser")
    static async openBrowser(options: any = {}, useOriginalCall: Boolean = false): Promise<void> {
        if (useOriginalCall) {
            await ScreenCheck._openBrowser(options)
        } else {
            options.args = [...(options.args || []), 
                '--disable-gpu',
                '--high-dpi-support=1',
                '--device-scale-factor=1',
                '--force-device-scale-factor=1',
                ...(ScreenCheck.isContainerEnvironment() ? [
                    '--headless',
                    '--no-sandbox'
                ] : [])
            ]
            await ScreenCheck._openBrowser(options)
            await ScreenCheck.taiko.setViewPort(PageSize.default)
        }
    }

    /**
     * configures screencheck
     * @param options screencheck configuration
     */
    @exportForPlugin("screencheckSetup")
    static async setup(options?: ScreenCheckSetup): Promise<ScreenCheckSetup> {
        ScreenCheck.baseDir = options && options.baseDir || process.cwd()
        ScreenCheck.runId = options && options.runId ? options.runId : await ScreenCheck.nextRunId()
        ScreenCheck.refRunId = options && options.refRunId ? options.refRunId : await ScreenCheck.latestRunId()
        ScreenCheck.filenameGenerator = options && options.filenameGenerator ? options.filenameGenerator : ScreenCheck.filenameGenerator
        ScreenCheck.isSetup = true
        return {
            baseDir: ScreenCheck.baseDir,
            runId: ScreenCheck.runId,
            refRunId: ScreenCheck.refRunId,
            filenameGenerator: ScreenCheck.filenameGenerator
        }
    }

    @cached()
    static async detectLatestRunIdIndex(): Promise<number> {
        let current = (await fse.readdir(ScreenCheck.baseDir))
            .filter(name => name.match(/^\d+\./))
            .filter(name => fse.lstatSync(name).isDirectory)
            .sort()
            .map(name => parseInt(name.split(".")[0]))
            .reverse()[0]
            || 0
        return current
    }

    static async latestRunId(): Promise<string> {
        const current = await ScreenCheck.detectLatestRunIdIndex()
        return `${current.toString().padStart(4, "0")}.auto`
    }

    static async nextRunId(): Promise<string> {
        const current = await ScreenCheck.detectLatestRunIdIndex()
        let next = current + 1
        return `${next.toString().padStart(4, "0")}.auto`
    }

    static async screencheck(options?: TaikoScreenshotOptions, ...args: TaikoSearchElement[]): Promise<ScreenCheckResult> {
        if (!ScreenCheck.isSetup)
            ScreenCheck.setup()
        options = options || {}
        if (options.path && path.isAbsolute(options.path)) {
            throw "options.path cannot be absolute. Please specify a directory relative to .baseDir"
        }
        const relativeFilename: string = options.path || await ScreenCheck.filenameGenerator(options, ...args)
        const referenceImage = await ScreenCheck.getReferenceImagePath(relativeFilename)
        options.path = `${ScreenCheck.getRunDir()}/${relativeFilename}`
        await fse.mkdirp(ScreenCheck.getRunDir() + "/")
        await ScreenCheck.taiko.screenshot(options as TaikoScreenshotOptions, ...args)
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

    static async getReferenceImagePath(current: string): Promise<string | undefined> {
        const absolutePath = path.join(ScreenCheck.getRefDir(), current)
        if (await fse.pathExists(absolutePath)) {
            return absolutePath
        }
        return undefined
    }

    static async compareImages(left: string | Buffer, right: string | Buffer): Promise<{ missmatching: number, diffImage: PNG }> {
        const leftImage = PNG.sync.read(isBuffer(left) ? left : fse.readFileSync(left))
        const rightImage = PNG.sync.read(isBuffer(right) ? right : fse.readFileSync(right))
        const { width, height } = leftImage
        const diffImage = new PNG({ width, height })
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
     * generates a name for a unique name for a screenshot
     * @param taiko an instance of taiko
     * @param fullPage if true is capture of whole page
     * @param args taiko screenshot search elements
     */
    static async generateName(taiko: Taiko, fullPage: boolean = false, ...args: TaikoSearchElement[]): Promise<string> {
        const crypto = require('crypto')
        const url = await taiko.currentURL()
        const urlPart = ScreenCheck.simplifyPath(url.replace(/^\w*\:/gi, ""))
        return `${urlPart}${(args.length ? "-" : "") + args.map(arg => crypto.createHash('md5').update(arg.description).digest("hex").match(/.{6}/)).join("-")}${fullPage ? '-fullpage' : ''}`
    }

    @exportForPlugin("isContainerEnvironment")
    static isContainerEnvironment():boolean {
        return process.env.IS_CONTAINER !== undefined || isDocker()
    }
}

export default ScreenCheck