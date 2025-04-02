const { supabaseClient } = require("../backend/config/database");
const seedDatabase = require("./seedDb");

async function resetDb() {
  try {
    console.log("Resetting database...");

    // Clear tables
    console.log("Clearing applications table...");
    await supabaseClient
      .from("applications")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");

    console.log("Clearing job_skills table...");
    await supabaseClient
      .from("job_skills")
      .delete()
      .neq("job_id", "00000000-0000-0000-0000-000000000000");

    console.log("Clearing user_skills table...");
    await supabaseClient
      .from("user_skills")
      .delete()
      .neq("user_id", "00000000-0000-0000-0000-000000000000");

    console.log("Clearing jobs table...");
    await supabaseClient
      .from("jobs")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");

    console.log("Clearing users table...");
    await supabaseClient
      .from("users")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");

    console.log("Clearing session table...");
    await supabaseClient
      .from("session")
      .delete()
      .neq("sid", "dummy-sid-to-delete-all");

    // Delete Supabase Auth Users
    console.log("Deleting Supabase Auth users...");
    const { data: userList, error: listError } =
      await supabaseClient.auth.admin.listUsers();
    if (listError) {
      console.error("Error listing auth users:", listError.message);
    } else if (userList && userList.users) {
      console.log(`Found ${userList.users.length} auth users to delete.`);
      for (const user of userList.users) {
        const { error: deleteError } =
          await supabaseClient.auth.admin.deleteUser(user.id, true);
        if (deleteError)
          console.warn(
            `Failed to delete auth user ${user.email || user.id}: ${deleteError.message}`,
          );
      }
      console.log("Finished deleting auth users.");
    } else {
      console.log("No auth users found to delete.");
    }

    // Call Seeder
    console.log("--- Running Seeder ---");
    await seedDatabase();
    console.log("--- Seeder Finished ---");

    // Check remaining rows after delete for verification
    const { count: remainingSessions } = await supabaseClient
      .from("session")
      .select("*", { count: "exact", head: true });
    console.log(`Remaining rows in session table: ${remainingSessions}`);
    const { count: remainingUsers } = await supabaseClient
      .from("users")
      .select("*", { count: "exact", head: true });
    console.log(`Remaining rows in users table: ${remainingUsers}`);

    console.log("Database reset and seed process complete.");
  } catch (error) {
    console.error("Error during database reset/seed:", error.message);
    process.exit(1); // Exit with error on failure
  }
}

// If the script is run directly execute the function
if (require.main === module) {
  resetDb().catch((err) => {
    console.error("Unhandled error running resetDb directly:", err);
    process.exit(1);
  });
}

module.exports = resetDb;
