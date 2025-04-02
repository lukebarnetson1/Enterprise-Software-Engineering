const express = require("express");
const router = express.Router();
const { supabaseClient } = require("../../../backend/config/database");
const { validateLogin } = require("../../middlewares/validation");
const { validationResult } = require("express-validator");
const { findByUsernameInsensitive } = require("../../../backend/models/user");

// GET /auth/login
router.get("/login", (req, res) => {
  const oldInputData = req.flash("oldInput")[0] || {};
  res.render("auth/login", {
    title: "Login",
    csrfToken: req.csrfToken(),
    oldInput: oldInputData,
  });
});

// POST /auth/login
router.post("/login", validateLogin, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    req.flash(
      "error",
      errors
        .array()
        .map((e) => e.msg)
        .join(" | "),
    );
    req.flash("oldInput", req.body);
    // Pass CSRF token back on validation error redirect
    return res.status(422).render("auth/login", {
      title: "Login",
      errors: errors.array(),
      oldInput: req.body,
      csrfToken: req.csrfToken(),
    });
  }

  let { identifier, password, rememberMe } = req.body;

  try {
    // If identifier is a username, convert to email
    if (!identifier.includes("@")) {
      const userRecord = await findByUsernameInsensitive(identifier);
      if (!userRecord) {
        req.flash("error", "Invalid username or password.");
        req.flash("oldInput", req.body);
        return res.redirect("/auth/login");
      }
      identifier = userRecord.email;
    }

    // Sign in with email and password
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email: identifier,
      password,
    });

    if (error || !data.session) {
      console.warn("Login failed:", error?.message || "No session returned"); // Log specific error
      req.flash("error", "Invalid email or password.");
      req.flash("oldInput", req.body);
      return res.redirect("/auth/login");
    }

    // Check email verification status
    const { data: profileData, error: profileError } = await supabaseClient
      .from("users")
      .select("is_verified")
      .eq("id", data.user.id)
      .single();

    if (profileError || !profileData) {
      console.error(
        "Error fetching profile during login or profile not found:",
        profileError,
      );
      req.flash("error", "Login failed: Could not verify account status.");
      req.flash("oldInput", req.body);
      return res.redirect("/auth/login");
    }

    if (!profileData.is_verified) {
      req.flash("error", "Please verify your email before logging in.");
      req.flash("oldInput", req.body);
      await supabaseClient.auth.signOut();
      return res.redirect("/auth/login");
    }

    const { access_token, refresh_token } = data.session;

    res.cookie("access_token", access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: rememberMe ? 1000 * 60 * 60 * 24 * 7 : undefined, // 7 days
      sameSite: "Lax",
    });

    res.cookie("refresh_token", refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: rememberMe ? 1000 * 60 * 60 * 24 * 30 : undefined, // 30 days
      sameSite: "Lax",
    });

    req.flash("success", "Welcome back!");
    // Redirect to intended destination or default
    const returnTo = req.session.returnTo || "/job";
    delete req.session.returnTo; // Clear it after use
    res.redirect(returnTo);
  } catch (err) {
    console.error("Login error:", err);
    req.flash("error", "Something went wrong during login.");
    req.flash("oldInput", req.body);
    res.redirect("/auth/login");
  }
});

module.exports = router;
