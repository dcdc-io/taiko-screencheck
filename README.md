# taiko screencheck

![Node.js CI](https://github.com/dcdc-io/taiko-screencheck/workflows/Node.js%20CI/badge.svg)

## Introduction

taiko-screencheck is a taiko plugin that assists visual regression testing by tracking changes to screenshots. It introduces a `screencheck` method that has the same signature as the built-in `screenshot` method, except that it returns the result of comparing this screenshot to a reference screenshot normally stored in a `/reference` subdirectory of the the working directory.

By default `taiko-screencheck` will automatically create a directory for screenshots whenever taiko is loaded. It is recommended that test developers use the `screenshot.setup` method to override this behaviour with information particular to a given test run.

## Taiko Methods

### `screencheck(screenshotOptions = {}): { result:string, data:Buffer, referenceData:Buffer = undefined, pixelCount:number }`

This method takes and saves a screenshot, and compares it to the reference screenshot to the equivalent screenshot in the detected or configured reference run (see below).

### `screencheckSetup(options = { runId:string = <000n.auto>, refRunId:string = <000n-1.auto>, baseDir:string = <cwd>}): options`

This method optionally configures screencheck to use custom directories for output and comparison.

## FAQs

1. My headless screen captures never match my headed screen captures of the same page.
   This may be happening because you have a high DPI display. Try setting your desktop as a 1:1 pixel ratio to your display device. Alternatively you may want to avoid headed mode for the creation of reference images.

## Contributing

Use the `_test_harness` subdirectory to explore your plugin in the taiko environment.
