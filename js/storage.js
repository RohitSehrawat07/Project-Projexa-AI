// =============================================
//  EduRank — storage.js
//  THE BRAIN — All data lives here
//  Used by EVERY page
// =============================================

// Default students list (class data)
const DEFAULT_STUDENTS = [
  { name: "Aman",  elo: 1842, tier: "Gold",     accuracy: 94, streak: 12, speed: 8, activity: 90, quizzes: 15 },
  { name: "Rohit", elo: 1720, tier: "Gold",     accuracy: 75, streak: 5,  speed: 6, activity: 70, quizzes: 12 },
  { name: "Dev",   elo: 1650, tier: "Silver",   accuracy: 60, streak: 3,  speed: 5, activity: 55, quizzes: 10 },
  { name: "Vansh", elo: 1500, tier: "Silver",   accuracy: 45, streak: 1,  speed: 4, activity: 40, quizzes: 7  },
  { name: "Dhruv", elo: 1300, tier: "Bronze",   accuracy: 30, streak: 0,  speed: 3, activity: 20, quizzes: 4  },
];

// ── Initialize class data if not already in browser ──
function initStorage() {
  if (!localStorage.getItem("edurank_students")) {
    localStorage.setItem("edurank_students", JSON.stringify(DEFAULT_STUDENTS));
  }
}

// ── Get all students ──
function getAllStudents() {
  initStorage();
  return JSON.parse(localStorage.getItem("edurank_students"));
}

// ── Get one student by name ──
function getStudent(name) {
  const students = getAllStudents();
  return students.find(s => s.name.toLowerCase() === name.toLowerCase()) || null;
}

// ── Save current logged in student name ──
function setCurrentStudent(name) {
  localStorage.setItem("edurank_current", name);
}

// ── Get current logged in student ──
function getCurrentStudent() {
  const name = localStorage.getItem("edurank_current");
  if (!name) return null;
  return getStudent(name);
}

// ── Update a student's data ──
function updateStudent(name, newData) {
  const students = getAllStudents();
  const index = students.findIndex(s => s.name.toLowerCase() === name.toLowerCase());
  if (index !== -1) {
    students[index] = { ...students[index], ...newData };
    localStorage.setItem("edurank_students", JSON.stringify(students));
  }
}

// ── Add a brand new student ──
function addStudent(name) {
  const students = getAllStudents();
  const exists = students.find(s => s.name.toLowerCase() === name.toLowerCase());
  if (!exists) {
    students.push({
      name: name,
      elo: 1000,
      tier: "Bronze",
      accuracy: 0,
      streak: 0,
      speed: 5,
      activity: 0,
      quizzes: 0
    });
    localStorage.setItem("edurank_students", JSON.stringify(students));
  }
}

// ── Get ELO tier label from number ──
function getTier(elo) {
  if (elo >= 2000) return "Diamond";
  if (elo >= 1800) return "Gold";
  if (elo >= 1500) return "Silver";
  if (elo >= 1200) return "Bronze";
  return "Bronze";
}

// ── Get tier color ──
function getTierColor(tier) {
  const colors = {
    "Diamond": "#a855f7",
    "Gold":    "#81b64c",
    "Silver":  "#4a9fd4",
    "Bronze":  "#c4771b"
  };
  return colors[tier] || "#999693";
}

// ── Protect page — redirect to index if not logged in ──
function requireLogin() {
  const name = localStorage.getItem("edurank_current");
  if (!name) {
    window.location.href = "index.html";
  }
}

// ── Logout ──
function logout() {
  localStorage.removeItem("edurank_current");
  window.location.href = "index.html";
}

// ── Predict student performance ──
function predictStudent(s) {
  const score = (s.accuracy * 0.4)
    + (Math.min(s.streak * 3, 30) * 0.3)
    + (s.speed * 4 * 0.2)
    + (s.activity * 0.1);
  if (score >= 75) return { label:"Excellent", icon:"🌟", color:"#81b64c" };
  if (score >= 55) return { label:"Good",      icon:"✅", color:"#4a9fd4" };
  if (score >= 35) return { label:"Average",   icon:"⚠️",  color:"#f6f669" };
  return              { label:"At Risk",   icon:"🚨", color:"#e44d4d" };
}

// ── Save match result to history ──
function saveMatchResult(result) {
  let history = JSON.parse(
    localStorage.getItem('edurank_match_history') || '[]'
  );
  history.unshift(result);
  if (history.length > 20) history = history.slice(0, 20);
  localStorage.setItem(
    'edurank_match_history', JSON.stringify(history)
  );
}

// ── Get match history ──
function getMatchHistory() {
  return JSON.parse(
    localStorage.getItem('edurank_match_history') || '[]'
  );
}

// Init on load
initStorage();
