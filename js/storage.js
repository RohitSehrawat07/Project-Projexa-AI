// =============================================
//  EduRank — storage.js
//  BACKEND API INTEGRATION
//  Uses Flask API + localStorage for session data
// =============================================

const API_URL = "http://localhost:5000/api";

// ── Login or Create Student ──
async function loginStudent(name) {
  try {
    const response = await fetch(`${API_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name })
    });
    const result = await response.json();
    
    if (result.status === "success") {
      // Save current logged-in student to localStorage
      localStorage.setItem("edurank_current", result.data.name);
      return result.data;
    } else {
      console.error("Login failed:", result.message);
      return { _error: result.message };
    }
  } catch (error) {
    console.error("Login error:", error);
    return null;
  }
}

// ── Sign up new Student ──
async function signupStudent(name) {
  try {
    const response = await fetch(`${API_URL}/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name })
    });
    const result = await response.json();
    
    if (result.status === "success") {
      localStorage.setItem("edurank_current", result.data.name);
      return result.data;
    } else {
      console.error("Signup failed:", result.message);
      return { _error: result.message };
    }
  } catch (error) {
    console.error("Signup error:", error);
    return null;
  }
}

// ── Get all students from backend ──
async function getAllStudents() {
  try {
    const response = await fetch(`${API_URL}/students`);
    const result = await response.json();
    
    if (result.status === "success") {
      return result.data;
    } else {
      console.error("Failed to get students:", result.message);
      return [];
    }
  } catch (error) {
    console.error("Get students error:", error);
    return [];
  }
}

// ── Get one student by name from backend ──
async function getStudent(name) {
  try {
    const response = await fetch(`${API_URL}/students/${encodeURIComponent(name)}`);
    const result = await response.json();
    
    if (result.status === "success") {
      return result.data;
    } else {
      return null;
    }
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
    const response = await fetch(`${API_URL}/students/${encodeURIComponent(name)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newData)
    });
    const result = await response.json();
    
    if (result.status === "success") {
      return result.data;
    } else {
      console.error("Update failed:", result.message);
      return null;
    }
  } catch (error) {
    console.error("Update error:", error);
    return null;
  }
}

// ── Add a brand new student ──
async function addStudent(name) {
  return await signupStudent(name);
}

// ── Update ELO after quiz/match ──
async function updateELO(name, elo_change) {
  try {
    const response = await fetch(`${API_URL}/elo/update`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name, elo_change: elo_change })
    });
    const result = await response.json();
    
    if (result.status === "success") {
      return result.data;
    } else {
      console.error("ELO update failed:", result.message);
      return null;
    }
  } catch (error) {
    console.error("ELO update error:", error);
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
    "Diamond": "#a855f7",
    "Platinum": "#06b6d4",
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

// ── TOURNAMENT FUNCTIONS ──

// Get tournament data
async function getTournament() {
  try {
    const response = await fetch(`${API_URL}/tournament`);
    const result = await response.json();
    
    if (result.status === "success") {
      return result.data;
    } else {
      return null;
    }
  } catch (error) {
    console.error("Get tournament error:", error);
    return null;
  }
}

// Join tournament
async function joinTournament(name) {
  try {
    const response = await fetch(`${API_URL}/tournament/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name })
    });
    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Join tournament error:", error);
    return { status: "error", message: error.message };
  }
}

// Start tournament
async function startTournament() {
  try {
    const response = await fetch(`${API_URL}/tournament/start`, {
      method: "POST"
    });
    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Start tournament error:", error);
    return { status: "error", message: error.message };
  }
}

// Submit tournament run score
async function playTournament(name, score) {
  try {
    const response = await fetch(`${API_URL}/tournament/play`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name,
        score: score
      })
    });
    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Play tournament error:", error);
    return { status: "error", message: error.message };
  }
}

// Reset tournament
async function resetTournament() {
  try {
    const response = await fetch(`${API_URL}/tournament/reset`, {
      method: "POST"
    });
    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Reset tournament error:", error);
    return { status: "error", message: error.message };
  }
}
