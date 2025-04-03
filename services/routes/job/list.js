const express = require("express");
const router = express.Router();
const { supabaseClient } = require("../../../backend/config/database");
const { isAuthenticated } = require("../../middlewares/accountAuth");
const UserSkill = require("../../../backend/models/userSkill");
const Application = require("../../../backend/models/application");
const { checkAndCloseExpiredJobs } = require("./helpers");

const ITEMS_PER_PAGE = 50; // Define pagination limit

// GET / - Job Board Listing with Filtering & Pagination
router.get("/", isAuthenticated, async (req, res, next) => {
  try {
    // Run check for expired jobs before fetching the list
    await checkAndCloseExpiredJobs();

    const currentUserId = req.user ? req.user.id : null;
    const currentPage = parseInt(req.query.page) || 1;
    const offset = (currentPage - 1) * ITEMS_PER_PAGE;

    // --- Read Filters from Query Parameters ---
    const {
      minSalary,
      match,
      status: filterStatus,
      location: filterLocation,
      hoursOperator, // 'gt' or 'lt'
      hoursValue,
    } = req.query;

    const filters = {
      minSalary: minSalary || "",
      match: match === "true", // Convert string 'true' to boolean
      status: filterStatus || "",
      location: filterLocation || "",
      hoursOperator: hoursOperator || "",
      hoursValue: hoursValue || "",
    };

    // --- Fetch User Data (Skills, Applied Job IDs) if Logged In ---
    let userSkills = [];
    let appliedJobIds = new Set();
    if (currentUserId) {
      try {
        const [skillsResult, appsResult] = await Promise.all([
          UserSkill.getSkillsByUserId(currentUserId),
          Application.getApplicationsByApplicant(currentUserId),
        ]);
        userSkills = skillsResult || [];
        (appsResult || []).forEach((app) => appliedJobIds.add(app.job_id));
      } catch (userDataError) {
        console.error(
          "Error fetching user skills/applications:",
          userDataError,
        );
        // Continue without user-specific data, maybe flash a warning?
        req.flash("warning", "Could not load your skill/application data.");
      }
    }

    // Build Supabase query based on filters
    let query = supabaseClient.from("jobs").select("*", { count: "exact" }); // Select all columns and get total count for pagination

    // Apply basic filters directly to the query
    if (filters.minSalary && !isNaN(parseFloat(filters.minSalary))) {
      query = query.gte("salary_amount", parseFloat(filters.minSalary));
    }
    if (filters.status) {
      query = query.eq("status", filters.status);
    }
    if (filters.location) {
      query = query.eq("working_location", filters.location);
    }
    if (
      filters.hoursOperator &&
      filters.hoursValue &&
      !isNaN(parseFloat(filters.hoursValue))
    ) {
      const hoursNum = parseFloat(filters.hoursValue);
      if (filters.hoursOperator === "gt") {
        query = query.gt("weekly_hours", hoursNum);
      } else if (filters.hoursOperator === "lt") {
        query = query.lt("weekly_hours", hoursNum);
      }
    }

    // Skill match filter applied after initial fetch or requires complex join)
    // For pagination simplicity, we'll fetch job IDs that match skills if the filter is active.
    let jobIdsToFetch = null; // null means fetch all (or based on other filters)
    let perfectMatchJobIds = null; // Store IDs that perfectly match user skills

    if (filters.match && currentUserId && userSkills.length > 0) {
      console.log("Applying skill match filter...");
      perfectMatchJobIds = new Set(); // Initialize set to track matches
      const userSkillMap = userSkills.reduce((map, skill) => {
        map[skill.id] = skill.years_experience;
        return map;
      }, {});

      // Fetch ALL job IDs and their required skills that *potentially* match other filters
      // This is less efficient but simpler than a complex SQL join/RPC for now
      let candidateJobsQuery = supabaseClient.from("jobs").select(
        "id, salary_amount, status, working_location, weekly_hours, job_skills!inner(skill_id, min_years_experience)", // Select required skills
      );

      // Re-apply the *same basic filters* to this candidate query
      if (filters.minSalary && !isNaN(parseFloat(filters.minSalary)))
        candidateJobsQuery = candidateJobsQuery.gte(
          "salary_amount",
          parseFloat(filters.minSalary),
        );
      if (filters.status)
        candidateJobsQuery = candidateJobsQuery.eq("status", filters.status);
      if (filters.location)
        candidateJobsQuery = candidateJobsQuery.eq(
          "working_location",
          filters.location,
        );
      if (
        filters.hoursOperator &&
        filters.hoursValue &&
        !isNaN(parseFloat(filters.hoursValue))
      ) {
        const hoursNum = parseFloat(filters.hoursValue);
        if (filters.hoursOperator === "gt")
          candidateJobsQuery = candidateJobsQuery.gt("weekly_hours", hoursNum);
        else if (filters.hoursOperator === "lt")
          candidateJobsQuery = candidateJobsQuery.lt("weekly_hours", hoursNum);
      }

      const { data: candidateJobsWithSkills, error: candidateError } =
        await candidateJobsQuery;

      if (candidateError) {
        console.error(
          "Error fetching candidate jobs for skill match:",
          candidateError,
        );
        // Fallback: Ignore the match filter if there's an error
        filters.match = false; // Turn off the filter flag
        req.flash(
          "warning",
          "Could not apply skill match filter due to an error.",
        );
      } else {
        // Filter the candidate jobs based on user skills
        jobIdsToFetch = (candidateJobsWithSkills || [])
          .filter((job) => {
            const requiredSkills = job.job_skills || [];
            if (requiredSkills.length === 0) {
              perfectMatchJobIds.add(job.id); // No skills required means perfect match
              return true; // Include jobs with no skill requirements
            }

            // Check if user meets ALL requirements for this job
            for (const reqSkill of requiredSkills) {
              const userYears = userSkillMap[reqSkill.skill_id];
              if (
                userYears === undefined ||
                userYears < reqSkill.min_years_experience
              ) {
                return false; // Mismatch found, exclude this job
              }
            }
            perfectMatchJobIds.add(job.id); // If loop completes, it's a perfect match
            return true; // All skills met, include this job
          })
          .map((job) => job.id); // Get only the IDs of matching jobs

        // Apply the ID filter to the main query
        if (jobIdsToFetch && jobIdsToFetch.length > 0) {
          query = query.in("id", jobIdsToFetch);
        } else {
          // If no jobs match skills, ensure the main query returns nothing by using impossible condition
          query = query.eq("id", "00000000-0000-0000-0000-000000000000");
        }
      }
    } // End of skill match filter logic

    // Apply Sorting and Pagination to the Final Query
    query = query
      .order("created_at", { ascending: false }) // Sort by creation date descending
      .range(offset, offset + ITEMS_PER_PAGE - 1); // Apply pagination limits

    // Execute final query
    const { data: jobs, error: jobsError, count: totalJobs } = await query;

    if (jobsError) {
      console.error("Error fetching final job list:", jobsError);
      throw new Error("Failed to retrieve job listings.");
    }

    // Calculate total pages for pagination controls
    const totalPages = totalJobs ? Math.ceil(totalJobs / ITEMS_PER_PAGE) : 0;

    // Render the Job Board View
    res.render("job/index", {
      title: "Jobs",
      jobs: jobs || [], // Ensure jobs is an array
      appliedJobIds, // Set of job IDs the user has applied to
      currentUserId, // Pass user ID for conditional rendering in view
      userSkillsCount: userSkills.length, // Pass count for conditional UI
      filterValues: filters, // Pass current filters back to the view
      perfectMatchJobIds: perfectMatchJobIds, // Set of IDs matching user skills (can be null)
      // Pagination data
      currentPage: currentPage,
      totalPages: totalPages,
      totalJobs: totalJobs || 0,
      itemsPerPage: ITEMS_PER_PAGE,
      csrfToken: req.csrfToken(), // Needed for potential actions on the page
    });
  } catch (err) {
    console.error("Error loading jobs page:", err);
    req.flash("error", "Failed to load job listings. Please try again.");
    next(err); // Pass error to global handler
  }
});

module.exports = router;
