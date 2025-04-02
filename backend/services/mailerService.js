// backend/services/mailerService.js
const transporter = require("../config/mailer");
require("dotenv").config();

const SENDER_NAME = "Job Matchmaker";
const SENDER_EMAIL = process.env.EMAIL_USER;

async function sendNotification(to, subject, html) {
  if (!to || !subject || !html) {
    console.error("Missing parameters for sendNotification:", {
      to,
      subject,
      html: html ? "HTML provided" : "HTML missing",
    });
    throw new Error("Missing required email parameters.");
  }
  try {
    await transporter.sendMail({
      from: `"${SENDER_NAME}" <${SENDER_EMAIL}>`,
      to: to,
      subject: subject,
      html: html,
    });
    console.log(`Notification email sent successfully to ${to}`);
  } catch (error) {
    console.error(`Error sending notification email to ${to}:`, error);
  }
}
async function notifyNewApplication(
  jobCreator,
  applicant,
  job,
  application,
  req,
) {
  if (
    !jobCreator ||
    !jobCreator.email ||
    !jobCreator.notify_new_applicant_for_my_job
  ) {
    console.log(
      `Skipping new application notification for job ${job.id}. Reason: Job creator (${jobCreator?.email}) opted out or invalid.`,
    );
    return;
  }
  const applicantName =
    applicant?.username || applicant?.email || "A new applicant";
  const host = process.env.APP_HOST || req.get("host");
  const reviewUrl = `${req.protocol}://${host}/application/received`;
  const subject = `New Application Received for "${job.title}"`;
  const html = `
        <p>Hello ${jobCreator.username || jobCreator.email},</p>
        <p>You have received a new application from <strong>${applicantName}</strong> for your job posting: <strong>"${job.title}"</strong>.</p>
        <p>Application Title: ${application.title}</p>
        <p>You can review this application and others here:</p>
        <p><a href="${reviewUrl}">${reviewUrl}</a></p>
        <hr>
        <p><small>To manage your notification preferences, please visit your settings page.</small></p>
    `;
  await sendNotification(jobCreator.email, subject, html);
}

/**
 * Sends a notification to the applicant about their application status update
 * This is only triggered manually by the employer for 'rejected'or 'hired' status, not used for 'accepted'
 * @param {object} applicant
 * @param {object} job
 * @param {object} application
 * @param {object} req
 */
async function notifyApplicationStatusUpdate(applicant, job, application, req) {
  // Check preference and valid applicant
  if (!applicant || !applicant.email || !applicant.notify_own_status_change) {
    console.log(
      `Skipping status update notification for applicant ${applicant?.email}. Reason: Opted out or invalid.`,
    );
    return;
  }

  if (application.status !== "rejected" && application.status !== "hired") {
    console.log(
      `notifyApplicationStatusUpdate: Skipping notification for status: ${application.status}`,
    );
    return;
  }

  const host = process.env.APP_HOST || req.get("host");
  const myApplicationsUrl = `${req.protocol}://${host}/application/my`;
  const statusText =
    application.status.charAt(0).toUpperCase() + application.status.slice(1);

  let subject = `Update on your application for "${job.title}"`;
  let html = ``;

  if (application.status === "hired") {
    // 'offer' message
    subject = `Job Offer for "${job.title}"`;
    html = `
        <p>Hello ${applicant.username || applicant.email},</p>
        <p>Congratulations! You have received a job offer for the position: <strong>"${job.title}"</strong>.</p>
        <p>Please visit your 'My Applications' page to review the details and respond to the offer.</p>
        <p><a href="${myApplicationsUrl}">${myApplicationsUrl}</a></p>
        <hr>
        <p><small>To manage your notification preferences, please visit your settings page.</small></p>
    `;
  } else {
    // 'rejected' message
    html = `
        <p>Hello ${applicant.username || applicant.email},</p>
        <p>There's an update on your application for the job: <strong>"${job.title}"</strong>.</p>
        <p>Your application status has been updated to: <strong>${statusText}</strong>.</p>
        <p>You can view your application status here:</p>
        <p><a href="${myApplicationsUrl}">${myApplicationsUrl}</a></p>
        <hr>
        <p><small>To manage your notification preferences, please visit your settings page.</small></p>
    `;
  }

  await sendNotification(applicant.email, subject, html);
}

/**
 * Sends a joint email when an applicant accepts a job offer.
 * @param {object} applicant
 * @param {object} jobCreator
 * @param {object} job
 * @param {object} req
 */
async function notifyOfferAccepted(applicant, jobCreator, job, req) {
  if (!applicant || !applicant.email || !jobCreator || !jobCreator.email) {
    console.error(
      "Cannot send acceptance notification: Missing applicant or job creator email.",
    );
    return;
  }

  const applicantName = applicant.username || applicant.email;
  const creatorName = jobCreator.username || jobCreator.email;

  const subject = `Offer Accepted: ${applicantName} for "${job.title}"`;
  const html = `
        <p>Congratulations!</p>
        <p><strong>${applicantName}</strong> has accepted the job offer for the position: <strong>"${job.title}"</strong> posted by <strong>${creatorName}</strong>.</p>
        <p>This email connects you both to coordinate the next steps for onboarding.</p>
        <hr>
        <p><strong>Contact Information:</strong></p>
        <ul>
            <li>Applicant (${applicantName}): ${applicant.email}</li>
            <li>Employer (${creatorName}): ${jobCreator.email}</li>
        </ul>
        <hr>
        <p>Best regards,</p>
        <p>The Job Matchmaker Team</p>
    `;

  // Send the email to both parties
  const recipients = [applicant.email, jobCreator.email].join(", ");

  await sendNotification(recipients, subject, html);
}

/**
 * Sends a notification to the job creator when an applicant declines an offer.
 * @param {object} jobCreator
 * @param {object} applicant
 * @param {object} job
 * @param {object} req
 */
async function notifyOfferDeclined(jobCreator, applicant, job, req) {
  if (!jobCreator || !jobCreator.email) {
    console.error(
      "Cannot send offer declined notification: Missing job creator email.",
    );
    return;
  }

  const applicantName = applicant.username || applicant.email;
  const creatorName = jobCreator.username || jobCreator.email;
  const receivedApplicationsUrl = `${req.protocol}://${req.get("host")}/application/received`;

  const subject = `Offer Declined: ${applicantName} for "${job.title}"`;
  const html = `
        <p>Hello ${creatorName},</p>
        <p><strong>${applicantName}</strong> has declined the job offer for the position: <strong>"${job.title}"</strong>.</p>
        <p>The job status remains open, and you can review other candidates or update the job posting here:</p>
        <p><a href="${receivedApplicationsUrl}">${receivedApplicationsUrl}</a></p>
    `;
  await sendNotification(jobCreator.email, subject, html);
}

module.exports = {
  sendNotification,
  notifyNewApplication,
  notifyApplicationStatusUpdate,
  notifyOfferAccepted,
  notifyOfferDeclined,
};
