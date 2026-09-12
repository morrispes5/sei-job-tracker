import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { APPLICATIONS_REPOSITORY } from "./applications.constants";
import { ApplicationsController } from "./applications.controller";
import { ApplicationsRepository } from "./applications.repository";
import { ApplicationsService } from "./applications.service";

@Module({
  imports: [AuthModule],
  controllers: [ApplicationsController],
  providers: [
    ApplicationsService,
    ApplicationsRepository,
    {
      provide: APPLICATIONS_REPOSITORY,
      useExisting: ApplicationsRepository,
    },
  ],
})
export class ApplicationsModule {}
