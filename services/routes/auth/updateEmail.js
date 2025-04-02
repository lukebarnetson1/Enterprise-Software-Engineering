const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const mailerService = require("../../../backend/services/mailerService");
const { supabaseClient } = require("../../../backend/config/database");
const { isAuthenticated } = require("../../middlewares/accountAuth");
const { generateToken, sendVerificationEmail } = require("./helpers");
const { body, validationResult } = require("express-validator");
require("dotenv").config();

const validateUpdateEmail = [
  body("newEmail")
    .isEmail()
    .withMessage("Must be a valid email address.")
    .normalizeEmail(),
];

router.get("/update-email", isAuthenticated, (req, res) => {
  res.render("auth/update-email", {
    title: "Update Email Address",
    csrfToken: req.csrfToken(),
  });
});

router.post(
  "/update-email",
  isAuthenticated,
  validateUpdateEmail,
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      req.flash(
        "error",
        errors
          .array()
          .map((e) => e.msg)
          .join(" | "),
      );
      return res.redirect("/auth/update-email");
    }

    try {
      const { newEmail } = req.body;
      const currentUserId = req.user.id; // Get current user ID
      const currentUserEmail = req.user.email; // Get current email for sending confirmation

      // Check if the new email is the same as the current one
      if (newEmail === currentUserEmail) {
        req.flash(
          "error",
          "The new email address must be different from the current one.",
        );
        return res.redirect("/auth/update-email");
      }

      // Check if the new email address is already in use by another account
      const { data: existingUser, error: checkError } = await supabaseClient
        .from("users")
        .select("id")
        .eq("email", newEmail)
        .neq("id", currentUserId) // Exclude the current user
        .maybeSingle();

      if (checkError) throw checkError; // Throw DB errors

      if (existingUser) {
        req.flash("error", "Email already in use by another account.");
        return res.redirect("/auth/update-email");
      }

      // Generate confirmation token
      const token = generateToken(
        { userId: currentUserId, newEmail: newEmail },
        "1h",
      );
      const host = process.env.APP_HOST || req.get("host");
      const confirmURL = `${req.protocol}://${host}/auth/confirm-update-email?token=${token}`;

      // Send confirmation link to the current email address using mailerService
      const subject = "Confirm Email Change Request";
      const html = `
        <p>Hello ${req.user.user_metadata?.username || "User"},</p>
        <p>You requested to change your Job Matchmaker email address to <strong>${newEmail}</strong>.</p>
        <p>To confirm this change, please click the link below (valid for 1 hour):</p>
        <a href="${confirmURL}">${confirmURL}</a>
        <p>If you did not request this change, please ignore this email.</p>
      `;
      await mailerService.sendNotification(currentUserEmail, subject, html);

      req.flash(
        "success",
        `A confirmation email has been sent to your current address (${currentUserEmail}). Please click the link to finalize the change.`,
      );
      res.redirect("/settings"); // Redirect back to settings
    } catch (err) {
      console.error("Update Email POST Error:", err);
      req.flash(
        "error",
        err.message ||
          "An internal server error occurred while processing your request.",
      );
      res.redirect("/auth/update-email");
    }
  },
);

router.get("/confirm-update-email", async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) {
      req.flash("error", "Missing confirmation token.");
      return res.redirect("/settings"); // Redirect to settings
    }

    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { userId, newEmail } = decoded;

    // Fetch the user's current data from Supabase Auth to be sure
    const {
      data: { user: authUser },
      error: authUserError,
    } = await supabaseClient.auth.admin.getUserById(userId);

    if (authUserError || !authUser) {
      console.error("Confirm Update Email: Auth user not found", authUserError);
      req.flash("error", "Invalid token or user not found.");
      return res.redirect("/settings"); // Redirect to settings
    }

    // Update the email in Supabase Auth
    const { error: updateAuthError } =
      await supabaseClient.auth.admin.updateUserById(userId, {
        email: newEmail,
        email_confirm: false,
      });

    if (updateAuthError) {
      console.error("Error updating email in Supabase Auth:", updateAuthError);
      if (
        updateAuthError.message.includes(
          "duplicate key value violates unique constraint",
        )
      ) {
        req.flash("error", "This email address is already registered.");
      } else {
        req.flash("error", "Failed to update email address. Please try again.");
      }
      return res.redirect("/settings"); // Redirect to settings
    }

    // Update email and verification status in 'users' table
    await supabaseClient
      .from("users")
      .update({ email: newEmail, is_verified: false })
      .eq("id", userId);
    // Log errors from profile update but don't necessarily fail the request

    // Send verification email to the *new* address
    const username = authUser.user_metadata?.username || newEmail.split("@")[0];
    await sendVerificationEmail({ email: newEmail, username }, req);

    // Log the user out
    res.clearCookie("access_token");
    res.clearCookie("refresh_token");

    req.flash(
      "success",
      `Email change confirmed to ${newEmail}. A verification email has been sent to your new address. Please verify it to log back in.`,
    );
    res.redirect("/auth/login"); // Redirect to login
  } catch (err) {
    console.error("Confirm Update Email GET Error:", err);
    if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
      req.flash("error", "The confirmation link is invalid or has expired.");
    } else {
      req.flash("error", "An error occurred during email confirmation.");
    }
    res.redirect("/settings"); // Redirect to settings on error
  }
});

module.exports = router;
