/** An error with an HTTP status and a message that is safe to show the user. */
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export const notFound = (what = 'Not found') => new HttpError(404, what);
export const badRequest = (message: string) => new HttpError(400, message);
export const forbidden = (message = 'You cannot do that') => new HttpError(403, message);
export const conflict = (message: string) => new HttpError(409, message);
