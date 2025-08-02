// MidWhereAh Profile Page JavaScript

// Initialize when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
    const logoutBtn = document.getElementById('logout-btn');
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Try AuthManager first, fallback to direct Firebase
            if (window.authManager && typeof window.authManager.logout === 'function') {
                window.authManager.logout();
            } else if (typeof firebase !== 'undefined' && firebase.auth) {
                firebase.auth().signOut().then(() => {
                    window.location.replace('/');
                }).catch((error) => {
                    console.error('Logout error:', error);
                });
            } else {
                console.error('No authentication method available');
            }
        });
    }
    
    // Initialize Firebase from the config
    if (typeof initFirebase === 'function') {
        initFirebase();
    }
    
    // Set up auth observer to load profile data
    setupProfileAuthObserver();
    
    // Set up profile edit functionality
    setupProfileEditing();
    
    // Set up quick edit buttons
    setupQuickEditButtons();
});



// Set up Firebase authentication state observer for profile page
function setupProfileAuthObserver() {
    firebase.auth().onAuthStateChanged(function(user) {
        if (user) {
            // User is signed in, load profile data
            loadUserProfile(user);
        } else {
            // User is signed out, redirect to login
            window.location.replace('/login');
        }
    });
}

// Load user profile data from Firestore
function loadUserProfile(user) {
    // Get user document from Firestore
    firebase.firestore().collection('users').doc(user.uid).get()
        .then((doc) => {
            if (doc.exists) {
                const userData = doc.data();
                
                // Update profile display
                updateProfileDisplay(user, userData);
                
                // Pre-fill edit form
                prefillEditForm(user, userData);
            } else {
                console.log("No user document found!");
                // Create a user document if it doesn't exist
                createUserDocument(user);
            }
        })
        .catch((error) => {
            console.error("Error getting user document:", error);
        });
}

// Create a user document if it doesn't exist
function createUserDocument(user) {
    const userData = {
        name: user.displayName || '',
        email: user.email,
        username: user.email.split('@')[0],
        defaultAddress: '',
        defaultTransportMode: 'driving',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    firebase.firestore().collection('users').doc(user.uid).set(userData)
        .then(() => {
            console.log("User document created");
            updateProfileDisplay(user, userData);
            prefillEditForm(user, userData);
        })
        .catch((error) => {
            console.error("Error creating user document:", error);
        });
}

// Update profile display with user data
function updateProfileDisplay(user, userData) {
    // Update profile header
    document.getElementById('profile-display-name').textContent = userData.name || user.displayName || 'User';
    
    // Update username
    const username = userData.username || user.email.split('@')[0];
    document.getElementById('profile-username').textContent = '@' + username;
    document.getElementById('profile-username-value').textContent = username;
    
    // Update email
    document.getElementById('profile-email').textContent = user.email;
    
    // Update address
    const addressElement = document.getElementById('profile-address');
    if (userData.defaultAddress) {
        addressElement.textContent = userData.defaultAddress;
    } else {
        addressElement.textContent = 'No default address set';
        addressElement.classList.add('text-muted');
    }
    
    // Update transport mode
    const transportElement = document.getElementById('profile-transport');
    if (userData.defaultTransportMode) {
        const transportModes = {
            'driving': 'Driving',
            'walking': 'Walking',
            'bicycling': 'Bicycling',
            'transit': 'Public Transit'
        };
        transportElement.textContent = transportModes[userData.defaultTransportMode] || 'Driving';
    } else {
        transportElement.textContent = 'Driving (default)';
    }
}

// Pre-fill edit form with user data
function prefillEditForm(user, userData) {
    document.getElementById('edit-display-name').value = userData.name || user.displayName || '';
    document.getElementById('edit-username').value = userData.username || user.email.split('@')[0];
    document.getElementById('edit-address').value = userData.defaultAddress || '';
    
    const transportSelect = document.getElementById('edit-transport');
    if (userData.defaultTransportMode) {
        transportSelect.value = userData.defaultTransportMode;
    } else {
        transportSelect.value = 'driving';
    }
}

// Set up profile editing functionality
function setupProfileEditing() {
    // Edit profile button
    const editProfileBtn = document.getElementById('edit-profile-btn');
    if (editProfileBtn) {
        editProfileBtn.addEventListener('click', function() {
            // Show edit profile modal
            const editProfileModal = new bootstrap.Modal(document.getElementById('editProfileModal'));
            editProfileModal.show();
        });
    }
    
    // Save profile changes button
    const saveProfileBtn = document.getElementById('save-profile-btn');
    if (saveProfileBtn) {
        saveProfileBtn.addEventListener('click', function() {
            saveProfileChanges();
        });
    }
}

// Save profile changes to Firestore
function saveProfileChanges() {
    const user = firebase.auth().currentUser;
    if (!user) return;
    
    // Get form values
    const displayName = document.getElementById('edit-display-name').value;
    const username = document.getElementById('edit-username').value;
    const defaultAddress = document.getElementById('edit-address').value;
    const defaultTransportMode = document.getElementById('edit-transport').value;
    
    // Update Firebase Auth profile
    user.updateProfile({
        displayName: displayName
    }).then(() => {
        console.log("Auth profile updated");
        
        // Update Firestore document
        return firebase.firestore().collection('users').doc(user.uid).update({
            name: displayName,
            username: username,
            defaultAddress: defaultAddress,
            defaultTransportMode: defaultTransportMode,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    }).then(() => {
        console.log("Firestore profile updated");
        
        // Close modal
        const editProfileModal = bootstrap.Modal.getInstance(document.getElementById('editProfileModal'));
        editProfileModal.hide();
        
        // Show success message
        showNotification("Profile updated successfully!", "success");
        
        // Reload profile data
        loadUserProfile(user);
    }).catch((error) => {
        console.error("Error updating profile:", error);
        showNotification("Error updating profile: " + error.message, "danger");
    });
}

// Set up quick edit buttons
function setupQuickEditButtons() {
    // Edit address button
    const editAddressBtn = document.getElementById('edit-address-btn');
    if (editAddressBtn) {
        editAddressBtn.addEventListener('click', function(e) {
            e.preventDefault();
            // Show edit profile modal and focus on address field
            const editProfileModal = new bootstrap.Modal(document.getElementById('editProfileModal'));
            editProfileModal.show();
            setTimeout(() => {
                document.getElementById('edit-address').focus();
            }, 500);
        });
    }
    
    // Edit transport mode button
    const editTransportBtn = document.getElementById('edit-transport-btn');
    if (editTransportBtn) {
        editTransportBtn.addEventListener('click', function(e) {
            e.preventDefault();
            // Show edit profile modal and focus on transport field
            const editProfileModal = new bootstrap.Modal(document.getElementById('editProfileModal'));
            editProfileModal.show();
            setTimeout(() => {
                document.getElementById('edit-transport').focus();
            }, 500);
        });
    }
}

// Show notification
function showNotification(message, type = 'info') {
    if (typeof window.showToast === 'function') {
        window.showToast(message, type);
    } else {
        alert(message);
    }
}
