import nodemailer from 'nodemailer'

type SendEmailOptions = {
  to: string | string[]
  subject: string
  html?: string
  text?: string
}

function getMailerConfig() {
  const {
    SMTP_HOST,
    SMTP_PORT,
    SMTP_USER,
    SMTP_PASS,
    SMTP_FROM,
    MAILTRAP_HOST,
    MAILTRAP_PORT,
    MAILTRAP_USER,
    MAILTRAP_PASS,
    SMTP_SECURE,
  } = process.env

  const host = SMTP_HOST || MAILTRAP_HOST || 'smtp.gmail.com'
  const port = Number(SMTP_PORT || MAILTRAP_PORT || '587')
  const user = SMTP_USER || MAILTRAP_USER
  const pass = SMTP_PASS || MAILTRAP_PASS
  const secure = SMTP_SECURE === 'true' || port === 465

  if (!host || !port || !user || !pass) {
    throw new Error('Mailer is not configured. Missing SMTP_* or Mailtrap environment variables.')
  }

  return {
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
    from: SMTP_FROM || user,
  }
}

export async function sendEmail({ to, subject, html, text }: SendEmailOptions) {
  const { host, port, secure, auth, from } = getMailerConfig()

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth,
  })

  return transporter.sendMail({
    from,
    to,
    subject,
    html,
    text,
  })
}

