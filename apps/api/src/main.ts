import "reflect-metadata";

import { createApiApplication } from "./app.bootstrap";

async function bootstrap(): Promise<void> {
  const app = await createApiApplication();
  await app.listen(process.env.PORT ?? 3000);
}

void bootstrap();
