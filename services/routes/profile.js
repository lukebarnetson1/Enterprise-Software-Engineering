const express = require("express");
const router = express.Router();
const { isAuthenticated } = require("../middlewares/accountAuth");
const Skill = require("../../backend/models/skill");
const UserSkill = require("../../backend/models/userSkill");
const { body, validationResult } = require("express-validator");

// Simple validation for skill data structure
const validateSkillsInput = (req, res, next) => {
  if (!req.body.skills) {
    // If skills field is missing, treat as empty array / no update
    req.body.skillsData = [];
    return next();
  }
  // Expecting skills format like: { "skill_id_1": "2", "skill_id_2": "0.5" } from form
  const skillsData = [];
  for (const skillId in req.body.skills) {
    const years = req.body.skills[skillId];
    // Basic validation: is it a valid UUID and a non-negative number?
    if (
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
        skillId,
      ) &&
      !isNaN(parseFloat(years)) &&
      parseFloat(years) >= 0
    ) {
      skillsData.push({
        skill_id: skillId,
        years_experience: parseFloat(years), // Ensure it's a number
      });
    } else {
      console.warn(
        `Invalid skill data received: ID=${skillId}, Years=${years}`,
      );
      // Skip invalid entries
    }
  }
  req.body.skillsData = skillsData; // Attach processed data to request
  next();
};

// GET route to render the skill editing form
router.get("/skills/edit", isAuthenticated, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const [allSkills, userSkillsList] = await Promise.all([
      Skill.getAllSkills(),
      UserSkill.getSkillsByUserId(userId),
    ]);

    // Create a map for easy lookup in the template
    const userSkillsMap = userSkillsList.reduce((map, skill) => {
      map[skill.id] = skill.years_experience;
      return map;
    }, {});

    res.render("profile/edit-skills", {
      title: "Edit Your Skills",
      allSkills: allSkills,
      userSkillsMap: userSkillsMap, // Pass the map { skill_id: years }
      csrfToken: req.csrfToken(),
    });
  } catch (err) {
    console.error("Error loading edit skills page:", err);
    req.flash("error", "Failed to load skills editor.");
    next(err);
  }
});

// POST route to update user skills
router.post(
  "/skills/edit",
  isAuthenticated,
  validateSkillsInput,
  async (req, res, next) => {
    try {
      const userId = req.user.id;
      const skillsData = req.body.skillsData; // Processed data from middleware

      await UserSkill.setUserSkills(userId, skillsData);

      req.flash("success", "Your skills have been updated successfully.");
      res.redirect("/settings"); // Redirect back to settings page
    } catch (err) {
      console.error(`Error updating skills for user ${req.user.id}:`, err);
      req.flash("error", "Failed to update skills. Please try again.");
      // Redirect back to the edit page on error
      res.redirect("/profile/skills/edit");
    }
  },
);

module.exports = router;
