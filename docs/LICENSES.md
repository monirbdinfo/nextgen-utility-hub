# Licensing

## Project licence

NextGen Utility Hub is released under the [MIT License](../LICENSE).
Copyright (c) 2026 Md. Maniruzzaman.

You may use, copy, modify, merge, publish, distribute, sublicense and sell copies of the
software, provided the copyright notice and permission notice are kept in all copies or
substantial portions. The software is provided “as is”, without warranty.

## What ships to users

The production build (`dist/`) contains this project’s own TypeScript, CSS and HTML, the
NextGen Tech BD logo, and the runtime dependencies below. There are no web fonts, no CDN
scripts and no third-party assets. Icons are hand-written SVG paths in `src/ui/icons.ts`.

| Package   | Version | Licence    | Used for                                                         |
| --------- | ------- | ---------- | ---------------------------------------------------------------- |
| `pdf-lib` | 1.17.1  | MIT        | Creating, merging, splitting and editing PDFs in the browser     |
| `jsqr`    | 1.4.0   | Apache-2.0 | Reading QR codes from the camera or a picture (loaded on demand) |

`jsqr` has no dependencies. `pdf-lib` pulls in `@pdf-lib/standard-fonts` (MIT), `@pdf-lib/upng`
(MIT), `pako` (MIT AND Zlib) and `tslib` (0BSD). Licences and versions were read from each
installed package’s `package.json`. All are permissive; none is copyleft.

**Notices.** These licences require their text to travel with the software, so
[`public/THIRD-PARTY-NOTICES.txt`](../public/THIRD-PARTY-NOTICES.txt) is published with the site
(at `THIRD-PARTY-NOTICES.txt` next to `index.html`). It is generated from the installed packages’
own licence files and a unit test (`tests/licenses.test.ts`) fails if a runtime dependency is
missing from it. When a runtime dependency is added or upgraded, regenerate the file and update
the table above.

**Why `jsqr`.** Scanning a QR code in Firefox and Safari is impossible without a decoder, because
they lack the `BarcodeDetector` API; it also lets the scanner be tested in all three engines and
lets the QR generator be verified by decoding its output. It is small (130 kB, 47 kB gzipped),
dependency-free, permissively licensed, and is fetched only when someone starts a scan. Its last
release was in 2020; it is stable but not actively developed.

**Logo.** `src/assets/brand/nextgen-tech-bd-logo.png` (250 × 250, transparent PNG) was
supplied by the project owner as the brand logo. `logo-mark.png` (the "NG" mark, 212 × 70)
and `logo-full.png` (mark and wordmark, 218 × 92) are exact 1:1 pixel crops of it. The logo
is the NextGen Tech BD brand mark; whether the MIT licence above also covers reuse of the
logo outside this project is for the owner to state.

## Development dependencies

These are used only to build, lint and test the project and are not bundled into the site.
Versions and licences below were read from each installed package’s `package.json`
(`node_modules/<name>/package.json`) on 2026-10-02.

| Package                  | Version | Licence    | Purpose                    |
| ------------------------ | ------- | ---------- | -------------------------- |
| `vite`                   | 6.4.3   | MIT        | Dev server and bundler     |
| `typescript`             | 5.9.3   | Apache-2.0 | Type checking              |
| `vitest`                 | 3.2.7   | MIT        | Unit test runner           |
| `jsdom`                  | 26.1.0  | MIT        | DOM for unit tests         |
| `@playwright/test`       | 1.56.1  | Apache-2.0 | Browser smoke tests        |
| `eslint`                 | 9.39.5  | MIT        | Linting                    |
| `@eslint/js`             | 9.39.5  | MIT        | ESLint recommended rules   |
| `typescript-eslint`      | 8.71.0  | MIT        | TypeScript lint rules      |
| `eslint-config-prettier` | 10.1.8  | MIT        | Disables conflicting rules |
| `prettier`               | 3.9.9   | MIT        | Formatting                 |

Across the full installed dependency tree, licences found were: MIT, MIT-0, Apache-2.0,
ISC, BSD-2-Clause, BSD-3-Clause, BlueOak-1.0.0 and Python-2.0 (all permissive; none
copyleft). The tree changes when dependencies are updated, so re-check with:

```bash
node -e 'const p=require("./package.json");for(const n of Object.keys(p.devDependencies)){const m=require(`./node_modules/${n}/package.json`);console.log(n,m.version,m.license)}'
```

`@playwright/test` is pinned to an exact version so its browser build matches the
browsers available in CI and local tooling. Any new dependency must be added to this file,
with verified licence data, when it is introduced.
