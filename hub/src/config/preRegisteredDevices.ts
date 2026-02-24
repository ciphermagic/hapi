import { join } from "node:path";
import { homedir } from "node:os";

export class PreRegisteredDeviceManager {
  private static deviceRecords: Set<string> = new Set();

  private static getSettingsPath(): string {
    const dataDir = process.env.HAPI_HOME
      ? process.env.HAPI_HOME.replace(/^~/, homedir())
      : join(homedir(), ".hapi");
    return join(dataDir, "settings.json");
  }

  static isDeviceAllowed(deviceFingerprint: string): boolean {
    return this.deviceRecords.has(deviceFingerprint);
  }

  static async loadDeviceConfig(): Promise<void> {
    try {
      const settingsPath = this.getSettingsPath();
      const { readFileSync, existsSync } = await import("fs");
      if (existsSync(settingsPath)) {
        const config = JSON.parse(readFileSync(settingsPath, "utf8"));
        if (Array.isArray(config.fingerprint)) {
          config.fingerprint.forEach((record: string) => {
            this.deviceRecords.add(record);
          });
        }
      }
    } catch (error) {
      console.error("Failed to load device config:", error);
      throw error;
    }
  }
}

PreRegisteredDeviceManager.loadDeviceConfig().catch((err) =>
  console.error("Failed to initialize device manager:", err),
);
