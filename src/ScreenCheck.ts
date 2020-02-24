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

/**
 * Image comparison result type.
 */
export enum ScreenCheckResultType {
    /**
     * No base image located.
     */
    NO_BASE_IMAGE = "NO_BASE_IMAGE",
    /**
     * The images are alike.
     */
    SAME = "SAME",
    /**
     * The images are different.
     */
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

/**
 * <strong>Decorator</strong>
 * 
 * Caches the return value of a function.
 * 
 * <strong>Warning:</strong> Does not consider parameters in cache key. Not recommended for memoizing functions with arity greater than zero.
 * @param duration ms duration for return value TTL
 */
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
        descriptor.value.invalidate = () => {
            delete descriptor.value._return
            delete descriptor.value._expires
            delete descriptor.value._has_run
        }
    }
}

function cacheInvalidate(method:string) {
    return function(target:any, propertyKey: string) {
        if (delete target[propertyKey]) {
            let value:any
            Object.defineProperty(target, propertyKey, {
                get: () => value,
                set: (newValue:any) => {
                    if (value !== newValue) {
                        if (target[method].invalidate) {
                            target[method].invalidate()
                        }
                    }
                    value = newValue
                },
                enumerable: true,
                configurable: true
            })
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

    private static isSetup: boolean
    @cacheInvalidate("detectLatestRunIdIndex")
    private static baseDir:string
    private static runId: string
    private static refRunId: string
    protected static getRunDir = () => path.join(ScreenCheck.baseDir || "", ScreenCheck.runId || "")
    protected static getRefDir = () => path.join(ScreenCheck.baseDir || "", ScreenCheck.refRunId || "")
    /**
     * The taiko exported API
     */
    static taiko: Taiko
    private static _openBrowser: any
    private static filenameGenerator: FilenameGenerator
    private static defaultFilenameGenerator = async (
        options: TaikoScreenshotOptions, ...args: TaikoSearchElement[]
    ) => `${await ScreenCheck.generateName(ScreenCheck.taiko, options.fullPage, ...args)}.png`

    @entryPoint()
    static init(taiko: Taiko): void {
        /** hooks */
        ScreenCheck._openBrowser = taiko.openBrowser

        ScreenCheck.filenameGenerator = ScreenCheck.defaultFilenameGenerator
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
        ScreenCheck.baseDir = options && options.baseDir || ScreenCheck.baseDir || process.cwd()
        ScreenCheck.runId = options && options.runId ? options.runId : ScreenCheck.runId || await ScreenCheck.nextRunId()
        ScreenCheck.refRunId = options && options.refRunId ? options.refRunId : ScreenCheck.refRunId || await ScreenCheck.latestRunId()
        ScreenCheck.filenameGenerator = options && options.filenameGenerator ? options.filenameGenerator : ScreenCheck.filenameGenerator
        ScreenCheck.isSetup = true
        return {
            baseDir: ScreenCheck.baseDir,
            runId: ScreenCheck.runId,
            refRunId: ScreenCheck.refRunId,
            filenameGenerator: ScreenCheck.filenameGenerator
        }
    }

    static async reset(): Promise<void> {
        ScreenCheck.baseDir = ""
        ScreenCheck.runId = ""
        ScreenCheck.refRunId = ""
        ScreenCheck.filenameGenerator = ScreenCheck.defaultFilenameGenerator
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

    /**
     * Returns the absolute path of the reference image corresponding to the given current image relative path.
     * @param current the path of the new image for which a reference image is required
     */
    static async getReferenceImagePath(current: string): Promise<string | undefined> {
        const absolutePath = path.join(ScreenCheck.getRefDir(), current)
        if (await fse.pathExists(absolutePath)) {
            return absolutePath
        }
        return undefined
    }

    /**
     * Compares PNG data and returns a diff PNG (with pngjs) and count of missmatching pixels.
     * @param left reference PNG data buffer
     * @param right new PNG data buffer
     */
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
     * Removes structure from a file path to flatten it to a filename.
     * e.g. /foo/bar/buzz.zip becomes foo-bar-buzz-zip
     * @param path a file path to simplify
     */
    static simplifyPath(path: string): string {
        //throw new Error("Method not implemented.")
        return path.replace(/[^a-z0-9_-]+/gi, "-").replace(/^-+/g, "").replace(/-+$/, "")
    }

    /**
     * Generates a name for a unique name for a screenshot.
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

    /**
     * Detect if execution is inside a container environment.
     * 
     * @remarks Exposed as isContainerEnvironment in taiko CLI
     */
    @exportForPlugin("isContainerEnvironment")
    static isContainerEnvironment():boolean {
        return process.env.IS_CONTAINER !== undefined || isDocker()
    }
}

export default ScreenCheck