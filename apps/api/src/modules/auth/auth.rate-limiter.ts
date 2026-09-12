import { HttpException, HttpStatus, Injectable } from "@nestjs/common";

import {
  AUTH_RATE_LIMIT_MAX_ATTEMPTS,
  AUTH_RATE_LIMIT_WINDOW_MS,
} from "./auth.constants";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

@Injectable()
export class AuthRateLimiter {
  private readonly entries = new Map<string, RateLimitEntry>();

  assertAllowed(key: string): void {
    const now = Date.now();
    const entry = this.entries.get(key);

    if (!entry || entry.resetAt <= now) {
      this.entries.set(key, {
        count: 1,
        resetAt: now + AUTH_RATE_LIMIT_WINDOW_MS,
      });
      return;
    }

    if (entry.count >= AUTH_RATE_LIMIT_MAX_ATTEMPTS) {
      throw new HttpException(
        "Too many authentication attempts. Try again later.",
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    entry.count += 1;
  }
}
