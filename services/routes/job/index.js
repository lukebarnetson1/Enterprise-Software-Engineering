const express = require("express");
const router = express.Router();

// Import the route handlers for different job actions
const listRoutes = require("./list");
const detailRoutes = require("./detail");
const createRoutes = require("./create");
const editRoutes = require("./edit");
const deleteRoutes = require("./delete");

// Mount the specific route handlers
router.use(listRoutes);
router.use(detailRoutes);
router.use(createRoutes);
router.use(editRoutes);
router.use(deleteRoutes);

module.exports = router;