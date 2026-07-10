- [ ] Update signup flow to not insert into `users` until email verified.
- [ ] Create a pending collection (e.g., `email_verifications`) to store signup data + verification token.
- [ ] Update verify-email route to: validate token in pending collection, then insert into `users`, then delete pending record.
- [ ] Remove immediate session creation from signup endpoint (so no cookie/JWT until verified).
- [ ] Validate TypeScript compile and basic runtime behavior (signup/verify/login).

