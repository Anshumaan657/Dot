const { spawnSync } = require("child_process");
const path = require("path");

const UNUSED_PLIST_KEYS = [
  "NSAppTransportSecurity",
  "NSAudioCaptureUsageDescription",
  "NSBluetoothAlwaysUsageDescription",
  "NSBluetoothPeripheralUsageDescription",
  "NSCameraUsageDescription",
  "NSMicrophoneUsageDescription"
];

exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== "darwin") {
    return;
  }

  const plistPath = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`, "Contents", "Info.plist");

  for (const key of UNUSED_PLIST_KEYS) {
    spawnSync("/usr/libexec/PlistBuddy", ["-c", `Delete :${key}`, plistPath], {
      stdio: "ignore"
    });
  }
};
