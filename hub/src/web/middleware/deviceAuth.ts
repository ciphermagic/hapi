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
      const deviceFingerprint = c.req.header('X-Device-Fingerprint');
      if (!deviceFingerprint) {
        console.warn('Device fingerprint missing in request');
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

      const authHeader = c.req.header('Authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.warn('Invalid authorization header format');
        return c.json({
          error: 'Invalid authorization header format',
          code: 'INVALID_AUTH_HEADER',
          hint: 'Authorization header should be in format: Bearer <token>'
        }, 401);
      }

      const accessToken = authHeader.substring(7);

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