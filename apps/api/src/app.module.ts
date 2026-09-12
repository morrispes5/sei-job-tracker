import { Module } from "@nestjs/common";

import { DatabaseModule } from "./drizzle/database.module";
import { AuthModule } from "./modules/auth/auth.module";

@Module({
  imports: [DatabaseModule, AuthModule],
})
export class AppModule {}
