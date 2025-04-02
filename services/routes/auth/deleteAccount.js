const express = require("express");
const router = express.Router();
const mailerService = require("../../../backend/services/mailerService");
const { supabaseClient } = require("../../../backend/config/database");
const { isAuthenticated } = require("../../middlewares/accountAuth");
const { generateToken } = require("./helpers");
const jwt = require("jsonwebtoken");
require("dotenv").config();

// GET /auth/delete-account (Render confirmation page)
router.get("/delete-account", isAuthenticated, (req, res) => {
  res.render("auth/delete-account", {
    title: "Delete Account",
    csrfToken: req.csrfToken(),
  });
});

// POST /auth/delete-account, sends confirmation email
router.post("/delete-account", isAuthenticated, async (req, res) => {
  const user = req.user;
  if (!user || !user.id || !user.email) {
    req.flash("error", "User information not found. Cannot initiate deletion.");
    return res.redirect("/settings");
  }

  try {
    const tokenPayload = { userId: user.id, action: "delete_account" };
    const token = generateToken(tokenPayload, "1h");
    const host = process.env.APP_HOST || req.get("host");
    const confirmURL = `${req.protocol}://${host}/auth/confirm-delete-account-action?token=${token}`;

    const subject = "Confirm Account Deletion Request";
    const html = `
          <p>Hello ${user.user_metadata?.username || user.email},</p>
          <p>You requested to delete your Job Matchmaker account. <strong>This action is permanent and irreversible.</strong> All your data, including created jobs and applications, will be removed.</p>
          <p>To confirm account deletion, please click the link below (valid for 1 hour):</p>
          <a href="${confirmURL}">${confirmURL}</a>
          <p>If you did not request this, please ignore this email.</p>
        `;
    await mailerService.sendNotification(user.email, subject, html);

    req.flash(
      "success",
      "A confirmation email has been sent. Please click the link inside to permanently delete your account.",
    );
    res.redirect("/settings");
  } catch (err) {
    console.error("Error sending delete confirmation email:", err);
    req.flash(
      "error",
      "Could not send confirmation email. Please try again later.",
    );
    res.redirect("/settings");
  }
});

// This route performs the deletion and redirects with a status message
router.get("/confirm-delete-account-action", async (req, res) => {
  let redirectUrl = "/?message="; // Redirect to homepage with message parameter

  try {
    const { token } = req.query;
    if (!token) {
      console.warn("Confirm Delete Action: Missing token.");
      return res.redirect(redirectUrl + "delete_link_invalid");
    }

    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;
    const action = decoded.action;

    if (!userId || action !== "delete_account") {
      throw new Error("Invalid token payload.");
    }

    // Deletion steps
    const { data: userToDelete, error: fetchError } =
      await supabaseClient.auth.admin.getUserById(userId);

    if (fetchError || !userToDelete) {
      console.warn(
        `Confirm Delete Action: User ${userId} not found or error fetching.`,
        fetchError,
      );
      // Account might already be gone
      return res.redirect(redirectUrl + "account_deleted");
    }
    const userEmailForLog = userToDelete.user.email;

    // Delete related data (jobs, applications, user profile, user skills)
    await supabaseClient
      .from("applications")
      .delete()
      .eq("applicant_id", userId);
    await supabaseClient.from("jobs").delete().eq("user_id", userId);
    await supabaseClient.from("user_skills").delete().eq("user_id", userId);
    await supabaseClient.from("users").delete().eq("id", userId);

    // Delete from Supabase Auth last
    const { error: deleteAuthError } =
      await supabaseClient.auth.admin.deleteUser(userId, true); // Hard delete

    if (deleteAuthError) {
      // This is serious, log it and inform user
      console.error(
        `CRITICAL: Failed to delete Supabase Auth user ${userId} (${userEmailForLog}): ${deleteAuthError.message}`,
      );
      return res.redirect(redirectUrl + "delete_failed_contact_support");
    }

    // Clear any cookies associated with the deleted user
    res.clearCookie("access_token", { path: "/" });
    res.clearCookie("refresh_token", { path: "/" });

    console.log(
      `Successfully deleted account for user ${userId} (${userEmailForLog})`,
    );
    return res.redirect(redirectUrl + "account_deleted"); // Success redirect
  } catch (err) {
    console.error("Confirm Delete Account Action GET Error:", err);
    let errorType = "delete_error_generic";
    if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
      errorType = "delete_link_invalid";
    }
    // Redirect with a generic or specific error code
    res.redirect(redirectUrl + errorType);
  }
});

module.exports = router;
