export class PreRegisteredDeviceManager {
  private static readonly CONFIG_FILE_PATH = './config/devices.json';
  private static allowedDevices: Set<string> = new Set();

  static async initialize(): Promise<void> {
    try {
      await this.loadDeviceConfig();
    } catch (error) {
      console.log('No existing device config found, using defaults');
      this.allowedDevices.add('dev-test-device');
    }
  }

  static isDeviceAllowed(deviceFingerprint: string): boolean {
    return this.allowedDevices.has(deviceFingerprint);
  }

  static addDevice(deviceFingerprint: string): void {
    if (this.isValidFingerprint(deviceFingerprint)) {
      this.allowedDevices.add(deviceFingerprint);
      console.log(`Device ${deviceFingerprint} registered successfully`);
      this.saveDeviceConfig();
    } else {
      throw new Error('Invalid device fingerprint format');
    }
  }

  static removeDevice(deviceFingerprint: string): void {
    this.allowedDevices.delete(deviceFingerprint);
    console.log(`Device ${deviceFingerprint} removed`);
    this.saveDeviceConfig();
  }

  static getAllowedDevices(): string[] {
    return Array.from(this.allowedDevices);
  }

  private static isValidFingerprint(fingerprint: string): boolean {
    return /^[a-f0-9]{32}$/.test(fingerprint);
  }

  private static async loadDeviceConfig(): Promise<void> {
    try {
      if (typeof Bun !== 'undefined') {
        const fs = await import('fs');
        if (fs.existsSync(this.CONFIG_FILE_PATH)) {
          const config = JSON.parse(fs.readFileSync(this.CONFIG_FILE_PATH, 'utf8'));
          this.allowedDevices = new Set(config.devices || []);
        }
      } else {
        const { readFileSync, existsSync } = await import('fs');
        if (existsSync(this.CONFIG_FILE_PATH)) {
          const config = JSON.parse(readFileSync(this.CONFIG_FILE_PATH, 'utf8'));
          this.allowedDevices = new Set(config.devices || []);
        }
      }
    } catch (error) {
      console.error('Failed to load device config:', error);
      throw error;
    }
  }

  private static saveDeviceConfig(): void {
    try {
      const config = {
        devices: Array.from(this.allowedDevices),
        updatedAt: new Date().toISOString()
      };

      if (typeof Bun !== 'undefined') {
        const fs = require('fs');
        fs.writeFileSync(this.CONFIG_FILE_PATH, JSON.stringify(config, null, 2));
      } else {
        const { writeFileSync } = require('fs');
        writeFileSync(this.CONFIG_FILE_PATH, JSON.stringify(config, null, 2));
      }

      console.log('Device config saved successfully');
    } catch (error) {
      console.error('Failed to save device config:', error);
    }
  }
}

PreRegisteredDeviceManager.initialize()
  .catch(err => console.error('Failed to initialize device manager:', err));