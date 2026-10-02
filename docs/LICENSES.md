# Licensing

## Project licence

NextGen Utility Hub is released under the [MIT License](../LICENSE).
Copyright (c) 2026 Md. Maniruzzaman.

You may use, copy, modify, merge, publish, distribute, sublicense and sell copies of the
software, provided the copyright notice and permission notice are kept in all copies or
substantial portions. The software is provided “as is”, without warranty.

## What ships to users

The production build (`dist/`) contains only this project’s own TypeScript, CSS and HTML.
There are **no runtime dependencies**, no web fonts, no CDN scripts and no third-party
assets. Icons are hand-written SVG paths in `src/ui/icons.ts`.

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
browsers available in CI and local tooling. Planned additions such as `pdf-lib` must be
added to this file, with verified licence data, when they are introduced.
