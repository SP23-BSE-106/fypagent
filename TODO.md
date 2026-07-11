# TODO

- [x] UC-3: Create Manage Profile API route `src/app/api/auth/profile/route.ts`
- [x] UC-3: Extend user settings UI at `src/app/dashboard/settings/page.tsx` to call `/api/auth/profile` for:
  - [x] Update profile (full name, avatar, preferences)
  - [x] Update email with re-verification (BR-5)
  - [x] Change password (Alternative Flow 3.1)
- [x] UC-3: Add/Update user type fields in `src/lib/mongo/types.ts` for `avatarUrl` and `preferences`


- [ ] Lint/build verification (run `npm run lint`, `npm run build`)

