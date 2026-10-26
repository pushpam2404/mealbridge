import { HttpError } from '../utils/httpError.js';

// Parses req[source] with a zod schema and replaces it with the parsed value.
export const validate = (schema, source = 'body') => (req, _res, next) => {
  const result = schema.safeParse(req[source]);
  if (!result.success) {
    const fields = {};
    for (const issue of result.error.issues) {
      const key = issue.path.join('.') || '_';
      fields[key] ??= issue.message;
    }
    throw new HttpError(400, 'Some fields need fixing', fields);
  }
  if (source === 'query') req.validQuery = result.data;
  else req[source] = result.data;
  next();
};
