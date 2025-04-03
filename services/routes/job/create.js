const express = require("express");
const router = express.Router();
const Job = require("../../../backend/models/job");
const User = require("../../../backend/models/user");
const Skill = require("../../../backend/models/skill");
const JobSkill = require("../../../backend/models/jobSkill");
const { isAuthenticated } = require("../../middlewares/accountAuth");
const {
  validateJob,
  handleValidationErrors,
} = require("../../middlewares/validation");
const { processSkillsInput } = require("./helpers");

// GET /create
router.get("/create", isAuthenticated, async (req, res, next) => {
  try {
    // Fetch all available skills
    const allSkills = await Skill.getAllSkills();

    res.render("job/create", {
      title: "Create Job",
      // Pass flashed old input data if any
      oldInput: req.flash("oldInput")[0] || {},
      allSkills: allSkills || [], // Ensure it's an array
      jobSkillsMap: {},
      csrfToken: req.csrfToken(),
    });
  } catch (err) {
    console.error("Error loading create job page:", err);
    req.flash("error", "Failed to load the create job form.");
    next(err);
  }
});

// POST /create
router.post(
  "/create",
  isAuthenticated,
  validateJob, // Apply validation rules for job creation
  processSkillsInput, // Process the 'skills' input into 'skillsData'
  handleValidationErrors, // Check for validation errors and redirect if any
  async (req, res, next) => {
    // If execution reaches here, validation passed
    const skillsData = req.body.skillsData; // Get processed skill data from middleware
    const currentUserId = req.user.id;

    try {
      // Fetch the current user's details to get their username for the 'author' field
      const currentUser = await User.findById(currentUserId);
      if (!currentUser || !currentUser.username) {
        // This should be rare if isAuthenticated works, but good safety check
        req.flash(
          "error",
          "Authentication error: Could not retrieve your username.",
        );
        // Redirect back to form, flashing input
        req.flash("oldInput", req.body);
        return res.redirect("/job/create");
      }

      // Construct the job data object
      const jobData = {
        title: req.body.title,
        description: req.body.description,
        author: currentUser.username, // Use the fetched username
        user_id: currentUserId,
        company_name: req.body.company_name,
        application_deadline: req.body.application_deadline,
        start_date: req.body.start_date,
        salary_amount: req.body.salary_amount, // Already integer/float from validation
        weekly_hours: req.body.weekly_hours, // Already float from validation
        working_hours_details: req.body.working_hours_details || "[]", // Ensure it's a JSON string
        working_location: req.body.working_location,
        in_person_location: req.body.in_person_location || null, // Use null if not provided/applicable
        // 'status' is set to 'open' by default in the Job.createJob model function
      };

      // 1. Create the base job record
      const createdJob = await Job.createJob(jobData);

      // 2. If job creation was successful and skills were provided, set the job skills
      if (createdJob?.id && skillsData && skillsData.length > 0) {
        // Use JobSkill model to handle setting/replacing skills for the job
        await JobSkill.setJobSkills(createdJob.id, skillsData);
      }

      // Success: Redirect to the job board (or the newly created job's page)
      req.flash("success", "Job created successfully!");
      res.redirect("/job"); // Redirect to the main job board
    } catch (err) {
      console.error("Error creating job:", err);

      // Provide more specific user feedback based on common errors
      let userErrorMessage =
        "Failed to create job. Please check the form and try again.";
      if (err.message.includes("violates check constraint")) {
        if (err.message.includes("jobs_weekly_hours_check")) {
          userErrorMessage = "Weekly hours must be between 1 and 48.";
        } else if (err.message.includes("start_after_deadline")) {
          userErrorMessage =
            "Start date must be after the application deadline.";
        }
      } else if (err.message.includes("violates not-null constraint")) {
        userErrorMessage = `Failed to create job: A required field was missing. (${err.detail || err.message})`;
      } else {
        userErrorMessage = `Failed to create job: ${err.message}`;
      }

      req.flash("error", userErrorMessage);

      // Flash the submitted data back to the form for correction
      req.flash("oldInput", req.body);
      res.redirect("/job/create"); // Redirect back to the create form
    }
  },
);

module.exports = router;
