const fs = require("fs");
const path = require("path");
require("dotenv").config();

/**
 * Configures the 404 Not Found handler and the final global error handler
 * @param {express.Application} app
 */
function configureErrorHandlers(app) {
  // 404 Handler - Catches requests that didn't match any route
  app.use((req, res, next) => {
    res.status(404);
    // __dirname is services/middlewares, go up one level, then into frontend/views
    const viewPath = path.join(__dirname, "../../frontend/views/404.ejs");

    if (fs.existsSync(viewPath)) {
      // Render the custom 404 page if it exists
      res.render("404", {
        title: "Page Not Found",
        // Pass necessary layout variables, ensuring defaults
        flashSuccess: res.locals.flashSuccess || [],
        flashError: res.locals.flashError || [],
        flashWarning: res.locals.flashWarning || [],
        csrfToken: res.locals.csrfToken || "",
        user: res.locals.user || null,
        oldInput: res.locals.oldInput || {},
      });
    } else {
      // Basic fallback if 404.ejs is missing
      console.error(`Error: 404.ejs not found at expected path: ${viewPath}`);
      res.type("txt").send("Error 404: Not Found (Template missing)");
    }
    // Note: We don't call next() here for a 404
  });
  console.log("404 handler configured.");

  // Global Error Handler - Catches errors passed via next(err)
  // Must have 4 arguments: (err, req, res, next)
  app.use((err, req, res, next) => {
    // Log the error details for debugging
    console.error(
      `[${new Date().toISOString()}] Global Error Handler Caught (${req.method} ${req.originalUrl}):`,
      {
        message: err.message,
        code: err.code,
        status: err.status, // HTTP status if attached to error
        // Conditionally log stack trace (hide in production for security)
        stack:
          process.env.NODE_ENV !== "production"
            ? err.stack
            : "Stack trace hidden in production",
      },
    );

    // Handle specific error types, like CSRF errors
    if (err.code === "EBADCSRFTOKEN") {
      console.warn(
        `CSRF Token Error detected for ${req.method} ${req.originalUrl}.`,
      );
      req.flash(
        "error",
        "Your form session has expired or is invalid. Please refresh and try again.",
      );
      // Redirect back to the referring page or a safe default
      const referer = req.header("Referer");
      const redirectUrl =
        referer && referer !== req.originalUrl
          ? referer
          : req.session?.returnTo || "/";
      return res.redirect(redirectUrl);
    }

    // Determine appropriate status code
    // Use error's status if it's a valid HTTP error code, otherwise default to 500
    const statusCode =
      typeof err.status === "number" && err.status >= 400 && err.status < 600
        ? err.status
        : 500;
    res.status(statusCode);

    // Determine user-facing error message
    let userMessage =
      "An unexpected error occurred on the server. Please try again later.";
    // Show more detailed errors in development or for non-500 errors
    if (statusCode < 500 || process.env.NODE_ENV !== "production") {
      userMessage = err.message || "An internal server error occurred.";
    }

    // Render the standard error page (error.ejs)
    // No path correction needed here as app.render uses the path set globally.
    res.render("error", {
      title: `Error ${statusCode}`,
      message: userMessage,
      // Pass the full error object only in development environments
      error: process.env.NODE_ENV !== "production" ? err : {},
      // Pass layout variables, ensuring defaults
      flashSuccess: res.locals.flashSuccess || [],
      // Add the current error message to flash errors for display
      flashError: res.locals.flashError
        ? [...res.locals.flashError, userMessage]
        : [userMessage],
      flashWarning: res.locals.flashWarning || [],
      csrfToken: res.locals.csrfToken || "",
      user: res.locals.user || null,
      oldInput: res.locals.oldInput || {},
    });
  });
  console.log("Global error handler configured.");
}

module.exports = {
  configureErrorHandlers,
};
