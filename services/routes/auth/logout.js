const express = require("express");
const router = express.Router();

// GET /auth/logout
router.get("/logout", (req, res) => {
  res.clearCookie("access_token");
  res.clearCookie("refresh_token");
  req.flash("success", "You have been logged out.");
  res.redirect("/");
});

module.exports = router;
