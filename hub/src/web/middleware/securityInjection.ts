import type { MiddlewareHandler } from 'hono'

export function createSecurityInjectionMiddleware(): MiddlewareHandler {
  return async (c, next) => {
    await next()

    // 如果响应是HTML并且是主页面，则注入安全脚本
    if (c.res.headers.get('Content-Type')?.includes('text/html')) {
      const originalBody = await c.res.text()

      if (originalBody.includes('</body>')) {
        // 在 </body> 标签前注入安全初始化代码
        const securityScript = `
<script>
// Security Layer for Device Fingerprinting
(function() {
  async function generateFingerprint() {
    const features = {
      screenResolution: \`\${screen.width}x\${screen.height}\`,
      colorDepth: screen.colorDepth,
      pixelDepth: screen.pixelDepth,
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      hardwareConcurrency: navigator.hardwareConcurrency || 0,
      deviceMemory: (navigator && (navigator as any).deviceMemory) || 0,
      canvas: getCanvasFingerprint(),
      webgl: getWebGLFingerprint(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language,
      maxTouchPoints: navigator.maxTouchPoints || 0,
    };

    const featuresString = JSON.stringify(features);
    return sha256Hash(featuresString);
  }

  function getCanvasFingerprint() {
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

  function getWebGLFingerprint() {
    const canvas = document.createElement('canvas');
    let gl;
    try {
      gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    } catch (e) {
      return '';
    }

    if (!gl) return '';

    try {
      const renderer = gl.getParameter(gl.RENDERER);
      const vendor = gl.getParameter(gl.VENDOR);
      return \`\${renderer}-\${vendor}\`;
    } catch (e) {
      return '';
    }
  }

  async function sha256Hash(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 32);
  }

  async function initializeSecurityLayer() {
    try {
      // 生成设备指纹
      const deviceFingerprint = await generateFingerprint();

      // 注入请求拦截器以添加设备指纹头
      const originalFetch = window.fetch;
      window.fetch = async (...args) => {
        const [resource, config] = args;

        const headers = new Headers(config?.headers || {});
        headers.set('X-Device-Fingerprint', deviceFingerprint);

        const modifiedConfig = { ...config, headers };
        return originalFetch(resource, modifiedConfig);
      };

      // 创建安全信息UI
      createSecurityUI(deviceFingerprint);

      console.log('Security layer initialized with fingerprint:', deviceFingerprint);
    } catch (error) {
      console.error('Security initialization failed:', error);
      showErrorNotification('Security initialization failed');
    }
  }

  function createSecurityUI(deviceFingerprint) {
    const securityDiv = document.createElement('div');
    securityDiv.id = 'hapi-security-info';
    securityDiv.style.cssText = \`
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
    \`;

    securityDiv.innerHTML = \`
      <div><strong>HAPI Security Info</strong></div>
      <div>Device Fingerprint:</div>
      <div id="device-fingerprint-display">\${deviceFingerprint.substring(0, 16)}...</div>
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
    \`;

    document.body.appendChild(securityDiv);

    document.getElementById('copy-fingerprint-btn')?.addEventListener('click', () => {
      copyFingerprint(deviceFingerprint);
    });

    document.getElementById('show-full-fingerprint-btn')?.addEventListener('click', () => {
      showFullFingerprint(deviceFingerprint);
    });
  }

  async function copyFingerprint(deviceFingerprint) {
    try {
      await navigator.clipboard.writeText(deviceFingerprint);
      showSuccessNotification('Device fingerprint copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy fingerprint:', err);
      showErrorNotification('Failed to copy fingerprint. Please manually select and copy.');
    }
  }

  function showFullFingerprint(deviceFingerprint) {
    if (deviceFingerprint) {
      const modal = document.createElement('div');
      modal.style.cssText = \`
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
      \`;

      modal.innerHTML = \`
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
          <pre style="margin: 10px 0; font-family: monospace; background: #f5f5f5; padding: 10px;">\${deviceFingerprint}</pre>
          <button id="close-modal-btn" style="
            padding: 8px 16px;
            background: #007AFF;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
          ">Close</button>
        </div>
      \`;

      document.body.appendChild(modal);

      document.getElementById('close-modal-btn')?.addEventListener('click', () => {
        document.body.removeChild(modal);
      });
    }
  }

  function showErrorNotification(message) {
    showNotification(message, 'error');
  }

  function showSuccessNotification(message) {
    showNotification(message, 'success');
  }

  function showNotification(message, type) {
    const notification = document.createElement('div');
    const bgColor = type === 'error' ? '#ff4444' : type === 'success' ? '#44aa44' : '#4444ff';

    notification.style.cssText = \`
      position: fixed;
      top: 20px;
      right: 20px;
      background: \${bgColor};
      color: white;
      padding: 12px 20px;
      border-radius: 6px;
      font-family: Arial, sans-serif;
      font-size: 14px;
      z-index: 10002;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      transition: opacity 0.3s ease;
    \`;

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

  // 初始化安全层
  initializeSecurityLayer().catch(console.error);
})();
</script>
        `;

        // 在 </body> 标签前插入安全脚本
        const modifiedBody = originalBody.replace('</body>', securityScript + '</body>');

        // 重新创建响应对象
        c.res = new Response(modifiedBody, {
          status: c.res.status,
          headers: c.res.headers
        });
      }
    }
  }
}