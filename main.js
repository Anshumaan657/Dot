const { app, BrowserWindow, ipcMain, nativeImage, screen, Tray, Menu, globalShortcut } = require("electron");
const fs = require("fs");
const path = require("path");

const APP_NAME = "Dot";
const PET_SIZE = { width: 220, height: 232 };
const SETTINGS_SIZE = { width: 430, height: 640 };
const CURSOR_TICK_MS = 40;
const DRAG_TICK_MS = 16;

const DEFAULT_SETTINGS = {
  petName: "Dot",
  catColor: "#f7efe1",
  patternColor: "#262a31",
  accentColor: "#ff7a59",
  keyboardWatch: false,
  hideInFullscreen: true,
  openAtLogin: false,
  stretchMinutes: 45,
  pomodoroFocus: 25,
  pomodoroBreak: 5,
  fixedMessageEnabled: false,
  fixedMessage: "Drink water",
  reminderMinutes: 10,
  reminderMessage: "Back stretch"
};

const KEY_ACCELERATORS = [
  ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""),
  ..."0123456789".split(""),
  "Space",
  "Backspace",
  "Enter",
  "Tab"
];

let petWindow;
let settingsWindow;
let tray;
let settingsCache;
let keyboardWatchOn = false;
let cursorTimer;
let dragTimer;
let dragOffset = null;
let ignoreMouse = false;

function settingsPath() {
  return path.join(app.getPath("userData"), "settings.json");
}

function readSettings() {
  if (settingsCache) {
    return settingsCache;
  }

  try {
    const raw = fs.readFileSync(settingsPath(), "utf8");
    settingsCache = { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    settingsCache = { ...DEFAULT_SETTINGS };
  }

  return settingsCache;
}

function writeSettings(nextSettings) {
  settingsCache = { ...DEFAULT_SETTINGS, ...nextSettings };
  fs.mkdirSync(app.getPath("userData"), { recursive: true });
  fs.writeFileSync(settingsPath(), JSON.stringify(settingsCache, null, 2));
  return settingsCache;
}

function broadcast(channel, payload) {
  for (const target of [petWindow, settingsWindow]) {
    if (target && !target.isDestroyed()) {
      target.webContents.send(channel, payload);
    }
  }
}

function syncLoginItem(enabled, force = false) {
  if (!app.isPackaged) {
    return false;
  }

  try {
    if (enabled || force) {
      app.setLoginItemSettings({
        openAtLogin: Boolean(enabled),
        openAsHidden: true
      });
    }

    return app.getLoginItemSettings().openAtLogin;
  } catch {
    return false;
  }
}

function createTrayImage() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
      <rect width="32" height="32" fill="none"/>
      <path d="M7 14 L10 5 L16 11 L22 5 L25 14 L23 25 L9 25 Z" fill="#f7efe1" stroke="#262a31" stroke-width="2" stroke-linejoin="round"/>
      <path d="M9 13 L10 5 L16 11 L14 14 Z" fill="#262a31"/>
      <rect x="11" y="16" width="4" height="4" fill="#262a31"/>
      <rect x="18" y="16" width="4" height="4" fill="#262a31"/>
      <rect x="15" y="21" width="3" height="2" fill="#ff7a59"/>
      <path d="M7 20 H2 M8 22 H3 M24 20 H30 M23 22 H29" stroke="#262a31" stroke-width="1.5"/>
    </svg>
  `.trim();

  return nativeImage.createFromDataURL(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);
}

function buildControlMenu() {
  const settings = readSettings();
  const petVisible = Boolean(petWindow && !petWindow.isDestroyed() && petWindow.isVisible());

  return Menu.buildFromTemplate([
    {
      label: petVisible ? "Minimize Dot" : "Show Dot",
      click: () => {
        if (petVisible) {
          petWindow.hide();
        } else {
          showPetWindow();
        }
      }
    },
    {
      label: "Settings",
      click: () => showSettingsWindow()
    },
    {
      label: "Open at Login",
      type: "checkbox",
      checked: Boolean(settings.openAtLogin && app.isPackaged),
      click: (item) => {
        const desired = Boolean(item.checked);
        const actual = syncLoginItem(desired, true);
        const saved = writeSettings({ ...settings, openAtLogin: actual });
        broadcast("settings:changed", saved);
        refreshTrayMenu();
      }
    },
    {
      label: "Hide in Full Screen",
      type: "checkbox",
      checked: Boolean(settings.hideInFullscreen),
      click: (item) => {
        const saved = writeSettings({ ...settings, hideInFullscreen: Boolean(item.checked) });
        applyPetWorkspaceVisibility(saved);
        broadcast("settings:changed", saved);
        refreshTrayMenu();
      }
    },
    { type: "separator" },
    {
      label: "Quit Dot",
      click: () => app.quit()
    }
  ]);
}

function createApplicationMenu() {
  const menu = Menu.buildFromTemplate([
    {
      label: APP_NAME,
      submenu: [
        {
          label: "Settings",
          accelerator: "CommandOrControl+,",
          click: () => showSettingsWindow()
        },
        {
          label: "Show Dot",
          click: () => showPetWindow()
        },
        {
          label: "Minimize Dot",
          click: () => petWindow?.hide()
        },
        { type: "separator" },
        {
          label: "Quit Dot",
          accelerator: "CommandOrControl+Q",
          click: () => app.quit()
        }
      ]
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" }
      ]
    }
  ]);

  Menu.setApplicationMenu(menu);
}

function refreshTrayMenu() {
  if (tray) {
    tray.setContextMenu(buildControlMenu());
  }
}

function applyPetWorkspaceVisibility(settings = readSettings()) {
  if (!petWindow || petWindow.isDestroyed()) return;

  petWindow.setVisibleOnAllWorkspaces(true, {
    visibleOnFullScreen: !settings.hideInFullscreen
  });
}

function createPetWindow() {
  const primary = screen.getPrimaryDisplay();
  const workArea = primary.workArea;
  const settings = readSettings();

  petWindow = new BrowserWindow({
    width: PET_SIZE.width,
    height: PET_SIZE.height,
    x: Math.round(workArea.x + workArea.width - PET_SIZE.width - 48),
    y: Math.round(workArea.y + workArea.height - PET_SIZE.height - 64),
    frame: false,
    transparent: true,
    resizable: false,
    maximizable: false,
    minimizable: false,
    show: false,
    hasShadow: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    backgroundColor: "#00000000",
    title: APP_NAME,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      backgroundThrottling: false
    }
  });

  petWindow.loadFile(path.join(__dirname, "renderer", "index.html"), { query: { mode: "pet" } });
  petWindow.setAlwaysOnTop(true, "floating");
  applyPetWorkspaceVisibility(settings);

  petWindow.once("ready-to-show", () => {
    petWindow.showInactive();
    petWindow.webContents.send("settings:changed", settings);
  });

  petWindow.on("show", refreshTrayMenu);
  petWindow.on("hide", refreshTrayMenu);
  petWindow.on("closed", () => {
    petWindow = null;
    refreshTrayMenu();
  });

  if (cursorTimer) {
    clearInterval(cursorTimer);
  }

  cursorTimer = setInterval(() => {
    if (!petWindow || petWindow.isDestroyed()) return;
    const cursor = screen.getCursorScreenPoint();
    petWindow.webContents.send("cursor:update", {
      cursor,
      windowBounds: petWindow.getBounds(),
      display: screen.getDisplayNearestPoint(cursor).workArea
    });
  }, CURSOR_TICK_MS);

  if (settings.keyboardWatch) {
    setKeyboardWatch(true);
  }
}

function showPetWindow() {
  if (!petWindow || petWindow.isDestroyed()) {
    createPetWindow();
    return;
  }

  petWindow.showInactive();
  petWindow.setAlwaysOnTop(true, "floating");
  applyPetWorkspaceVisibility();
  refreshTrayMenu();
}

function showSettingsWindow() {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.show();
    settingsWindow.focus();
    return;
  }

  settingsWindow = new BrowserWindow({
    width: SETTINGS_SIZE.width,
    height: SETTINGS_SIZE.height,
    frame: true,
    transparent: false,
    resizable: false,
    maximizable: false,
    minimizable: true,
    show: false,
    backgroundColor: "#f8f4ec",
    title: "Dot Settings",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      backgroundThrottling: false
    }
  });

  settingsWindow.loadFile(path.join(__dirname, "renderer", "index.html"), { query: { mode: "settings" } });

  settingsWindow.once("ready-to-show", () => {
    settingsWindow.show();
    settingsWindow.webContents.send("settings:changed", readSettings());
  });

  settingsWindow.on("closed", () => {
    settingsWindow = null;
  });
}

function createTray() {
  tray = new Tray(createTrayImage());
  tray.setToolTip(APP_NAME);
  tray.on("click", () => showSettingsWindow());
  refreshTrayMenu();
}

function setMousePassthrough(shouldIgnore) {
  if (!petWindow || petWindow.isDestroyed() || ignoreMouse === shouldIgnore) return;
  ignoreMouse = shouldIgnore;
  petWindow.setIgnoreMouseEvents(shouldIgnore, { forward: true });
}

function setKeyboardWatch(enabled) {
  if (keyboardWatchOn === enabled) return keyboardWatchOn;

  globalShortcut.unregisterAll();
  keyboardWatchOn = false;

  if (!enabled) {
    return false;
  }

  let registered = 0;
  for (const accelerator of KEY_ACCELERATORS) {
    let ok = false;
    try {
      ok = globalShortcut.register(accelerator, () => {
        petWindow?.webContents.send("input:typing", { source: "globalShortcut", key: accelerator });
      });
    } catch {
      ok = false;
    }

    if (ok) {
      registered += 1;
    }
  }

  keyboardWatchOn = registered > 0;
  return keyboardWatchOn;
}

function startDragging() {
  if (!petWindow || petWindow.isDestroyed()) return;
  const cursor = screen.getCursorScreenPoint();
  const bounds = petWindow.getBounds();
  dragOffset = {
    x: cursor.x - bounds.x,
    y: cursor.y - bounds.y
  };

  if (dragTimer) {
    clearInterval(dragTimer);
  }

  dragTimer = setInterval(() => {
    if (!petWindow || petWindow.isDestroyed() || !dragOffset) return;
    const point = screen.getCursorScreenPoint();
    petWindow.setPosition(Math.round(point.x - dragOffset.x), Math.round(point.y - dragOffset.y), false);
  }, DRAG_TICK_MS);
}

function stopDragging() {
  dragOffset = null;
  if (dragTimer) {
    clearInterval(dragTimer);
    dragTimer = null;
  }
}

app.whenReady().then(() => {
  app.setName(APP_NAME);
  app.setAppUserModelId("app.dot.desktop");

  const saved = readSettings();
  const openAtLogin = saved.openAtLogin ? syncLoginItem(true) : false;
  writeSettings({ ...saved, openAtLogin });

  createApplicationMenu();
  createPetWindow();
  createTray();

  app.on("activate", () => {
    showPetWindow();
  });
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
  if (cursorTimer) {
    clearInterval(cursorTimer);
  }
  stopDragging();
});

app.on("window-all-closed", () => {});

ipcMain.handle("settings:get", () => readSettings());

ipcMain.handle("settings:save", (_event, nextSettings) => {
  const candidate = { ...readSettings(), ...nextSettings };
  const keyboardEnabled = setKeyboardWatch(Boolean(candidate.keyboardWatch));
  const openAtLogin = syncLoginItem(Boolean(candidate.openAtLogin), true);
  const normalized = writeSettings({
    ...candidate,
    keyboardWatch: keyboardEnabled,
    openAtLogin
  });

  applyPetWorkspaceVisibility(normalized);
  broadcast("settings:changed", normalized);
  refreshTrayMenu();
  return normalized;
});

ipcMain.handle("keyboard-watch:set", (_event, enabled) => {
  const ok = setKeyboardWatch(Boolean(enabled));
  const saved = writeSettings({ ...readSettings(), keyboardWatch: ok });
  broadcast("settings:changed", saved);
  return ok;
});

ipcMain.on("window:ignore-mouse", (_event, shouldIgnore) => setMousePassthrough(Boolean(shouldIgnore)));
ipcMain.on("window:open-settings", () => showSettingsWindow());
ipcMain.on("window:show-pet", () => showPetWindow());
ipcMain.on("window:hide-pet", () => petWindow?.hide());
ipcMain.on("window:quit", () => app.quit());
ipcMain.on("pet:drag-start", () => startDragging());
ipcMain.on("pet:drag-end", () => stopDragging());
ipcMain.on("pet:trigger", (_event, payload) => {
  petWindow?.webContents.send("pet:trigger", payload);
});
ipcMain.on("pet:context-menu", () => {
  buildControlMenu().popup({ window: petWindow || undefined });
});
