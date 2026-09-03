import { ConfigService } from '@nestjs/config';

/**
 * Builds the ioredis connection options from REDIS_URL.
 * Automatically enables TLS when the URL starts with rediss:// (Upstash, Redis Cloud, etc.)
 */
export function buildRedisConnection(config: ConfigService): Record<string, unknown> {
  const url = config.getOrThrow<string>('REDIS_URL');
  const isTls = url.startsWith('rediss://');

  return {
    url,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: true,
    ...(isTls && {
      tls: {
        rejectUnauthorized: false, // Required for Upstash self-signed certs
      },
    }),
  };
}
