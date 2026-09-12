import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";

import { getAccessSecret } from "./auth.config";

interface JwtPayload {
  sub?: unknown;
  email?: unknown;
  type?: unknown;
}

export interface AuthenticatedRequestUser {
  userId: string;
  email: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: getAccessSecret(),
    });
  }

  validate(payload: JwtPayload): AuthenticatedRequestUser {
    if (
      payload.type !== "access" ||
      typeof payload.sub !== "string" ||
      typeof payload.email !== "string"
    ) {
      throw new UnauthorizedException("Access token is invalid.");
    }

    return {
      userId: payload.sub,
      email: payload.email,
    };
  }
}
