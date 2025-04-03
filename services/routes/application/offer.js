// backend/services/routes/application/offer.js
const express = require("express");
const router = express.Router();
const Application = require("../../../backend/models/application");
const Job = require("../../../backend/models/job");
const User = require("../../../backend/models/user");
const { isAuthenticated } = require("../../middlewares/accountAuth");
const mailerService = require("../../../backend/services/mailerService");

// GET /confirm-accept/:id
router.get("/confirm-accept/:id", isAuthenticated, async (req, res, next) => {
  const applicationId = req.params.id;
  const applicantId = req.user.id;

  try {
    const application = await Application.getApplicationById(applicationId);

    // Validations
    if (!application) {
      req.flash("error", "Application not found.");
      return res.redirect("/application/my");
    }
    // Ensure current user is the applicant
    if (application.applicant_id !== applicantId) {
      req.flash("error", "You are not authorized to view this confirmation.");
      return res.redirect("/application/my");
    }
    // Ensure offer was actually made ('hired')
    if (application.status !== "hired") {
      req.flash(
        "error",
        `Offer cannot be accepted because the current status is '${application.status}'.`,
      );
      return res.redirect("/application/my");
    }

    // Fetch Job Details for context and validation
    const job = await Job.getJobById(application.job_id);
    if (!job) {
      // Should be rare if application exists, but check anyway
      req.flash("error", "Associated job details could not be found.");
      return res.redirect("/application/my");
    }
    // Job Status Check: Ensure job is still open
    if (job.status !== "open") {
      req.flash(
        "error",
        "This job is no longer open and the offer cannot be accepted.",
      );
      return res.redirect("/application/my");
    }

    // Render Confirmation Page
    res.render("applications/confirm-accept", {
      title: "Confirm Offer Acceptance",
      application: application,
      job: job,
      csrfToken: req.csrfToken(), // Needed for the confirmation form POST
    });
  } catch (err) {
    console.error(
      `Error loading offer confirmation page for app ${applicationId}:`,
      err,
    );
    req.flash("error", "Could not load confirmation page. Please try again.");
    next(err); // Pass to global error handler
  }
});

// POST /accept/:id - Applicant accepts the offer
router.post("/accept/:id", isAuthenticated, async (req, res, next) => {
  const applicationId = req.params.id;
  const applicantId = req.user.id;

  try {
    // Re-validate Application and Job state before proceeding
    const application = await Application.getApplicationById(applicationId);
    if (!application) {
      req.flash("error", "Application not found.");
      return res.redirect("/application/my");
    }
    if (application.applicant_id !== applicantId) {
      req.flash("error", "You are not authorized to accept this offer.");
      return res.redirect("/application/my");
    }
    if (application.status !== "hired") {
      req.flash(
        "error",
        `Offer cannot be accepted because the status is '${application.status}'.`,
      );
      return res.redirect("/application/my");
    }

    const job = await Job.getJobById(application.job_id);
    if (!job) {
      req.flash("error", "Associated job not found.");
      return res.redirect("/application/my");
    }
    if (job.status !== "open") {
      req.flash(
        "error",
        "This job is no longer open and the offer cannot be accepted.",
      );
      return res.redirect("/application/my");
    }

    // Fetch Applicant and Job Creator for notification
    const applicant = await User.findById(applicantId);
    const jobCreator = await User.findById(job.user_id);
    if (!applicant || !jobCreator) {
      // Important for the notification step
      console.error(
        `Could not find applicant (${applicantId}) or job creator (${job.user_id}) for offer acceptance email. App ID: ${applicationId}`,
      );
      req.flash(
        "error",
        "Could not process acceptance due to missing user data. Please contact support.",
      );
      return res.redirect("/application/my");
    }

    // 1. Update Application Status to 'accepted'
    await Application.updateApplication(applicationId, { status: "accepted" });

    // 2. Update Job Status to 'closed'
    try {
      await Job.updateJob(job.id, { status: "closed" });
      console.log(
        `Job ${job.id} status set to closed due to offer acceptance (App ID: ${applicationId}).`,
      );
    } catch (updateJobError) {
      console.error(
        `Error updating job ${job.id} status to closed after acceptance (App ID: ${applicationId}):`,
        updateJobError,
      );
      // Decide how to handle: log and continue, or flash a warning?
      req.flash(
        "warning", // Use warning, as acceptance succeeded but closing failed
        "Offer accepted, but failed to automatically close the job listing. The employer has been notified.",
      );
    }

    // 3. Send Joint Notification Email
    await mailerService.notifyOfferAccepted(applicant, jobCreator, job, req);

    // Redirect with success message
    req.flash(
      "success",
      `You have accepted the offer for "${job.title}"! An email has been sent to you and the employer.`,
    );
    res.redirect("/application/my");
  } catch (err) {
    console.error(
      `Error accepting offer for application ${applicationId} by user ${applicantId}:`,
      err,
    );
    req.flash(
      "error",
      err.message || "Failed to accept the offer. Please try again.",
    );
    // Redirect back to 'My Applications' even on error
    res.redirect("/application/my");
  }
});

// POST /decline/:id - Applicant declines the offer
router.post("/decline/:id", isAuthenticated, async (req, res, next) => {
  const applicationId = req.params.id;
  const applicantId = req.user.id;

  try {
    // Revalidate Application state
    const application = await Application.getApplicationById(applicationId);
    if (!application) {
      req.flash("error", "Application not found.");
      return res.redirect("/application/my");
    }
    if (application.applicant_id !== applicantId) {
      req.flash("error", "You are not authorized to decline this offer.");
      return res.redirect("/application/my");
    }
    // Can only decline if status is 'hired'
    if (application.status !== "hired") {
      req.flash(
        "error",
        `Offer cannot be declined because the status is '${application.status}'.`,
      );
      return res.redirect("/application/my");
    }

    // Fetch Job, Applicant, and Creator for notification context
    const job = await Job.getJobById(application.job_id);
    const applicant = await User.findById(applicantId);
    const jobCreator = job ? await User.findById(job.user_id) : null;

    if (!job || !applicant || !jobCreator) {
      // Log if data is missing, but proceed with declining the application
      console.warn(
        `Could not find all details (job/applicant/creator) for offer decline notification. App ID: ${applicationId}`,
      );
    }

    // 1. Update Application Status to 'offer_declined'
    await Application.updateApplication(applicationId, {
      status: "offer_declined",
    });

    // 2. Notify Job Creator (if details were found)
    if (job && applicant && jobCreator) {
      // mailerService checks creator's preference internally
      await mailerService.notifyOfferDeclined(jobCreator, applicant, job, req);
    }

    // Redirect with Success Message
    req.flash(
      "success",
      `You have declined the offer for "${job?.title || "this job"}". ${jobCreator ? "The employer has been notified." : ""}`,
    );
    res.redirect("/application/my");
  } catch (err) {
    console.error(
      `Error declining offer for application ${applicationId} by user ${applicantId}:`,
      err,
    );
    req.flash(
      "error",
      err.message || "Failed to decline the offer. Please try again.",
    );
    res.redirect("/application/my");
  }
});

module.exports = router;
