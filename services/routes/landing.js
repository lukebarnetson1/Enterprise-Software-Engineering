const express = require("express");
const router = express.Router();
const { supabaseClient } = require("../../backend/config/database");

router.get("/", async (req, res, next) => {
  try {
    // Message handling
    const messageCode = req.query.message;
    if (messageCode) {
      switch (messageCode) {
        case "account_deleted":
          req.flash("success", "Your account has been permanently deleted.");
          break;
        case "delete_failed_contact_support":
          req.flash(
            "error",
            "Failed to fully delete account from authentication system. Please contact support.",
          );
          break;
        case "delete_link_invalid":
          req.flash(
            "error",
            "The deletion confirmation link is invalid or has expired.",
          );
          break;
        case "delete_error_generic":
          req.flash("error", "An error occurred during account deletion.");
          break;
        // Add other message codes as needed
      }
      // Redirect to self without the query parameter to prevent refresh issues
      return res.redirect("/");
    }

    // Original Supabase test query (optional)
    const { data, error } = await supabaseClient
      .from("jobs")
      .select("id")
      .limit(1);
    if (error) {
      console.error("Supabase CLIENT test query failed:", error);
    }

    // Render landing page normally (now including potentially flashed messages)
    res.render("landing", { title: "Welcome" });
  } catch (err) {
    console.error(
      "Error during Supabase client test or landing page render:",
      err,
    );
    next(err); // Pass to global error handler
  }
});
module.exports = router;
