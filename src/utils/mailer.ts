import nodemailer from 'nodemailer'

type SendEmailOptions = {
  to: string | string[]
  subject: string
  html?: string
  text?: string
}

export async function sendEmail({ to, subject, html, text }: SendEmailOptions) {
  const {
    SMTP_HOST,
    SMTP_PORT,
    SMTP_USER,
    SMTP_PASS,
    SMTP_FROM,
  } = process.env

  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    throw new Error('Mailer is not configured. Missing SMTP_* environment variables.')
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: Number(SMTP_PORT) === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  })

  const from = SMTP_FROM || SMTP_USER

  return transporter.sendMail({
    from,
    to,
    subject,
    html,
    text,
  })
}

