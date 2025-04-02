const { supabaseClient: supabase } = require("../config/database"); // Adjust path

async function getSkillsByUserId(userId) {
  const { data, error } = await supabase
    .from("user_skills")
    .select(
      `
        skill_id,
        years_experience,
        skill:skills ( name, category )
    `,
    )
    .eq("user_id", userId);

  if (error) {
    console.error(`Error fetching skills for user ${userId}:`, error);
    throw error;
  }
  // Restructure data for easier use
  return data
    ? data.map((us) => ({
        id: us.skill_id,
        name: us.skill.name,
        category: us.skill.category,
        years_experience: us.years_experience,
      }))
    : [];
}

// Function to set/update multiple skills for a user at once
async function setUserSkills(userId, skillsData) {
  if (!userId || !Array.isArray(skillsData)) {
    throw new Error("Invalid input for setting user skills.");
  }

  // 1. Delete existing skills for the user
  const { error: deleteError } = await supabase
    .from("user_skills")
    .delete()
    .eq("user_id", userId);

  if (deleteError) {
    console.error(
      `Error deleting existing skills for user ${userId}:`,
      deleteError,
    );
    throw deleteError;
  }

  // 2. Insert new skills (if any provided)
  if (skillsData.length > 0) {
    const skillsToInsert = skillsData.map((skill) => ({
      user_id: userId,
      skill_id: skill.skill_id,
      years_experience: skill.years_experience,
    }));

    const { error: insertError } = await supabase
      .from("user_skills")
      .insert(skillsToInsert);

    if (insertError) {
      console.error(
        `Error inserting new skills for user ${userId}:`,
        insertError,
      );
      throw insertError;
    }
  }
  // Return the newly set skills (optional)
  return getSkillsByUserId(userId);
}

module.exports = {
  getSkillsByUserId,
  setUserSkills,
};
