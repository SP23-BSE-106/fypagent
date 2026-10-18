# Mailtrap env setup (for this project)

## 1) Open `.env.local`
Edit this file:
- `./.env.local`

## 2) Add your Mailtrap SMTP values
Add lines like this:

```env
SMTP_HOST=sandbox.smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=your_mailtrap_user
SMTP_PASS=your_mailtrap_password
SMTP_FROM=AgentFlow <no-reply@agentflow.local>
```

## 3) Restart the dev server
After editing env vars, restart Next.js dev server.

## 4) Verify the mailer is reading the correct vars
The app’s mailer now accepts either `SMTP_*` values or `MAILTRAP_*` values.

