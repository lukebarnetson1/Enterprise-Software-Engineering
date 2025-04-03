const express = require("express");
const router = express.Router();
const Job = require("../../../backend/models/job");
const { isAuthenticated } = require("../../middlewares/accountAuth");

// POST /delete/:id - Handle job deletion
router.post("/delete/:id", isAuthenticated, async (req, res, next) => {
  const jobId = req.params.id;
  const currentUserId = req.user.id;

  try {
    // Fetch job to verify ownership before deleting
    const jobToDelete = await Job.getJobById(jobId); // Simple fetch is enough

    // Check if job exists
    if (!jobToDelete) {
      req.flash("error", "Job not found.");
      return res.redirect("/job");
    }

    // Check ownership
    if (jobToDelete.user_id !== currentUserId) {
      req.flash("error", "You are not authorised to delete this job.");
      return res.redirect(`/job/job/${jobId}`);
    }

    // Perform the deletion
    await Job.deleteJob(jobId);

    // Success: Redirect to the job board
    req.flash(
      "success",
      "Job and associated applications deleted successfully.",
    );
    res.redirect("/job");
  } catch (err) {
    console.error(`Error deleting job ${jobId}:`, err);
    req.flash("error", `Failed to delete job: ${err.message}`);
    // Redirect back to the job detail page on error
    res.redirect(`/job/job/${jobId}`);
  }
});

module.exports = router;
