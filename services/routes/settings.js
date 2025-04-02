const express = require("express");
const router = express.Router();
const { isAuthenticated } = require("../middlewares/accountAuth");
const User = require("../../backend/models/user");
const { body, validationResult } = require("express-validator");

// GET /settings
router.get("/settings", isAuthenticated, async (req, res, next) => {
  try {
    // Fetch the full user profile including notification settings
    const userProfile = await User.findById(req.user.id);

    if (!userProfile) {
      // Should be caught by isAuthenticated, but good to handle
      req.flash("error", "User profile not found.");
      return res.redirect("/auth/login");
    }

    res.render("settings", {
      title: "Settings",
      user: userProfile, // Pass the full profile to the view
      csrfToken: req.csrfToken(), // Needed for the preferences form
    });
  } catch (err) {
    console.error(`Error fetching settings for user ${req.user.id}:`, err);
    req.flash("error", "Could not load settings page.");
    next(err);
  }
});

// POST /settings
router.post("/settings", isAuthenticated, async (req, res, next) => {
  try {
    const userId = req.user.id;
    // Get values from form. Tickboxes not present in body if unchecked
    const notifyOwnStatus = req.body.notify_own_status_change === "on"; // Check if was ticked
    const notifyNewApplicant =
      req.body.notify_new_applicant_for_my_job === "on";

    const updates = {
      notify_own_status_change: notifyOwnStatus,
      notify_new_applicant_for_my_job: notifyNewApplicant,
    };

    await User.updateUser(userId, updates);

    req.flash("success", "Notification preferences updated successfully.");
    res.redirect("/settings"); // Redirect back to the settings page
  } catch (err) {
    console.error(
      `Error updating notification preferences for user ${req.user.id}:`,
      err,
    );
    req.flash("error", "Failed to update preferences. Please try again.");
    next(err); // Pass error to handler
  }
});

module.exports = router;
