import { PreRegisteredDeviceManager } from '../../config/preRegisteredDevices';
import { jwtVerify } from 'jose';
import { z } from 'zod';
import type { MiddlewareHandler } from 'hono';

type DeviceAuthEnv = {
  Variables: {
    userId: number;
    namespace: string;
  }
};

const jwtPayloadSchema = z.object({
  uid: z.number(),
  ns: z.string()
});

export function createDeviceBasedAuthMiddleware(jwtSecret: Uint8Array): MiddlewareHandler<DeviceAuthEnv> {
  return async (c, next) => {
    try {
      // 从请求头或查询参数获取设备指纹
      let deviceFingerprint = c.req.header('X-Device-Fingerprint');
      if (!deviceFingerprint) {
        // 尝试从查询参数获取（主要用于 SSE 连接）
        const queryParams = c.req.query();
        deviceFingerprint = queryParams.deviceFingerprint;
      }

      if (!deviceFingerprint) {
        console.warn('Device fingerprint missing in request header and query parameters');
        return c.json({
          error: 'Device fingerprint required for security verification',
          code: 'DEVICE_FINGERPRINT_MISSING',
          hint: 'Please ensure the security layer is properly initialized on your device'
        }, 401);
      }

      if (!/^[a-f0-9]{32}$/.test(deviceFingerprint)) {
        console.warn(`Invalid device fingerprint format: ${deviceFingerprint}`);
        return c.json({
          error: 'Invalid device fingerprint format',
          code: 'INVALID_DEVICE_FINGERPRINT_FORMAT',
          hint: 'Device fingerprint should be a 32-character hex string'
        }, 400);
      }

      if (!PreRegisteredDeviceManager.isDeviceAllowed(deviceFingerprint)) {
        console.warn(`Unauthorized device access attempt: ${deviceFingerprint}`);
        console.log(`Registered devices:`, PreRegisteredDeviceManager.getAllowedDevices());

        return c.json({
          error: 'Device not authorized',
          code: 'DEVICE_NOT_AUTHORIZED',
          hint: 'This device is not registered with the server. Contact administrator to register your device.'
        }, 403);
      }

      // 获取 JWT token，兼容头部和查询参数两种方式
      const authHeader = c.req.header('Authorization');
      const path = c.req.path;
      const tokenFromHeader = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : undefined;
      const tokenFromQuery = path === '/api/events' ? c.req.query().token : undefined;
      const accessToken = tokenFromHeader ?? tokenFromQuery;

      if (!accessToken) {
        console.warn('Authorization token missing in request header and query parameters');
        return c.json({
          error: 'Authorization token required for authentication',
          code: 'AUTH_TOKEN_MISSING',
          hint: 'Authorization token should be provided in header as Bearer token or as query parameter for SSE connections'
        }, 401);
      }

      try {
        const verified = await jwtVerify(accessToken, jwtSecret, { algorithms: ['HS256'] });
        const parsed = jwtPayloadSchema.safeParse(verified.payload);

        if (!parsed.success) {
          return c.json({ error: 'Invalid token payload' }, 401);
        }

        c.set('userId', parsed.data.uid);
        c.set('namespace', parsed.data.ns);

        await next();
      } catch (tokenError) {
        console.error('Token verification failed:', tokenError);
        return c.json({
          error: 'Invalid access token',
          code: 'INVALID_ACCESS_TOKEN',
          hint: 'Access token may be expired or invalid. Please refresh your token.'
        }, 401);
      }
    } catch (error) {
      console.error('Authentication middleware error:', error);
      return c.json({
        error: 'Internal authentication error',
        code: 'INTERNAL_AUTH_ERROR',
        hint: 'Please contact administrator if this error persists'
      }, 500);
    }
  };
}