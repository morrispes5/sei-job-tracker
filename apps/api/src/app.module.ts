import { Module } from "@nestjs/common";

import { DatabaseModule } from "./drizzle/database.module";
import { ApplicationsModule } from "./modules/applications/applications.module";
import { AuthModule } from "./modules/auth/auth.module";

@Module({
  imports: [DatabaseModule, AuthModule, ApplicationsModule],
})
export class AppModule {}
