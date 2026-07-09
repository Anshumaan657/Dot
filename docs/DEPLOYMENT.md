# Deployment Checklist

This checklist keeps the first public launch calm and reversible.

## Before Pushing

```bash
npm install
npm run check
npm run make:mac
npm run dist
```

Confirm these files exist locally:

```text
dist/Dot-0.1.0-arm64.dmg
dist/Dot-0.1.0-arm64-mac.zip
dist/mac-arm64/Dot.app
```

## First GitHub Push

```bash
git remote add origin git@github.com:Anshumaan657/Dot.git
git add .
git commit -m "Initial public release"
git push -u origin main
```

Use the HTTPS remote instead if you prefer:

```bash
git remote add origin https://github.com/Anshumaan657/Dot.git
```

## Landing Page

After pushing, enable GitHub Pages:

1. Open the repository on GitHub.
2. Go to `Settings > Pages`.
3. Under `Build and deployment`, choose `GitHub Actions`.
4. Run or wait for the `Pages` workflow.

The landing page will be:

```text
https://anshumaan657.github.io/Dot/
```

## Release

Create a release tag:

```bash
git tag v0.1.0
git push origin v0.1.0
```

The `Release` workflow creates a draft release with macOS artifacts. Review the draft release, then publish it.

## Public Notes

- The current public build is macOS-first.
- The app is unsigned unless you add Apple Developer ID signing and notarization.
- Unsigned macOS apps can show a Gatekeeper warning on first launch.
- Windows support should be announced only after a Windows build and fullscreen behavior are tested.
