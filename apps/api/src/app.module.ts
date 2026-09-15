import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";

import { DatabaseModule } from "./drizzle/database.module";
import { ApplicationsModule } from "./modules/applications/applications.module";
import { AuthModule } from "./modules/auth/auth.module";
import { RemindersModule } from "./modules/reminders/reminders.module";

@Module({
  imports: [
    ScheduleModule.forRoot(),
    DatabaseModule,
    AuthModule,
    ApplicationsModule,
    RemindersModule,
  ],
})
export class AppModule {}
