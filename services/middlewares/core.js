const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");

/**
 * Configures core Express middleware like static files, body parsing, and cookies
 * @param {express.Application} app - The Express application instance
 */
function configureCoreMiddleware(app) {
  const staticPath = path.join(__dirname, "../../frontend/public");
  app.use(express.static(staticPath));
  console.log(`Serving static files from: ${staticPath}`); // Log the path being used

  // Parse URL-encoded bodies (as sent by HTML forms)
  app.use(express.urlencoded({ extended: true }));

  // Parse JSON bodies (as sent by API clients)
  app.use(express.json());

  // Parse Cookie header and populate req.cookies with an object keyed by the cookie names
  app.use(cookieParser());

  console.log("Core middleware (static, body-parser, cookie-parser) configured.");
}

module.exports = {
  configureCoreMiddleware,
};