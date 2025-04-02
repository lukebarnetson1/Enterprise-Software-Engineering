const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const { supabaseClient } = require("../../../backend/config/database");
require("dotenv").config();

router.get("/verify", async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) {
      req.flash("error", "Missing token.");
      return res.redirect("/auth/login");
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 1. Fetch user from custom profile table
    const { data: user, error: userError } = await supabaseClient
      .from("users")
      .select("*")
      .eq("email", decoded.email)
      .single();

    if (userError || !user) {
      req.flash("error", "Invalid token or user no longer exists.");
      return res.redirect("/auth/login");
    }

    // 2. Skip if already verified
    if (user.is_verified) {
      req.flash("success", "Your account is already verified.");
      return res.redirect("/auth/login");
    }

    // 3. Update custom users table
    await supabaseClient
      .from("users")
      .update({ is_verified: true })
      .eq("id", user.id);

    // 4. Also update Supabase Auth metadata
    await supabaseClient.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...user.user_metadata,
        is_verified: true,
      },
    });

    req.flash("success", "Your email has been verified!");
    res.redirect("/auth/login");
  } catch (err) {
    console.error(err);
    req.flash("error", "Verification link is invalid or has expired.");
    res.redirect("/auth/login");
  }
});

module.exports = router;
