// backend/models/user.js
const { supabaseClient: supabase } = require("../../backend/config/database");

// Helper function to fetch a user by ID
async function findById(id) {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", id)
    .single();
  // Do not throw error if user not found (PGRST116), return null instead
  if (error && error.code !== "PGRST116") {
    console.error(`Error finding user by ID ${id}:`, error);
    throw error;
  }
  return data; // Returns user object or null
}

// Find user by email
async function findByEmail(email) {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("email", email)
    .maybeSingle(); // Use maybeSingle to return null if not found
  // Do not throw error if user not found (PGRST116), return null instead
  if (error && error.code !== "PGRST116") {
    console.error(`Error finding user by email ${email}:`, error);
    throw error;
  }
  return data;
}

// Find user by username (case-insensitive)
async function findByUsernameInsensitive(username) {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .ilike("username", username)
    .limit(1);

  if (error) {
    console.error(`Error finding user by username ${username}:`, error);
    throw error;
  }
  return data && data.length > 0 ? data[0] : null;
}

// Insert a new user
async function createUser({ email, username, password }) {
  const { data, error } = await supabase
    .from("users")
    .insert([
      {
        email,
        username,
        password,
        is_verified: false,
        // Notification preferences will use true for both options by default
      },
    ])
    .select()
    .single();
  if (error) {
    console.error("Error creating user profile:", error);
    throw error;
  }
  return data;
}

// Update user fields by ID
async function updateUser(id, updates) {
  // Explicitly handle boolean conversion for notification preferences if needed
  if (updates.hasOwnProperty("notify_own_status_change")) {
    updates.notify_own_status_change = !!updates.notify_own_status_change;
  }
  if (updates.hasOwnProperty("notify_new_applicant_for_my_job")) {
    updates.notify_new_applicant_for_my_job =
      !!updates.notify_new_applicant_for_my_job;
  }

  const { data, error } = await supabase
    .from("users")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) {
    console.error(`Error updating user ${id}:`, error);
    throw error;
  }
  return data;
}

async function deleteUser(id) {
  const { error } = await supabase.from("users").delete().eq("id", id);
  if (error) {
    console.error(`Error deleting user ${id}:`, error);
    throw error;
  }
}

module.exports = {
  findById,
  findByEmail,
  findByUsernameInsensitive,
  createUser,
  updateUser,
  deleteUser,
};
