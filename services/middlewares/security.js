const rateLimit = require("express-rate-limit");
const csrf = require("csurf");

/**
 * Configures security-related middleware: rate limiting, CSRF is configured separately after session middleware.
 * @param {express.Application} app
 */
function configureRateLimiter(app) {
  // Apply to all requests
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 150, // Limit each IP to 150 requests per windowMs
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    message:
      "Too many requests from this IP, please try again after 15 minutes",
  });
  app.use(limiter);
  console.log("Rate limiting middleware configured.");
}

// Export CSRF middleware setup function separately
const csrfProtection = csrf({ cookie: false }); // Use session storage

module.exports = {
  configureRateLimiter,
  csrfProtection,
};
