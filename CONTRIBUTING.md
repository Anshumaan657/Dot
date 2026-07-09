# Contributing

Thanks for helping Dot stay tiny, useful, and cute.

## Local Setup

```bash
npm install
npm start
```

Run checks before opening a pull request:

```bash
npm run check
```

## Design Rules

- Keep the pet window clean. Controls belong in the menu bar, context menu, or settings window.
- Keep Dot original. Do not add paid app assets or copyrighted character art.
- Prefer small, readable changes over large rewrites.
- Keep settings local and transparent.

## Release Checks

Before publishing a release:

```bash
npm run icon
npm run check
npm run dist
```

Unsigned macOS builds are fine for local testing. Public releases should be signed and notarized for the smoothest install experience.
