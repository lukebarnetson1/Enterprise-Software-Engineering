const { supabaseClient: supabase } = require("../config/database"); // Adjust path

async function getSkillsByJobId(jobId) {
  const { data, error } = await supabase
    .from("job_skills")
    .select(
      `
         skill_id,
         min_years_experience,
         skill:skills ( name, category )
     `,
    )
    .eq("job_id", jobId);

  if (error) {
    console.error(`Error fetching skills for job ${jobId}:`, error);
    throw error;
  }
  // Restructure data
  return data
    ? data.map((js) => ({
        id: js.skill_id,
        name: js.skill.name,
        category: js.skill.category,
        min_years_experience: js.min_years_experience,
      }))
    : [];
}

// Function to set/update multiple skills for a job at once
async function setJobSkills(jobId, skillsData) {
  if (!jobId || !Array.isArray(skillsData)) {
    throw new Error("Invalid input for setting job skills.");
  }

  // 1. Delete existing skills for the job
  const { error: deleteError } = await supabase
    .from("job_skills")
    .delete()
    .eq("job_id", jobId);

  if (deleteError) {
    console.error(
      `Error deleting existing skills for job ${jobId}:`,
      deleteError,
    );
    throw deleteError;
  }

  // 2. Insert new skills (if any provided)
  if (skillsData.length > 0) {
    const skillsToInsert = skillsData.map((skill) => ({
      job_id: jobId,
      skill_id: skill.skill_id,
      min_years_experience: skill.min_years_experience,
    }));

    const { error: insertError } = await supabase
      .from("job_skills")
      .insert(skillsToInsert);

    if (insertError) {
      console.error(
        `Error inserting new skills for job ${jobId}:`,
        insertError,
      );
      throw insertError;
    }
  }
  // Return the newly set skills
  return getSkillsByJobId(jobId);
}

module.exports = {
  getSkillsByJobId,
  setJobSkills,
};
