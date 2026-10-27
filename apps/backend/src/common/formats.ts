// Formats OpenAPI `date` (YYYY-MM-DD) et `time` (HH:mm ou HH:mm:ss)
export const DATE_REGEX = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
export const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;
