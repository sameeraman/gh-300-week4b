# Repository Instructions

- Use strict TypeScript and preserve type safety; do not use `any` to bypass type checking.
- Validate all untrusted input before using it, including route parameters and request bodies.
- Return errors as consistent JSON objects with an `error.code` and `error.message`.
- Add or update tests for every behavior change, including HTTP status and response contracts.
- Run `npm run typecheck`, `npm run build`, and `npm test` before considering changes complete.
