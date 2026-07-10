# Dot

Dot is a tiny open-source desktop pixel cat for macOS. It opens a transparent always-on-top companion window with an original canvas-drawn cat that reacts to cursor movement, dragging, petting, typing signals, reminders, and Pomodoro sessions.

![Dot landing preview](site/preview.svg)

## Download

Download the latest Apple Silicon macOS build:

```text
https://github.com/Anshumaan657/Dot/releases/latest/download/Dot-0.1.0-arm64.dmg
```

Download the `.dmg`, open it, drag `Dot.app` into Applications, then launch Dot.

> Dot is currently an unsigned open-source build. macOS may block first launch because the app is not Apple Developer ID signed or notarized.

### If macOS Says Dot Is Damaged

After moving Dot to Applications, run:

```bash
xattr -dr com.apple.quarantine /Applications/Dot.app
open /Applications/Dot.app
```

This removes the download quarantine flag from your local copy of Dot.

### Verify The Download

SHA256 for `Dot-0.1.0-arm64.dmg`:

```text
f98af460451119f23b61b467c3476230b170e3c323f82647354caa50dad2cbda
```

## Run From Source

If you do not trust the unsigned download, build Dot locally from source:

```bash
git clone https://github.com/Anshumaan657/Dot.git
cd Dot
npm install
npm start
```

## Build The Mac App

Build a local `.app`:

```bash
npm run make:mac
```

Create release files for users:

```bash
npm run dist
```

The generated `.dmg` and `.zip` files appear in `dist/`.

> Public release note: unsigned macOS apps may show a Gatekeeper warning or a misleading damaged-app message. For the smoothest public install, sign and notarize the app with an Apple Developer ID before publishing releases.

## Settings

You can access Dot settings in three ways:

- Click the Dot menu bar icon.
- Right-click the cat and choose `Settings`.
- Use `Dot > Settings` from the macOS app menu.

Settings include colors, reminders, Pomodoro, keyboard watch, full-screen hiding, startup, show, minimize, and quit.

## Landing Page

The landing page is in `site/`. It is static HTML/CSS, so it can be deployed with GitHub Pages, Netlify, Vercel, or any static host.

For GitHub Pages, publish the `site/` folder. The expected URL will be:

```text
https://anshumaan657.github.io/Dot/
```

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for the first public launch checklist.

## Notes

Keyboard watch uses Electron global shortcuts. Some systems will not allow plain letter shortcuts globally, and macOS may require privacy permissions for deeper keyboard monitoring. The app still works without keyboard watch: open settings and use `Tap paws` to test the typing animation.

This project intentionally draws its own original pixel cat in canvas. No paid app assets or copyrighted character assets are used.

## Contributing

Dot is small on purpose. Keep changes focused, friendly, and easy to run locally. See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT. See [LICENSE](LICENSE).
