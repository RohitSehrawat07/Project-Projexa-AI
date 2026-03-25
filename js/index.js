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
        modal.style.display = 'flex';
        error.style.display = 'none';
        nameInput.focus();
    }
}

/**
 * Closes the modal
 */
function closeModal() {
    const modal = document.getElementById('modalOverlay');
    if (modal) {
        modal.style.display = 'none';
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
        error.style.display = 'block';
        nameInput.focus();
        return;
    }
    
    // Store name in localStorage
    localStorage.setItem('userName', name);
    
    // Redirect to dashboard
    window.location.href = 'dashboard.html';
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    const modal = document.getElementById('modalOverlay');
    const nameInput = document.getElementById('nameInput');
    const enterBtn = document.querySelector('.modal-btn');
    
    if (modal && nameInput && enterBtn) {
        // Close modal by default on page load
        modal.style.display = 'none';
        
        // Allow Enter key to submit
        nameInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                enterPlatform();
            }
        });
    }
});
