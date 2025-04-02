const { body, validationResult } = require("express-validator");
const sanitiseHtml = require("sanitize-html");
const zxcvbn = require("zxcvbn");
const { parseISO, isFuture, isAfter, isValid, isToday } = require("date-fns");

// Reusable sanitisation function
const sanitiseInput = (input) => {
  return sanitiseHtml(input, {
    allowedTags: [],
    allowedAttributes: {},
    disallowedTagsMode: "discard",
    enforceHtmlBoundary: true,
  });
};

const validatePasswordStrength = (password) => {
  const result = zxcvbn(password);
  if (result.score < 2) {
    throw new Error("Password is too weak. Please choose a stronger password.");
  }
  return true;
};

// Helper for date validation
const isValidDate = (value) => {
  if (!value) return false;
  try {
    const date = parseISO(value);
    return isValid(date);
  } catch (e) {
    return false;
  }
};

// Validation rules for creating jobs
const validateJob = [
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Title is required")
    .isLength({ max: 100 })
    .withMessage("Title must be less than 100 characters")
    .customSanitizer(sanitiseInput),
  body("description")
    .trim()
    .notEmpty()
    .withMessage("Description is required")
    .customSanitizer(sanitiseInput),
  body("company_name")
    .trim()
    .notEmpty()
    .withMessage("Company name is required")
    .isLength({ max: 150 })
    .withMessage("Company name must be less than 150 characters")
    .customSanitizer(sanitiseInput),
  body("application_deadline")
    .trim()
    .notEmpty()
    .withMessage("Application deadline is required")
    .isISO8601({ strict: true, strictSeparator: true })
    .withMessage("Invalid date format (YYYY-MM-DD)")
    .custom((value) => {
      if (!isValidDate(value)) throw new Error("Invalid deadline date.");
      return true;
    })
    .toDate(),
  body("start_date")
    .trim()
    .notEmpty()
    .withMessage("Start date is required")
    .isISO8601({ strict: true, strictSeparator: true })
    .withMessage("Invalid date format (YYYY-MM-DD)")
    .custom((value, { req }) => {
      if (!isValidDate(value)) throw new Error("Invalid start date."); // Check validity first
      const startDate = parseISO(value);
      const deadline = req.body.application_deadline; // Date object from validation
      if (
        deadline instanceof Date &&
        isValid(startDate) &&
        !isAfter(startDate, deadline)
      ) {
        throw new Error("Start date must be after the application deadline.");
      }
      return true;
    })
    .toDate(),
  body("salary_amount")
    .trim()
    .notEmpty()
    .withMessage("Salary amount is required")
    .isInt({ gt: 0 })
    .withMessage("Salary must be a positive number")
    .toInt(),
  body("weekly_hours")
    .exists({ checkFalsy: true })
    .withMessage("Working hours grid selection seems to be missing.")
    .isFloat()
    .withMessage("Weekly hours must be a number.")
    .toFloat()
    .isFloat({ min: 1, max: 48 })
    .withMessage("Weekly hours must be between 1 and 48."),
  body("working_hours_details")
    .optional({ values: "falsy" })
    .trim()
    .customSanitizer((value) => sanitiseInput(value))
    .custom((value) => {
      if (!value) return true;
      try {
        const parsed = JSON.parse(value);
        if (!Array.isArray(parsed)) throw new Error();
        return true;
      } catch (e) {
        throw new Error("Invalid format for working hours details.");
      }
    }),
  body("working_location")
    .trim()
    .notEmpty()
    .withMessage("Working location is required")
    .isIn(["in_person", "remote", "hybrid"])
    .withMessage("Invalid working location selected"),
  body("in_person_location")
    .trim()
    .custom((value, { req }) => {
      const locationType = req.body.working_location;
      if (
        (locationType === "in_person" || locationType === "hybrid") &&
        !value
      ) {
        throw new Error(
          "In-person location is required for in-person or hybrid jobs.",
        );
      }
      return true;
    })
    .isLength({ max: 150 })
    .withMessage("In-person location must be less than 150 characters")
    .customSanitizer(sanitiseInput),
];

// Validation rules for editing jobs
const validateJobEdit = [
  body("description")
    .trim()
    .notEmpty()
    .withMessage("Description is required")
    .customSanitizer(sanitiseInput),
  body("status")
    .isIn(["open", "closed"])
    .withMessage("Invalid status value.")
    .customSanitizer(sanitiseInput),
  body("company_name")
    .trim()
    .notEmpty()
    .withMessage("Company name is required")
    .isLength({ max: 150 })
    .withMessage("Company name must be less than 150 characters")
    .customSanitizer(sanitiseInput),
  body("application_deadline")
    .trim()
    .notEmpty()
    .withMessage("Application deadline is required")
    .isISO8601({ strict: true, strictSeparator: true })
    .withMessage("Invalid date format (YYYY-MM-DD)")
    .custom((value) => {
      if (!isValidDate(value)) throw new Error("Invalid deadline date.");
      return true;
    })
    .toDate(),
  body("start_date")
    .trim()
    .notEmpty()
    .withMessage("Start date is required")
    .isISO8601({ strict: true, strictSeparator: true })
    .withMessage("Invalid date format (YYYY-MM-DD)")
    .custom((value, { req }) => {
      if (!isValidDate(value)) throw new Error("Invalid start date.");
      const startDate = parseISO(value);
      let deadline;
      try {
        if (req.body.application_deadline) {
          deadline = parseISO(req.body.application_deadline);
        }
      } catch (e) {
        /* ignore parsing error here, previous validation caught it */
      }

      if (
        deadline instanceof Date && // Ensure deadline is a valid Date
        isValid(deadline) &&
        isValid(startDate) &&
        !isAfter(startDate, deadline)
      ) {
        throw new Error("Start date must be after the application deadline.");
      }
      return true;
    })
    .toDate(),
  body("salary_amount")
    .trim()
    .notEmpty()
    .withMessage("Salary amount is required")
    .isFloat({ gt: 0 })
    .withMessage("Salary must be a positive number")
    .toFloat(),
  body("weekly_hours")
    .exists({ checkFalsy: true })
    .withMessage("Working hours grid selection seems to be missing.")
    .isFloat()
    .withMessage("Weekly hours must be a number.")
    .toFloat()
    .isFloat({ min: 1, max: 48 })
    .withMessage("Weekly hours must be between 1 and 48."),
  body("working_hours_details")
    .optional({ values: "falsy" })
    .trim()
    .customSanitizer(sanitiseInput)
    .custom((value) => {
      if (!value) return true;
      try {
        const parsed = JSON.parse(value);
        if (!Array.isArray(parsed)) throw new Error();
        return true;
      } catch (e) {
        throw new Error("Invalid format for working hours details.");
      }
    }),
  body("working_location")
    .trim()
    .notEmpty()
    .withMessage("Working location is required")
    .isIn(["in_person", "remote", "hybrid"])
    .withMessage("Invalid working location selected"),
  body("in_person_location")
    .trim()
    .custom((value, { req }) => {
      const locationType = req.body.working_location;
      if ((locationType === "in_person" || locationType === "hybrid") && !value)
        throw new Error("In-person location required for this working type.");
      return true;
    })
    .isLength({ max: 150 })
    .withMessage("Location name too long (max 150 characters).")
    .customSanitizer(sanitiseInput),
];

// Other validation sets (signup, login etc) remain the same
const validateSignUp = [
  body("email")
    .isEmail()
    .withMessage("Must be a valid email address")
    .normalizeEmail()
    .customSanitizer(sanitiseInput),
  body("username")
    .trim()
    .notEmpty()
    .withMessage("Username is required")
    .isLength({ min: 3, max: 30 })
    .withMessage("Username must be between 3 and 30 characters.")
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage("Username can only contain letters, numbers, and underscores.")
    .customSanitizer(sanitiseInput),
  body("password").custom(validatePasswordStrength),
];
const validateLogin = [
  body("identifier")
    .trim()
    .notEmpty()
    .withMessage("Email or Username is required")
    .customSanitizer(sanitiseInput),
  body("password").notEmpty().withMessage("Password is required"),
];
const validateUpdateUsername = [
  body("newUsername")
    .trim()
    .notEmpty()
    .withMessage("Username is required")
    .isLength({ min: 3, max: 30 })
    .withMessage("Username must be between 3 and 30 characters.")
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage("Username can only contain letters, numbers, and underscores.")
    .customSanitizer(sanitiseInput),
];
const validateResetPassword = [
  body("password").custom(validatePasswordStrength),
];

// Middleware to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.warn("Validation Errors:", JSON.stringify(errors.array())); // Log as warning
    // Store errors in flash
    errors.array().forEach((err) => {
      // Don't flash generic CSRF message if a specific one is already there
      if (
        err.msg === "Invalid CSRF token" &&
        req.flash("error").some((msg) => msg.includes("Form session expired"))
      ) {
        // Skip adding the generic CSRF message again
      } else if (err.msg === "Invalid CSRF token") {
        req.flash(
          "error",
          "Form session expired or is invalid. Please try submitting again.",
        );
      } else {
        req.flash("error", err.msg);
      }
    });
    // Store old input in flash
    req.flash("oldInput", req.body);

    const backURL = req.originalUrl || req.header("Referer") || "/";
    return res.redirect(backURL);
  }
  next(); // Proceed if no validation errors
};

module.exports = {
  validateJob,
  validateJobEdit,
  validateSignUp,
  validateLogin,
  validateUpdateUsername,
  validateResetPassword,
  handleValidationErrors,
};
