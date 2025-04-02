const express = require("express");
const router = express.Router();
const { validationResult } = require("express-validator");
const { supabaseClient } = require("../../../backend/config/database");
const {
  validateSignUp,
  handleValidationErrors,
} = require("../../middlewares/validation");
const { sendVerificationEmail } = require("./helpers");

// GET /auth/signup
router.get("/signup", (req, res) => {
  // Get old input flashed data if any (good practice)
  const oldInputData = req.flash("oldInput")[0] || {};
  res.render("auth/signup", {
    title: "Sign Up",
    csrfToken: req.csrfToken(),
    oldInput: oldInputData,
  });
});

// POST /auth/signup
router.post("/signup", validateSignUp, async (req, res) => {
  const { email, username, password } = req.body;
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    req.flash(
      "error",
      errors
        .array()
        .map((e) => e.msg)
        .join(" | "),
    );
    // Pass CSRF token back on validation error render
    return res.status(422).render("auth/signup", {
      title: "Sign Up",
      errors: errors.array(),
      oldInput: req.body,
      csrfToken: req.csrfToken(),
    });
  }

  try {
    // Check if email already exists in profile table
    const { data: emailExists } = await supabaseClient
      .from("users")
      .select("email")
      .eq("email", email)
      .maybeSingle();

    if (emailExists) {
      req.flash("error", "That email address is already in use.");
      req.flash("oldInput", req.body); // Keep old input
      return res.redirect("/auth/signup");
    }

    // Check if username is taken (case-insensitive)
    const { data: usernameExists } = await supabaseClient
      .from("users")
      .select("username")
      .ilike("username", username);

    if (usernameExists?.length > 0) {
      req.flash("error", "That username is already taken.");
      req.flash("oldInput", req.body); // Keep old input
      return res.redirect("/auth/signup");
    }

    // Create Supabase Auth user
    const { data: authData, error: authError } =
      await supabaseClient.auth.signUp({
        email,
        password,
        options: {
          data: { username },
        },
      });

    if (authError) {
      console.error("Supabase Auth error:", authError);
      req.flash("error", authError.message || "Signup failed.");
      req.flash("oldInput", req.body); // Keep old input
      return res.redirect("/auth/signup");
    }

    const supabaseUserId = authData?.user?.id;
    if (!supabaseUserId) {
      req.flash("error", "User creation failed unexpectedly.");
      req.flash("oldInput", req.body); // Keep old input
      return res.redirect("/auth/signup");
    }

    // Insert into profile table
    const { data: profileInsert, error: insertError } = await supabaseClient
      .from("users")
      .insert([{ id: supabaseUserId, email, username, is_verified: false }])
      .select();

    console.log("Profile insert result:", profileInsert);
    console.error("Insert error (if any):", insertError);

    if (insertError) {
      console.error("Profile insert error:", insertError);
      req.flash("error", "Signup failed while saving user profile.");
      req.flash("oldInput", req.body); // Keep old input
      return res.redirect("/auth/signup");
    }

    // Send verification email using helper
    await sendVerificationEmail({ email, username }, req);

    req.flash(
      "success",
      "Signup successful! Check your email to verify your account.",
    );
    res.redirect("/auth/login");
  } catch (err) {
    console.error("Unhandled signup error:", err);
    req.flash("error", "Something went wrong during sign up.");
    req.flash("oldInput", req.body); // Keep old input
    res.redirect("/auth/signup");
  }
});

module.exports = router;
