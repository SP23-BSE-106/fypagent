import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rateLimit";
import { sendEmail } from "@/utils/mailer";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: NextRequest) {
  try {
    const forwardedIp =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown";

    const body = (await request.json().catch(() => ({}))) as {
      name?: string;
      email?: string;
      subject?: string;
      message?: string;
    };

    const name = (body.name || "").trim();
    const email = (body.email || "").trim().toLowerCase();
    const subject = (body.subject || "").trim();
    const message = (body.message || "").trim();

    if (!name || name.length < 2) {
      return NextResponse.json({ error: "Missing name" }, { status: 400 });
    }

    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    if (!subject || subject.length < 3) {
      return NextResponse.json({ error: "Missing subject" }, { status: 400 });
    }

    if (!message || message.length < 10) {
      return NextResponse.json({ error: "Message is too short" }, { status: 400 });
    }

    const rl = rateLimit(`contact:${forwardedIp}`, { windowMs: 60_000, max: 5 });
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Too many requests", retryAfterMs: rl.retryAfterMs },
        { status: 429 },
      );
    }

    // Where we send inbound contact messages.
    // Prefer an explicit admin email.
    // e.g. CONTACT_TO_EMAIL=munaazza@gmail.com
    const to = (process.env.CONTACT_TO_EMAIL || process.env.ADMIN_EMAIL || "munazza@gmail.com").trim();

    if (!to || !isValidEmail(to)) {
      throw new Error(`Invalid CONTACT_TO_EMAIL/ADMIN_EMAIL recipient: ${to}`);
    }

    const text = [
      "You received a new contact form submission.",
      "",
      `From: ${name} <${email}>`,
      `Subject: ${subject}`,
      "",
      message,
    ].join("\n");

    const html = `
      <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;">
        <h2 style="margin:0 0 12px 0;">New contact form submission</h2>
        <p style="margin:0 0 8px 0;">From: <b>${name}</b> <${email}></p>
        <p style="margin:0 0 16px 0;">Subject: <b>${subject}</b></p>
        <pre style="white-space: pre-wrap; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; background:#f3f4f6; padding:12px; border-radius:8px;">${message}</pre>
      </div>
    `;

    console.log("[contact] sending email", { to, subject: `Contact: ${subject}`, from: process.env.SMTP_NO_REPLY || process.env.NO_REPLY_EMAIL || process.env.SMTP_FROM || process.env.SMTP_USER || process.env.MAILTRAP_USER });

    await sendEmail({
      to,
      subject: `Contact: ${subject}`,
      text,
      html,
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

