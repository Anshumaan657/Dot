const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("macPet", {
  getSettings: () => ipcRenderer.invoke("settings:get"),
  saveSettings: (settings) => ipcRenderer.invoke("settings:save", settings),
  setKeyboardWatch: (enabled) => ipcRenderer.invoke("keyboard-watch:set", enabled),
  setIgnoreMouse: (ignore) => ipcRenderer.send("window:ignore-mouse", ignore),
  openSettings: () => ipcRenderer.send("window:open-settings"),
  showPet: () => ipcRenderer.send("window:show-pet"),
  hidePet: () => ipcRenderer.send("window:hide-pet"),
  quit: () => ipcRenderer.send("window:quit"),
  dragStart: () => ipcRenderer.send("pet:drag-start"),
  dragEnd: () => ipcRenderer.send("pet:drag-end"),
  openPetMenu: () => ipcRenderer.send("pet:context-menu"),
  triggerPet: (action, payload = {}) => ipcRenderer.send("pet:trigger", { action, payload }),
  onCursor: (callback) => {
    ipcRenderer.on("cursor:update", (_event, payload) => callback(payload));
  },
  onTyping: (callback) => {
    ipcRenderer.on("input:typing", (_event, payload) => callback(payload));
  },
  onPetTrigger: (callback) => {
    ipcRenderer.on("pet:trigger", (_event, payload) => callback(payload));
  },
  onSettingsChanged: (callback) => {
    ipcRenderer.on("settings:changed", (_event, settings) => callback(settings));
  }
});
