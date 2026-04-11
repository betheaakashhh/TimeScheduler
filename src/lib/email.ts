// src/lib/email.ts
import nodemailer from 'nodemailer';
import { emailQueue } from './redis';
import { env } from './env';
import { EmailJob } from '@/types';

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_PORT === 465,
  auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
});

function getEmailTemplate(job: EmailJob): { subject: string; html: string } {
  const { type, data } = job;
  const base = `
    <div style="font-family:'Segoe UI',sans-serif;max-width:540px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08)">
      <div style="background:#FF6B35;padding:24px 32px">
        <h1 style="color:white;margin:0;font-size:22px;font-weight:700">RhythmIQ ⏰</h1>
      </div>
      <div style="padding:28px 32px">
  `;
  const footer = `
      </div>
      <div style="padding:16px 32px;background:#F4F3EE;font-size:12px;color:#9A9A94;text-align:center">
        You're receiving this because email alerts are enabled in your RhythmIQ settings.
        <a href="${env.NEXTAUTH_URL}/settings" style="color:#FF6B35">Manage preferences</a>
      </div>
    </div>
  `;

  switch (type) {
    case 'wake-up':
      return {
        subject: '🌅 Good morning, ' + data.userName + '! Time to rise.',
        html: base + `
          <h2 style="color:#1A1A18;margin-top:0">Good morning, ${data.userName}! 🌟</h2>
          <p style="color:#5A5A55;line-height:1.7">Hope you're feeling well rested. Your schedule is ready and waiting for you.</p>
          <p style="color:#5A5A55;line-height:1.7">✅ Remember to check off your morning alarm and get started strong!</p>
          <a href="${env.NEXTAUTH_URL}/dashboard" style="display:inline-block;background:#FF6B35;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:12px">Open Today's Schedule →</a>
        ` + footer,
      };

    case 'reminder':
      return {
        subject: `⏰ Reminder: ${data.taskTitle} is starting now`,
        html: base + `
          <h2 style="color:#1A1A18;margin-top:0">Time for: ${data.taskTitle} ⏰</h2>
          <p style="color:#5A5A55;line-height:1.7">Hey ${data.userName}, your scheduled task is starting right now. Don't miss it!</p>
          ${data.message ? `<p style="background:#FFF8E1;padding:12px 16px;border-radius:8px;border-left:3px solid #F5A623;color:#5A5A55">${data.message}</p>` : ''}
          <a href="${env.NEXTAUTH_URL}/dashboard" style="display:inline-block;background:#FF6B35;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:12px">Mark as done →</a>
        ` + footer,
      };

    case 'streak-warning':
      return {
        subject: `⚠️ Your ${data.streakCount}-day streak is at risk today!`,
        html: base + `
          <h2 style="color:#1A1A18;margin-top:0">Streak Alert! 🌞 ${data.streakCount} days</h2>
          <p style="color:#5A5A55;line-height:1.7">Hey ${data.userName}, you still have pending tasks today. Complete them to keep your ${data.streakCount}-day streak alive!</p>
          <div style="background:#FFF3E0;border-radius:8px;padding:16px;margin:16px 0">
            <p style="margin:0;color:#E65100;font-weight:600">🔥 Don't break the chain! You're so close.</p>
          </div>
          <a href="${env.NEXTAUTH_URL}/dashboard" style="display:inline-block;background:#FF6B35;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Complete today's tasks →</a>
        ` + footer,
      };

    case 'task-alert':
      return {
        subject: `📚 Strict task reminder: ${data.taskTitle}`,
        html: base + `
          <h2 style="color:#1A1A18;margin-top:0">${data.taskTitle} — Don't miss it!</h2>
          <p style="color:#5A5A55;line-height:1.7">Hey ${data.userName}, this is a <strong>strict task</strong>. Skipping it will impact your schedule and streak.</p>
          ${data.message ? `<p style="color:#5A5A55">${data.message}</p>` : ''}
          <a href="${env.NEXTAUTH_URL}/dashboard" style="display:inline-block;background:#FF6B35;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:8px">Open Schedule →</a>
        ` + footer,
      };

    default:
      return { subject: 'RhythmIQ notification', html: base + `<p>${data.message}</p>` + footer };
  }
}

export async function sendEmail(job: EmailJob): Promise<void> {
  const { subject, html } = getEmailTemplate(job);
  await transporter.sendMail({
    from: `RhythmIQ <${env.SMTP_FROM}>`,
    to: job.to,
    subject,
    html,
  });
}

export async function queueEmail(job: EmailJob, delayMs = 0): Promise<void> {
  await emailQueue.add(job, {
    delay: delayMs,
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: 100,
    removeOnFail: 50,
  });
}

// Bull worker — process email jobs
emailQueue.process(async (job) => {
  await sendEmail(job.data);
  console.log(`✉️ Email sent [${job.data.type}] to ${job.data.to}`);
});

emailQueue.on('failed', (job, err) => {
  console.error(`❌ Email job ${job.id} failed:`, err.message);
});
