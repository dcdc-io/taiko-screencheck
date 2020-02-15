# taiko screencheck

![Node.js CI](https://github.com/dcdc-io/taiko-screencheck/workflows/Node.js%20CI/badge.svg)

## Introduction

taiko-screencheck is a taiko plugin that assists visual regression testing by tracking changes to screenshots. It introduces a `screencheck` method that has the same signature as the built-in `screenshot` method, except that it returns the result of comparing this screenshot to a reference screenshot normally stored in a `/reference` subdirectory of the the working directory.

By default `taiko-screencheck` will automatically create a directory for screenshots whenever taiko is loaded. It is recommended that test developers use the `screenshot.setup` method to override this behaviour with information particular to a given test run.

## Contributing

Use the `_test_harness` subdirectory to explore your plugin in the taiko environment.
