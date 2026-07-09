# Releasing Dot

## Local Release Build

```bash
npm install
npm run icon
npm run check
npm run dist
```

Upload the generated `.dmg` and `.zip` from `dist/` to a GitHub Release.

For the complete first-launch flow, see [DEPLOYMENT.md](DEPLOYMENT.md).

## GitHub Release Build

The workflow in `.github/workflows/release.yml` builds release files when you push a tag:

```bash
git tag v0.1.0
git push origin v0.1.0
```

The workflow creates a draft release with the generated macOS artifacts.

## Signing And Notarization

For public distribution without scary macOS warnings, configure Apple Developer ID signing and notarization in GitHub Actions. Until then, users may need to right-click `Dot.app` and choose `Open` the first time.
