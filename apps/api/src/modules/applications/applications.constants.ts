export const APPLICATIONS_REPOSITORY = Symbol("APPLICATIONS_REPOSITORY");
export const APPLICATION_NOT_FOUND = "Application was not found.";
export const NOTE_NOT_FOUND = "Note was not found.";
export const CONTACT_NOT_FOUND = "Contact was not found.";
export const APPLICATION_ALREADY_ARCHIVED = "Application is already archived.";
export const APPLICATION_NOT_ARCHIVED = "Application is not archived.";
export const APPLICATION_STORAGE_LIMIT_REACHED =
  "The application storage limit has been reached.";
export const APPLICATION_NOTE_STORAGE_LIMIT_REACHED =
  "The note storage limit has been reached.";
export const APPLICATION_CONTACT_STORAGE_LIMIT_REACHED =
  "The contact storage limit has been reached.";

export const APPLICATION_MAX_PER_USER = 1_000;
export const APPLICATION_NOTE_MAX_PER_USER = 5_000;
export const APPLICATION_CONTACT_MAX_PER_USER = 2_000;

export type ApplicationStorageResource = "application" | "note" | "contact";

export class ApplicationStorageLimitError extends Error {
  constructor(readonly resource: ApplicationStorageResource) {
    super(`${resource} storage limit reached`);
    this.name = "ApplicationStorageLimitError";
  }
}
