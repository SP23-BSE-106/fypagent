# TODO

## DB connection limits ("fixed" strategy) + Supabase GoTrue client churn

- [ ] Implement app-side mitigations to reduce Supabase GoTrue client churn in the browser (avoid multiple instances/storage key conflicts)
- [ ] Add request rate limiting around auth-sensitive actions/endpoints to prevent traffic spikes from triggering DB connection-limit issues
- [ ] Refactor login/signup UI to reuse a single Supabase client instance per browser context (module-level singleton)
- [ ] Ensure server routes use server-side client with cookies (avoid unnecessary client creation per request where possible)
- [ ] Lint + run dev server, validate login/signup and one execute call


