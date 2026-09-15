import {
  BadRequestException,
  Controller,
  Get,
  Headers,
  Inject,
  Post,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import type { Request, Response } from "express";

import { clientPlatformSchema, type ClientPlatform } from "@sei/shared";

import { AUTH_REFRESH_COOKIE, REFRESH_TOKEN_TTL_MS } from "./auth.constants";
import { isProduction } from "./auth.config";
import { AuthRateLimiter } from "./auth.rate-limiter";
import { AuthService, type AuthSessionResponse } from "./auth.service";
import { type AuthenticatedRequestUser } from "./jwt.strategy";

type AuthenticatedRequest = Request & {
  user: AuthenticatedRequestUser;
};

@Controller("auth")
export class AuthController {
  constructor(
    @Inject(AuthService)
    private readonly authService: AuthService,
    @Inject(AuthRateLimiter)
    private readonly rateLimiter: AuthRateLimiter,
  ) {}

  @Post("register")
  async register(
    @Req() request: Request,
    @Headers("x-client-platform") platformHeader: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ) {
    const platform = this.getPlatform(platformHeader);
    this.assertRateLimit("register", request);
    const session = await this.authService.register(request.body);

    return this.presentSession(platform, session, response);
  }

  @Post("login")
  async login(
    @Req() request: Request,
    @Headers("x-client-platform") platformHeader: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ) {
    const platform = this.getPlatform(platformHeader);
    this.assertRateLimit("login", request);
    const session = await this.authService.login(request.body);

    return this.presentSession(platform, session, response);
  }

  @Post("refresh")
  async refresh(
    @Req() request: Request,
    @Headers("x-client-platform") platformHeader: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ) {
    const platform = this.getPlatform(platformHeader);
    this.assertRateLimit("refresh", request);
    const session = await this.authService.refresh(
      this.getRefreshInput(request, platform),
    );

    return this.presentSession(platform, session, response);
  }

  @Post("logout")
  async logout(
    @Req() request: Request,
    @Headers("x-client-platform") platformHeader: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ) {
    const platform = this.getPlatform(platformHeader);
    const refreshInput = this.getOptionalRefreshInput(request, platform);

    if (refreshInput) {
      await this.authService.logout(refreshInput);
    }

    if (platform === "web") {
      this.clearRefreshCookie(response);
    }

    return { success: true };
  }

  @Get("me")
  @UseGuards(AuthGuard("jwt"))
  async me(@Req() request: AuthenticatedRequest) {
    return {
      user: await this.authService.me(request.user.userId),
    };
  }

  private getPlatform(platformHeader: string | undefined): ClientPlatform {
    const result = clientPlatformSchema.safeParse(platformHeader);

    if (!result.success) {
      throw new BadRequestException(
        "X-Client-Platform must be either web or mobile.",
      );
    }

    return result.data;
  }

  private getRefreshInput(request: Request, platform: ClientPlatform) {
    if (platform === "mobile") {
      return request.body;
    }

    const refreshToken = request.cookies?.[AUTH_REFRESH_COOKIE];

    if (typeof refreshToken !== "string") {
      throw new BadRequestException("Refresh session is required.");
    }

    return { refreshToken };
  }

  private getOptionalRefreshInput(
    request: Request,
    platform: ClientPlatform,
  ): { refreshToken: string } | undefined {
    if (platform === "mobile") {
      return request.body;
    }

    const refreshToken = request.cookies?.[AUTH_REFRESH_COOKIE];

    return typeof refreshToken === "string" ? { refreshToken } : undefined;
  }

  private presentSession(
    platform: ClientPlatform,
    session: AuthSessionResponse,
    response: Response,
  ) {
    if (platform === "web") {
      response.cookie(AUTH_REFRESH_COOKIE, session.refreshToken, {
        httpOnly: true,
        secure: isProduction(),
        sameSite: "lax",
        path: "/api/v1/auth",
        maxAge: REFRESH_TOKEN_TTL_MS,
      });

      return {
        accessToken: session.accessToken,
        user: session.user,
      };
    }

    return session;
  }

  private clearRefreshCookie(response: Response): void {
    response.clearCookie(AUTH_REFRESH_COOKIE, {
      httpOnly: true,
      secure: isProduction(),
      sameSite: "lax",
      path: "/api/v1/auth",
    });
  }

  private assertRateLimit(action: string, request: Request): void {
    this.rateLimiter.assertAllowed(`${action}:${request.ip}`);
  }
}
