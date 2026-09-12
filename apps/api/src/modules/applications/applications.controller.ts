import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import type { Request } from "express";

import { type AuthenticatedRequestUser } from "../auth/jwt.strategy";
import { ApplicationsService } from "./applications.service";

type AuthenticatedRequest = Request & {
  user: AuthenticatedRequestUser;
};

@Controller("applications")
@UseGuards(AuthGuard("jwt"))
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @Get()
  list(
    @Req() request: AuthenticatedRequest,
    @Query() query: Record<string, string | undefined>,
  ) {
    return this.applicationsService.list(request.user.userId, query);
  }

  @Post()
  create(@Req() request: AuthenticatedRequest, @Body() body: unknown) {
    return this.applicationsService.create(request.user.userId, body);
  }

  @Get(":id")
  getById(
    @Req() request: AuthenticatedRequest,
    @Param("id") applicationId: string,
  ) {
    return this.applicationsService.getById(request.user.userId, applicationId);
  }

  @Patch(":id")
  update(
    @Req() request: AuthenticatedRequest,
    @Param("id") applicationId: string,
    @Body() body: unknown,
  ) {
    return this.applicationsService.update(
      request.user.userId,
      applicationId,
      body,
    );
  }

  @Post(":id/archive")
  @HttpCode(HttpStatus.OK)
  archive(
    @Req() request: AuthenticatedRequest,
    @Param("id") applicationId: string,
  ) {
    return this.applicationsService.archive(request.user.userId, applicationId);
  }

  @Post(":id/restore")
  @HttpCode(HttpStatus.OK)
  restore(
    @Req() request: AuthenticatedRequest,
    @Param("id") applicationId: string,
  ) {
    return this.applicationsService.restore(request.user.userId, applicationId);
  }

  @Delete(":id")
  remove(
    @Req() request: AuthenticatedRequest,
    @Param("id") applicationId: string,
  ) {
    return this.applicationsService.remove(request.user.userId, applicationId);
  }

  @Get(":id/notes")
  listNotes(
    @Req() request: AuthenticatedRequest,
    @Param("id") applicationId: string,
  ) {
    return this.applicationsService.listNotes(
      request.user.userId,
      applicationId,
    );
  }

  @Post(":id/notes")
  createNote(
    @Req() request: AuthenticatedRequest,
    @Param("id") applicationId: string,
    @Body() body: unknown,
  ) {
    return this.applicationsService.createNote(
      request.user.userId,
      applicationId,
      body,
    );
  }

  @Patch(":id/notes/:noteId")
  updateNote(
    @Req() request: AuthenticatedRequest,
    @Param("id") applicationId: string,
    @Param("noteId") noteId: string,
    @Body() body: unknown,
  ) {
    return this.applicationsService.updateNote(
      request.user.userId,
      applicationId,
      noteId,
      body,
    );
  }

  @Delete(":id/notes/:noteId")
  deleteNote(
    @Req() request: AuthenticatedRequest,
    @Param("id") applicationId: string,
    @Param("noteId") noteId: string,
  ) {
    return this.applicationsService.deleteNote(
      request.user.userId,
      applicationId,
      noteId,
    );
  }

  @Get(":id/contacts")
  listContacts(
    @Req() request: AuthenticatedRequest,
    @Param("id") applicationId: string,
  ) {
    return this.applicationsService.listContacts(
      request.user.userId,
      applicationId,
    );
  }

  @Post(":id/contacts")
  createContact(
    @Req() request: AuthenticatedRequest,
    @Param("id") applicationId: string,
    @Body() body: unknown,
  ) {
    return this.applicationsService.createContact(
      request.user.userId,
      applicationId,
      body,
    );
  }

  @Patch(":id/contacts/:contactId")
  updateContact(
    @Req() request: AuthenticatedRequest,
    @Param("id") applicationId: string,
    @Param("contactId") contactId: string,
    @Body() body: unknown,
  ) {
    return this.applicationsService.updateContact(
      request.user.userId,
      applicationId,
      contactId,
      body,
    );
  }

  @Delete(":id/contacts/:contactId")
  deleteContact(
    @Req() request: AuthenticatedRequest,
    @Param("id") applicationId: string,
    @Param("contactId") contactId: string,
  ) {
    return this.applicationsService.deleteContact(
      request.user.userId,
      applicationId,
      contactId,
    );
  }

  @Get(":id/activities")
  listActivities(
    @Req() request: AuthenticatedRequest,
    @Param("id") applicationId: string,
  ) {
    return this.applicationsService.listActivities(
      request.user.userId,
      applicationId,
    );
  }
}
