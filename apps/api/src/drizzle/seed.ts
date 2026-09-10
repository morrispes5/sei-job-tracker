import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import {
  applicationActivities,
  applicationContacts,
  applicationNotes,
  applications,
  reminders,
  users,
} from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL is required to seed the local or preview database.",
  );
}

const seedIds = {
  activity: "00000000-0000-4000-8000-000000000004",
  application: "00000000-0000-4000-8000-000000000002",
  contact: "00000000-0000-4000-8000-000000000005",
  note: "00000000-0000-4000-8000-000000000003",
  reminder: "00000000-0000-4000-8000-000000000006",
  user: "00000000-0000-4000-8000-000000000001",
} as const;

const client = postgres(connectionString, { max: 1 });
const db = drizzle(client);

async function seed(): Promise<void> {
  try {
    await db.transaction(async (tx) => {
      await tx
        .insert(users)
        .values({
          id: seedIds.user,
          email: "demo@sei.local",
          // This record is fixture data, not an account. M2 replaces it with a real Argon2id hash fixture.
          passwordHash: "M1_SEED_USER_IS_NOT_AUTHENTICATABLE",
          displayName: "Sei Demo",
          timezone: "Asia/Jakarta",
        })
        .onConflictDoNothing();

      await tx
        .insert(applications)
        .values({
          id: seedIds.application,
          userId: seedIds.user,
          title: "Backend Intern",
          organizationName: "Example Technology",
          type: "INTERNSHIP",
          status: "APPLIED",
          sourceName: "Campus career page",
          workMode: "HYBRID",
          location: "Jakarta",
          appliedAt: "2030-01-05",
          deadlineAt: new Date("2030-01-15T09:00:00.000Z"),
          nextStepAt: new Date("2030-01-12T09:00:00.000Z"),
        })
        .onConflictDoNothing();

      await tx
        .insert(applicationNotes)
        .values({
          id: seedIds.note,
          applicationId: seedIds.application,
          body: "Prepare a concise system-design portfolio walkthrough.",
        })
        .onConflictDoNothing();

      await tx
        .insert(applicationContacts)
        .values({
          id: seedIds.contact,
          applicationId: seedIds.application,
          name: "Recruiting Team",
          role: "Talent Acquisition",
          email: "recruiting@example.test",
        })
        .onConflictDoNothing();

      await tx
        .insert(applicationActivities)
        .values({
          id: seedIds.activity,
          applicationId: seedIds.application,
          type: "CREATED",
          metadata: { source: "M1_SEED" },
        })
        .onConflictDoNothing();

      await tx
        .insert(reminders)
        .values({
          id: seedIds.reminder,
          userId: seedIds.user,
          applicationId: seedIds.application,
          kind: "FOLLOW_UP",
          dueAt: new Date("2030-01-12T09:00:00.000Z"),
        })
        .onConflictDoNothing();
    });

    console.info("Development seed completed.");
  } finally {
    await client.end();
  }
}

void seed();
