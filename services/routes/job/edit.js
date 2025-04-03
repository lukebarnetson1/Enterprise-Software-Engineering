const express = require("express");
const router = express.Router();
const Job = require("../../../backend/models/job");
const Skill = require("../../../backend/models/skill");
const JobSkill = require("../../../backend/models/jobSkill");
const { isAuthenticated } = require("../../middlewares/accountAuth");
const {
  validateJobEdit,
  handleValidationErrors,
} = require("../../middlewares/validation");
const { processSkillsInput } = require("./helpers");

// GET /edit/:id - Render the job editing form
router.get("/edit/:id", isAuthenticated, async (req, res, next) => {
  try {
    const jobId = req.params.id;
    const currentUserId = req.user.id;

    // Fetch job details including its currently required skills
    const [job, allSkills] = await Promise.all([
      Job.getJobWithSkillsById(jobId), // Fetches job and its related skills
      Skill.getAllSkills(), // Fetches all possible skills
    ]);

    // Check if job exists
    if (!job) {
      req.flash("error", "Job not found.");
      return res.redirect("/job");
    }

    // Ensure the current user owns this job
    if (job.user_id !== currentUserId) {
      req.flash("error", "You are not authorized to edit this job.");
      return res.redirect("/job"); // Redirect to job board
    }
    let workingHoursDetailsString = "[]"; // Default
    if (job.working_hours_details) {
      if (typeof job.working_hours_details === "string") {
        // Already a string, use it (validate JSON?)
        try {
          JSON.parse(job.working_hours_details);
          workingHoursDetailsString = job.working_hours_details;
        } catch {
          /* Ignore invalid JSON string, use default */
        }
      } else if (Array.isArray(job.working_hours_details)) {
        // Convert array to JSON string
        workingHoursDetailsString = JSON.stringify(job.working_hours_details);
      }
    }
    // Modify the job object before passing it to the view
    const jobForView = {
      ...job,
      working_hours_details: workingHoursDetailsString,
    };

    // Create a map of the job's current skills { skill_id: min_years } for the form partial
    const jobSkillsMap = (job.required_skills || []).reduce((map, skill) => {
      map[skill.id] = skill.min_years_experience;
      return map;
    }, {});

    // Render the edit form, passing necessary data
    res.render("job/edit", {
      title: `Edit Job: ${job.title}`,
      job: jobForView, // Pass the job object (contains original details and required_skills)
      allSkills: allSkills || [], // All possible skills for selection
      jobSkillsMap, // Map of currently selected skills and their years
      // Pass flashed old input data (if any, from previous failed attempt)
      oldInput: req.flash("oldInput")[0] || {},
      csrfToken: req.csrfToken(), // Pass CSRF token
    });
  } catch (err) {
    console.error(`Error loading edit job page for ID ${req.params.id}:`, err);
    req.flash("error", "Failed to load the job editor.");
    next(err); // Pass error to global handler
  }
});

// POST /edit/:id
router.post(
  "/edit/:id",
  isAuthenticated,
  validateJobEdit,
  processSkillsInput, // Process the 'skills' input into 'skillsData'
  handleValidationErrors, // Check for validation errors and redirect if any
  async (req, res, next) => {
    // If execution reaches here, validation passed
    const jobId = req.params.id;
    const skillsData = req.body.skillsData; // Get processed skill data from middleware
    const currentUserId = req.user.id;

    try {
      // Re-fetch job before update for authorisation check
      const jobToEdit = await Job.getJobById(jobId); // Simple fetch is enough here
      if (!jobToEdit) {
        req.flash("error", "Job not found.");
        return res.redirect("/job");
      }
      // Ensure the current user still owns this job
      if (jobToEdit.user_id !== currentUserId) {
        req.flash("error", "You are not authorized to edit this job.");
        return res.redirect("/job");
      }

      // Prepare the updates object from the validated request body
      const updates = {
        // Title is not editable
        description: req.body.description,
        status: req.body.status,
        company_name: req.body.company_name,
        application_deadline: req.body.application_deadline,
        start_date: req.body.start_date,
        salary_amount: req.body.salary_amount,
        weekly_hours: req.body.weekly_hours,
        working_hours_details: req.body.working_hours_details || "[]", // Ensure JSON string
        working_location: req.body.working_location,
        in_person_location: req.body.in_person_location || null,
      };

      // 1. Update the base job fields
      await Job.updateJob(jobId, updates);

      // 2. Update the job's skills (replace existing with new set)
      await JobSkill.setJobSkills(jobId, skillsData);

      // Success: Redirect to the updated job's detail page
      req.flash("success", "Job updated successfully!");
      res.redirect(`/job/job/${jobId}`);
    } catch (err) {
      console.error(`Error updating job ${jobId}:`, err);
      req.flash("error", `Failed to update job: ${err.message}`);

      // Flash the submitted data back to the form for correction
      req.flash("oldInput", req.body);
      res.redirect(`/job/edit/${jobId}`); // Redirect back to the edit form
    }
  },
);

module.exports = router;
