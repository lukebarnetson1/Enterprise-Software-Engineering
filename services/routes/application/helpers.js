/**
 * Checks the overall skill match between a user's skills and a job's required skills
 * @param {Array} userSkills - Array of user skill objects { id, years_experience }
 * @param {Array} requiredSkills - Array of required skill objects { id, min_years_experience }
 * @returns {Object} - { status: ('met'|'partial'|'missing'), text: String, badge: String }
 */
function checkOverallSkillMatch(userSkills, requiredSkills) {
    if (!requiredSkills || requiredSkills.length === 0) {
      return {
        status: "met",
        text: "Met (No skills required)",
        badge: "success",
      };
    }
    if (!userSkills || userSkills.length === 0) {
      return { status: "missing", text: "Missing All Skills", badge: "danger" };
    }
  
    const userSkillMap = userSkills.reduce((map, skill) => {
      map[skill.id] = skill.years_experience;
      return map;
    }, {});
  
    let meetsAll = true;
    let hasAllSkills = true;
    let hasSufficientExperience = true;
  
    for (const req of requiredSkills) {
      const userYears = userSkillMap[req.id];
      if (userYears === undefined) {
        meetsAll = false;
        hasAllSkills = false;
        break; // No need to check further if a skill is completely missing
      } else if (userYears < req.min_years_experience) {
        meetsAll = false;
        hasSufficientExperience = false;
        // Continue checking other skills even if experience is insufficient for one
      }
    }
  
    if (meetsAll) {
      return { status: "met", text: "Meets Requirements", badge: "success" };
    } else if (!hasAllSkills) {
      // If at least one skill was missing entirely
      return { status: "missing", text: "Missing Some Skills", badge: "danger" };
    } else {
      // If all skills are present, but experience is insufficient for at least one
      return {
        status: "partial",
        text: "Insufficient Experience",
        badge: "warning text-dark",
      };
    }
  }
  
  module.exports = {
    checkOverallSkillMatch,
  };