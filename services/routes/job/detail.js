// backend/services/routes/job/detail.js
const express = require("express");
const router = express.Router();
const Job = require("../../../backend/models/job");
const Application = require("../../../backend/models/application");
const UserSkill = require("../../../backend/models/userSkill");
const { isAuthenticated } = require("../../middlewares/accountAuth");
const { calculateSkillMatches } = require("./helpers");

// GET /job/:id - View Job Detail
router.get("/job/:id", isAuthenticated, async (req, res, next) => {
  try {
    const jobId = req.params.id;
    const currentUserId = req.user?.id; // Use optional chaining

    // Fetch job details including required skills
    const job = await Job.getJobWithSkillsById(jobId);

    if (!job) {
      req.flash("error", "Job not found.");
      return res.redirect("/job"); // Redirect to job board if job doesn't exist
    }

    // --- Ensure working_hours_details is an array ---
    if ( job.working_hours_details && typeof job.working_hours_details === "string") {
      try {
        job.working_hours_details = JSON.parse(job.working_hours_details);
      } catch (parseError) {
        console.error( `Error parsing working_hours_details JSON for job ${jobId}:`, parseError,);
        job.working_hours_details = []; // Default to empty array on error
      }
    } else if (!Array.isArray(job.working_hours_details)) {
        job.working_hours_details = []; // Ensure it's an array if null/undefined/not array
    }
    // --- End working_hours_details fix ---


    let userApplication = null;
    let userSkills = [];
    let skillMatchResults = [];

    // If a user is logged in, fetch their application status for this job and their skills
    if (currentUserId) {
      try {
        const [appResult, skillsResult] = await Promise.all([
          Application.getApplicationByJobAndApplicant(jobId, currentUserId),
          UserSkill.getSkillsByUserId(currentUserId),
        ]);
        userApplication = appResult; // Will be null if no application found
        userSkills = skillsResult || []; // Ensure it's an array

        // Calculate skill matches if required skills exist
        if (job.required_skills && job.required_skills.length > 0) {
          skillMatchResults = calculateSkillMatches(
            userSkills,
            job.required_skills,
          );
        }
      } catch (userDataError) {
        console.error(
          `Error fetching user application/skills for job ${jobId}:`,
          userDataError,
        );
        req.flash(
          "warning",
          "Could not load your application status or skill matches.",
        );
        // Continue rendering the page without this data
      }
    }

    // Determine if the logged-in user is the owner of the job
    const isOwner = currentUserId && job.user_id === currentUserId;

    // Render the job detail page
    res.render("job/job", {
      title: job.title, // Set page title
      job, // The main job object (includes required_skills)
      isOwner, // Boolean indicating if current user owns the job
      userApplication, // User's application object for this job (or null)
      currentUserId, // Pass user ID for conditional rendering
      skillMatchResults, // Array of skill match results for the user
      userSkills, // Pass user's full skill list (might be useful in template)
      csrfToken: req.csrfToken(), // Needed for apply/delete forms on the page
    });
  } catch (err) {
    console.error(`Error loading job detail page for ID ${req.params.id}:`, err);
    req.flash("error", "Failed to load job details.");
    next(err); // Pass error to global handler
  }
});

module.exports = router;