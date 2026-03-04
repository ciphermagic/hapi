import { DeviceFingerprintGenerator } from './deviceFingerprint';

const DEVICE_FINGERPRINT_KEY = 'hapi_device_fingerprint';

export class DeviceManager {
  private static instance: DeviceManager;
  private deviceFingerprint: string | null = null;

  static getInstance(): DeviceManager {
    if (!this.instance) {
      this.instance = new DeviceManager();
    }
    return this.instance;
  }

  async initialize(): Promise<void> {
    // 尝试从localStorage加载设备指纹
    this.deviceFingerprint = this.loadDeviceFingerprint();

    // 如果没有存储的指纹，则生成新的指纹并保存到localStorage
    if (!this.deviceFingerprint) {
      this.deviceFingerprint = await DeviceFingerprintGenerator.generateFingerprint();
      this.saveDeviceFingerprint(this.deviceFingerprint);
    }

    this.injectDeviceFingerprintToRequests();
    this.createSecurityUI();
  }

  private loadDeviceFingerprint(): string | null {
    try {
      return localStorage.getItem(DEVICE_FINGERPRINT_KEY);
    } catch (error) {
      console.error('Error reading device fingerprint from localStorage:', error);
      return null;
    }
  }

  private saveDeviceFingerprint(fingerprint: string): void {
    try {
      localStorage.setItem(DEVICE_FINGERPRINT_KEY, fingerprint);
    } catch (error) {
      console.error('Error saving device fingerprint to localStorage:', error);
    }
  }

  private injectDeviceFingerprintToRequests(): void {
    const originalFetch = window.fetch;

    window.fetch = async (...args) => {
      const [resource, config] = args;

      const headers = new Headers(config?.headers || {});
      headers.set('X-Device-Fingerprint', this.deviceFingerprint!);

      const modifiedConfig = { ...config, headers };
      return originalFetch(resource, modifiedConfig);
    };
  }

  private createSecurityUI(): void {
    // 确保安全UI只创建一次
    if (document.getElementById('hapi-security-info')) {
      return;
    }

    const securityDiv = document.createElement('div');
    securityDiv.id = 'hapi-security-info';
    securityDiv.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 15px;
      border-radius: 8px;
      font-family: monospace;
      font-size: 12px;
      z-index: 10000;
      max-width: 300px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    `;

    securityDiv.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
        <div><strong>HAPI Security Info</strong></div>
        <button id="close-security-ui-btn" style="
          background: #ff4444;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          padding: 2px 6px;
          font-size: 14px;
          font-weight: bold;
          margin-left: 8px;
        ">&times;</button>
      </div>
      <div>Device Fingerprint:</div>
      <div id="device-fingerprint-display">${this.deviceFingerprint?.substring(0, 16)}...</div>
      <button id="copy-fingerprint-btn" style="
        margin-top: 8px;
        padding: 4px 8px;
        background: #007AFF;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 11px;
      ">Copy Full Fingerprint</button>
      <button id="show-full-fingerprint-btn" style="
        margin-left: 8px;
        margin-top: 8px;
        padding: 4px 8px;
        background: #5856D6;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 11px;
      ">Show Full</button>
    `;

    document.body.appendChild(securityDiv);

    document.getElementById('copy-fingerprint-btn')?.addEventListener('click', () => {
      this.copyFingerprint();
    });

    document.getElementById('show-full-fingerprint-btn')?.addEventListener('click', () => {
      this.showFullFingerprint();
    });

    document.getElementById('close-security-ui-btn')?.addEventListener('click', () => {
      this.hideSecurityUI();
    });
  }

  private async copyFingerprint(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.deviceFingerprint!);
      this.showNotification('Device fingerprint copied to clipboard!', 'success');
    } catch (err) {
      console.error('Failed to copy fingerprint:', err);
      this.showNotification('Failed to copy fingerprint. Please manually select and copy.', 'error');
    }
  }

  private showFullFingerprint(): void {
    if (this.deviceFingerprint) {
      const modal = document.createElement('div');
      modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10001;
      `;

      modal.innerHTML = `
        <div style="
          background: white;
          padding: 20px;
          border-radius: 8px;
          max-width: 90%;
          word-break: break-all;
          max-height: 80vh;
          overflow-y: auto;
        ">
          <h3>Device Fingerprint</h3>
          <pre style="margin: 10px 0; font-family: monospace; background: #f5f5f5; padding: 10px;">${this.deviceFingerprint}</pre>
          <button id="close-modal-btn" style="
            padding: 8px 16px;
            background: #007AFF;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
          ">Close</button>
        </div>
      `;

      document.body.appendChild(modal);

      document.getElementById('close-modal-btn')?.addEventListener('click', () => {
        document.body.removeChild(modal);
      });
    }
  }

  private hideSecurityUI(): void {
    const securityDiv = document.getElementById('hapi-security-info');
    if (securityDiv) {
      securityDiv.style.display = 'none';
    }
  }

  private showNotification(message: string, type: 'error' | 'success' | 'info'): void {
    const notification = document.createElement('div');
    const bgColor = type === 'error' ? '#ff4444' : type === 'success' ? '#44aa44' : '#4444ff';

    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${bgColor};
      color: white;
      padding: 12px 20px;
      border-radius: 6px;
      font-family: Arial, sans-serif;
      font-size: 14px;
      z-index: 10002;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      transition: opacity 0.3s ease;
    `;

    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.opacity = '0';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }

  getDeviceFingerprint(): string | null {
    return this.deviceFingerprint;
  }
}