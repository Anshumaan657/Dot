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

Add the SHA256 checksum for the `.dmg` to the release notes so users can verify the download:

```bash
shasum -a 256 dist/Dot-0.1.0-arm64.dmg
```

## GitHub Release Build

The workflow in `.github/workflows/release.yml` builds release files when you push a tag:

```bash
git tag v0.1.0
git push origin v0.1.0
```

The workflow creates a draft release with the generated macOS artifacts.

## Signing And Notarization

For public distribution without scary macOS warnings, configure Apple Developer ID signing and notarization in GitHub Actions.

Until then, publish Dot as an unsigned open-source build and tell users macOS may block first launch. If macOS says Dot is damaged after download, users can move Dot to Applications and run:

```bash
xattr -dr com.apple.quarantine /Applications/Dot.app
open /Applications/Dot.app
```
