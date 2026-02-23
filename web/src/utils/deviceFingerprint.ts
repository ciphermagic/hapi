export class DeviceFingerprintGenerator {
  static async generateFingerprint(): Promise<string> {
    const features = {
      screenResolution: `${screen.width}x${screen.height}`,
      colorDepth: screen.colorDepth,
      pixelDepth: screen.pixelDepth,
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      hardwareConcurrency: navigator.hardwareConcurrency || 0,
      deviceMemory: (navigator as any).deviceMemory || 0,
      canvas: this.getCanvasFingerprint(),
      webgl: this.getWebGLFingerprint(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language,
      maxTouchPoints: navigator.maxTouchPoints || 0,
    };

    const featuresString = JSON.stringify(features);
    return this.sha256Hash(featuresString);
  }

  private static getCanvasFingerprint(): string {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillStyle = '#f60';
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = '#069';
    ctx.fillText('Hello, world! 🌍', 2, 15);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.fillText('Hello, world! 🌍', 4, 17);

    return canvas.toDataURL();
  }

  private static getWebGLFingerprint(): string {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return '';

    try {
      const renderer = (gl as WebGLRenderingContext).getParameter(WebGLRenderingContext.RENDERER);
      const vendor = (gl as WebGLRenderingContext).getParameter(WebGLRenderingContext.VENDOR);
      return `${renderer}-${vendor}`;
    } catch (e) {
      return '';
    }
  }

  private static async sha256Hash(message: string): Promise<string> {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 32);
  }
}