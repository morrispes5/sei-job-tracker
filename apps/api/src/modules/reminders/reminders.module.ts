import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { createEmailProvider } from "./email.provider";
import { readReminderRuntimeConfig } from "./reminder.config";
import { ReminderSchedulerService } from "./reminder-scheduler.service";
import {
  EMAIL_PROVIDER,
  REMINDER_RUNTIME_CONFIG,
  REMINDERS_REPOSITORY,
} from "./reminders.constants";
import { RemindersController } from "./reminders.controller";
import { RemindersRepository } from "./reminders.repository";
import { RemindersService } from "./reminders.service";

@Module({
  imports: [AuthModule],
  controllers: [RemindersController],
  providers: [
    RemindersService,
    RemindersRepository,
    ReminderSchedulerService,
    {
      provide: REMINDERS_REPOSITORY,
      useExisting: RemindersRepository,
    },
    {
      provide: EMAIL_PROVIDER,
      useFactory: createEmailProvider,
    },
    {
      provide: REMINDER_RUNTIME_CONFIG,
      useFactory: readReminderRuntimeConfig,
    },
  ],
})
export class RemindersModule {}
