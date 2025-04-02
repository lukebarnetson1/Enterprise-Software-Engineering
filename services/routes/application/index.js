const express = require("express");
const router = express.Router();

// Import the route handlers for different application actions
const applyRoutes = require("./apply");
const listRoutes = require("./list");
const editRoutes = require("./edit");
const offerRoutes = require("./offer");

// Mount the specific route handlers
router.use(applyRoutes);
router.use(listRoutes);
router.use(editRoutes);
router.use(offerRoutes);

module.exports = router;