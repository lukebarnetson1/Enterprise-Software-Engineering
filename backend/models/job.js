const { supabaseClient: supabase } = require("../../backend/config/database");

async function getAllJobs() {
  const { data, error } = await supabase
    .from("jobs")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

async function getJobById(id) {
  const { data, error } = await supabase
    .from("jobs")
    .select("*")
    .eq("id", id)
    .single();
  // Allow 'PGRST116' (No rows found) for single() calls
  if (error && error.code !== "PGRST116") {
    console.error(`Error fetching job by ID ${id}:`, error);
    throw error;
  }
  return data; // Will be null if not found
}

async function createJob(jobData) {
  const {
    title,
    description,
    author,
    user_id,
    company_name,
    application_deadline,
    start_date,
    salary_amount,
    weekly_hours,
    working_hours_details,
    working_location,
    in_person_location,
  } = jobData;

  const { data, error } = await supabase
    .from("jobs")
    .insert([
      {
        title,
        description,
        author,
        user_id,
        company_name,
        application_deadline,
        start_date,
        salary_amount,
        weekly_hours,
        working_hours_details,
        working_location,
        in_person_location,
        status: "open", // Default status on creation
      },
    ])
    .select() // Select the newly created row
    .single(); // Expecting a single row back

  if (error) {
    console.error("Error creating job in DB:", error);
    throw error;
  }
  return data;
}

async function updateJob(id, updates) {
  // Ensure dates are in ISO format if they are Date objects from validation
  if (updates.application_deadline instanceof Date) {
    updates.application_deadline = updates.application_deadline.toISOString();
  }
  if (updates.start_date instanceof Date) {
    updates.start_date = updates.start_date.toISOString();
  } else if (updates.start_date === null || updates.start_date === "") {
    updates.start_date = null; // Ensure null is sent for empty optional date
  }

  const { data, error } = await supabase
    .from("jobs")
    .update(updates) // Pass the whole updates object
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error(`Error updating job ID ${id}:`, error);
    throw error;
  }
  return data;
}

async function deleteJob(id) {
  const { error } = await supabase.from("jobs").delete().eq("id", id);
  if (error) {
    console.error(`Error deleting job ID ${id}:`, error);
    throw error;
  }
}

async function getJobWithSkillsById(id) {
  const { data, error } = await supabase
    .from("jobs")
    .select(
      `
          *,
          required_skills:job_skills (
              min_years_experience,
              skill:skills (id, name, category)
          )
      `,
    )
    .eq("id", id)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error(`Error fetching job with skills by ID ${id}:`, error);
    throw error;
  }
  if (data && data.required_skills) {
    data.required_skills = data.required_skills.map((rs) => ({
      id: rs.skill.id,
      name: rs.skill.name,
      category: rs.skill.category,
      min_years_experience: rs.min_years_experience,
    }));
  } else if (data) {
    data.required_skills = []; // Ensure it's always an array
  }

  return data; // Returns job object with a 'required_skills' array or null
}

module.exports = {
  getAllJobs,
  getJobById,
  createJob,
  updateJob,
  deleteJob,
  getJobWithSkillsById,
  supabaseClient: supabase,
};
