const { supabaseClient } = require("../../backend/config/database");

module.exports = {
  isAuthenticated: async (req, res, next) => {
    const token = req.cookies.access_token;

    if (!token) {
      req.flash("error", "You must be logged in to access this page.");
      return res.redirect("/auth/login");
    }

    try {
      const { data, error } = await supabaseClient.auth.getUser(token);
      if (error || !data.user) {
        req.flash("error", "Session expired. Please log in again.");
        return res.redirect("/auth/login");
      }

      // Attach user info to request
      req.user = data.user;
      res.locals.user = {
        email: data.user.email,
        username: data.user.user_metadata?.username || "Unknown",
      };

      next();
    } catch (err) {
      console.error("Auth middleware error:", err);
      req.flash("error", "Authentication failed.");
      return res.redirect("/auth/login");
    }
  },
};
