/* mock-fs is priority import */
import mockfs from "mock-fs"
import * as fse from "fs-extra"
import * as assert from "assert"
import { ScreenCheck, ScreenCheckResult, ScreenCheckResultType, ScreenCheckSetup } from "../ScreenCheck"
import path from "path"

describe('ScreenCheck', () => {
    const taiko = {
        currentURL: () => "https://dcdc.io/events#latest"
    }

    describe('#setup()', () => {
        const expectedBaseDir = path.join(__dirname, "temp_safe_to_delete")

        it('should set ScreenCheck.baseDir', async () => {            
            mockfs({
                [expectedBaseDir]: {}
            })
            // @ts-ignore
            await ScreenCheck.init(taiko)
            assert.notEqual((await ScreenCheck.setup()).baseDir, expectedBaseDir)
            await ScreenCheck.setup({baseDir: expectedBaseDir})
            assert.equal((await ScreenCheck.setup()).baseDir, expectedBaseDir)
            mockfs.restore()
        })

        it('should set ScreenCheck.runId', async () => {
            mockfs({
                [expectedBaseDir]: {}
            })
            // @ts-ignore
            await ScreenCheck.init(taiko)
            await ScreenCheck.setup({baseDir: expectedBaseDir})
            // assert.equal(ScreenCheck.runId.split("-").length, 2)
            mockfs.restore()
        })
    })

    describe('#simplifyPath', () => {
        it('should remove all unsafe characters', async () => {
            const badPath = "C:/windows/system32/image.png"
            const expectedPath = "C-windows-system32-image-png"
            const actualPath = ScreenCheck.simplifyPath(badPath)
            assert.equal(actualPath, expectedPath)
        })
    })

    describe('#generateFilename', () => {
        it('should generate a path without element searching', async () => {
            const expectedFilename = "dcdc-io-events-latest"
            // @ts-ignore
            const actualFilename = await ScreenCheck.generateName(taiko)
            assert.equal(actualFilename, expectedFilename)
        })

        it('should generate a path with element searching', async () => {
            const expectedFilename = "dcdc-io-events-latest-407833-fullpage"
            const textElement = { description: 'Element with text "hello"' }
            // @ts-ignore
            const actualFilename = await ScreenCheck.generateName(taiko, true, textElement)
            assert.equal(actualFilename, expectedFilename)
        })
    })

    describe("#screencheck", () => {
        beforeEach(async () => {
            // @ts-ignore
            await ScreenCheck.init(taiko)
            await ScreenCheck.setup({runId:"0001.auto", refRunId:"reference"})
            mockfs({})
        })
        afterEach(() => 
            mockfs.restore()
        )
        it('should take a screenshot without arguments', async () => {
            let hit = 0
            // @ts-ignore
            taiko.screenshot = async () =>  {
                hit++
                mockfs({ "0001.auto/dcdc-io-events-latest.png": "0123456789" })
            }
            await ScreenCheck.screencheck()
            assert.equal(hit, 1)
        })

        it('should take a screenshot with arguments', async () => {
            let hit = 0
            let callargs:any[] = []
            // @ts-ignore
            taiko.screenshot = async function() {
                // @ts-ignore 
                callargs = arguments
                mockfs({ "0001.auto/dcdc-io-events-latest-0cc175-92eb5f-fullpage.png": "0123456789" })
             }
            await ScreenCheck.screencheck({fullPage:true, encoding:"base64"}, {description:"a"}, {description:"b"})
            assert.equal(
                JSON.stringify(Array.from(callargs)),
                JSON.stringify([{fullPage:true, encoding:"base64", path: path.join((await ScreenCheck.setup()).baseDir || "", (await ScreenCheck.setup()).runId || "") + "/dcdc-io-events-latest-0cc175-92eb5f-fullpage.png"}, {description:"a"}, {description:"b"}])
            )
        })

        it('should return NO_BASE_IMAGE result when there is no base image', async () => {
            const fs = {}
            // @ts-ignore
            taiko.screenshot = async (options) => {
                mockfs.restore()
                // @ts-ignore
                fs[options.path] = fse.readFileSync(path.join(__dirname, "image_1.png"))
                mockfs(fs)
            }
            const result = await ScreenCheck.screencheck()
            assert.equal(result.result, ScreenCheckResultType.NO_BASE_IMAGE)
            assert.ok(result.data)
            assert.equal(result.referenceData, undefined)
        })

        it('should return SAME when base and new image match', async () => {
            mockfs.restore()
            const fs = {
                "reference/dcdc-io-events-latest.png": fse.readFileSync(path.join(__dirname, "image_1.png"))
            }
            mockfs(fs)
            // @ts-ignore
            taiko.screenshot = async (options) => {
                mockfs.restore()
                // @ts-ignore
                fs[options.path] = fse.readFileSync(path.join(__dirname, "image_1.png"))
                mockfs(fs)
            }
            const result = await ScreenCheck.screencheck()
            assert.equal(result.result, ScreenCheckResultType.SAME)
            assert.ok(result.data)
            assert.equal(result.referenceData, undefined)
        })

        it('should return DIFFERENT when base and new image differ', async () => {
            mockfs.restore()
            const fs = {
                "reference/dcdc-io-events-latest.png": fse.readFileSync(path.join(__dirname, "image_1.png"))
            }
            mockfs(fs)
            // @ts-ignore
            taiko.screenshot = async (options) => {
                mockfs.restore()
                // @ts-ignore
                fs[options.path] = fse.readFileSync(path.join(__dirname, "image_2.png"))
                mockfs(fs)
            }
            const result = await ScreenCheck.screencheck()
            assert.equal(result.result, ScreenCheckResultType.DIFFERENT)
            assert.ok(result.data)
            assert.ok(result.referenceData)
        })
    })

    describe('#compareImages', () => {
        it('should produce a diff image', async () => {
            mockfs.restore()
            const image1 = `${__dirname}/image_1.png`
            const image2 = `${__dirname}/image_2.png`
            const diff = await ScreenCheck.compareImages(image1, image2)
            assert.equal(diff.missmatching, 719)            
        })
    })

    describe("#detectLastRunId", () => {
        it('should return 0 if there are no runs', async () => {
            mockfs({})
            // @ts-ignore
            await ScreenCheck.init(taiko)
            const index = await ScreenCheck.detectLatestAutoRunIdIndex()
            assert.equal(index, 0)
        })
    })

    describe('#getReferenceImagePath', () => {
        beforeEach(() => {
            mockfs({})
            //@ts-ignore
            ScreenCheck.init(taiko)
        })
        afterEach(() => mockfs.restore())

        describe('without setup', () => {
            it('should return null when there is no previous image', async () => {
                // @ts-ignore
                await ScreenCheck.init(taiko)
                const previousImage = await ScreenCheck.getReferenceImagePath("fake.png")
                assert.equal(previousImage, undefined)
            })
    
            it('should return a path when a previous image exists', async () => {
                // @ts-ignore
                await ScreenCheck.init(taiko)
                const realpath = path.join(process.cwd(), '0000.auto')
                const expectedImage = path.join(realpath, "fake.png")
                let fs = {[realpath]: {'fake.png': '0123456789'}}
                mockfs(fs)
                const previousImage = await ScreenCheck.getReferenceImagePath("fake.png")
                assert.ok(previousImage)
                assert.equal(path.normalize(previousImage!), path.normalize(expectedImage))
            })
        })

        describe('with setup', () => {
            it('should return null when there is no previous image', async () => {
                mockfs({})
                await ScreenCheck.setup({ baseDir:"/mock", runId: "0001", refRunId: "0000" })   
                const previousImage = await ScreenCheck.getReferenceImagePath("fake.png")
                assert.equal(previousImage, undefined)
            })
    
            it('should return a path when a previous image exists', async () => {            
                await ScreenCheck.setup({ baseDir:"/mock", runId: "0001", refRunId: "0000" })   
                mockfs({
                    '/mock/0000': {
                        'fake.png': '0123456789'
                    }
                })
                const previousImage = await ScreenCheck.getReferenceImagePath("fake.png")
                assert.ok(previousImage)
                const expectedImage = "/mock/0000/fake.png"
                assert.equal(path.normalize(previousImage!), path.normalize(expectedImage))
            })
        })
    })
    
})