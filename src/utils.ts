export class HttpError extends Error {
  statusCode: number;
  details?: Record<string, unknown>;
}

export const createHttpError = (
  statusCode: number,
  message: string,
  details?: Record<string, unknown>,
): HttpError => {
  const e = new HttpError(message);

  e.statusCode = statusCode;
  e.details = details;

  return e;
};
