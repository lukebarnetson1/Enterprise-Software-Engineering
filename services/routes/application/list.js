const express = require("express");
const router = express.Router();
const Application = require("../../../backend/models/application");
const Job = require("../../../backend/models/job");
const User = require("../../../backend/models/user");
const { supabaseClient } = require("../../../backend/config/database");
const { isAuthenticated } = require("../../middlewares/accountAuth");
const { checkOverallSkillMatch } = require("./helpers");

// List user's own applications
router.get("/my", isAuthenticated, async (req, res, next) => {
  try {
    const applications = await Application.getApplicationsByApplicant(
      req.user.id,
    );
    res.render("applications/my", {
      title: "My Applications",
      applications,
      csrfToken: req.csrfToken(), // Add CSRF token for the accept/decline forms
    });
  } catch (err) {
    console.error(`Error loading applications for user ${req.user.id}:`, err);
    req.flash("error", "Failed to load your applications.");
    next(err); // Pass to global error handler
  }
});

// List applications received for the user's jobs
router.get("/received", isAuthenticated, async (req, res, next) => {
  try {
    const currentUserId = req.user.id;

    // 1. Get IDs of jobs created by the current user
    const { data: userJobs, error: jobsError } = await supabaseClient
      .from("jobs")
      .select("id")
      .eq("user_id", currentUserId);

    if (jobsError) throw new Error("Could not retrieve your job listings.");

    // If user has no jobs, render page with empty list immediately
    if (!userJobs || userJobs.length === 0) {
      return res.render("applications/received", {
        title: "Received Applications",
        applications: [],
        jobSkillsMap: {},
        userSkillsMap: {},
        checkOverallSkillMatch: checkOverallSkillMatch,
        csrfToken: req.csrfToken(), // Include CSRF token even if no apps
      });
    }

    const myJobIds = userJobs.map((job) => job.id);

    // 2. Get applications submitted for those jobs, including related job and applicant info
    const { data: applications, error: appsError } = await supabaseClient
      .from("applications")
      .select(
        `id, job_id, applicant_id, title, description, status, created_at,
               job:jobs ( id, title ),
               applicant:users ( id, username, email )`, // Fetch applicant details
      )
      .in("job_id", myJobIds) // Filter by user's job IDs
      .order("created_at", { ascending: false });

    if (appsError) throw new Error("Could not retrieve applications.");

    // If no applications received, render page with empty list
    if (!applications || applications.length === 0) {
      return res.render("applications/received", {
        title: "Received Applications",
        applications: [],
        jobSkillsMap: {},
        userSkillsMap: {},
        checkOverallSkillMatch: checkOverallSkillMatch,
        csrfToken: req.csrfToken(),
      });
    }

    // 3. Gather unique Job IDs and Applicant IDs from the fetched applications
    const uniqueJobIds = [...new Set(applications.map((app) => app.job_id))];
    const uniqueApplicantIds = [
      ...new Set(applications.map((app) => app.applicant_id)),
    ];

    // 4. Fetch required skills for the relevant jobs AND skills for the relevant applicants in parallel
    const [jobSkillsRes, userSkillsRes] = await Promise.all([
      supabaseClient
        .from("job_skills")
        .select(
          "job_id, min_years_experience, skill:skills(id, name, category)",
        )
        .in("job_id", uniqueJobIds),
      supabaseClient
        .from("user_skills")
        .select("user_id, years_experience, skill:skills(id, name, category)")
        .in("user_id", uniqueApplicantIds),
    ]);

    if (jobSkillsRes.error)
      throw new Error("Could not fetch required job skills.");
    if (userSkillsRes.error)
      throw new Error("Could not fetch applicant skills.");

    // 5. Process skill results into maps for easy lookup
    const jobSkillsMap = (jobSkillsRes.data || []).reduce((map, js) => {
      const jobId = js.job_id;
      if (!map[jobId]) map[jobId] = [];
      if (js.skill) {
        // Ensure skill data is present
        map[jobId].push({
          id: js.skill.id,
          name: js.skill.name,
          category: js.skill.category,
          min_years_experience: js.min_years_experience,
        });
      }
      return map;
    }, {});

    const userSkillsMap = (userSkillsRes.data || []).reduce((map, us) => {
      const userId = us.user_id;
      if (!map[userId]) map[userId] = [];
      if (us.skill) {
        // Ensure skill data is present
        map[userId].push({
          id: us.skill.id,
          name: us.skill.name,
          category: us.skill.category,
          years_experience: us.years_experience,
        });
      }
      return map;
    }, {});

    // 6. Render the page, passing all necessary data
    res.render("applications/received", {
      title: "Received Applications",
      applications: applications || [], // Pass the raw applications with nested data
      jobSkillsMap,
      userSkillsMap,
      checkOverallSkillMatch, // Pass the helper function
      csrfToken: req.csrfToken(),
    });
  } catch (err) {
    console.error("Error loading received applications:", err);
    req.flash(
      "error",
      err.message || "Failed to load applications for your jobs.",
    );
    next(err); // Pass to global error handler
  }
});

module.exports = router;