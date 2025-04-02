const { supabaseClient: supabase } = require("../config/database"); // Adjust path if needed

async function getAllSkills() {
  const { data, error } = await supabase
    .from("skills")
    .select("id, name, category")
    .order("category")
    .order("name");
  if (error) {
    console.error("Error fetching all skills:", error);
    throw error;
  }
  return data || [];
}

module.exports = {
  getAllSkills,
};
