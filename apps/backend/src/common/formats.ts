/** Format OpenAPI `date` : `YYYY-MM-DD`. */
export const DATE_REGEX = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
/** Format OpenAPI `time` : `HH:mm` ou `HH:mm:ss`. */
export const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;
