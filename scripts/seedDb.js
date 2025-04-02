const { supabaseClient } = require("../backend/config/database");
const { faker } = require("@faker-js/faker/locale/en_GB");
const Skill = require("../backend/models/skill");

const NUM_USERS = 50;
const TARGET_NUM_JOBS = 2000;
const AVG_APPS_PER_USER = 8;
const MAX_SKILLS_PER_USER = 18;
const MAX_SKILLS_PER_JOB = 10;
const COMMON_SKILL_RATIO_FOR_JOBS = 0.7;
const COMMON_SKILL_POOL_SIZE_RATIO = 0.3;
const MOCK_PASSWORD = "password123";

// Helper Functions

const getRandomSubset = (arr, maxSize, biasPool = null, biasRatio = 0.5) => {
  if (!arr || arr.length === 0) return [];

  const finalSelection = new Set();
  const remainingArr = [...arr];

  let targetSize = Math.floor(Math.random() * (maxSize + 1));
  let biasTarget = 0;
  let otherTarget = 0;
  let actualBiasPool = [];
  let otherPool = [...remainingArr];

  if (biasPool && biasPool.length > 0 && biasRatio > 0 && biasRatio < 1) {
    actualBiasPool = biasPool.filter((item) =>
      remainingArr.some((r) => r.id === item.id),
    );
    otherPool = remainingArr.filter(
      (item) => !actualBiasPool.some((b) => b.id === item.id),
    );
    biasTarget = Math.round(targetSize * biasRatio);
    otherTarget = targetSize - biasTarget;
    if (biasTarget > actualBiasPool.length) {
      otherTarget += biasTarget - actualBiasPool.length;
      biasTarget = actualBiasPool.length;
    }
    if (otherTarget > otherPool.length) {
      biasTarget += otherTarget - otherPool.length;
      otherTarget = otherPool.length;
    }
    targetSize = Math.min(targetSize, biasTarget + otherTarget);
  } else {
    otherTarget = targetSize;
    otherTarget = Math.min(otherTarget, otherPool.length);
    targetSize = otherTarget;
  }

  actualBiasPool.sort(() => 0.5 - Math.random());
  for (let i = 0; i < biasTarget && finalSelection.size < targetSize; i++) {
    finalSelection.add(actualBiasPool[i]);
  }

  otherPool.sort(() => 0.5 - Math.random());
  for (let i = 0; i < otherTarget && finalSelection.size < targetSize; i++) {
    finalSelection.add(otherPool[i]);
  }

  const remainingToPick = targetSize - finalSelection.size;
  if (remainingToPick > 0) {
    const combinedPool = [...actualBiasPool, ...otherPool].filter(
      (item) => !finalSelection.has(item),
    );
    combinedPool.sort(() => 0.5 - Math.random());
    for (let i = 0; i < remainingToPick && i < combinedPool.length; i++) {
      finalSelection.add(combinedPool[i]);
    }
  }

  return Array.from(finalSelection);
};

const getRandomExperience = (isJobRequirement = false) => {
  const power = isJobRequirement ? 1.5 : 2;
  const rand = Math.pow(Math.random(), power);
  const years = rand * 7;
  if (years < 0.7) return 0.5;
  if (years <= 1.2) return 1;
  if (years <= 2.2) return 2;
  if (years <= 3.2) return 3;
  if (years <= 4.2) return 4;
  if (years <= 5.2) return 5;
  if (years <= 6.2) return 6;
  return 7;
};

const generateSalary = (weeklyHours) => {
  const baseSalary = 25000;
  const hoursMultiplier = 500 + (weeklyHours - 20) * 50;
  const randomFactor = (Math.random() - 0.3) * 10000;
  let salary = baseSalary + weeklyHours * hoursMultiplier + randomFactor;
  salary = Math.max(20000, salary);
  salary = Math.round(salary / 500) * 500;
  return salary;
};

const generateRealisticWorkingHours = () => {
  const totalHoursTarget = faker.number.int({ min: 20, max: 40 });
  const details = [];
  const days = ["mon", "tue", "wed", "thu", "fri"];
  let actualTotalHours = 0;
  const dailyHours = Math.min(9, Math.max(4, Math.round(totalHoursTarget / 5)));
  const startHourBase = faker.number.int({ min: 8, max: 10 });

  for (const day of days) {
    const startHour = startHourBase + faker.number.int({ min: -1, max: 1 });
    const endHour = startHour + dailyHours;
    if (endHour > 19) continue;
    for (let h = startHour; h < endHour; h++) {
      details.push({ day: day, time: `${String(h).padStart(2, "0")}:00` });
      actualTotalHours += 1;
    }
  }
  actualTotalHours = Math.max(1, Math.min(48, actualTotalHours));
  return {
    weekly_hours: actualTotalHours,
    working_hours_details: details,
  };
};

async function seedDatabase() {
  console.log("Starting database seeding (V4 - UK Cities)...");
  try {
    // 1. Fetch skills and define common pool
    console.log("Fetching skill IDs...");
    const allSkills = await Skill.getAllSkills();
    if (!allSkills || allSkills.length === 0)
      throw new Error("No skills found.");
    const skillIds = allSkills.map((s) => s.id);
    console.log(`Found ${skillIds.length} skills.`);
    const commonSkillPoolSize = Math.floor(
      allSkills.length * COMMON_SKILL_POOL_SIZE_RATIO,
    );
    const commonSkills = allSkills.slice(0, commonSkillPoolSize);
    console.log(`Designated ${commonSkills.length} skills as 'common'.`);

    // 2. Create users
    console.log(`Creating ${NUM_USERS} mock users...`);
    const users = [];
    const userPromises = [];
    for (let i = 0; i < NUM_USERS; i++) {
      const firstName = faker.person.firstName();
      const lastName = faker.person.lastName();
      const email = faker.internet
        .email({
          firstName,
          lastName,
          provider: `testmail${i + Date.now()}.com`,
        })
        .toLowerCase();
      const username =
        faker.internet.username({ firstName, lastName }).toLowerCase() +
        `_${i}${Date.now() % 1000}`;

      userPromises.push(
        supabaseClient.auth.admin
          .createUser({
            email,
            password: MOCK_PASSWORD,
            email_confirm: true,
            user_metadata: { username },
          })
          .then(async ({ data: authData, error: authError }) => {
            if (authError || !authData?.user) {
              console.warn(`Auth user fail ${email}: ${authError?.message}`);
              return null;
            }
            const userId = authData.user.id;
            const { error: profileError } = await supabaseClient
              .from("users")
              .insert({ id: userId, email, username, is_verified: true });
            if (profileError) {
              console.warn(`Profile fail ${email}: ${profileError.message}`);
              await supabaseClient.auth.admin
                .deleteUser(userId)
                .catch((e) =>
                  console.error(`Cleanup fail ${userId}: ${e.message}`),
                );
              return null;
            }
            return { id: userId, email, username };
          })
          .catch((err) => {
            console.error(`Error in user promise ${i}:`, err);
            return null;
          }),
      );
    }
    const createdUsersRaw = await Promise.all(userPromises);
    const createdUsers = createdUsersRaw.filter((u) => u !== null);
    console.log(`Successfully created ${createdUsers.length} users.`);
    if (createdUsers.length === 0) throw new Error("No users created.");

    // 3. Create jobs
    console.log(`Creating approx ${TARGET_NUM_JOBS} mock jobs...`);
    const jobs = [];
    const jobPromises = [];
    let jobCount = 0;

    while (jobCount < TARGET_NUM_JOBS) {
      const user = faker.helpers.arrayElement(createdUsers);
      const hoursData = generateRealisticWorkingHours();
      const jobData = {
        user_id: user.id,
        author: user.username,
        title: faker.person.jobTitle(),
        description: faker.lorem.paragraphs(
          faker.number.int({ min: 2, max: 5 }),
        ),
        company_name: faker.company.name(),
        application_deadline: faker.date.future({ years: 0.4 }),
        start_date: faker.date.future({ years: 0.5 }),
        salary_amount: generateSalary(hoursData.weekly_hours),
        weekly_hours: hoursData.weekly_hours,
        working_hours_details: hoursData.working_hours_details,
        working_location: faker.helpers.arrayElement([
          "remote",
          "in_person",
          "hybrid",
        ]),
        in_person_location: null,
        status: faker.helpers.arrayElement([
          "open",
          "open",
          "open",
          "open",
          "closed",
        ]),
      };

      if (jobData.working_location !== "remote") {
        jobData.in_person_location = faker.location.city();
      }

      if (
        new Date(jobData.start_date) <= new Date(jobData.application_deadline)
      ) {
        jobData.start_date = new Date(
          new Date(jobData.application_deadline).getTime() +
            7 * 24 * 60 * 60 * 1000,
        );
      }

      const insertData = {
        ...jobData,
        working_hours_details: JSON.stringify(
          jobData.working_hours_details || [],
        ),
      };

      jobPromises.push(
        supabaseClient
          .from("jobs")
          .insert(insertData)
          .select("id")
          .single()
          .then(({ data, error }) => {
            if (error) {
              console.warn(`Job fail ${user.username}: ${error.message}`);
              return null;
            }
            return { ...jobData, id: data.id };
          })
          .catch((err) => {
            console.error("Error in job promise:", err);
            return null;
          }),
      );

      jobCount++;
      if (jobPromises.length >= 500) {
        const createdJobsBatch = (await Promise.all(jobPromises)).filter(
          (j) => j !== null,
        );
        jobs.push(...createdJobsBatch);
        console.log(
          `   ... processed batch, total jobs created so far: ${jobs.length}`,
        );
        jobPromises.length = 0; // Clear promises array for next batch
        await new Promise((resolve) => setTimeout(resolve, 500)); // Slight pause
      }
    }
    // Process any remaining promises
    if (jobPromises.length > 0) {
      const createdJobsBatch = (await Promise.all(jobPromises)).filter(
        (j) => j !== null,
      );
      jobs.push(...createdJobsBatch);
    }
    console.log(`Created ${jobs.length} jobs total.`);
    if (jobs.length === 0) throw new Error("No jobs created.");

    // 4. Create user skills
    console.log("Assigning skills to users...");
    const userSkillInserts = [];
    createdUsers.forEach((user) => {
      const skillsToAdd = getRandomSubset(allSkills, MAX_SKILLS_PER_USER);
      skillsToAdd.forEach((skill) => {
        userSkillInserts.push({
          user_id: user.id,
          skill_id: skill.id,
          years_experience: getRandomExperience(),
        });
      });
    });
    if (userSkillInserts.length > 0) {
      console.log(
        `Attempting to insert ${userSkillInserts.length} user skill records...`,
      );
      const { error } = await supabaseClient
        .from("user_skills")
        .insert(userSkillInserts);
      if (error) console.error("Error inserting user skills:", error.message);
      else console.log("Inserted user skills.");
    }

    // 5. Create job skills
    console.log("Assigning required skills to jobs (with bias)...");
    const jobSkillInserts = [];
    jobs.forEach((job) => {
      const skillsToAdd = getRandomSubset(
        allSkills,
        MAX_SKILLS_PER_JOB,
        commonSkills,
        COMMON_SKILL_RATIO_FOR_JOBS,
      );
      skillsToAdd.forEach((skill) => {
        jobSkillInserts.push({
          job_id: job.id,
          skill_id: skill.id,
          min_years_experience: getRandomExperience(true),
        });
      });
    });
    if (jobSkillInserts.length > 0) {
      console.log(
        `Attempting to insert ${jobSkillInserts.length} biased job skill records...`,
      );
      const { error } = await supabaseClient
        .from("job_skills")
        .insert(jobSkillInserts);
      if (error) console.error("Error inserting job skills:", error.message);
      else console.log("Inserted job skills.");
    }

    // 6. Create applications
    console.log("Creating mock applications...");
    const applicationInserts = [];
    const appliedKeys = new Set(); // Keep track of user/job pairs

    if (jobs.length > 0 && createdUsers.length > 1) {
      createdUsers.forEach((applicant) => {
        const numApps = Math.floor(Math.random() * (AVG_APPS_PER_USER * 1.5));
        const potentialJobs = getRandomSubset(jobs, numApps * 2);
        let appsMade = 0;

        for (const job of potentialJobs) {
          if (appsMade >= numApps) break;
          if (job.user_id === applicant.id) continue; // Can't apply to own job
          const appKey = `${applicant.id}-${job.id}`;
          if (appliedKeys.has(appKey)) continue; // Don't apply twice

          // Seed only as 'pending', 'rejected', or 'hired'.
          const appStatus = faker.helpers.arrayElement([
            "pending",
            "pending",
            "pending",
            "pending",
            "rejected",
            "hired",
          ]);

          applicationInserts.push({
            job_id: job.id,
            applicant_id: applicant.id,
            title: `Application for ${job.title.substring(0, 50)}...`,
            description: faker.lorem.sentence(),
            status: appStatus,
          });
          appliedKeys.add(appKey);
          appsMade++;
        }
      });

      if (applicationInserts.length > 0) {
        console.log(
          `Attempting to insert ${applicationInserts.length} application records...`,
        );
        const { error } = await supabaseClient
          .from("applications")
          .insert(applicationInserts);
        if (error)
          console.error("Error inserting applications:", error.message);
        else console.log("Inserted applications.");
      }
    }

    console.log("Database seeding completed successfully!");
  } catch (error) {
    console.error("FATAL Error during database seeding:", error);
    throw error; // Rethrow to stop the process if seeding fails
  }
}

module.exports = seedDatabase;

if (require.main === module) {
  seedDatabase().catch((err) => {
    console.error("Unhandled error running seedDb directly:", err);
    process.exit(1);
  });
}
