// backend/services/routes/application/edit.js
const express = require("express");
const router = express.Router();
const Application = require("../../../backend/models/application");
const Job = require("../../../backend/models/job");
const User = require("../../../backend/models/user");
const { isAuthenticated } = require("../../middlewares/accountAuth");
const { body } = require("express-validator");
const { handleValidationErrors } = require("../../middlewares/validation");
const mailerService = require("../../../backend/services/mailerService");

// Define validators specifically for this route
const validateStatusUpdate = [
  body("status")
    .isIn(["pending", "hired", "rejected"]) // Explicitly allow 'pending' for validation, but prevent setting it back later
    .withMessage("Invalid status value selected."),
];

// Render edit status form
router.get("/edit/:id", isAuthenticated, async (req, res, next) => {
  try {
    const applicationId = req.params.id;
    const currentUserId = req.user.id;

    // Fetch application
    const application = await Application.getApplicationById(applicationId);
    if (!application) {
      req.flash("error", "Application not found.");
      return res.redirect("/application/received");
    }

    // Fetch associated job for authorisation check and context
    const job = await Job.getJobById(application.job_id);
    if (!job) {
      req.flash("error", "Associated job not found.");
      return res.redirect("/application/received");
    }

    // Ensure the current user owns the job
    if (job.user_id !== currentUserId) {
      req.flash(
        "error",
        "You are not authorized to edit this application status.",
      );
      return res.redirect("/application/received");
    }

    // Fetch applicant details for display
    const applicant = await User.findById(application.applicant_id);

    // Render the edit form
    res.render("applications/edit", {
      title: "Review Application Status",
      application,
      jobTitle: job.title,
      applicantUsername: applicant
        ? applicant.username || applicant.email
        : "Unknown Applicant", // Provide a fallback
      csrfToken: req.csrfToken(),
    });
  } catch (err) {
    console.error(
      `Error loading application edit page for ID ${req.params.id}:`,
      err,
    );
    req.flash("error", "Application not found or error loading details.");
    next(err); // Pass to global error handler
  }
});

// Update status (Only allows Pending -> hired/rejected)
router.post(
  "/edit/:id",
  isAuthenticated,
  validateStatusUpdate,
  handleValidationErrors,
  async (req, res, next) => {
    const { status } = req.body; // 'hired' or 'rejected' are the only valid new states allowed by logic
    const applicationId = req.params.id;
    const currentUserId = req.user.id;
    let originalApplication = null;
    let applicant = null;
    let job = null;

    try {
      // Fetch original application to check current status and job ownership
      originalApplication = await Application.getApplicationById(applicationId);
      if (!originalApplication) {
        req.flash("error", "Application not found.");
        return res.redirect("/application/received");
      }

      // Fetch job for authorization and notification context
      job = await Job.getJobById(originalApplication.job_id);
      if (!job) {
        req.flash("error", "Associated job not found.");
        return res.redirect("/application/received");
      }

      // Ensure current user owns the job
      if (job.user_id !== currentUserId) {
        req.flash(
          "error",
          "You are not authorised to update this application status.",
        );
        return res.redirect("/application/received");
      }

      // Only allow changes from 'pending'
      if (originalApplication.status !== "pending") {
        req.flash(
          "error",
          `Status is already '${originalApplication.status}' and cannot be changed via this action.`,
        );
        // Redirect back to the edit page to show the message
        return res.redirect(`/application/edit/${applicationId}`);
      }

      // Prevent setting status back to 'pending' (even if validation allowed it)
      if (status === "pending") {
        req.flash("error", "Cannot set status back to 'pending'.");
        return res.redirect(`/application/edit/${applicationId}`);
      }

      // Perform the status update
      const updatedApplication = await Application.updateApplication(
        applicationId,
        { status }, // Update with the new status ('hired' or 'rejected')
      );

      // Fetch applicant details for notification
      applicant = await User.findById(originalApplication.applicant_id);

      // Send Notification (if applicant exists and status changed to hired/rejected)
      if (applicant && updatedApplication) {
        await mailerService.notifyApplicationStatusUpdate(
          applicant,
          job,
          updatedApplication,
          req,
        );
      }

      // Success feedback
      const friendlyStatus =
        status === "hired"
          ? "Offer Sent"
          : status.charAt(0).toUpperCase() + status.slice(1); // "Rejected"
      req.flash(
        "success",
        `Application status updated to '${friendlyStatus}'. ${applicant ? "The applicant will be notified if they opted in." : ""}`,
      );
      res.redirect("/application/received"); // Redirect back to the list
    } catch (err) {
      console.error(
        `Error updating status for application ${applicationId}:`,
        err,
      );
      req.flash("error", err.message || "Failed to update application status.");
      // Redirect back to the edit page on error
      res.redirect(`/application/edit/${applicationId}`);
    }
  },
);

module.exports = router;
