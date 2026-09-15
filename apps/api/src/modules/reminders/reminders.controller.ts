import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import type { Request } from "express";

import type { AuthenticatedRequestUser } from "../auth/jwt.strategy";
import { RemindersService } from "./reminders.service";

type AuthenticatedRequest = Request & {
  user: AuthenticatedRequestUser;
};

@Controller("reminders")
@UseGuards(AuthGuard("jwt"))
export class RemindersController {
  constructor(private readonly remindersService: RemindersService) {}

  @Get()
  list(
    @Req() request: AuthenticatedRequest,
    @Query() query: Record<string, string | undefined>,
  ) {
    return this.remindersService.list(request.user.userId, query);
  }

  @Post()
  create(@Req() request: AuthenticatedRequest, @Body() body: unknown) {
    return this.remindersService.create(request.user.userId, body);
  }

  @Patch(":id")
  update(
    @Req() request: AuthenticatedRequest,
    @Param("id") reminderId: string,
    @Body() body: unknown,
  ) {
    return this.remindersService.update(request.user.userId, reminderId, body);
  }

  @Delete(":id")
  cancel(
    @Req() request: AuthenticatedRequest,
    @Param("id") reminderId: string,
  ) {
    return this.remindersService.cancel(request.user.userId, reminderId);
  }
}
