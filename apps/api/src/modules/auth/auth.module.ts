import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";

import { ACCESS_TOKEN_TTL, AUTH_REPOSITORY } from "./auth.constants";
import { getAccessSecret } from "./auth.config";
import { AuthController } from "./auth.controller";
import { AuthRateLimiter } from "./auth.rate-limiter";
import { AuthRepository } from "./auth.repository";
import { AuthService } from "./auth.service";
import { JwtStrategy } from "./jwt.strategy";

@Module({
  imports: [
    JwtModule.register({
      secret: getAccessSecret(),
      signOptions: { expiresIn: ACCESS_TOKEN_TTL },
    }),
    PassportModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthRateLimiter,
    AuthRepository,
    JwtStrategy,
    {
      provide: AUTH_REPOSITORY,
      useExisting: AuthRepository,
    },
  ],
  exports: [AuthService],
})
export class AuthModule {}
