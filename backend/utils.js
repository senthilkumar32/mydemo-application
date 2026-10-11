// An error that is safe to show the user. `field` names the form input it belongs to.
export class HttpError extends Error {
  constructor(status, message, field) {
    super(message);
    this.status = status;
    this.field = field;
  }
}

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Turn an untrusted request value into a trimmed string ("" when missing).
export const cleanString = (value) => String(value ?? "").trim();
