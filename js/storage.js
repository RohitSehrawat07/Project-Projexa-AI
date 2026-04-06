// =============================================
//  EduRank — storage.js
//  BACKEND API INTEGRATION
//  Uses Flask API + localStorage for session data
// =============================================

const API = "http://localhost:5000/api";

// ── Login or Create Student (unified) ──
async function loginStudent(name) {
  try {
    const res = await fetch(`${API}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name })
    });

    if (!res.ok) {
      const err = await res.json();
      return { _error: err.error || "Server error" };
    }

    const data = await res.json();

    // Save current user to localStorage
    localStorage.setItem("edurank_current", data.name);

    return data;
  } catch (err) {
    console.error("Login error:", err);
    return { _error: "Cannot connect to server" };
  }
}

// ── Get all students from backend ──
async function getAllStudents() {
  try {
    const res = await fetch(`${API}/students`);
    if (!res.ok) return [];
    return await res.json();
  } catch (error) {
    console.error("Get students error:", error);
    return [];
  }
}

// ── Get one student by name from backend ──
async function getStudent(name) {
  try {
    const res = await fetch(`${API}/students/${encodeURIComponent(name)}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.error ? null : data;
  } catch (error) {
    console.error("Get student error:", error);
    return null;
  }
}

// ── Save current logged in student name ──
function setCurrentStudent(name) {
  localStorage.setItem("edurank_current", name);
}

// ── Get current logged in student from localStorage ──
function getCurrentStudentName() {
  return localStorage.getItem("edurank_current");
}

// ── Get current logged in student data ──
async function getCurrentStudent() {
  const name = localStorage.getItem("edurank_current");
  if (!name) return null;
  return await getStudent(name);
}

// ── Update a student's data on backend ──
async function updateStudent(name, newData) {
  try {
    const res = await fetch(`${API}/students/${encodeURIComponent(name)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newData)
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.error ? null : data;
  } catch (error) {
    console.error("Update error:", error);
    return null;
  }
}

// ── Add a brand new student (alias for loginStudent) ──
async function addStudent(name) {
  return await loginStudent(name);
}

// ── Update ELO after quiz/match ──
async function updateELO(name, elo_change) {
  try {
    const res = await fetch(`${API}/elo/update`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, elo_change })
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.error ? null : data;
  } catch (error) {
    console.error("ELO update error:", error);
    return null;
  }
}

// ── Submit quiz result ──
async function submitQuiz(payload) {
  try {
    const res = await fetch(`${API}/quiz/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.error ? null : data;
  } catch (error) {
    console.error("Quiz submit error:", error);
    return null;
  }
}

// ── Get today's daily question ──
async function getDailyQuestion(name, date) {
  try {
    let url = `${API}/daily/question?name=${encodeURIComponent(name)}`;
    if (date) url += `&date=${encodeURIComponent(date)}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    return data.error ? null : data;
  } catch (error) {
    console.error("Get daily question error:", error);
    return null;
  }
}

// ── Get old (past) daily questions ──
async function getOldQuestions(name) {
  try {
    const res = await fetch(`${API}/daily/old?name=${encodeURIComponent(name)}`);
    if (!res.ok) return [];
    return await res.json();
  } catch (error) {
    console.error("Get old questions error:", error);
    return [];
  }
}

// ── Submit daily challenge answer ──
async function submitDaily(payload) {
  try {
    const res = await fetch(`${API}/daily/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const errData = await res.json();
      return { _error: errData.error || "Submission failed", ...errData };
    }
    return await res.json();
  } catch (error) {
    console.error("Daily submit error:", error);
    return { _error: "Cannot connect to server" };
  }
}

// ── Submit tournament practice result ──
async function submitTournamentPractice(payload) {
  try {
    const res = await fetch(`${API}/tournament/practice`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.error ? null : data;
  } catch (error) {
    console.error("Tournament practice error:", error);
    return null;
  }
}

// ── Get ELO tier label from number ──
function getTier(elo) {
  if (elo >= 1800) return "Diamond";
  if (elo >= 1600) return "Platinum";
  if (elo >= 1400) return "Gold";
  if (elo >= 1200) return "Silver";
  return "Bronze";
}

// ── Get tier color ──
function getTierColor(tier) {
  const colors = {
    "Diamond":  "#a855f7",
    "Platinum": "#06b6d4",
    "Gold":     "#81b64c",
    "Silver":   "#4a9fd4",
    "Bronze":   "#c4771b"
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
  if (score >= 75) return { label: "Excellent", icon: "🌟", color: "#81b64c" };
  if (score >= 55) return { label: "Good",      icon: "✅", color: "#4a9fd4" };
  if (score >= 35) return { label: "Average",   icon: "⚠️",  color: "#f6f669" };
  return                   { label: "At Risk",   icon: "🚨", color: "#e44d4d" };
}

// ── Save match result to history (localStorage cache) ──
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

// ── TOURNAMENT FUNCTIONS ──

// Get tournament data
async function getTournament() {
  try {
    const res = await fetch(`${API}/tournament`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.error ? null : data;
  } catch (error) {
    console.error("Get tournament error:", error);
    return null;
  }
}

// Join tournament
async function joinTournament(name) {
  try {
    const res = await fetch(`${API}/tournament/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name })
    });
    return await res.json();
  } catch (error) {
    console.error("Join tournament error:", error);
    return { error: error.message };
  }
}

// Start tournament
async function startTournament() {
  try {
    const res = await fetch(`${API}/tournament/start`, {
      method: "POST"
    });
    return await res.json();
  } catch (error) {
    console.error("Start tournament error:", error);
    return { error: error.message };
  }
}

// Submit tournament match score
async function submitTournamentMatch(match_id, player, score) {
  try {
    const res = await fetch(`${API}/tournament/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ match_id, player, score })
    });
    return await res.json();
  } catch (error) {
    console.error("Submit match error:", error);
    return { error: error.message };
  }
}

// Get my next match
async function getMyMatch(name) {
  try {
    const res = await fetch(`${API}/tournament/mymatch?name=${encodeURIComponent(name)}`);
    if (!res.ok) return null;
    const data = await res.json();
    // Empty object = no match
    if (!data || Object.keys(data).length === 0) return null;
    return data.error ? null : data;
  } catch (error) {
    console.error("Get my match error:", error);
    return null;
  }
}

// Get tournament standings
async function getTournamentStandings() {
  try {
    const res = await fetch(`${API}/tournament/standings`);
    if (!res.ok) return [];
    return await res.json();
  } catch (error) {
    console.error("Get standings error:", error);
    return [];
  }
}

// Reset tournament
async function resetTournament() {
  try {
    const res = await fetch(`${API}/tournament/reset`, {
      method: "POST"
    });
    return await res.json();
  } catch (error) {
    console.error("Reset tournament error:", error);
    return { error: error.message };
  }
}
