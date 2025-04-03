const { parseISO, isValid } = require("date-fns");
const Job = require("../../../backend/models/job");

/**
 * Middleware to process skills input from job create/edit forms.
 * Transforms req.body.skills object into req.body.skillsData array.
 * Expects input like: req.body.skills = { "skill_id_1": "2", "skill_id_2": "0.5" }
 * Populates req.body.skillsData = [ { skill_id: "...", min_years_experience: 2 }, ... ]
 */
const processSkillsInput = (req, res, next) => {
  req.body.skillsData = []; // Initialise skillsData array
  if (req.body.skills && typeof req.body.skills === "object") {
    for (const skillId in req.body.skills) {
      // Check if the key is a valid UUID and the value is a valid number representation
      const years = req.body.skills[skillId];
      if (
        /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
          skillId,
        ) &&
        years !== undefined && // Ensure value exists
        !isNaN(parseFloat(years)) &&
        parseFloat(years) >= 0 // Allow 0 or more years (0.5 for <1)
      ) {
        req.body.skillsData.push({
          skill_id: skillId,
          // Use min_years_experience as the key, matching the database column
          min_years_experience: parseFloat(years),
        });
      } else {
        console.warn(
          `Skipping invalid job skill input: ID='${skillId}', Years='${years}'`,
        );
      }
    }
  }
  // Proceed even if skills object was missing or empty
  next();
};

// Checks for open jobs whose application deadline has passed and updates their status to 'closed'
async function checkAndCloseExpiredJobs() {
  try {
    const { data: openJobs, error } = await Job.supabaseClient
      .from("jobs")
      .select("id, application_deadline")
      .eq("status", "open"); // Select only open jobs

    if (error) {
      console.error("Error fetching open jobs for expiration check:", error);
      return; // Exit if cannot fetch jobs
    }

    if (!openJobs || openJobs.length === 0) {
      return; // No jobs to check
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to start of today for comparison

    const jobsToCloseIds = [];

    for (const job of openJobs) {
      if (job.application_deadline) {
        try {
          // Parse the deadline string (assuming ISO format from DB)
          const deadline = parseISO(job.application_deadline);

          if (!isValid(deadline)) {
            console.warn(
              `Job ${job.id} has an invalid deadline format: ${job.application_deadline}`,
            );
            continue; // Skip if deadline is invalid
          }

          deadline.setHours(0, 0, 0, 0); // Set deadline to start of its day

          // If the deadline was *before* today, mark for closing
          if (deadline < today) {
            jobsToCloseIds.push(job.id);
          }
        } catch (parseError) {
          console.error(
            `Error parsing deadline for job ${job.id} ('${job.application_deadline}'):`,
            parseError,
          );
          // Skip this job if parsing fails
        }
      }
    }

    // If any jobs need closing, perform the update
    if (jobsToCloseIds.length > 0) {
      console.log(`Attempting to auto-close ${jobsToCloseIds.length} jobs...`);
      const { error: updateError } = await Job.supabaseClient
        .from("jobs")
        .update({ status: "closed", updated_at: new Date() }) // Set status and update timestamp
        .in("id", jobsToCloseIds); // Update based on collected IDs

      if (updateError) {
        console.error("Error auto-closing expired jobs:", updateError);
      } else {
        console.log(`Successfully auto-closed ${jobsToCloseIds.length} jobs.`);
      }
    }
  } catch (err) {
    console.error("Unexpected error during job expiration check:", err);
  }
}

/**
 * Calculates skill match status between a user's skills and required job skills.
 * @param {Array} userSkills - Array of user skill objects { id, years_experience }
 * @param {Array} requiredSkills - Array of required skill objects { id, name, category, min_years_experience }
 * @returns {Array} - Array of match result objects { id, name, category, required_years, user_years, status, difference }
 */
function calculateSkillMatches(userSkills, requiredSkills) {
  if (!requiredSkills || requiredSkills.length === 0) {
    return []; // No skills required, so no specific matches to calculate
  }
  if (!userSkills) {
    userSkills = []; // Treat null/undefined user skills as an empty array
  }

  // Create a map of user skills for efficient lookup
  const userMap = userSkills.reduce((map, skill) => {
    map[skill.id] = skill.years_experience;
    return map;
  }, {});

  // Iterate through required skills and determine match status
  return requiredSkills.map((req) => {
    const userYears = userMap[req.id];
    let status = "missing"; // Default status
    let diff = null;

    if (userYears !== undefined) {
      // User has the skill
      if (userYears >= req.min_years_experience) {
        status = "met"; // User meets or exceeds experience requirement
      } else {
        status = "insufficient"; // User has the skill but not enough experience
        diff = req.min_years_experience - userYears; // Calculate the difference
      }
    }

    return {
      id: req.id,
      name: req.name,
      category: req.category,
      required_years: req.min_years_experience,
      user_years: userYears,
      status: status,
      difference: diff,
    };
  });
}

module.exports = {
  processSkillsInput,
  checkAndCloseExpiredJobs,
  calculateSkillMatches,
};
