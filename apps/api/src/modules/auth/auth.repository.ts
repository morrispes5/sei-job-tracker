import { Inject, Injectable } from "@nestjs/common";
import { and, eq, isNull } from "drizzle-orm";

import { DatabaseService } from "../../drizzle/database.service";
import { refreshTokens, users } from "../../drizzle/schema";

export type UserRecord = typeof users.$inferSelect;
export type RefreshTokenRecord = typeof refreshTokens.$inferSelect;

export interface CreateUserInput {
  email: string;
  passwordHash: string;
  displayName: string;
  timezone: string;
}

export interface CreateRefreshTokenInput {
  id?: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  deviceLabel?: string;
}

export interface AuthRepositoryPort {
  findUserByEmail(email: string): Promise<UserRecord | undefined>;
  findUserById(id: string): Promise<UserRecord | undefined>;
  createUser(input: CreateUserInput): Promise<UserRecord>;
  findRefreshTokenById(id: string): Promise<RefreshTokenRecord | undefined>;
  createRefreshToken(
    input: CreateRefreshTokenInput,
  ): Promise<RefreshTokenRecord>;
  rotateRefreshToken(
    previousId: string,
    input: CreateRefreshTokenInput,
    revokedAt: Date,
  ): Promise<RefreshTokenRecord>;
  revokeRefreshToken(id: string, revokedAt: Date): Promise<void>;
}

@Injectable()
export class AuthRepository implements AuthRepositoryPort {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
  ) {}

  async findUserByEmail(email: string): Promise<UserRecord | undefined> {
    return this.database.db.query.users.findFirst({
      where: eq(users.email, email),
    });
  }

  async findUserById(id: string): Promise<UserRecord | undefined> {
    return this.database.db.query.users.findFirst({
      where: eq(users.id, id),
    });
  }

  async createUser(input: CreateUserInput): Promise<UserRecord> {
    const [user] = await this.database.db
      .insert(users)
      .values(input)
      .returning();

    if (!user) {
      throw new Error("User insert did not return a record.");
    }

    return user;
  }

  async findRefreshTokenById(
    id: string,
  ): Promise<RefreshTokenRecord | undefined> {
    return this.database.db.query.refreshTokens.findFirst({
      where: eq(refreshTokens.id, id),
    });
  }

  async createRefreshToken(
    input: CreateRefreshTokenInput,
  ): Promise<RefreshTokenRecord> {
    const [refreshToken] = await this.database.db
      .insert(refreshTokens)
      .values(input)
      .returning();

    if (!refreshToken) {
      throw new Error("Refresh token insert did not return a record.");
    }

    return refreshToken;
  }

  async rotateRefreshToken(
    previousId: string,
    input: CreateRefreshTokenInput,
    revokedAt: Date,
  ): Promise<RefreshTokenRecord> {
    return this.database.db.transaction(async (transaction) => {
      const [revoked] = await transaction
        .update(refreshTokens)
        .set({ revokedAt })
        .where(
          and(
            eq(refreshTokens.id, previousId),
            isNull(refreshTokens.revokedAt),
          ),
        )
        .returning({ id: refreshTokens.id });

      if (!revoked) {
        throw new Error("Refresh token has already been revoked.");
      }

      const [nextRefreshToken] = await transaction
        .insert(refreshTokens)
        .values(input)
        .returning();

      if (!nextRefreshToken) {
        throw new Error("Refresh token insert did not return a record.");
      }

      return nextRefreshToken;
    });
  }

  async revokeRefreshToken(id: string, revokedAt: Date): Promise<void> {
    await this.database.db
      .update(refreshTokens)
      .set({ revokedAt })
      .where(and(eq(refreshTokens.id, id), isNull(refreshTokens.revokedAt)));
  }
}
