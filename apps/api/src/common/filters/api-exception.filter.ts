import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { ZodError } from "zod";

interface ErrorResponseBody {
  error: {
    code: string;
    message: string;
    fields?: Record<string, string[]>;
  };
  requestId?: string;
}

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<Request>();
    const response = context.getResponse<Response>();

    const zodIssues = this.getZodIssues(exception);

    if (zodIssues) {
      const fields: Record<string, string[]> = {};

      for (const issue of zodIssues) {
        const field = issue.path.join(".") || "root";
        fields[field] ??= [];
        fields[field].push(issue.message);
      }

      this.send(response, request, HttpStatus.BAD_REQUEST, {
        error: {
          code: "VALIDATION_ERROR",
          message: "Input tidak valid.",
          fields,
        },
      });
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const responseBody = exception.getResponse();
      const message = this.getHttpMessage(responseBody);

      this.send(response, request, status, {
        error: {
          code: this.getErrorCode(status),
          message,
        },
      });
      return;
    }

    this.send(response, request, HttpStatus.INTERNAL_SERVER_ERROR, {
      error: {
        code: "INTERNAL_ERROR",
        message: "Terjadi kesalahan internal.",
      },
    });
  }

  private getZodIssues(
    exception: unknown,
  ): ReadonlyArray<{ path: (string | number)[]; message: string }> | undefined {
    if (exception instanceof ZodError) {
      return exception.issues;
    }

    if (
      !exception ||
      typeof exception !== "object" ||
      !("name" in exception) ||
      exception.name !== "ZodError" ||
      !("issues" in exception) ||
      !Array.isArray(exception.issues)
    ) {
      return undefined;
    }

    const issues = exception.issues.filter(
      (issue): issue is { path: (string | number)[]; message: string } =>
        Boolean(
          issue &&
          typeof issue === "object" &&
          "path" in issue &&
          Array.isArray(issue.path) &&
          issue.path.every(
            (segment: unknown) =>
              typeof segment === "string" || typeof segment === "number",
          ) &&
          "message" in issue &&
          typeof issue.message === "string",
        ),
    );

    return issues.length === exception.issues.length ? issues : undefined;
  }

  private send(
    response: Response,
    request: Request,
    status: number,
    body: Omit<ErrorResponseBody, "requestId">,
  ): void {
    const requestId = request.header("x-request-id");
    response.status(status).json({
      ...body,
      ...(requestId ? { requestId } : {}),
    });
  }

  private getHttpMessage(responseBody: string | object): string {
    if (typeof responseBody === "string") {
      return responseBody;
    }

    if ("message" in responseBody && typeof responseBody.message === "string") {
      return responseBody.message;
    }

    return "Request tidak dapat diproses.";
  }

  private getErrorCode(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return "VALIDATION_ERROR";
      case HttpStatus.UNAUTHORIZED:
        return "UNAUTHORIZED";
      case HttpStatus.FORBIDDEN:
        return "FORBIDDEN";
      case HttpStatus.NOT_FOUND:
        return "NOT_FOUND";
      case HttpStatus.CONFLICT:
        return "CONFLICT";
      case HttpStatus.TOO_MANY_REQUESTS:
        return "RATE_LIMITED";
      default:
        return "REQUEST_ERROR";
    }
  }
}
