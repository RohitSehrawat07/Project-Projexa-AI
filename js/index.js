// EduRank — index.js
// Handles modal interaction and platform entry

/**
 * Opens the name entry modal
 */
function openModal() {
    const modal = document.getElementById('modalOverlay');
    const nameInput = document.getElementById('nameInput');
    const error = document.getElementById('modalError');
    
    if (modal) {
        modal.classList.add('active');
        if (error) error.style.display = 'none';
        if (nameInput) nameInput.focus();
    }
}

/**
 * Closes the modal
 */
function closeModal() {
    const modal = document.getElementById('modalOverlay');
    if (modal) {
        modal.classList.remove('active');
    }
}

/**
 * Handles overlay click to close modal
 */
function handleOverlayClick(event) {
    // Only close if clicking directly on the overlay, not the modal
    if (event.target.id === 'modalOverlay') {
        closeModal();
    }
}

/**
 * Validates name and enters the platform
 */
function enterPlatform() {
    const nameInput = document.getElementById('nameInput');
    const error = document.getElementById('modalError');
    const name = nameInput.value.trim();
    
    if (!name || name.length === 0) {
        if (error) error.style.display = 'block';
        nameInput.focus();
        return;
    }
    
    // Check if student exists
    const students = getAllStudents();
    const exists = students.find(
      s => s.name.toLowerCase() === name.toLowerCase()
    );
    
    if (exists) {
      // Student exists — use their exact stored name
      setCurrentStudent(exists.name);
    } else {
      // New student — capitalize first letter
      const capitalizedName = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
      addStudent(capitalizedName);
      setCurrentStudent(capitalizedName);
    }
    
    // Redirect to dashboard
    window.location.href = 'dashboard.html';
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    const modal = document.getElementById('modalOverlay');
    const nameInput = document.getElementById('nameInput');
    
    if (modal && nameInput) {
        // Ensure modal starts hidden
        modal.classList.remove('active');
        
        // Allow Enter key to submit
        nameInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                enterPlatform();
            }
        });
        
        console.log('EduRank initialized successfully');
    }
});
