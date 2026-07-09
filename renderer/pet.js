const api = window.macPet;
const mode = new URLSearchParams(window.location.search).get("mode") || "pet";
const isPetMode = mode === "pet";
const isSettingsMode = mode === "settings";

const appRoot = document.getElementById("app");
const canvas = document.getElementById("petCanvas");
const ctx = canvas.getContext("2d");
const speech = document.getElementById("speech");
const petStage = document.getElementById("petStage");
const settingsPanel = document.getElementById("settingsPanel");
const settingsStatus = document.getElementById("settingsStatus");
const saveButton = document.getElementById("saveButton");
const showPetButton = document.getElementById("showPetButton");
const hidePetButton = document.getElementById("hidePetButton");
const quitButton = document.getElementById("quitButton");
const testTypingButton = document.getElementById("testTypingButton");
const stretchNowButton = document.getElementById("stretchNowButton");
const scheduleReminderButton = document.getElementById("scheduleReminderButton");
const pomodoroStartButton = document.getElementById("pomodoroStartButton");
const pomodoroPauseButton = document.getElementById("pomodoroPauseButton");
const pomodoroResetButton = document.getElementById("pomodoroResetButton");

const fields = {
  petName: document.getElementById("petNameInput"),
  catColor: document.getElementById("catColorInput"),
  patternColor: document.getElementById("patternColorInput"),
  accentColor: document.getElementById("accentColorInput"),
  keyboardWatch: document.getElementById("keyboardWatchInput"),
  hideInFullscreen: document.getElementById("hideInFullscreenInput"),
  openAtLogin: document.getElementById("openAtLoginInput"),
  stretchMinutes: document.getElementById("stretchMinutesInput"),
  pomodoroFocus: document.getElementById("focusMinutesInput"),
  pomodoroBreak: document.getElementById("breakMinutesInput"),
  fixedMessageEnabled: document.getElementById("fixedMessageEnabledInput"),
  fixedMessage: document.getElementById("fixedMessageInput"),
  reminderMinutes: document.getElementById("reminderMinutesInput"),
  reminderMessage: document.getElementById("reminderMessageInput")
};

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

let settings = { ...DEFAULT_SETTINGS };
let cursorPayload = null;
let mouseLocal = { x: 0, y: 0 };
let lastCursor = null;
let cursorSpeed = 0;
let typingHeat = 0;
let petHeat = 0;
let scrollHeat = 0;
let dragHeat = 0;
let stretchUntil = 0;
let reminderUntil = 0;
let messageUntil = 0;
let transientMessage = "";
let fixedMessage = "";
let dragging = false;
let mousePassthrough = false;
let stretchTimer = null;
let reminderTimer = null;
let lastFrame = performance.now();

const pomodoro = {
  running: false,
  mode: "focus",
  endsAt: 0,
  remainingSeconds: 0
};

appRoot.classList.add(isSettingsMode ? "settings-mode" : "pet-mode");
settingsPanel.hidden = !isSettingsMode;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function now() {
  return performance.now();
}

function secondsToLabel(seconds) {
  const safe = Math.max(0, Math.ceil(seconds));
  const min = String(Math.floor(safe / 60)).padStart(2, "0");
  const sec = String(safe % 60).padStart(2, "0");
  return `${min}:${sec}`;
}

function setStatus(text) {
  if (settingsStatus) {
    settingsStatus.textContent = text;
  }
}

function fillRect(x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function outlineRect(x, y, w, h, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.strokeRect(Math.round(x) + 1, Math.round(y) + 1, Math.round(w) - 2, Math.round(h) - 2);
}

function getFormSettings() {
  return {
    petName: fields.petName.value.trim() || DEFAULT_SETTINGS.petName,
    catColor: fields.catColor.value || DEFAULT_SETTINGS.catColor,
    patternColor: fields.patternColor.value || DEFAULT_SETTINGS.patternColor,
    accentColor: fields.accentColor.value || DEFAULT_SETTINGS.accentColor,
    keyboardWatch: fields.keyboardWatch.checked,
    hideInFullscreen: fields.hideInFullscreen.checked,
    openAtLogin: fields.openAtLogin.checked,
    stretchMinutes: clamp(Number(fields.stretchMinutes.value) || DEFAULT_SETTINGS.stretchMinutes, 1, 240),
    pomodoroFocus: clamp(Number(fields.pomodoroFocus.value) || DEFAULT_SETTINGS.pomodoroFocus, 1, 120),
    pomodoroBreak: clamp(Number(fields.pomodoroBreak.value) || DEFAULT_SETTINGS.pomodoroBreak, 1, 60),
    fixedMessageEnabled: fields.fixedMessageEnabled.checked,
    fixedMessage: fields.fixedMessage.value.trim() || DEFAULT_SETTINGS.fixedMessage,
    reminderMinutes: clamp(Number(fields.reminderMinutes.value) || DEFAULT_SETTINGS.reminderMinutes, 1, 240),
    reminderMessage: fields.reminderMessage.value.trim() || DEFAULT_SETTINGS.reminderMessage
  };
}

function syncForm(nextSettings) {
  settings = { ...DEFAULT_SETTINGS, ...nextSettings };
  fields.petName.value = settings.petName;
  fields.catColor.value = settings.catColor;
  fields.patternColor.value = settings.patternColor;
  fields.accentColor.value = settings.accentColor;
  fields.keyboardWatch.checked = Boolean(settings.keyboardWatch);
  fields.hideInFullscreen.checked = Boolean(settings.hideInFullscreen);
  fields.openAtLogin.checked = Boolean(settings.openAtLogin);
  fields.stretchMinutes.value = settings.stretchMinutes;
  fields.pomodoroFocus.value = settings.pomodoroFocus;
  fields.pomodoroBreak.value = settings.pomodoroBreak;
  fields.fixedMessageEnabled.checked = Boolean(settings.fixedMessageEnabled);
  fields.fixedMessage.value = settings.fixedMessage;
  fields.reminderMinutes.value = settings.reminderMinutes;
  fields.reminderMessage.value = settings.reminderMessage;
  fixedMessage = settings.fixedMessageEnabled ? settings.fixedMessage : "";
  document.documentElement.style.setProperty("--accent", settings.accentColor);

  if (isPetMode) {
    resetStretchTimer();
  }
}

function showMessage(text, durationMs = 3500) {
  if (!isPetMode) {
    setStatus(text);
    return;
  }

  transientMessage = text;
  messageUntil = now() + durationMs;
  updateSpeech();
}

function updateSpeech() {
  if (!isPetMode) return;

  const current = now();
  let text = "";

  if (transientMessage && current < messageUntil) {
    text = transientMessage;
  } else if (pomodoro.running) {
    const remaining = Math.max(0, (pomodoro.endsAt - Date.now()) / 1000);
    text = `${pomodoro.mode === "focus" ? "Focus" : "Break"} ${secondsToLabel(remaining)}`;
  } else if (fixedMessage) {
    text = fixedMessage;
  }

  if (!text) {
    speech.hidden = true;
    speech.textContent = "";
    return;
  }

  speech.hidden = false;
  speech.textContent = text;
}

function resetStretchTimer() {
  if (stretchTimer) {
    clearInterval(stretchTimer);
  }

  const ms = clamp(Number(settings.stretchMinutes) || 45, 1, 240) * 60 * 1000;
  stretchTimer = setInterval(() => triggerStretch(), ms);
}

function triggerStretch() {
  stretchUntil = now() + 6500;
  showMessage(`${settings.petName} says stretch.`, 5500);
}

function scheduleReminder(payload = {}) {
  if (reminderTimer) {
    clearTimeout(reminderTimer);
  }

  const minutes = clamp(Number(payload.minutes ?? fields.reminderMinutes.value) || settings.reminderMinutes, 1, 240);
  const text = String(payload.message || fields.reminderMessage.value || settings.reminderMessage).trim();

  reminderTimer = setTimeout(() => {
    reminderUntil = now() + 5500;
    showMessage(text, 5500);
  }, minutes * 60 * 1000);

  showMessage(`Reminder in ${minutes} min.`, 2500);
}

function startPomodoro(payload = {}) {
  const focusSeconds = clamp(Number(payload.focus ?? fields.pomodoroFocus.value) || settings.pomodoroFocus, 1, 120) * 60;

  if (!pomodoro.remainingSeconds) {
    pomodoro.remainingSeconds = focusSeconds;
    pomodoro.mode = "focus";
  }

  pomodoro.running = true;
  pomodoro.endsAt = Date.now() + pomodoro.remainingSeconds * 1000;
  showMessage("Focus started.", 1800);
}

function pausePomodoro() {
  if (!pomodoro.running) return;
  pomodoro.remainingSeconds = Math.max(0, Math.ceil((pomodoro.endsAt - Date.now()) / 1000));
  pomodoro.running = false;
  showMessage("Paused.", 1600);
}

function resetPomodoro() {
  pomodoro.running = false;
  pomodoro.mode = "focus";
  pomodoro.remainingSeconds = 0;
  pomodoro.endsAt = 0;
  showMessage("Timer reset.", 1600);
}

function tickPomodoro() {
  if (!pomodoro.running) return;
  const remaining = Math.ceil((pomodoro.endsAt - Date.now()) / 1000);

  if (remaining > 0) {
    return;
  }

  if (pomodoro.mode === "focus") {
    pomodoro.mode = "break";
    pomodoro.remainingSeconds = clamp(Number(fields.pomodoroBreak.value) || settings.pomodoroBreak, 1, 60) * 60;
    pomodoro.endsAt = Date.now() + pomodoro.remainingSeconds * 1000;
    reminderUntil = now() + 5000;
    showMessage("Break time.", 4800);
  } else {
    pomodoro.mode = "focus";
    pomodoro.remainingSeconds = clamp(Number(fields.pomodoroFocus.value) || settings.pomodoroFocus, 1, 120) * 60;
    pomodoro.endsAt = Date.now() + pomodoro.remainingSeconds * 1000;
    showMessage("Back to focus.", 4200);
  }
}

function triggerTyping() {
  typingHeat = clamp(typingHeat + 1.6, 0, 16);
  if (typingHeat > 10) {
    showMessage("Tiny paws overheating.", 1200);
  }
}

function computeCursorSpeed(payload) {
  if (!payload || !payload.cursor) return;
  if (!lastCursor) {
    lastCursor = { ...payload.cursor, time: now() };
    return;
  }

  const t = now();
  const dt = Math.max(1, t - lastCursor.time);
  const dx = payload.cursor.x - lastCursor.x;
  const dy = payload.cursor.y - lastCursor.y;
  const speed = Math.sqrt(dx * dx + dy * dy) / dt;
  cursorSpeed = lerp(cursorSpeed, speed, 0.4);
  lastCursor = { ...payload.cursor, time: t };
}

function getMood() {
  const current = now();

  if (dragging || dragHeat > 1) return "drag";
  if (current < stretchUntil) return "stretch";
  if (current < reminderUntil) return "reminder";
  if (typingHeat > 10) return "overheat";
  if (typingHeat > 1.4) return "typing";
  if (pomodoro.running && pomodoro.mode === "break") return "break";
  if (pomodoro.running && pomodoro.mode === "focus") return "focus";
  if (scrollHeat > 1.2) return "scroll";
  if (petHeat > 1.4) return "pet";
  if (cursorSpeed > 1.5) return "hunt";
  return "idle";
}

function drawPixelCat(mood) {
  const t = now() / 1000;
  const fur = settings.catColor;
  const pattern = settings.patternColor;
  const accent = settings.accentColor;
  const ink = "#24262b";
  const blush = "#f2a3a0";
  const steam = "#d7e8ed";
  const shadow = "rgba(36,38,43,0.20)";

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const bob = Math.round(Math.sin(t * 5) * (mood === "idle" ? 1 : 2));
  const typingBob = mood === "typing" || mood === "overheat" ? Math.round(Math.sin(t * 28) * 2) : 0;
  const stretch = mood === "stretch" ? 9 : 0;
  const squish = mood === "drag" ? Math.round(Math.sin(t * 16) * 4) : 0;
  const baseY = 15 + bob + typingBob - stretch;
  const headY = baseY + 7 - stretch - Math.max(0, squish);
  const bodyY = baseY + 54 + stretch;

  fillRect(23, 97, 64, 6, shadow);

  if (mood === "scroll") {
    fillRect(22, 79, 64, 15, "#fffdf7");
    outlineRect(22, 79, 64, 15, ink);
    fillRect(26, 84, 56, 2, "#ded7c8");
  }

  fillRect(70, bodyY + 8, 10, 19, pattern);
  fillRect(79, bodyY + 3, 8, 12, pattern);
  fillRect(86, bodyY - 4, 8, 10, pattern);
  fillRect(92, bodyY - 11, 6, 9, pattern);
  fillRect(96, bodyY - 17, 5, 7, pattern);
  fillRect(89, bodyY + 1, 5, 4, fur);
  fillRect(94, bodyY - 8, 4, 4, fur);

  fillRect(32 - squish, bodyY, 47 + squish * 2, 32 - stretch, fur);
  outlineRect(32 - squish, bodyY, 47 + squish * 2, 32 - stretch, ink);
  fillRect(43, bodyY + 7, 25, 19 - Math.round(stretch / 2), "#fff7ed");
  fillRect(40, bodyY + 25 - stretch, 9, 11 + stretch, fur);
  fillRect(61, bodyY + 25 - stretch, 9, 11 + stretch, fur);
  fillRect(39, bodyY + 34, 13, 5, ink);
  fillRect(59, bodyY + 34, 13, 5, ink);

  const pawLift = mood === "typing" || mood === "overheat" ? Math.round(Math.sin(t * 30) * 4) : 0;
  fillRect(29, bodyY + 14 - pawLift, 13, 13, fur);
  fillRect(70, bodyY + 14 + pawLift, 13, 13, fur);
  outlineRect(29, bodyY + 14 - pawLift, 13, 13, ink);
  outlineRect(70, bodyY + 14 + pawLift, 13, 13, ink);

  fillRect(22, headY + 11, 17, 14, pattern);
  fillRect(72, headY + 11, 17, 14, fur);
  fillRect(24, headY + 4, 14, 14, pattern);
  fillRect(74, headY + 4, 14, 14, fur);
  fillRect(28, headY + 9, 6, 8, "#f2aaa0");
  fillRect(78, headY + 9, 6, 8, "#f2aaa0");
  outlineRect(22, headY + 11, 17, 14, ink);
  outlineRect(72, headY + 11, 17, 14, ink);
  outlineRect(24, headY + 4, 14, 14, ink);
  outlineRect(74, headY + 4, 14, 14, ink);

  fillRect(29, headY + 20, 55, 37 + stretch, fur);
  outlineRect(29, headY + 20, 55, 37 + stretch, ink);
  fillRect(29, headY + 20, 17, 24, pattern);
  fillRect(48, headY + 20, 8, 6, pattern);
  fillRect(67, headY + 21, 7, 7, pattern);
  fillRect(31, headY + 56 + stretch, 51, 3, ink);

  let eyeDx = 0;
  let eyeDy = 0;
  if (cursorPayload && cursorPayload.cursor && cursorPayload.windowBounds) {
    const petCenterX = cursorPayload.windowBounds.x + window.innerWidth - 110;
    const petCenterY = cursorPayload.windowBounds.y + window.innerHeight - 122;
    const dx = cursorPayload.cursor.x - petCenterX;
    const dy = cursorPayload.cursor.y - petCenterY;
    eyeDx = clamp(Math.round(dx / 180), -2, 2);
    eyeDy = clamp(Math.round(dy / 180), -1, 2);
  }

  if (mood === "break") {
    fillRect(41, headY + 36, 12, 2, ink);
    fillRect(64, headY + 36, 12, 2, ink);
  } else {
    const eyeTall = mood === "hunt" ? 7 : 5;
    fillRect(40, headY + 33, 10, eyeTall, ink);
    fillRect(64, headY + 33, 10, eyeTall, ink);
    fillRect(43 + eyeDx, headY + 34 + eyeDy, 3, 3, "#fffdf7");
    fillRect(67 + eyeDx, headY + 34 + eyeDy, 3, 3, "#fffdf7");
  }

  fillRect(56, headY + 43, 5, 3, accent);
  fillRect(53, headY + 49, 4, 2, ink);
  fillRect(62, headY + 49, 4, 2, ink);
  fillRect(31, headY + 44, 16, 2, ink);
  fillRect(31, headY + 49, 15, 2, ink);
  fillRect(67, headY + 44, 16, 2, ink);
  fillRect(68, headY + 49, 15, 2, ink);

  if (mood === "pet" || mood === "reminder") {
    fillRect(36, headY + 42, 5, 3, blush);
    fillRect(74, headY + 42, 5, 3, blush);
  }

  if (mood === "overheat") {
    fillRect(32, headY + 20, 49, 15, "rgba(255, 122, 89, 0.45)");
    fillRect(42, headY - 7 + Math.round(Math.sin(t * 9) * 2), 5, 9, steam);
    fillRect(58, headY - 10 + Math.round(Math.cos(t * 8) * 2), 5, 11, steam);
    fillRect(74, headY - 6 + Math.round(Math.sin(t * 7) * 2), 5, 9, steam);
  }

  if (mood === "focus") {
    fillRect(83, headY + 24, 13, 13, "#fffdf7");
    outlineRect(83, headY + 24, 13, 13, ink);
    fillRect(89, headY + 27, 2, 5, ink);
    fillRect(89, headY + 32, 4, 2, ink);
  }

  if (mood === "reminder") {
    fillRect(83, headY + 20, 8, 18, accent);
    fillRect(83, headY + 41, 8, 6, accent);
    outlineRect(83, headY + 20, 8, 27, ink);
  }
}

function updateDecay(deltaSeconds) {
  typingHeat = Math.max(0, typingHeat - deltaSeconds * 2.6);
  petHeat = Math.max(0, petHeat - deltaSeconds * 2.2);
  scrollHeat = Math.max(0, scrollHeat - deltaSeconds * 3.8);
  dragHeat = Math.max(0, dragHeat - deltaSeconds * 4.4);
}

function frame() {
  const current = performance.now();
  const delta = Math.min(0.05, (current - lastFrame) / 1000);
  lastFrame = current;

  updateDecay(delta);
  tickPomodoro();
  updateSpeech();
  drawPixelCat(getMood());
  requestAnimationFrame(frame);
}

function updateMousePassthrough(event) {
  if (!isPetMode) return;

  if (dragging) {
    if (mousePassthrough) {
      mousePassthrough = false;
      api.setIgnoreMouse(false);
    }
    return;
  }

  const target = document.elementFromPoint(event.clientX, event.clientY);
  const interactive = Boolean(target && (target.closest(".pet-stage") || target.closest(".speech")));
  const shouldIgnore = !interactive;

  if (mousePassthrough !== shouldIgnore) {
    mousePassthrough = shouldIgnore;
    api.setIgnoreMouse(shouldIgnore);
  }
}

function handlePetAction(message = {}) {
  const action = message.action;
  const payload = message.payload || {};

  if (action === "typing-burst") {
    for (let i = 0; i < 4; i += 1) triggerTyping();
  } else if (action === "stretch") {
    triggerStretch();
  } else if (action === "schedule-reminder") {
    scheduleReminder(payload);
  } else if (action === "pomodoro-start") {
    startPomodoro(payload);
  } else if (action === "pomodoro-pause") {
    pausePomodoro();
  } else if (action === "pomodoro-reset") {
    resetPomodoro();
  }
}

function runOnPet(action, payload = {}) {
  if (isPetMode) {
    handlePetAction({ action, payload });
  } else {
    api.triggerPet(action, payload);
  }
}

async function saveSettings() {
  const next = getFormSettings();
  const saved = await api.saveSettings(next);
  syncForm(saved);
  setStatus("Saved");
  showMessage("Saved.", 1400);
}

if (isPetMode) {
  petStage.addEventListener("mousedown", () => {
    dragging = true;
    dragHeat = 6;
    api.setIgnoreMouse(false);
    api.dragStart();
  });

  petStage.addEventListener("contextmenu", (event) => {
    event.preventDefault();
    api.openPetMenu();
  });

  window.addEventListener("mouseup", () => {
    if (!dragging) return;
    dragging = false;
    dragHeat = 3;
    api.dragEnd();
  });

  petStage.addEventListener("mousemove", (event) => {
    const rect = petStage.getBoundingClientRect();
    mouseLocal = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };

    if (mouseLocal.y > 30 && mouseLocal.y < 105) {
      petHeat = clamp(petHeat + 0.24, 0, 8);
    }
  });

  window.addEventListener("mousemove", updateMousePassthrough);

  window.addEventListener("keydown", (event) => {
    if (event.target instanceof HTMLInputElement) return;
    if (event.key.length === 1 || event.key === "Backspace" || event.key === "Enter") {
      triggerTyping();
    }
  });

  window.addEventListener("wheel", () => {
    scrollHeat = clamp(scrollHeat + 3.5, 0, 8);
    showMessage("Paper roll mode.", 900);
  });

  api.onCursor((payload) => {
    cursorPayload = payload;
    computeCursorSpeed(payload);
  });

  api.onTyping(() => {
    triggerTyping();
  });

  api.onPetTrigger(handlePetAction);
}

showPetButton.addEventListener("click", () => {
  api.showPet();
  setStatus("Cat shown");
});

hidePetButton.addEventListener("click", () => {
  api.hidePet();
  setStatus("Cat minimized");
});

quitButton.addEventListener("click", () => api.quit());
saveButton.addEventListener("click", saveSettings);
testTypingButton.addEventListener("click", () => runOnPet("typing-burst"));
stretchNowButton.addEventListener("click", () => runOnPet("stretch"));
scheduleReminderButton.addEventListener("click", () => {
  runOnPet("schedule-reminder", {
    minutes: Number(fields.reminderMinutes.value) || settings.reminderMinutes,
    message: fields.reminderMessage.value.trim() || settings.reminderMessage
  });
  setStatus("Reminder scheduled");
});
pomodoroStartButton.addEventListener("click", () => {
  runOnPet("pomodoro-start", {
    focus: Number(fields.pomodoroFocus.value) || settings.pomodoroFocus,
    break: Number(fields.pomodoroBreak.value) || settings.pomodoroBreak
  });
  setStatus("Pomodoro started");
});
pomodoroPauseButton.addEventListener("click", () => {
  runOnPet("pomodoro-pause");
  setStatus("Pomodoro paused");
});
pomodoroResetButton.addEventListener("click", () => {
  runOnPet("pomodoro-reset");
  setStatus("Pomodoro reset");
});

fields.keyboardWatch.addEventListener("change", async () => {
  const ok = await api.setKeyboardWatch(fields.keyboardWatch.checked);
  fields.keyboardWatch.checked = ok;
  settings.keyboardWatch = ok;
  setStatus(ok ? "Keyboard watch on" : "Keyboard watch off");
});

fields.fixedMessageEnabled.addEventListener("change", () => {
  fixedMessage = fields.fixedMessageEnabled.checked ? fields.fixedMessage.value.trim() : "";
});

fields.fixedMessage.addEventListener("input", () => {
  fixedMessage = fields.fixedMessageEnabled.checked ? fields.fixedMessage.value.trim() : "";
});

api.onSettingsChanged((nextSettings) => {
  syncForm(nextSettings);
});

api.getSettings().then((loaded) => {
  syncForm(loaded);
  if (isPetMode) {
    showMessage("Meow.", 1200);
    requestAnimationFrame(frame);
  } else {
    setStatus("Ready");
  }
});
