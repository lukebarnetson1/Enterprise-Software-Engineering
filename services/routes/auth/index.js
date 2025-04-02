const express = require("express");
const router = express.Router();

// Import individual auth route modules
const deleteAccountRoutes = require("./deleteAccount");
const loginRoutes = require("./login");
const logoutRoutes = require("./logout");
const passwordRoutes = require("./password");
const signupRoutes = require("./signup");
const updateEmailRoutes = require("./updateEmail");
const updateUsernameRoutes = require("./updateUsername");
const verifyRoutes = require("./verify");

// Mount each set of routes onto the router
router.use(deleteAccountRoutes);
router.use(loginRoutes);
router.use(logoutRoutes);
router.use(passwordRoutes);
router.use(signupRoutes);
router.use(updateEmailRoutes);
router.use(updateUsernameRoutes);
router.use(verifyRoutes);

module.exports = router;
