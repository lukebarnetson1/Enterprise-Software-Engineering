const express = require("express");
const router = express.Router();
const { supabaseClient } = require("../../../backend/config/database");
const {
  validateResetPassword,
  handleValidationErrors,
} = require("../../middlewares/validation");
const { body, validationResult } = require("express-validator");
const User = require("../../../backend/models/user");
const mailerService = require("../../../backend/services/mailerService");
const { generateToken } = require("./helpers");
const jwt = require("jsonwebtoken");
require("dotenv").config();

// GET /auth/forgot
router.get("/forgot", (req, res) => {
  res.render("auth/forgot", {
    title: "Forgot Password",
    csrfToken: req.csrfToken(),
  });
});

// POST /auth/forgot
router.post(
  "/forgot",
  [
    body("email")
      .isEmail()
      .withMessage("Please enter a valid email address.")
      .normalizeEmail(),
  ],
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
      return res.redirect("/auth/forgot");
    }

    const { email } = req.body;
    const genericMessage =
      "If an account with that email exists, a password reset link has been sent.";

    try {
      // Find user in 'users' table
      const user = await User.findByEmail(email);

      if (!user) {
        // User not found, still show generic message for security
        console.warn(
          `Password reset requested for non-existent email: ${email}`,
        );
        req.flash("success", genericMessage);
        return res.redirect("/auth/forgot");
      }

      // Generate a JWT for password reset
      const tokenPayload = { userId: user.id, action: "password_reset" };
      const token = generateToken(tokenPayload, "1h"); // Token valid for 1 hour

      const host = process.env.APP_HOST || req.get("host");
      const resetURL = `${req.protocol}://${host}/auth/reset?token=${token}`;

      const subject = "Job Matchmaker - Password Reset Request";
      const html = `
            <p>Hello ${user.username || user.email},</p>
            <p>You requested a password reset for your Job Matchmaker account.</p>
            <p>Click the link below to set a new password (link valid for 1 hour):</p>
            <a href="${resetURL}">${resetURL}</a>
            <p>If you did not request this, please ignore this email.</p>
        `;

      // Send email using mailer service
      await mailerService.sendNotification(user.email, subject, html);

      req.flash("success", genericMessage);
      res.redirect("/auth/forgot");
    } catch (err) {
      console.error("Forgot Password internal error:", err);
      req.flash(
        "error",
        "Something went wrong sending the reset email. Please try again.",
      );
      res.redirect("/auth/forgot");
    }
  },
);

// GET /auth/reset
router.get("/reset", async (req, res) => {
  const { token } = req.query;

  if (!token) {
    req.flash("error", "Invalid or missing reset token.");
    return res.redirect("/auth/login");
  }

  try {
    // Verify the JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded.userId || decoded.action !== "password_reset") {
      throw new Error("Invalid token payload.");
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
      req.flash("error", "Invalid token or user not found.");
      return res.redirect("/auth/login");
    }

    // Token is valid, render the form and pass the token
    res.render("auth/reset", {
      title: "Reset Password",
      csrfToken: req.csrfToken(),
      token: token, // Pass token to the form's hidden input
    });
  } catch (err) {
    console.error("Password Reset GET error:", err);
    let message = "Password reset link is invalid or has expired.";
    if (err.name === "TokenExpiredError") {
      message = "Password reset link has expired. Please request a new one.";
    }
    req.flash("error", message);
    res.redirect("/auth/forgot"); // Redirect to request a new link
  }
});

// POST /auth/reset - Validate password
router.post(
  "/reset",
  // Keep password validation, add token validation
  [
    body("token").notEmpty().withMessage("Reset token is missing."),
    ...validateResetPassword, // Spread existing password rules
  ],
  handleValidationErrors, // Use shared handler
  async (req, res) => {
    // Destructure validated fields + token
    const { password, token } = req.body;

    try {
      // Verify the JWT again (essential security step)
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decoded.userId;

      if (!userId || decoded.action !== "password_reset") {
        req.flash("error", "Invalid reset token provided.");
        return res.redirect(`/auth/reset?token=${token}`); // Redirect back to form with token
      }

      // Update the user's password using Supabase Admin API
      const { error: updateError } =
        await supabaseClient.auth.admin.updateUserById(userId, {
          password: password,
        });

      if (updateError) {
        console.error("Password update failed via Admin API:", updateError);
        req.flash("error", `Failed to update password: ${updateError.message}`);
        return res.redirect(`/auth/reset?token=${token}`);
      }

      // Password updated successfully!
      req.flash(
        "success",
        "Password reset successful. Please log in with your new password.",
      );
      res.redirect("/auth/login");
    } catch (err) {
      console.error("Reset Password POST internal error:", err);
      let errorMsg = "Something went wrong during password reset.";
      if (
        err.name === "JsonWebTokenError" ||
        err.name === "TokenExpiredError"
      ) {
        errorMsg =
          "Password reset token is invalid or has expired. Please request a new link.";
        // Don't redirect back to reset form if token is bad, redirect to forgot
        req.flash("error", errorMsg);
        return res.redirect("/auth/forgot");
      } else {
        req.flash("error", errorMsg);
        // Redirect back to form only if token was likely valid but another error occurred
        return res.redirect(`/auth/reset?token=${token}`);
      }
    }
  },
);

module.exports = router;
