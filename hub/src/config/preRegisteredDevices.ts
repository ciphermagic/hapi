export interface DeviceRecord {
  fingerprint: string;
  userId: number;
  registeredAt: string;
  lastUsed?: string;
}

export class PreRegisteredDeviceManager {
  private static readonly CONFIG_FILE_PATH = '../.env';
  private static deviceRecords: Map<string, DeviceRecord> = new Map(); // 使用Map存储设备记录
  static async initialize(): Promise<void> {
    try {
      await this.loadDeviceConfig();
    } catch (error) {
      console.log('No existing device config found, using defaults');
    }
  }

  static isDeviceAllowed(deviceFingerprint: string): boolean {
    return this.deviceRecords.has(deviceFingerprint);
  }

  static getAllowedDevices(): DeviceRecord[] {
    return Array.from(this.deviceRecords.values());
  }

  static getUserDevices(userId: number): DeviceRecord[] {
    return Array.from(this.deviceRecords.values()).filter(device => device.userId === userId);
  }

  private static async loadDeviceConfig(): Promise<void> {
    try {
      if (typeof Bun !== 'undefined') {
        const fs = await import('fs');
        if (fs.existsSync(this.CONFIG_FILE_PATH)) {
          const config = JSON.parse(fs.readFileSync(this.CONFIG_FILE_PATH, 'utf8'));
          // 从旧格式转换
          if (Array.isArray(config.devices)) {
            // 旧格式，假设所有设备都属于用户1
            config.devices.forEach((fingerprint: string) => {
              this.deviceRecords.set(fingerprint, {
                fingerprint,
                userId: 1,
                registeredAt: new Date().toISOString()
              });
            });
          } else if (Array.isArray(config.records)) {
            // 新格式
            config.records.forEach((record: DeviceRecord) => {
              this.deviceRecords.set(record.fingerprint, record);
            });
          }
        }
      } else {
        const { readFileSync, existsSync } = await import('fs');
        if (existsSync(this.CONFIG_FILE_PATH)) {
          const config = JSON.parse(readFileSync(this.CONFIG_FILE_PATH, 'utf8'));
          // 从旧格式转换
          if (Array.isArray(config.devices)) {
            // 旧格式，假设所有设备都属于用户1
            config.devices.forEach((fingerprint: string) => {
              this.deviceRecords.set(fingerprint, {
                fingerprint,
                userId: 1,
                registeredAt: new Date().toISOString()
              });
            });
          } else if (Array.isArray(config.records)) {
            // 新格式
            config.records.forEach((record: DeviceRecord) => {
              this.deviceRecords.set(record.fingerprint, record);
            });
          }
        }
      }
    } catch (error) {
      console.error('Failed to load device config:', error);
      throw error;
    }
  }
}

PreRegisteredDeviceManager.initialize()
  .catch(err => console.error('Failed to initialize device manager:', err));