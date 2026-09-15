import type { INestApplication, NestApplicationOptions } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import cookieParser from "cookie-parser";

import { AppModule } from "./app.module";
import { ApiExceptionFilter } from "./common/filters/api-exception.filter";
import { assertAuthEnvironment } from "./modules/auth/auth.config";

export async function createApiApplication(
  options?: NestApplicationOptions,
): Promise<INestApplication> {
  assertAuthEnvironment();

  const app = await NestFactory.create(AppModule, options);
  app.setGlobalPrefix("api/v1");
  app.use(cookieParser());
  app.enableCors({
    origin: process.env.WEB_ORIGIN ?? "http://localhost:5173",
    credentials: true,
  });
  app.useGlobalFilters(new ApiExceptionFilter());

  return app;
}
