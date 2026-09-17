import { Controller, Get, Inject } from "@nestjs/common";

import type { HealthResponse } from "./health.service";
import { HealthService } from "./health.service";

@Controller("health")
export class HealthController {
  constructor(@Inject(HealthService) private readonly health: HealthService) {}

  @Get()
  check(): Promise<HealthResponse> {
    return this.health.check();
  }
}
