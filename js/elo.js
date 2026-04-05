// =============================================
//  EduRank — elo.js
//  ELO Calculation Engine
//  Called after every quiz or daily challenge
// =============================================

// K factor — how fast ELO changes
// High K = fast changes (for beginners)
// Low K = slow, stable changes (for advanced)
function getKFactor(elo) {
  if (elo < 1200) return 40;   // Bronze — fast learning
  if (elo < 1600) return 30;   // Silver — medium
  if (elo < 2000) return 20;   // Gold — slower
  return 15;                    // Diamond — very stable
}

// ── Core ELO formula ──
// myElo     = current ELO of student
// oppElo    = difficulty rating of quiz (or opponent ELO)
// result    = 1 if won/passed, 0 if lost/failed, 0.5 if draw
function calculateELO(myElo, oppElo, result) {
  const K = getKFactor(myElo);
  const expected = 1 / (1 + Math.pow(10, (oppElo - myElo) / 400));
  const newElo = Math.round(myElo + K * (result - expected));
  return Math.max(newElo, 100); // never go below 100
}

// ── Quiz difficulty to ELO mapping ──
function getDifficultyElo(difficulty) {
  const map = { "easy": 1000, "medium": 1400, "hard": 1800 };
  return map[difficulty] || 1200;
}

// ── Update ELO after a quiz ──
// studentName = string
// score       = 0 to 100 (percentage)
// difficulty  = "easy" | "medium" | "hard"
async function updateELOAfterQuiz(studentName, score, difficulty) {
  const student = await getStudent(studentName);
  if (!student) return;

  const oppElo = getDifficultyElo(difficulty);
  const result = score >= 60 ? 1 : (score >= 40 ? 0.5 : 0); // win / draw / loss

  const newElo = calculateELO(student.elo, oppElo, result);
  const newTier = getTier(newElo);

  await updateStudent(studentName, { elo: newElo, tier: newTier });

  return { oldElo: student.elo, newElo, change: newElo - student.elo };
}

// ── ELO boost for daily challenge ──
async function dailyChallengeBonus(studentName, correct) {
  const student = await getStudent(studentName);
  if (!student) return;

  const bonus = correct ? 15 : -5;
  const newElo = Math.max(student.elo + bonus, 100);
  const newTier = getTier(newElo);

  await updateStudent(studentName, { elo: newElo, tier: newTier });
  return { oldElo: student.elo, newElo, change: bonus };
}
