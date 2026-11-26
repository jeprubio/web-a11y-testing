# Project structure: the monorepo explained for Android developers

The repository has the same split as the Android `a11ytesting` project: a library that can be published and a sample app that never is, whose tests use the library. On the web this is done with **npm workspaces**.

## Gradle to npm, term by term

| Gradle / Android | npm / web | In this repo |
|---|---|---|
| Root `settings.gradle(.kts)` with `include(":library", ":app")` | Root `package.json` with `"workspaces": ["packages/*", "apps/*"]` | [`package.json`](../package.json) |
| Module `build.gradle` | Each workspace's own `package.json` | `packages/a11y-testing/package.json`, `apps/sample/package.json` |
| `group:artifact:version` | Package `name` and `version` | `@jeprubio/playwright-a11y@0.1.0` |
| Library module published as an AAR to Maven | Library package that can be published as a tarball to the npm registry | `packages/a11y-testing` |
| App module, never published | `"private": true` (npm refuses to publish it) | `apps/sample` |
| `androidTestImplementation(project(":library"))` | `"devDependencies": { "@jeprubio/playwright-a11y": "*" }`, which npm links to the local folder | `apps/sample/package.json` |
| `compileOnly` / dependency provided by the consumer | `peerDependencies` | `@playwright/test` is a peer of the library |
| `implementation` dependency shipped with the library | `dependencies` | `@axe-core/playwright` |
| Public API / `internal` visibility | The `exports` map: only `dist/index.js` can be imported; other files are private | `packages/a11y-testing/package.json` |
| `assemble` → AAR in `build/outputs` | `tsc` → JavaScript and `.d.ts` files in `dist/` | `npm run build:lib` |
| Local unit tests in the library module (`src/test`) | Library tests on inline HTML fixtures | `packages/a11y-testing/test` |
| Instrumented tests in the app (`src/androidTest`) | Playwright tests in the sample app, against the real page | `apps/sample/tests` |
| `./gradlew publish` | `npm publish -w @jeprubio/playwright-a11y` | not done yet |

## How the sample app uses the library

1. `npm install` at the root sees both workspaces and creates a link: `node_modules/@jeprubio/playwright-a11y` → `packages/a11y-testing`. Nothing is downloaded from npm for it.
2. The library's `package.json` says its entry point is `dist/index.js`, so the library must be **built** before the sample can use it. Every root test script runs `build:lib` first.
3. The sample's tests import it exactly as an external project would:

   ```ts
   import { a11y } from '@jeprubio/playwright-a11y';
   ```

   If a test needs something the library does not export, the test fails to compile. That's the same guarantee you get from a separate Gradle module.

## Why `@playwright/test` is a peer dependency

Playwright must be a single copy: the `test` and `expect` objects the library uses have to be the same ones the project's tests run with, or test steps and attachments end up in the wrong place. A peer dependency says "the project using me provides Playwright", the same way an Android test library expects the app to bring its own test runner.

## Two kinds of tests

| | Library tests (`packages/a11y-testing/test`) | Sample app tests (`apps/sample/tests`) |
|---|---|---|
| Purpose | Prove each DSL method passes and fails correctly | Prove the library works on a real page, and serve as usage examples |
| Page under test | Small HTML snippets loaded with `page.setContent` | The DuckOps sample site, served by Vite |
| Imports | `../src/index.js` (the source) | `@jeprubio/playwright-a11y` (the built package) |
| Includes failure cases | Yes: they assert on error messages | A few (animations before pausing), plus broken mode |

## Publishing (when you are ready)

1. Create the `@jeprubio` scope on npmjs.com (or rename the package to an unscoped name).
2. Check the contents with `npm run pack:lib`.
3. Bump the version in `packages/a11y-testing/package.json`.
4. Publish:

   ```bash
   npm publish -w @jeprubio/playwright-a11y --access public
   ```

   `prepublishOnly` rebuilds `dist/` first.

The library is declared as MIT-licensed in its `package.json`. Add a `LICENSE` file before publishing, or change the license if your organisation needs a different one.
