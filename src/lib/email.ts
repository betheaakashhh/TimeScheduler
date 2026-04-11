// src/lib/email.ts
import { getEmailQueue } from './redis';
import { EmailJob } from '@/types';
import { env } from './env';

function getEmailTemplate(job: EmailJob): { subject: string; html: string } {
  const { type, data } = job;
  const base = `<div style="font-family:'Segoe UI',sans-serif;max-width:540px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden">
    <div style="background:#FF6B35;padding:24px 32px"><h1 style="color:white;margin:0;font-size:22px;font-weight:700">RhythmIQ</h1></div>
    <div style="padding:28px 32px">`;
  const footer = `</div><div style="padding:16px 32px;background:#F4F3EE;font-size:12px;color:#9A9A94;text-align:center">
    <a href="${process.env.NEXTAUTH_URL}/settings" style="color:#FF6B35">Manage email preferences</a></div></div>`;

  switch (type) {
    case 'wake-up':
      return {
        subject: `Good morning, ${data.userName}! Time to rise.`,
        html: base + `<h2 style="color:#1A1A18;margin-top:0">Good morning, ${data.userName}!</h2>
          <p style="color:#5A5A55;line-height:1.7">Your schedule is ready and waiting for you.</p>
          <a href="${process.env.NEXTAUTH_URL}/dashboard" style="display:inline-block;background:#FF6B35;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:12px">Open Today's Schedule</a>` + footer,
      };
    case 'reminder':
      return {
        subject: `Reminder: ${data.taskTitle} is starting now`,
        html: base + `<h2 style="color:#1A1A18;margin-top:0">Time for: ${data.taskTitle}</h2>
          <p style="color:#5A5A55;line-height:1.7">Hey ${data.userName}, your scheduled task is starting right now.</p>
          <a href="${process.env.NEXTAUTH_URL}/dashboard" style="display:inline-block;background:#FF6B35;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:12px">Mark as done</a>` + footer,
      };
    case 'streak-warning':
      return {
        subject: `Your ${data.streakCount}-day streak is at risk today!`,
        html: base + `<h2 style="color:#1A1A18;margin-top:0">Streak Alert! ${data.streakCount} days</h2>
          <p style="color:#5A5A55;line-height:1.7">Hey ${data.userName}, complete more tasks today to keep your streak alive!</p>
          <a href="${process.env.NEXTAUTH_URL}/dashboard" style="display:inline-block;background:#FF6B35;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Complete tasks</a>` + footer,
      };
    case 'task-alert':
      return {
        subject: `Strict task reminder: ${data.taskTitle}`,
        html: base + `<h2 style="color:#1A1A18;margin-top:0">${data.taskTitle}</h2>
          <p style="color:#5A5A55;line-height:1.7">Hey ${data.userName}, this is a strict task. Skipping it will impact your streak.</p>
          <a href="${process.env.NEXTAUTH_URL}/dashboard" style="display:inline-block;background:#FF6B35;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:8px">Open Schedule</a>` + footer,
      };
    default:
      return { subject: 'RhythmIQ notification', html: base + `<p>${data.message}</p>` + footer };
  }
}

export async function sendEmail(job: EmailJob): Promise<void> {
  try {
    const nodemailer = await import('nodemailer');
    const transporter = nodemailer.default.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_PORT === '465',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    const { subject, html } = getEmailTemplate(job);
    await transporter.sendMail({
      from: `RhythmIQ <${process.env.SMTP_FROM || 'noreply@rhythmiq.app'}>`,
      to: job.to,
      subject,
      html,
    });
  } catch (err) {
    console.error('Email send failed:', err);
  }
}

export async function queueEmail(job: EmailJob, delayMs = 0): Promise<void> {
  try {
    const queue = await getEmailQueue();
    if (!queue) {
      // Fallback: send directly if queue unavailable
      await sendEmail(job);
      return;
    }
    await queue.add(job, {
      delay: delayMs,
      attempts: 2,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: 50,
      removeOnFail: 20,
    });
  } catch {
    // Final fallback: direct send
    await sendEmail(job).catch(() => {});
  }
}
