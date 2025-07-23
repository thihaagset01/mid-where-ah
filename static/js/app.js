// MidWhereAh Main JavaScript File

// Global variables
let currentUser = null;

// Initialize the application when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize Firebase from the config
    initFirebase();
    
    // Set up authentication state observer
    setupAuthObserver();
    
    // Set up logout functionality
    setupLogout();
    
    // Set up join group form on index page
    setupJoinGroupForm();
});

// Initialize Firebase with the configuration - This is now handled in firebase-config.js
// Keeping this function for backward compatibility
function initializeFirebase() {
    console.log('Using initFirebase() from firebase-config.js instead');
    // Don't call initFirebase() here as it would cause infinite recursion
}

// Set up Firebase authentication state observer
function setupAuthObserver() {
    console.log('Setting up auth observer and checking for redirect result');
    
    // First check for any redirect result
    // This must be done before any other auth operations
    firebase.auth().getRedirectResult().then((result) => {
        if (result.user) {
            console.log('Google sign-in successful via redirect:', result.user.email);
            // Check if user is new
            const isNewUser = result.additionalUserInfo && result.additionalUserInfo.isNewUser;
            
            if (isNewUser) {
                // Create user document in Firestore
                return firebase.firestore().collection('users').doc(result.user.uid).set({
                    name: result.user.displayName,
                    email: result.user.email,
                    photoURL: result.user.photoURL,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                }).then(() => {
                    showNotification('Account created successfully!', 'success');
                    // Force redirect to app (mobile interface)
                    console.log('Redirecting new user to app');
                    setTimeout(() => {
                        window.location.replace('/app');
                    }, 500); // Small delay to ensure notification is shown
                });
            } else {
                showNotification('Login successful!', 'success');
                // Force redirect to dashboard
                console.log('Redirecting existing user to dashboard');
                setTimeout(() => {
                    // Redirect to app instead of dashboard for better user experience
                    window.location.replace('/app');
                }, 500); // Small delay to ensure notification is shown
            }
        } else {
            console.log('No redirect result or user already handled');
        }
    }).catch((error) => {
        console.error('Google redirect result error:', error);
        if (error.code && error.message) {
            showNotification('Authentication error: ' + error.message, 'danger');
        }
    });

    // Define protected paths globally for consistency
    const protectedPaths = [
        '/dashboard',
        '/map',
        '/app',
        '/mobile_interface',
        '/venues',
        '/profile',
        '/groups',
        '/group/',
        '/swipe/'
    ];

    // Then set up the auth state observer
    firebase.auth().onAuthStateChanged(function(user) {
        const currentPath = window.location.pathname;
        console.log('Auth state changed. Path:', currentPath, 'User:', user ? user.email : 'signed out');
        
        if (user) {
            // User is signed in
            currentUser = user;
            
            // Update UI for authenticated user
            updateUIForAuthenticatedUser(user);
            
            // Handle page-specific authenticated user actions
            handleAuthenticatedUserActions(user);
            
            // If we're on the login page or root page, redirect to app (mobile interface)
            if (currentPath === '/login' || currentPath === '/') {
                console.log('User is authenticated on login/home page, redirecting to app');
                window.location.replace('/app');
            }
        } else {
            // User is signed out
            currentUser = null;
            
            // Update UI for unauthenticated user
            updateUIForUnauthenticatedUser();
            
            // Check if current path is protected
            if (protectedPaths.some(path => currentPath.startsWith(path))) {
                console.log('Unauthenticated user on protected page:', currentPath);
                console.log('Redirecting to login page');
                window.location.replace('/login');
            }
        }
    });
}

// Update UI elements for authenticated user
function updateUIForAuthenticatedUser(user) {
    // Show logout and dashboard links, hide login link
    document.getElementById('login-nav')?.style.setProperty('display', 'none');
    document.getElementById('logout-nav')?.style.setProperty('display', 'block');
    document.getElementById('dashboard-nav')?.style.setProperty('display', 'block');
    
    // Update user name if element exists
    const userNameElement = document.getElementById('user-name');
    if (userNameElement) {
        userNameElement.textContent = user.displayName || user.email.split('@')[0];
    }
}

// Update UI elements for unauthenticated user
function updateUIForUnauthenticatedUser() {
    // Show login link, hide logout and dashboard links
    document.getElementById('login-nav')?.style.setProperty('display', 'block');
    document.getElementById('logout-nav')?.style.setProperty('display', 'none');
    document.getElementById('dashboard-nav')?.style.setProperty('display', 'none');
}

// Set up logout functionality
function setupLogout() {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            firebase.auth().signOut().then(function() {
                // Sign-out successful
                showNotification('You have been logged out successfully', 'success');
                window.location.href = '/login';
            }).catch(function(error) {
                // An error happened
                console.error('Logout error:', error);
                showNotification('Error logging out. Please try again.', 'danger');
            });
        });
    }
}

// Google Sign-in
function signInWithGoogle() {
    // Log the current Firebase config (safely)
    const safeConfig = {...window.firebaseConfig};
    if (safeConfig.apiKey) {
        safeConfig.apiKey = safeConfig.apiKey.substring(0, 5) + '...';
    }
    console.log('Firebase config before Google sign-in:', safeConfig);
    
    try {
        // Only use redirect method to avoid popup issues
        const provider = new firebase.auth.GoogleAuthProvider();
        
        // Directly use redirect without checking for previous redirects
        // This prevents the dual-window issue
        firebase.auth().signInWithRedirect(provider)
            .catch((error) => {
                console.error("Google sign-in redirect error:", error);
                console.error("Error code:", error.code);
                console.error("Error message:", error.message);
                
                if (error.code === 'auth/api-key-not-valid') {
                    showToast("Invalid API key. Please check your Firebase configuration.", "error");
                } else {
                    showToast("Error signing in with Google. Please try again.", "error");
                }
            });
    } catch (e) {
        console.error("Exception during Google sign-in setup:", e);
        showToast("Error initializing Google sign-in. Please try again later.", "error");
    }
}

// Handle page-specific actions for authenticated users
function handleAuthenticatedUserActions(user) {
    // Get current page path
    const path = window.location.pathname;
    
    // Login page
    if (path === '/login') {
        // Redirect to dashboard if already logged in
        window.location.href = '/dashboard';
        return;
    }
    
    // Dashboard page
    if (path === '/dashboard') {
        loadUserGroups(user.uid);
        setupCreateGroupForm(user);
    }
    
    // Group page
    if (path.startsWith('/group/')) {
        const groupId = path.split('/').pop();
        loadGroupDetails(groupId);
        setupLocationForm(groupId, user.uid);
    }
    
    // Venues page
    if (path.startsWith('/venues/')) {
        const groupId = path.split('/').pop();
        loadGroupDetails(groupId);
        loadVenueRecommendations(groupId);
    }
    
    // Swipe page
    if (path.startsWith('/swipe/')) {
        const groupId = path.split('/').pop();
        loadGroupDetails(groupId);
        loadVenuesForVoting(groupId);
        setupChatFunctionality(groupId, user);
    }
}

// Load venue recommendations for a group
function loadVenueRecommendations(groupId) {
    if (!groupId) return;
    
    // Show loading state
    const venuesContainer = document.getElementById('venues-container');
    if (venuesContainer) {
        venuesContainer.innerHTML = `
            <div class="text-center p-5">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-3">Finding the perfect meetup spots...</p>
            </div>
        `;
    }
    
    // Get group data from Firestore
    db.collection('groups').doc(groupId).get()
        .then(doc => {
            if (!doc.exists) {
                showNotification('Group not found', 'danger');
                return;
            }
            
            const groupData = doc.data();
            const members = groupData.members || {};
            
            // Extract member locations
            const memberLocations = [];
            Object.keys(members).forEach(userId => {
                const member = members[userId];
                if (member.location && member.location.lat && member.location.lng) {
                    memberLocations.push({
                        lat: member.location.lat,
                        lng: member.location.lng,
                        name: member.name || 'Unknown'
                    });
                }
            });
            
            // Check if we have enough locations
            if (memberLocations.length < 1) {
                if (venuesContainer) {
                    venuesContainer.innerHTML = `
                        <div class="alert alert-info" role="alert">
                            <h4 class="alert-heading">No locations yet!</h4>
                            <p>We need at least one location to recommend venues. Ask group members to add their locations.</p>
                            <hr>
                            <p class="mb-0">Once locations are added, we'll find the perfect meetup spots!</p>
                        </div>
                    `;
                }
                return;
            }
            
            // Calculate midpoint
            const calculatedMidpoint = calculateMidpoint(memberLocations);
            midpoint = calculatedMidpoint; // Set global midpoint variable
            
            // Add midpoint marker to map
            if (map) {
                // Clear existing markers
                markers.forEach(marker => marker.setMap(null));
                markers = [];
                
                // Add midpoint marker
                const midpointMarker = new google.maps.Marker({
                    position: midpoint,
                    map: map,
                    title: 'Midpoint',
                    icon: {
                        url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png'
                    },
                    animation: google.maps.Animation.DROP,
                    zIndex: 1000
                });
                markers.push(midpointMarker);
                
                // Add member markers
                memberLocations.forEach(location => {
                    const marker = new google.maps.Marker({
                        position: { lat: location.lat, lng: location.lng },
                        map: map,
                        title: location.name,
                        icon: {
                            url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png'
                        }
                    });
                    markers.push(marker);
                });
                
                // Center map on midpoint
                map.setCenter(midpoint);
                map.setZoom(14);
            }
            
            // Check if venues are already stored in Firestore
            return db.collection('groups').doc(groupId).collection('venues').get()
                .then(snapshot => {
                    if (!snapshot.empty) {
                        // Venues already exist, display them
                        const venues = [];
                        snapshot.forEach(doc => {
                            venues.push({
                                id: doc.id,
                                ...doc.data()
                            });
                        });
                        displayVenueCards(venues, groupId);
                        return { existingVenues: true };
                    } else {
                        // No venues yet, search for new ones
                        return { existingVenues: false };
                    }
                });
        })
        .then(result => {
            if (result && !result.existingVenues) {
                // Search for venues near midpoint
                searchNearbyVenues(midpoint, 1500, 'restaurant', (venues) => {
                    if (venues.length === 0) {
                        // No venues found, try with a larger radius
                        searchNearbyVenues(midpoint, 3000, 'restaurant', (venuesWiderRadius) => {
                            if (venuesWiderRadius.length === 0) {
                                // Still no venues, show error
                                if (venuesContainer) {
                                    venuesContainer.innerHTML = `
                                        <div class="alert alert-warning" role="alert">
                                            <h4 class="alert-heading">No venues found</h4>
                                            <p>We couldn't find any suitable venues near the midpoint. Try adjusting your locations or preferences.</p>
                                        </div>
                                    `;
                                }
                            } else {
                                // Save and display venues from wider radius
                                saveVenuesToFirestore(venuesWiderRadius, groupId);
                                displayVenueCards(venuesWiderRadius, groupId);
                                displayVenuesOnMap(venuesWiderRadius);
                            }
                        });
                    } else {
                        // Save and display venues
                        saveVenuesToFirestore(venues, groupId);
                        displayVenueCards(venues, groupId);
                        displayVenuesOnMap(venues);
                    }
                });
            }
        })
        .catch(error => {
            console.error('Error loading venue recommendations:', error);
            showNotification('Error loading venue recommendations', 'danger');
        });
}

// Save venues to Firestore
function saveVenuesToFirestore(venues, groupId) {
    if (!venues || venues.length === 0 || !groupId) return;
    
    const batch = db.batch();
    
    venues.forEach(venue => {
        // Create a venue document reference
        const venueRef = db.collection('groups').doc(groupId).collection('venues').doc();
        
        // Prepare venue data
        const venueData = {
            placeId: venue.place_id,
            name: venue.name,
            address: venue.vicinity || venue.formatted_address || '',
            location: {
                lat: venue.geometry.location.lat(),
                lng: venue.geometry.location.lng()
            },
            rating: venue.rating || 0,
            userRatingsTotal: venue.user_ratings_total || 0,
            priceLevel: venue.price_level || 0,
            types: venue.types || [],
            photoUrl: venue.photos && venue.photos.length > 0 ? 
                venue.photos[0].getUrl({maxWidth: 500, maxHeight: 300}) : '',
            votes: {},
            voteCount: {
                likes: 0,
                dislikes: 0,
                total: 0
            },
            addedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        // Add to batch
        batch.set(venueRef, venueData);
    });
    
    // Commit the batch
    return batch.commit()
        .then(() => {
            console.log(`${venues.length} venues saved to Firestore`);
        })
        .catch(error => {
            console.error('Error saving venues to Firestore:', error);
        });
}

// Display venue cards in the UI
function displayVenueCards(venues, groupId) {
    const venuesContainer = document.getElementById('venues-container');
    if (!venuesContainer) return;
    
    if (!venues || venues.length === 0) {
        venuesContainer.innerHTML = `
            <div class="alert alert-info" role="alert">
                <h4 class="alert-heading">No venues found</h4>
                <p>We couldn't find any suitable venues. Try adjusting your search criteria.</p>
            </div>
        `;
        return;
    }
    
    // Sort venues by rating (highest first)
    venues.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    
    // Create HTML for venue cards
    let html = `
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h2>Recommended Venues</h2>
            <button id="start-voting-btn" class="btn btn-primary">
                <i class="fas fa-thumbs-up me-2"></i>Start Voting
            </button>
        </div>
        <div class="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4">
    `;
    
    venues.forEach(venue => {
        // Get photo URL
        let photoUrl = venue.photoUrl || '';
        if (!photoUrl && venue.photos && venue.photos.length > 0) {
            photoUrl = venue.photos[0].getUrl({maxWidth: 500, maxHeight: 300});
        }
        
        // Format price level
        let priceLevel = '';
        for (let i = 0; i < (venue.priceLevel || 0); i++) {
            priceLevel += '$';
        }
        
        // Get venue types for tags
        const venueTags = [];
        if (venue.types) {
            const displayTypes = ['restaurant', 'cafe', 'bar', 'food', 'bakery', 'meal_takeaway'];
            venue.types.forEach(type => {
                if (displayTypes.includes(type)) {
                    venueTags.push(type.replace('_', ' '));
                }
            });
        }
        
        // Create card HTML
        html += `
            <div class="col">
                <div class="venue-card card h-100 shadow-sm" data-venue-id="${venue.id || venue.place_id}">
                    <div class="venue-image position-relative">
                        ${photoUrl ? `<img src="${photoUrl}" class="card-img-top" alt="${venue.name}">` : 
                            `<div class="card-img-top bg-light d-flex align-items-center justify-content-center" style="height: 200px;">
                                <i class="fas fa-utensils fa-3x text-secondary"></i>
                            </div>`
                        }
                        <div class="venue-tags position-absolute bottom-0 start-0 p-2">
                            ${priceLevel ? `<span class="tag tag-price badge bg-dark me-1">${priceLevel}</span>` : ''}
                            ${venueTags.slice(0, 2).map(tag => `<span class="tag tag-cuisine badge bg-secondary me-1">${tag}</span>`).join('')}
                        </div>
                    </div>
                    <div class="card-body">
                        <h5 class="card-title">${venue.name}</h5>
                        <p class="card-text small text-muted">${venue.address}</p>
                        <div class="venue-meta d-flex justify-content-between align-items-center">
                            <div class="rating">
                                <span class="text-warning">★</span> ${venue.rating || 'N/A'}
                                <small class="text-muted">(${venue.userRatingsTotal || venue.user_ratings_total || 0})</small>
                            </div>
                            <div class="distance text-muted small">
                                <i class="fas fa-map-marker-alt me-1"></i>Near midpoint
                            </div>
                        </div>
                    </div>
                    <div class="card-footer bg-white border-top-0">
                        <div class="d-grid">
                            <button class="btn btn-outline-primary btn-add-voting" data-venue-id="${venue.id || venue.place_id}">
                                <i class="fas fa-plus-circle me-2"></i>Add to Voting
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    venuesContainer.innerHTML = html;
    
    // Add event listeners to buttons
    document.querySelectorAll('.btn-add-voting').forEach(button => {
        button.addEventListener('click', function() {
            const venueId = this.getAttribute('data-venue-id');
            addVenueToVoting(venueId, groupId);
        });
    });
    
    // Start voting button
    const startVotingBtn = document.getElementById('start-voting-btn');
    if (startVotingBtn) {
        startVotingBtn.addEventListener('click', function() {
            window.location.href = `/swipe/${groupId}`;
        });
    }
}

// Add a venue to the voting list
function addVenueToVoting(venueId, groupId) {
    if (!venueId || !groupId) {
        console.error('Missing venue ID or group ID');
        return;
    }
    
    // Get button and update its state
    const button = document.querySelector(`.venue-card[data-venue-id="${venueId}"] .btn-add-voting`);
    if (button) {
        // Disable button and show loading state
        // Show loading state
        const originalText = button.innerHTML;
        button.disabled = true;
        button.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Adding...';
        
        // Update venue in Firestore to mark it for voting
        db.collection('groups').doc(groupId).collection('venues').doc(venueId).update({
            addedToVoting: true,
            addedToVotingAt: firebase.firestore.FieldValue.serverTimestamp()
        })
        .then(() => {
            // Update button to show success
            button.classList.remove('btn-outline-primary');
            button.classList.add('btn-success');
            button.innerHTML = '<i class="fas fa-check me-2"></i>Added to Voting';
            showNotification('Venue added to voting list', 'success');
        })
        .catch(error => {
            console.error('Error adding venue to voting:', error);
            button.disabled = false;
            button.innerHTML = originalText;
        });
    }
}




// Redirect if on a protected page and not authenticated
function redirectIfProtectedPage() {
    console.log('redirectIfProtectedPage called - this function is now integrated into auth observer');
    // Get current page path
    const path = window.location.pathname;
    
    // List of paths that require authentication - should match the ones in setupAuthObserver
    const protectedPaths = [
        '/dashboard',
        '/map',
        '/app',
        '/mobile_interface',
        '/venues',
        '/profile',
        '/groups',
        '/group/',
        '/swipe/'
    ];
    
    // Check if current path is protected
    const isProtected = protectedPaths.some(protectedPath => path.startsWith(protectedPath));
    
    if (isProtected && !firebase.auth().currentUser) {
        console.log('User is not authenticated on protected page, redirecting to login');
        // Redirect to login page with force replace to prevent back button issues
        window.location.replace('/login');
    }
}

// Auth state observer
function setupAuthObserver() {
    firebase.auth().onAuthStateChanged(user => {
        if (user) {
            // User is signed in
            const path = window.location.pathname;
            const protectedPaths = [
                '/dashboard',
                '/map',
                '/app',
                '/mobile_interface',
                '/venues',
                '/profile',
                '/groups',
                '/group/',
                '/swipe/'
            ];
            const isProtected = protectedPaths.some(protectedPath => path.startsWith(protectedPath));
            if (isProtected) {
                // User is on a protected page, check if they were redirected from a login attempt
                const redirectResult = firebase.auth().getRedirectResult();
                if (redirectResult) {
                    // User was redirected from a login attempt, handle the result
                    handleRedirectResult(redirectResult);
                }
            }
        }
    });
    // Auth observer setup complete
}

// Placeholder functions for page-specific functionality
// These will be implemented as the project progresses

function loadUserGroups(userId) {
    console.log('Loading groups for user:', userId);
    
    const groupsContainer = document.getElementById('groups-container');
    const loadingElement = document.getElementById('groups-loading');
    const emptyElement = document.getElementById('groups-empty');
    
    if (!groupsContainer || !loadingElement || !emptyElement) return;
    
    // Show loading state
    groupsContainer.innerHTML = '';
    loadingElement.style.display = 'block';
    emptyElement.style.display = 'none';
    
    // Query Firestore for groups where the user is a member
    const db = firebase.firestore();
    db.collection('groups')
        .where(`members.${userId}`, '!=', null)
        .orderBy(`members.${userId}.joinedAt`, 'desc')
        .get()
        .then((querySnapshot) => {
            // Hide loading state
            loadingElement.style.display = 'none';
            
            if (querySnapshot.empty) {
                // Show empty state if no groups
                emptyElement.style.display = 'block';
                return;
            }
            
            // Process each group
            querySnapshot.forEach((doc) => {
                const group = doc.data();
                group.id = doc.id;
                
                // Create group card
                const groupCard = createGroupCard(group);
                groupsContainer.appendChild(groupCard);
            });
        })
        .catch((error) => {
            console.error('Error loading groups:', error);
            loadingElement.style.display = 'none';
            showNotification('Error loading groups: ' + error.message, 'danger');
        });
}

// Create a group card element
function createGroupCard(group) {
    const card = document.createElement('div');
    card.className = 'col-md-6 col-lg-4 mb-4';
    
    // Count members
    const memberCount = Object.keys(group.members).length;
    
    // Format date
    const createdDate = group.createdAt ? new Date(group.createdAt.seconds * 1000).toLocaleDateString() : 'Unknown date';
    
    card.innerHTML = `
        <div class="card h-100 shadow-sm">
            <div class="card-body">
                <h5 class="card-title">${escapeHtml(group.name)}</h5>
                <p class="card-text text-muted small">${escapeHtml(group.description || 'No description')}</p>
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <span class="badge bg-primary rounded-pill">${memberCount} member${memberCount !== 1 ? 's' : ''}</span>
                    <small class="text-muted">Created: ${createdDate}</small>
                </div>
                <div class="d-grid gap-2">
                    <a href="/group/${group.id}" class="btn btn-outline-primary">View Group</a>
                </div>
            </div>
        </div>
    `;
    
    return card;
}

// Helper function to escape HTML to prevent XSS
function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function setupJoinGroupForm() {
    const form = document.getElementById('join-group-form');
    if (!form) return;
    
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Get form values
        const inviteCode = document.getElementById('group-code').value.trim().toUpperCase();
        const userName = document.getElementById('your-name').value.trim();
        
        if (!inviteCode || !userName) {
            showNotification('Please enter both group code and your name', 'warning');
            return;
        }
        
        // Show loading state
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Joining...';
        
        // Check if user is logged in
        const user = firebase.auth().currentUser;
        
        if (!user) {
            // Create anonymous account if user is not logged in
            firebase.auth().signInAnonymously()
                .then((userCredential) => {
                    // Set display name for the anonymous user
                    return userCredential.user.updateProfile({
                        displayName: userName
                    }).then(() => {
                        // Now join the group with the anonymous user
                        joinGroupWithCode(inviteCode, userCredential.user, submitBtn, originalBtnText);
                    });
                })
                .catch((error) => {
                    console.error('Error creating anonymous account:', error);
                    showNotification('Error creating temporary account: ' + error.message, 'danger');
                    
                    // Reset button
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = originalBtnText;
                });
        } else {
            // User is already logged in, join the group directly
            joinGroupWithCode(inviteCode, user, submitBtn, originalBtnText);
        }
    });
}

// Join a group using invite code
function joinGroupWithCode(inviteCode, user, submitBtn, originalBtnText) {
    // Query Firestore for the group with this invite code
    firebase.firestore().collection('groups')
        .where('inviteCode', '==', inviteCode)
        .get()
        .then((querySnapshot) => {
            if (querySnapshot.empty) {
                showNotification('Invalid group code. Please check and try again.', 'warning');
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnText;
                return;
            }
            
            // Get the first (and should be only) group with this code
            const groupDoc = querySnapshot.docs[0];
            const groupData = groupDoc.data();
            const groupId = groupDoc.id;
            
            // Check if user is already a member
            if (groupData.members && groupData.members[user.uid]) {
                showNotification('You are already a member of this group!', 'info');
                
                // Redirect to the group page
                setTimeout(() => {
                    window.location.href = `/group/${groupId}`;
                }, 1500);
                return;
            }
            
            // Add user to the group's members
            const memberData = {
                name: user.displayName || user.email || 'Anonymous User',
                email: user.email || 'anonymous@user.com',
                photoURL: user.photoURL || '',
                role: 'member',
                joinedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            // Update the group document with the new member
            return firebase.firestore().collection('groups').doc(groupId).update({
                [`members.${user.uid}`]: memberData
            }).then(() => {
                showNotification(`Successfully joined group: ${groupData.name}!`, 'success');
                
                // Redirect to the group page
                setTimeout(() => {
                    window.location.href = `/group/${groupId}`;
                }, 1500);
            });
        })
        .catch((error) => {
            console.error('Error joining group:', error);
            showNotification('Error joining group: ' + error.message, 'danger');
            
            // Reset button
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText;
        });
}

function setupCreateGroupForm(user) {
    const form = document.getElementById('create-group-form');
    if (!form) return;
    
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Get form values
        const groupName = document.getElementById('group-name').value.trim();
        const groupDescription = document.getElementById('group-description').value.trim();
        
        if (!groupName) {
            showNotification('Please enter a group name', 'warning');
            return;
        }
        
        // Show loading state
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Creating...';
        
        // Generate a random 6-character invite code
        const inviteCode = generateInviteCode();
        
        // Create group document in Firestore
        const db = firebase.firestore();
        const groupData = {
            name: groupName,
            description: groupDescription,
            admin: user.uid,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            members: {
                [user.uid]: {
                    name: user.displayName || user.email.split('@')[0],
                    email: user.email,
                    photoURL: user.photoURL || null,
                    joinedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    role: 'admin'
                }
            },
            inviteCode: inviteCode,
            status: 'planning'
        };
        
        db.collection('groups').add(groupData)
            .then((docRef) => {
                console.log('Group created with ID:', docRef.id);
                showNotification('Group created successfully!', 'success');
                
                // Reset form
                form.reset();
                
                // Close modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('create-group-modal'));
                modal.hide();
                
                // Refresh groups list
                loadUserGroups(user.uid);
                
                // Reset button
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnText;
            })
            .catch((error) => {
                console.error('Error creating group:', error);
                showNotification('Error creating group: ' + error.message, 'danger');
                
                // Reset button
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnText;
            });
    });
}

// Generate a random 6-character invite code
function generateInviteCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

function loadGroupDetails(groupId) {
    console.log('Loading details for group:', groupId);
    
    const groupNameElement = document.getElementById('group-name-display');
    const groupDescriptionElement = document.getElementById('group-description');
    const groupMembersElement = document.getElementById('group-members');
    const groupStatusElement = document.getElementById('group-status');
    const inviteCodeElement = document.getElementById('invite-code');
    const loadingElement = document.getElementById('group-loading');
    
    // Show loading state if element exists
    if (loadingElement) {
        loadingElement.style.display = 'block';
    }
    
    // Hide content elements while loading
    [groupNameElement, groupDescriptionElement, groupMembersElement, groupStatusElement].forEach(el => {
        if (el) el.style.display = 'none';
    });
    
    // Get group document from Firestore
    const db = firebase.firestore();
    db.collection('groups').doc(groupId).get()
        .then((doc) => {
            // Hide loading state
            if (loadingElement) {
                loadingElement.style.display = 'none';
            }
            
            // Show content elements
            [groupNameElement, groupDescriptionElement, groupMembersElement, groupStatusElement].forEach(el => {
                if (el) el.style.display = 'block';
            });
            
            if (!doc.exists) {
                console.error('Group not found');
                showNotification('Group not found', 'danger');
                return;
            }
            
            const group = doc.data();
            group.id = doc.id;
            
            // Update group name
            if (groupNameElement) {
                groupNameElement.textContent = group.name;
                document.title = `${group.name} - MidWhereAh`;
            }
            
            // Update group description
            if (groupDescriptionElement) {
                groupDescriptionElement.textContent = group.description || 'No description';
            }
            
            // Update group status
            if (groupStatusElement) {
                const statusBadge = document.createElement('span');
                statusBadge.className = `badge bg-${getStatusColor(group.status)}`;
                statusBadge.textContent = capitalizeFirstLetter(group.status || 'planning');
                groupStatusElement.innerHTML = '';
                groupStatusElement.appendChild(statusBadge);
            }
            
            // Update invite code
            if (inviteCodeElement) {
                inviteCodeElement.textContent = group.inviteCode;
                
                // Set up copy button
                const copyBtn = document.getElementById('copy-invite-btn');
                if (copyBtn) {
                    copyBtn.addEventListener('click', function() {
                        const inviteUrl = `${window.location.origin}/join/${group.inviteCode}`;
                        navigator.clipboard.writeText(inviteUrl).then(() => {
                            showNotification('Invitation link copied to clipboard!', 'success');
                        });
                    });
                }
            }
            
            // Update members list
            if (groupMembersElement) {
                groupMembersElement.innerHTML = '';
                
                // Convert members object to array
                const members = Object.entries(group.members || {}).map(([id, data]) => {
                    return { id, ...data };
                });
                
                // Sort members by role (admin first) then by join date
                members.sort((a, b) => {
                    if (a.role === 'admin' && b.role !== 'admin') return -1;
                    if (a.role !== 'admin' && b.role === 'admin') return 1;
                    return (a.joinedAt?.seconds || 0) - (b.joinedAt?.seconds || 0);
                });
                
                // Add each member to the list
                members.forEach(member => {
                    const memberItem = document.createElement('div');
                    memberItem.className = 'list-group-item d-flex justify-content-between align-items-center';
                    memberItem.setAttribute('data-user-id', member.id);
                    
                    // Format joined date
                    const joinedDate = member.joinedAt ? new Date(member.joinedAt.seconds * 1000).toLocaleDateString() : 'Unknown';
                    
                    // Create content
                    memberItem.innerHTML = `
                        <div class="d-flex align-items-center">
                            ${member.photoURL ? 
                                `<img src="${escapeHtml(member.photoURL)}" class="rounded-circle me-2 member-avatar" width="40" height="40" alt="${escapeHtml(member.name)}">` : 
                                `<div class="rounded-circle bg-secondary text-white d-flex align-items-center justify-content-center me-2 member-avatar" style="width: 40px; height: 40px;">
                                    <span>${member.name.charAt(0).toUpperCase()}</span>
                                </div>`
                            }
                            <div>
                                <div class="fw-bold member-name">${escapeHtml(member.name)}</div>
                                <div class="small text-muted">
                                    ${member.role === 'admin' ? '<span class="badge bg-danger me-1">Admin</span>' : ''}
                                    Joined: ${joinedDate}
                                </div>
                            </div>
                        </div>
                    `;
                    
                    // Add to list
                    groupMembersElement.appendChild(memberItem);
                });
            }
            
            // Load group locations
            loadGroupLocations(groupId);
        })
        .catch((error) => {
            console.error('Error loading group details:', error);
            if (loadingElement) {
                loadingElement.style.display = 'none';
            }
            showNotification('Error loading group details: ' + error.message, 'danger');
        });
}

// Helper function to get status color
function getStatusColor(status) {
    switch (status) {
        case 'planning': return 'info';
        case 'active': return 'success';
        case 'completed': return 'secondary';
        case 'cancelled': return 'danger';
        default: return 'primary';
    }
}

// Helper function to capitalize first letter
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function loadGroupLocations(groupId) {
    console.log('Loading locations for group:', groupId);
    
    const mapContainer = document.getElementById('map-container');
    const loadingElement = document.getElementById('locations-loading');
    
    if (!mapContainer) return;
    
    // Show loading state if element exists
    if (loadingElement) {
        loadingElement.style.display = 'block';
    }
    
    // Query Firestore for group locations
    const db = firebase.firestore();
    db.collection('groups').doc(groupId).collection('locations').get()
        .then((querySnapshot) => {
            // Hide loading state
            if (loadingElement) {
                loadingElement.style.display = 'none';
            }
            
            // Clear existing markers
            if (window.clearMarkers) {
                window.clearMarkers();
            }
            
            if (querySnapshot.empty) {
                console.log('No locations found for this group');
                return;
            }
            
            // Process each location
            const locations = [];
            const locationData = [];
            
            querySnapshot.forEach((doc) => {
                const location = doc.data();
                
                // Skip if missing coordinates
                if (!location.latitude || !location.longitude) return;
                
                // Add to locations array for midpoint calculation
                locations.push({
                    lat: location.latitude,
                    lng: location.longitude
                });
                
                // Store full location data
                locationData.push(location);
                
                // Add marker for this location
                if (window.addMarker) {
                    window.addMarker({
                        position: { lat: location.latitude, lng: location.longitude },
                        title: location.address || 'Member location',
                        icon: {
                            url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png'
                        }
                    });
                }
            });
            
            // Calculate midpoint if we have locations
            if (locations.length > 0 && window.calculateMidpoint) {
                const midpoint = window.calculateMidpoint(locations);
                window.midpoint = midpoint;
                
                // Center map on midpoint
                if (window.map) {
                    window.map.setCenter(midpoint);
                    
                    // Add midpoint marker
                    if (window.addMarker) {
                        window.addMarker({
                            position: midpoint,
                            title: 'Midpoint',
                            icon: {
                                url: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png'
                            }
                        });
                    }
                    
                    // Update midpoint display if element exists
                    const midpointElement = document.getElementById('midpoint-location');
                    if (midpointElement) {
                        // Reverse geocode midpoint to get address
                        if (window.geocoder) {
                            window.geocoder.geocode({ location: midpoint }, function(results, status) {
                                if (status === 'OK' && results[0]) {
                                    midpointElement.textContent = results[0].formatted_address;
                                } else {
                                    midpointElement.textContent = `${midpoint.lat.toFixed(6)}, ${midpoint.lng.toFixed(6)}`;
                                }
                            });
                        } else {
                            midpointElement.textContent = `${midpoint.lat.toFixed(6)}, ${midpoint.lng.toFixed(6)}`;
                        }
                    }
                    
                    // If we're on the venues page, search for venues automatically
                    if (window.location.pathname.startsWith('/venues/') && window.searchVenues) {
                        window.searchVenues();
                    }
                }
            }
            
            // Update locations list if element exists
            updateLocationsList(locationData);
        })
        .catch((error) => {
            console.error('Error loading locations:', error);
            if (loadingElement) {
                loadingElement.style.display = 'none';
            }
            showNotification('Error loading locations: ' + error.message, 'danger');
        });
}

// Update the locations list display
function updateLocationsList(locations) {
    const locationsList = document.getElementById('locations-list');
    if (!locationsList) return;
    
    // Clear existing list
    locationsList.innerHTML = '';
    
    // Add each location to the list
    locations.forEach(location => {
        const item = document.createElement('div');
        item.className = 'list-group-item d-flex justify-content-between align-items-center';
        
        // Get user info from the group members list if available
        let userName = 'Unknown User';
        let userPhoto = null;
        
        const memberElement = document.querySelector(`[data-user-id="${location.userId}"]`);
        if (memberElement) {
            userName = memberElement.querySelector('.member-name')?.textContent || 'Unknown User';
            userPhoto = memberElement.querySelector('.member-avatar')?.src || null;
        }
        
        // Create content
        item.innerHTML = `
            <div class="d-flex align-items-center">
                ${userPhoto ? `<img src="${userPhoto}" class="rounded-circle me-2" width="32" height="32" alt="${userName}">` : 
                `<div class="rounded-circle bg-secondary text-white d-flex align-items-center justify-content-center me-2" style="width: 32px; height: 32px;">
                    <span>${userName.charAt(0).toUpperCase()}</span>
                </div>`}
                <div>
                    <div class="fw-bold">${escapeHtml(userName)}</div>
                    <div class="small text-muted">${escapeHtml(location.address || 'No address')}</div>
                </div>
            </div>
            <span class="badge bg-primary rounded-pill">${location.transportMode || 'walking'}</span>
        `;
        
        // Add to list
        locationsList.appendChild(item);
    });
}

function setupLocationForm(groupId, userId) {
    const form = document.getElementById('location-form');
    const locationInput = document.getElementById('location-input');
    const geolocateBtn = document.getElementById('geolocate-btn');
    
    if (!form || !locationInput) return;
    
    // Initialize Google Places Autocomplete
    if (window.google && window.google.maps) {
        initLocationAutocomplete(locationInput);
    } else {
        // Wait for Google Maps to load
        window.initLocationFormAfterMapsLoaded = function() {
            initLocationAutocomplete(locationInput);
        };
    }
    
    // Set up geolocation button
    if (geolocateBtn) {
        geolocateBtn.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Show loading state
            geolocateBtn.disabled = true;
            geolocateBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>';
            
            // Check if geolocation is supported
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    // Success callback
                    function(position) {
                        const lat = position.coords.latitude;
                        const lng = position.coords.longitude;
                        
                        // Reverse geocode to get address
                        reverseGeocode(lat, lng, function(address) {
                            locationInput.value = address;
                            
                            // Reset button
                            geolocateBtn.disabled = false;
                            geolocateBtn.innerHTML = '<i class="fas fa-location-arrow"></i>';
                            
                            // Submit the form automatically
                            const submitBtn = form.querySelector('button[type="submit"]');
                            if (submitBtn) submitBtn.click();
                        });
                    },
                    // Error callback
                    function(error) {
                        console.error('Geolocation error:', error);
                        showNotification('Could not get your location: ' + error.message, 'danger');
                        
                        // Reset button
                        geolocateBtn.disabled = false;
                        geolocateBtn.innerHTML = '<i class="fas fa-location-arrow"></i>';
                    },
                    // Options
                    {
                        enableHighAccuracy: true,
                        timeout: 10000,
                        maximumAge: 0
                    }
                );
            } else {
                showNotification('Geolocation is not supported by your browser', 'warning');
                
                // Reset button
                geolocateBtn.disabled = false;
                geolocateBtn.innerHTML = '<i class="fas fa-location-arrow"></i>';
            }
        });
    }
    
    // Set up form submission
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const address = locationInput.value.trim();
        if (!address) {
            showNotification('Please enter your location', 'warning');
            return;
        }
        
        // Show loading state
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Updating...';
        
        // Geocode address to get coordinates
        geocodeAddress(address, function(lat, lng, formattedAddress, placeId) {
            // Save location to Firestore
            const db = firebase.firestore();
            const locationData = {
                userId: userId,
                address: formattedAddress,
                latitude: lat,
                longitude: lng,
                placeId: placeId || null,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                transportMode: document.getElementById('transport-mode')?.value || 'walking'
            };
            
            db.collection('groups').doc(groupId).collection('locations').doc(userId).set(locationData)
                .then(() => {
                    console.log('Location updated successfully');
                    showNotification('Your location has been updated', 'success');
                    
                    // Reset button
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = originalBtnText;
                    
                    // Update map
                    loadGroupLocations(groupId);
                })
                .catch((error) => {
                    console.error('Error updating location:', error);
                    showNotification('Error updating location: ' + error.message, 'danger');
                    
                    // Reset button
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = originalBtnText;
                });
        }, function(error) {
            console.error('Geocoding error:', error);
            showNotification('Could not find this location. Please try again.', 'danger');
            
            // Reset button
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText;
        });
    });
}

function loadVenueRecommendations(groupId) {
    console.log('Loading venue recommendations for group:', groupId);
    // TODO: Implement venue recommendations using Google Places API
}

function loadVenuesForVoting(groupId) {
    if (!groupId) {
        console.error('Missing group ID');
        return;
    }
    
    // Get current user ID
    const userId = firebase.auth().currentUser?.uid;
    if (!userId) {
        console.error('User not authenticated');
        return;
    }
    
    // Initialize swipe interface
    if (typeof initSwipeInterface === 'function') {
        initSwipeInterface(groupId, userId);
    } else {
        console.error('Swipe interface not loaded');
    }
}

function setupChatFunctionality(groupId, user) {
    const form = document.getElementById('chat-form');
    if (!form) return;
    
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        console.log('Sending chat message from user:', user.displayName || user.email, 'in group:', groupId);
        // TODO: Implement chat functionality using Firestore
    });
}

// Login page specific functionality
if (window.location.pathname === '/login') {
    document.addEventListener('DOMContentLoaded', function() {
        setupLoginForm();
        setupSignupForm();
        setupGoogleSignIn();
        setupForgotPassword();
    });
}

function setupLoginForm() {
    const form = document.getElementById('login-form');
    if (!form) return;
    
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        
        firebase.auth().signInWithEmailAndPassword(email, password)
            .then((userCredential) => {
                // Signed in
                showNotification('Login successful!', 'success');
                window.location.href = '/dashboard';
            })
            .catch((error) => {
                console.error('Login error:', error);
                showNotification(error.message, 'danger');
            });
    });
}

function setupSignupForm() {
    const form = document.getElementById('signup-form');
    if (!form) return;
    
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const name = document.getElementById('signup-name').value;
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        const confirmPassword = document.getElementById('signup-confirm-password').value;
        
        // Validate passwords match
        if (password !== confirmPassword) {
            showNotification('Passwords do not match', 'danger');
            return;
        }
        
        firebase.auth().createUserWithEmailAndPassword(email, password)
            .then((userCredential) => {
                // Signed up
                const user = userCredential.user;
                
                // Update profile with name
                return user.updateProfile({
                    displayName: name
                }).then(() => {
                    // Create user document in Firestore
                    return firebase.firestore().collection('users').doc(user.uid).set({
                        name: name,
                        email: email,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                });
            })
            .then(() => {
                showNotification('Account created successfully!', 'success');
                window.location.href = '/dashboard';
            })
            .catch((error) => {
                console.error('Signup error:', error);
                showNotification(error.message, 'danger');
            });
    });
}

function setupGoogleSignIn() {
    const googleBtn = document.getElementById('google-signin');
    if (!googleBtn) return;
    
    // We'll handle the redirect result in the auth state change observer
    // This ensures we don't have multiple places handling the same authentication event
    
    googleBtn.addEventListener('click', function() {
        // Log the current Firebase config (safely)
        const safeConfig = {...window.firebaseConfig};
        if (safeConfig.apiKey) {
            safeConfig.apiKey = safeConfig.apiKey.substring(0, 5) + '...';
        }
        console.log('Firebase config before Google sign-in:', safeConfig);
        
        try {
            // Show loading state immediately
            googleBtn.disabled = true;
            googleBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Signing in...';
            
            // Create provider with all necessary scopes and parameters
            const provider = new firebase.auth.GoogleAuthProvider();
            
            // Add scopes for better user data
            provider.addScope('profile');
            provider.addScope('email');
            
            // Set custom parameters
            provider.setCustomParameters({
                'prompt': 'select_account'
            });
            
            // First clear any pending redirects
            firebase.auth().getRedirectResult().then(() => {
                console.log('Cleared any pending redirect results');
                
                // Then ensure persistence is set to LOCAL
                return firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL);
            })
            .then(() => {
                console.log('Auth persistence set to LOCAL before redirect');
                // Use redirect instead of popup to avoid dual-window issue
                console.log('Starting Google sign-in redirect flow...');
                return firebase.auth().signInWithRedirect(provider);
            })
            .catch((error) => {
                console.error('Google sign-in setup error:', error);
                console.error('Error code:', error.code);
                console.error('Error message:', error.message);
                
                // Reset button
                googleBtn.disabled = false;
                googleBtn.innerHTML = '<img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" width="18" height="18" class="me-2">Continue with Google';
                
                if (error.code === 'auth/api-key-not-valid') {
                    showNotification('Invalid API key. Please check your Firebase configuration.', 'danger');
                } else if (error.code === 'auth/network-request-failed') {
                    showNotification('Network error. Please check your internet connection.', 'danger');
                } else {
                    showNotification('Error signing in with Google: ' + error.message, 'danger');
                }
            });
        } catch (e) {
            console.error('Exception during Google sign-in setup:', e);
            showNotification('Error initializing Google sign-in. Please try again later.', 'danger');
            
            // Reset button
            googleBtn.disabled = false;
            googleBtn.innerHTML = '<img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" width="18" height="18" class="me-2">Continue with Google';
        }
    });
}

function setupForgotPassword() {
    const forgotPasswordLink = document.getElementById('forgot-password');
    if (!forgotPasswordLink) return;
    
    forgotPasswordLink.addEventListener('click', function(e) {
        e.preventDefault();
        
        const email = document.getElementById('login-email').value;
        
        if (!email) {
            showNotification('Please enter your email address first', 'warning');
            return;
        }
        
        firebase.auth().sendPasswordResetEmail(email)
            .then(() => {
                showNotification('Password reset email sent. Check your inbox.', 'success');
            })
            .catch((error) => {
                console.error('Password reset error:', error);
                showNotification(error.message, 'danger');
            });
    });
} // End of setupForgotPassword
