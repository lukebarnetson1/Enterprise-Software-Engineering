const { supabaseClient: supabase } = require("../../backend/config/database");

async function getApplicationsByJob(job_id) {
  const { data, error } = await supabase
    .from("applications")
    .select("*")
    .eq("job_id", job_id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

async function getApplicationsByApplicant(applicant_id) {
  const { data, error } = await supabase
    .from("applications")
    .select("*")
    .eq("applicant_id", applicant_id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

async function getApplicationById(id) {
  const { data, error } = await supabase
    .from("applications")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

async function getApplicationByJobAndApplicant(job_id, applicant_id) {
  if (!job_id || !applicant_id) {
    return null; // Avoid query if IDs are missing
  }
  const { data, error } = await supabase
    .from("applications")
    .select("*")
    .eq("job_id", job_id)
    .eq("applicant_id", applicant_id)
    .maybeSingle(); // Return null if no match

  if (error) {
    console.error("Error fetching application by job and applicant:", error);
    throw error; // Rethrow other errors
  }
  return data; // Returns the application object or null
}

async function createApplication({ job_id, applicant_id, title, description }) {
  // Ensure one application per user per job
  const { data: existing, error: existsError } = await supabase
    .from("applications")
    .select("*")
    .eq("job_id", job_id)
    .eq("applicant_id", applicant_id)
    .maybeSingle();
  if (existsError) throw existsError;
  if (existing) throw new Error("You have already applied for this job.");

  const { data, error } = await supabase
    .from("applications")
    .insert([{ job_id, applicant_id, title, description, status: "pending" }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function updateApplication(id, updates) {
  const { data, error } = await supabase
    .from("applications")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

module.exports = {
  getApplicationsByJob,
  getApplicationsByApplicant,
  getApplicationById,
  getApplicationByJobAndApplicant,
  createApplication,
  updateApplication,
};
