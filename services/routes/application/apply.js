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
const validateApplication = [
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Application title is required")
    .isLength({ max: 100 })
    .withMessage("Title must be less than 100 characters")
    .escape(),
  body("description")
    .trim()
    .notEmpty()
    .withMessage("Cover letter or message is required")
    .isLength({ max: 5000 })
    .withMessage("Description must be less than 5000 characters")
    .escape(),
];

// Submit an application
router.post(
  "/apply/:jobId",
  isAuthenticated,
  validateApplication,
  handleValidationErrors,
  async (req, res, next) => {
    const { title, description } = req.body;
    const jobId = req.params.jobId;
    const applicantId = req.user.id;
    let applicant = null;
    let job = null;
    let jobCreator = null;

    try {
      // Validate Job Existence and Status
      job = await Job.getJobById(jobId);
      if (!job) {
        req.flash("error", "Job not found.");
        return res.redirect("/job");
      }
      if (job.status !== "open") {
        req.flash("error", "Applications for this job are closed.");
        return res.redirect(`/job/job/${jobId}`);
      }

      // Fetch Applicant and Job Creator for notification
      applicant = await User.findById(applicantId);
      if (!applicant) {
        // This should ideally not happen if isAuthenticated works
        console.error(`Applicant user ${applicantId} not found.`);
        req.flash("error", "Your user profile could not be found.");
        return res.redirect(`/job/job/${jobId}#apply-section`);
      }
      jobCreator = await User.findById(job.user_id); // Fetch creator

      // Attempt to create the application
      const newApplication = await Application.createApplication({
        job_id: jobId,
        applicant_id: applicantId,
        title,
        description,
      });

      // Send Notification (only if creator exists and opted in)
      if (jobCreator && applicant && job && newApplication) {
        await mailerService.notifyNewApplication(
          jobCreator,
          applicant,
          job,
          newApplication,
          req,
        );
      }

      req.flash("success", "Application submitted successfully!");
      res.redirect("/application/my"); // Redirect to user's applications list
    } catch (err) {
      console.error(
        `Error applying for job ${jobId} by user ${applicantId}:`,
        err,
      );
      // Check for specific "already applied" error
      if (err.message.includes("You have already applied for this job")) {
        req.flash("error", err.message);
      } else {
        req.flash(
          "error",
          "Failed to submit application. Please try again.",
        );
      }
      // Redirect back to the job page apply section
      res.redirect(`/job/job/${jobId}#apply-section`);
    }
  },
);

module.exports = router;