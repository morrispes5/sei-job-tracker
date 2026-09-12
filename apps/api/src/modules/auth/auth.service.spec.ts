import { JwtService } from "@nestjs/jwt";
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";

import type {
  AuthRepositoryPort,
  CreateRefreshTokenInput,
  RefreshTokenRecord,
  UserRecord,
} from "./auth.repository";
import { AuthService } from "./auth.service";

class InMemoryAuthRepository implements AuthRepositoryPort {
  readonly users: UserRecord[] = [];
  readonly refreshTokens: RefreshTokenRecord[] = [];

  findUserByEmail(email: string): Promise<UserRecord | undefined> {
    return Promise.resolve(this.users.find((user) => user.email === email));
  }

  findUserById(id: string): Promise<UserRecord | undefined> {
    return Promise.resolve(this.users.find((user) => user.id === id));
  }

  createUser(input: {
    email: string;
    passwordHash: string;
    displayName: string;
    timezone: string;
  }): Promise<UserRecord> {
    const user: UserRecord = {
      id: randomUUID(),
      ...input,
      createdAt: new Date(),
    };
    this.users.push(user);
    return Promise.resolve(user);
  }

  findRefreshTokenById(id: string): Promise<RefreshTokenRecord | undefined> {
    return Promise.resolve(
      this.refreshTokens.find((refreshToken) => refreshToken.id === id),
    );
  }

  createRefreshToken(
    input: CreateRefreshTokenInput,
  ): Promise<RefreshTokenRecord> {
    const refreshToken: RefreshTokenRecord = {
      id: input.id ?? randomUUID(),
      userId: input.userId,
      tokenHash: input.tokenHash,
      expiresAt: input.expiresAt,
      revokedAt: null,
      deviceLabel: input.deviceLabel ?? null,
      createdAt: new Date(),
    };
    this.refreshTokens.push(refreshToken);
    return Promise.resolve(refreshToken);
  }

  async rotateRefreshToken(
    previousId: string,
    input: CreateRefreshTokenInput,
    revokedAt: Date,
  ): Promise<RefreshTokenRecord> {
    const previous = this.refreshTokens.find(
      (refreshToken) =>
        refreshToken.id === previousId && refreshToken.revokedAt === null,
    );

    if (!previous) {
      throw new Error("Refresh token has already been revoked.");
    }

    previous.revokedAt = revokedAt;
    return this.createRefreshToken(input);
  }

  revokeRefreshToken(id: string, revokedAt: Date): Promise<void> {
    const refreshToken = this.refreshTokens.find(
      (candidate) => candidate.id === id && candidate.revokedAt === null,
    );

    if (refreshToken) {
      refreshToken.revokedAt = revokedAt;
    }

    return Promise.resolve();
  }
}

function createAuthService(repository: InMemoryAuthRepository): AuthService {
  return new AuthService(
    repository,
    new JwtService({ secret: "test-access-secret" }),
  );
}

describe("AuthService", () => {
  it("registers with normalized email and returns a session", async () => {
    const repository = new InMemoryAuthRepository();
    const service = createAuthService(repository);

    const session = await service.register({
      email: "  USER@Example.com ",
      password: "a-secure-password",
      displayName: "Sei User",
      timezone: "Asia/Jakarta",
    });

    expect(session.user.email).toBe("user@example.com");
    expect(session.accessToken).toEqual(expect.any(String));
    expect(session.refreshToken).toContain(".");
    expect(repository.refreshTokens).toHaveLength(1);
  });

  it("rejects invalid credentials", async () => {
    const repository = new InMemoryAuthRepository();
    const service = createAuthService(repository);

    await service.register({
      email: "user@example.com",
      password: "a-secure-password",
      displayName: "Sei User",
    });

    await expect(
      service.login({
        email: "user@example.com",
        password: "wrong-password",
      }),
    ).rejects.toThrow("Invalid email or password.");
  });

  it("rotates refresh tokens and rejects the previous token", async () => {
    const repository = new InMemoryAuthRepository();
    const service = createAuthService(repository);
    const firstSession = await service.register({
      email: "user@example.com",
      password: "a-secure-password",
      displayName: "Sei User",
    });

    const secondSession = await service.refresh({
      refreshToken: firstSession.refreshToken,
    });

    expect(secondSession.refreshToken).not.toBe(firstSession.refreshToken);
    await expect(
      service.refresh({ refreshToken: firstSession.refreshToken }),
    ).rejects.toThrow("Refresh session is invalid or expired.");
  });

  it("revokes a refresh token on logout", async () => {
    const repository = new InMemoryAuthRepository();
    const service = createAuthService(repository);
    const session = await service.register({
      email: "user@example.com",
      password: "a-secure-password",
      displayName: "Sei User",
    });

    await service.logout({ refreshToken: session.refreshToken });

    await expect(
      service.refresh({ refreshToken: session.refreshToken }),
    ).rejects.toThrow("Refresh session is invalid or expired.");
  });
});
