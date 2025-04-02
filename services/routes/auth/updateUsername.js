const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const mailerService = require("../../../backend/services/mailerService");
const { supabaseClient } = require("../../../backend/config/database");
const Job = require("../../../backend/models/job");
const { isAuthenticated } = require("../../middlewares/accountAuth");
const { validateUpdateUsername } = require("../../middlewares/validation");
const { generateToken } = require("./helpers");
const { validationResult } = require("express-validator");
require("dotenv").config();

router.get("/update-username", isAuthenticated, (req, res) => {
  res.render("auth/update-username", {
    title: "Update Username",
    csrfToken: req.csrfToken(),
  });
});

router.post(
  "/update-username",
  isAuthenticated,
  validateUpdateUsername,
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      req.flash(
        "error",
        errors
          .array()
          .map((err) => err.msg)
          .join(" | "),
      );
      return res.redirect("/auth/update-username");
    }

    try {
      const { newUsername } = req.body;
      const currentUserId = req.user.id;
      const currentUserEmail = req.user.email; // Needed for sending email
      const currentUsername = req.user.username; // Get current username

      // Check if new username is the same as the current one (case-insensitive)
      if (
        newUsername.toLowerCase() === (currentUsername?.toLowerCase() || "")
      ) {
        req.flash(
          "error",
          "The new username must be different from the current one.",
        );
        return res.redirect("/auth/update-username");
      }

      // Check if the new username is already in use (case-insensitive)
      const { data: existingUser, error: checkError } = await supabaseClient
        .from("users")
        .select("id")
        .ilike("username", newUsername)
        .neq("id", currentUserId)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingUser) {
        req.flash(
          "error",
          "Username is already taken. Please choose another one.",
        );
        return res.redirect("/auth/update-username");
      }

      // Generate confirmation token
      const tokenPayload = { userId: currentUserId, newUsername: newUsername };
      const token = generateToken(tokenPayload, "1h");
      const host = process.env.APP_HOST || req.get("host");
      const confirmURL = `${req.protocol}://${host}/auth/confirm-update-username?token=${token}`;

      // Send confirmation email using mailerService
      const subject = "Confirm Username Change Request";
      const html = `
          <p>Hello ${currentUsername || "User"},</p>
          <p>You requested to change your Job Matchmaker username to <strong>${newUsername}</strong>.</p>
          <p>To confirm this change, please click the link below (valid for 1 hour):</p>
          <a href="${confirmURL}">${confirmURL}</a>
          <p>If you did not request this change, please ignore this email.</p>
        `;
      await mailerService.sendNotification(currentUserEmail, subject, html);

      req.flash(
        "success",
        "A confirmation email has been sent to your registered email address. Please click the link to finalize the username change.",
      );
      res.redirect("/settings"); // Redirect back to settings
    } catch (err) {
      console.error("Update Username POST Error:", err);
      req.flash(
        "error",
        err.message ||
          "An internal server error occurred while processing your request.",
      );
      res.redirect("/auth/update-username");
    }
  },
);

router.get("/confirm-update-username", async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) {
      req.flash("error", "Missing confirmation token.");
      return res.redirect("/settings"); // Redirect to settings
    }

    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { userId, newUsername } = decoded;

    // Double-check username availability *again*
    const { data: usernameInUse, error: checkError } = await supabaseClient
      .from("users")
      .select("id")
      .ilike("username", newUsername)
      .neq("id", userId)
      .maybeSingle();

    if (checkError) throw checkError;

    if (usernameInUse) {
      req.flash(
        "error",
        "This username has been taken since you requested the change. Please try choosing a different username.",
      );
      return res.redirect("/settings"); // Redirect to settings
    }

    // Update username in 'users' table
    const { error: profileUpdateError } = await supabaseClient
      .from("users")
      .update({ username: newUsername })
      .eq("id", userId);

    if (profileUpdateError) throw profileUpdateError;

    // Update username in Supabase Auth user_metadata
    const { error: authUpdateError } =
      await supabaseClient.auth.admin.updateUserById(userId, {
        user_metadata: { username: newUsername },
      });

    if (authUpdateError) {
      console.warn(
        "Failed to update username in Supabase Auth metadata:",
        authUpdateError,
      );
    }

    // Update res.locals (may not be needed due to redirect)
    if (res.locals.user && res.locals.user.id === userId) {
      res.locals.user.username = newUsername;
    }

    req.flash("success", `Username successfully updated to ${newUsername}.`);
    res.redirect("/settings"); // Redirect back to settings
  } catch (err) {
    console.error("Confirm Update Username GET Error:", err);
    if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
      req.flash("error", "The confirmation link is invalid or has expired.");
    } else {
      req.flash(
        "error",
        err.message || "An error occurred during username confirmation.",
      );
    }
    res.redirect("/settings"); // Redirect back to settings on error
  }
});

module.exports = router;
