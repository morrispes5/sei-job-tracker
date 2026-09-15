import {
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as argon2 from "argon2";
import { randomBytes, randomUUID } from "node:crypto";
import { z } from "zod";

import {
  authLoginSchema,
  authRefreshSchema,
  authRegisterSchema,
} from "@sei/shared";

import {
  ACCESS_TOKEN_TTL,
  AUTH_REPOSITORY,
  REFRESH_TOKEN_TTL_MS,
} from "./auth.constants";
import {
  type AuthRepositoryPort,
  type CreateRefreshTokenInput,
  type UserRecord,
} from "./auth.repository";

export interface AuthUserResponse {
  id: string;
  email: string;
  displayName: string;
  timezone: string;
}

export interface AuthSessionResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUserResponse;
}

interface AccessTokenPayload {
  sub: string;
  email: string;
  type: "access";
}

interface OpaqueRefreshToken {
  token: string;
  input: CreateRefreshTokenInput;
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(AUTH_REPOSITORY) private readonly repository: AuthRepositoryPort,
    @Inject(JwtService)
    private readonly jwtService: JwtService,
  ) {}

  async register(input: unknown): Promise<AuthSessionResponse> {
    const data = authRegisterSchema.parse(input);
    const existingUser = await this.repository.findUserByEmail(data.email);

    if (existingUser) {
      throw new ConflictException("Email is already registered.");
    }

    const passwordHash = await argon2.hash(data.password, {
      type: argon2.argon2id,
    });

    let user: UserRecord;

    try {
      user = await this.repository.createUser({
        email: data.email,
        passwordHash,
        displayName: data.displayName,
        timezone: data.timezone,
      });
    } catch (error: unknown) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException("Email is already registered.");
      }

      throw error;
    }

    return this.issueSession(user);
  }

  async login(input: unknown): Promise<AuthSessionResponse> {
    const data = authLoginSchema.parse(input);
    const user = await this.repository.findUserByEmail(data.email);

    if (
      !user ||
      !(await this.verifyPassword(user.passwordHash, data.password))
    ) {
      throw new UnauthorizedException("Invalid email or password.");
    }

    return this.issueSession(user);
  }

  async refresh(input: unknown): Promise<AuthSessionResponse> {
    const data = authRefreshSchema.parse(input);
    const sessionId = this.getRefreshSessionId(data.refreshToken);
    const currentSession =
      await this.repository.findRefreshTokenById(sessionId);

    if (
      !currentSession ||
      currentSession.revokedAt ||
      currentSession.expiresAt.getTime() <= Date.now()
    ) {
      throw new UnauthorizedException("Refresh session is invalid or expired.");
    }

    if (
      !(await this.verifyPassword(currentSession.tokenHash, data.refreshToken))
    ) {
      throw new UnauthorizedException("Refresh session is invalid or expired.");
    }

    const user = await this.repository.findUserById(currentSession.userId);

    if (!user) {
      throw new UnauthorizedException("Refresh session is invalid or expired.");
    }

    const nextRefreshToken = await this.createOpaqueRefreshToken(user.id);

    try {
      await this.repository.rotateRefreshToken(
        currentSession.id,
        nextRefreshToken.input,
        new Date(),
      );
    } catch {
      throw new UnauthorizedException("Refresh session is invalid or expired.");
    }

    return this.createSessionResponse(user, nextRefreshToken.token);
  }

  async logout(input: unknown): Promise<void> {
    const data = authRefreshSchema.parse(input);
    const sessionId = this.getRefreshSessionId(data.refreshToken);
    const currentSession =
      await this.repository.findRefreshTokenById(sessionId);

    if (!currentSession || currentSession.revokedAt) {
      return;
    }

    if (
      await this.verifyPassword(currentSession.tokenHash, data.refreshToken)
    ) {
      await this.repository.revokeRefreshToken(currentSession.id, new Date());
    }
  }

  async me(userId: string): Promise<AuthUserResponse> {
    const user = await this.repository.findUserById(userId);

    if (!user) {
      throw new UnauthorizedException("User session is invalid.");
    }

    return this.toPublicUser(user);
  }

  private async issueSession(user: UserRecord): Promise<AuthSessionResponse> {
    const refreshToken = await this.createOpaqueRefreshToken(user.id);
    await this.repository.createRefreshToken(refreshToken.input);

    return this.createSessionResponse(user, refreshToken.token);
  }

  private async createSessionResponse(
    user: UserRecord,
    refreshToken: string,
  ): Promise<AuthSessionResponse> {
    const accessToken = await this.jwtService.signAsync(
      this.createAccessTokenPayload(user),
      { expiresIn: ACCESS_TOKEN_TTL },
    );

    return {
      accessToken,
      refreshToken,
      user: this.toPublicUser(user),
    };
  }

  private createAccessTokenPayload(user: UserRecord): AccessTokenPayload {
    return {
      sub: user.id,
      email: user.email,
      type: "access",
    };
  }

  private async createOpaqueRefreshToken(
    userId: string,
  ): Promise<OpaqueRefreshToken> {
    const sessionId = randomUUID();
    const secret = randomBytes(48).toString("base64url");
    const token = `${sessionId}.${secret}`;
    const tokenHash = await argon2.hash(token, {
      type: argon2.argon2id,
    });

    return {
      token,
      input: {
        id: sessionId,
        userId,
        tokenHash,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      },
    };
  }

  private async verifyPassword(
    hash: string,
    plainText: string,
  ): Promise<boolean> {
    try {
      return await argon2.verify(hash, plainText);
    } catch {
      return false;
    }
  }

  private getRefreshSessionId(refreshToken: string): string {
    const [sessionId] = refreshToken.split(".");

    if (!sessionId || !z.string().uuid().safeParse(sessionId).success) {
      throw new UnauthorizedException("Refresh session is invalid or expired.");
    }

    return sessionId;
  }

  private toPublicUser(user: UserRecord): AuthUserResponse {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      timezone: user.timezone,
    };
  }

  private isUniqueViolation(error: unknown): boolean {
    return (error as { code?: unknown }).code === "23505";
  }
}
