// MidWhereAh - Swipe Voting Interface

// Global variables
let currentVenueIndex = 0;
let venues = [];
let groupId = '';
let userId = '';
let hammertime = null;
let isAnimating = false;
let totalVenues = 0;

// Initialize swipe interface
function initSwipeInterface(groupIdParam, userIdParam) {
    groupId = groupIdParam;
    userId = userIdParam;
    
    // Get swipe container
    const swipeContainer = document.getElementById('swipe-container');
    if (!swipeContainer) return;
    
    // Show loading state
    swipeContainer.innerHTML = `
        <div class="text-center p-5">
            <div class="spinner-border" style="color: var(--primary-purple);" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
            <p class="mt-3">Loading venues for voting...</p>
        </div>
    `;
    
    // Load venues from Firestore
    loadVenuesForVoting(groupId);
}

// Load venues for voting from Firestore
function loadVenuesForVoting(groupId) {
    if (!groupId) return;
    
    // Get venues that have been added to voting
    db.collection('groups').doc(groupId).collection('venues')
        .where('addedToVoting', '==', true)
        .orderBy('addedToVotingAt', 'asc')
        .get()
        .then(snapshot => {
            if (snapshot.empty) {
                showNoVenuesMessage();
                return;
            }
            
            // Store venues
            venues = [];
            snapshot.forEach(doc => {
                venues.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            totalVenues = venues.length;
            
            // Check if user has already voted on some venues
            checkExistingVotes();
        })
        .catch(error => {
            console.error('Error loading venues for voting:', error);
            showNotification('Error loading venues for voting', 'danger');
        });
}

// Check if user has already voted on some venues
function checkExistingVotes() {
    // Filter out venues that the user has already voted on
    const unvotedVenues = venues.filter(venue => {
        return !venue.votes || !venue.votes[userId];
    });
    
    if (unvotedVenues.length === 0) {
        // User has voted on all venues
        showAllVotesCompletedMessage();
    } else {
        // Update venues array to only include unvoted venues
        venues = unvotedVenues;
        currentVenueIndex = 0;
        
        // Initialize swipe cards
        initSwipeCards();
    }
}

// Initialize swipe cards
function initSwipeCards() {
    const swipeContainer = document.getElementById('swipe-container');
    if (!swipeContainer) return;
    
    // Create swipe card HTML
    let html = '';
    
    if (venues.length > 0) {
        const venue = venues[currentVenueIndex];
        
        html = `
            <div class="swipe-card" data-venue-id="${venue.id}">
                <div class="card-image">
                    ${venue.photoUrl ? 
                        `<img src="${venue.photoUrl}" alt="${venue.name}">` : 
                        `<div class="d-flex align-items-center justify-content-center bg-light" style="height: 250px;">
                            <i class="fas fa-utensils fa-3x text-secondary"></i>
                        </div>`
                    }
                </div>
                <div class="card-content">
                    <h2 class="venue-name">${venue.name}</h2>
                    <p class="venue-address text-muted">${venue.address}</p>
                    <div class="venue-details">
                        <span class="rating">
                            <span class="text-warning">★</span> ${venue.rating || 'N/A'}
                            <small class="text-muted">(${venue.userRatingsTotal || 0})</small>
                        </span>
                        <span class="price">
                            ${getPriceLevel(venue.priceLevel)}
                        </span>
                    </div>
                    <div class="venue-tags mt-2">
                        ${getVenueTags(venue)}
                    </div>
                </div>
            </div>
            
            <div class="swipe-actions">
                <button class="btn-dislike" onclick="voteDislike()">✗</button>
                <button class="btn-like" onclick="voteLike()">♡</button>
            </div>
            
            <div class="voting-progress">
                <span>Venue ${currentVenueIndex + 1} of ${venues.length}</span>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${((currentVenueIndex) / venues.length) * 100}%"></div>
                </div>
            </div>
        `;
        
        swipeContainer.innerHTML = html;
        
        // Initialize Hammer.js for swipe gestures
        initHammer();
    } else {
        showNoVenuesMessage();
    }
}

// Initialize Hammer.js for swipe gestures
function initHammer() {
    const swipeCard = document.querySelector('.swipe-card');
    if (!swipeCard) return;
    
    // Clean up previous Hammer instance
    if (hammertime) {
        hammertime.destroy();
    }
    
    // Create new Hammer instance
    hammertime = new Hammer(swipeCard);
    
    // Configure horizontal swipe recognition
    hammertime.get('pan').set({ direction: Hammer.DIRECTION_HORIZONTAL });
    
    // Handle pan events
    hammertime.on('pan', function(event) {
        if (isAnimating) return;
        
        const deltaX = event.deltaX;
        const opacity = Math.min(Math.abs(deltaX) / 200, 1);
        
        // Move card
        swipeCard.style.transform = `translateX(${deltaX}px) rotate(${deltaX * 0.05}deg)`;
        
        // Show like/dislike indicators
        if (deltaX > 0) {
            // Swiping right (like)
            swipeCard.classList.add('swipe-right');
            swipeCard.classList.remove('swipe-left');
        } else if (deltaX < 0) {
            // Swiping left (dislike)
            swipeCard.classList.add('swipe-left');
            swipeCard.classList.remove('swipe-right');
        } else {
            swipeCard.classList.remove('swipe-left', 'swipe-right');
        }
    });
    
    // Handle pan end events
    hammertime.on('panend', function(event) {
        if (isAnimating) return;
        
        const deltaX = event.deltaX;
        
        if (Math.abs(deltaX) > 100) {
            // Swipe threshold reached
            if (deltaX > 0) {
                // Swiped right (like)
                animateSwipe(swipeCard, 1, voteLike);
            } else {
                // Swiped left (dislike)
                animateSwipe(swipeCard, -1, voteDislike);
            }
        } else {
            // Reset card position
            swipeCard.style.transform = '';
            swipeCard.classList.remove('swipe-left', 'swipe-right');
        }
    });
}

// Animate swipe
function animateSwipe(card, direction, callback) {
    isAnimating = true;
    
    // Animate card off screen
    card.style.transition = 'transform 0.5s ease';
    card.style.transform = `translateX(${direction * window.innerWidth}px) rotate(${direction * 30}deg)`;
    
    // Wait for animation to complete
    setTimeout(() => {
        isAnimating = false;
        callback();
    }, 500);
}

// Vote like
function voteLike() {
    if (currentVenueIndex >= venues.length) return;
    
    const venue = venues[currentVenueIndex];
    saveVote(venue.id, 'like');
}

// Vote dislike
function voteDislike() {
    if (currentVenueIndex >= venues.length) return;
    
    const venue = venues[currentVenueIndex];
    saveVote(venue.id, 'dislike');
}

// Save vote to Firestore
function saveVote(venueId, voteType) {
    if (!venueId || !groupId || !userId) return;
    
    // Get venue reference
    const venueRef = db.collection('groups').doc(groupId).collection('venues').doc(venueId);
    
    // Update vote in Firestore
    venueRef.update({
        [`votes.${userId}`]: voteType,
        [`voteCount.${voteType}s`]: firebase.firestore.FieldValue.increment(1),
        'voteCount.total': firebase.firestore.FieldValue.increment(1)
    })
    .then(() => {
        // Move to next venue
        currentVenueIndex++;
        
        if (currentVenueIndex < venues.length) {
            // Show next venue
            initSwipeCards();
        } else {
            // All venues voted
            showVotingCompleteMessage();
        }
    })
    .catch(error => {
        console.error('Error saving vote:', error);
        showNotification('Error saving vote', 'danger');
    });
}

// Show no venues message
function showNoVenuesMessage() {
    const swipeContainer = document.getElementById('swipe-container');
    if (!swipeContainer) return;
    
    swipeContainer.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-map-marker-alt"></i>
            <h4>No Venues to Vote On</h4>
            <p class="text-muted">No venues have been added to the voting list yet.</p>
            <a href="/venues/${groupId}" class="preload-link btn btn-primary mt-3">
                <i class="fas fa-search me-2"></i>Find Venues
            </a>
        </div>
    `;
}

// Show all votes completed message
function showAllVotesCompletedMessage() {
    const swipeContainer = document.getElementById('swipe-container');
    if (!swipeContainer) return;
    
    swipeContainer.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-check-circle"></i>
            <h4>You've Voted on All Venues</h4>
            <p class="text-muted">You've already voted on all venues in this group.</p>
            <a href="/results/${groupId}" class="preload-link btn btn-primary mt-3">
                <i class="fas fa-chart-bar me-2"></i>See Results
            </a>
        </div>
    `;
}

// Show voting complete message
function showVotingCompleteMessage() {
    const swipeContainer = document.getElementById('swipe-container');
    if (!swipeContainer) return;
    
    swipeContainer.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-check-circle"></i>
            <h4>Voting Complete!</h4>
            <p class="text-muted">You've voted on all venues. Check out the results!</p>
            <a href="/results/${groupId}" class="preload-link btn btn-primary mt-3">
                <i class="fas fa-chart-bar me-2"></i>See Results
            </a>
        </div>
    `;
    
    // Show notification
    showNotification('Voting complete! Thanks for your input.', 'success');
}

// Helper function to get price level string
function getPriceLevel(level) {
    if (!level) return '';
    
    let priceString = '';
    for (let i = 0; i < level; i++) {
        priceString += '$';
    }
    
    return priceString;
}

// Helper function to get venue tags HTML
function getVenueTags(venue) {
    if (!venue.types || venue.types.length === 0) return '';
    
    const displayTypes = ['restaurant', 'cafe', 'bar', 'food', 'bakery', 'meal_takeaway'];
    const tags = [];
    
    venue.types.forEach(type => {
        if (displayTypes.includes(type)) {
            tags.push(`<span class="tag badge bg-secondary me-1">${type.replace('_', ' ')}</span>`);
        }
    });
    
    return tags.slice(0, 3).join('');
}

// Show notification
function showNotification(message, type = 'success') {
    const toast = document.getElementById('notification-toast');
    const toastMessage = document.getElementById('notification-message');
    
    if (toast && toastMessage) {
        // Set message and type
        toastMessage.textContent = message;
        
        // Remove existing color classes
        toast.classList.remove('bg-success', 'bg-danger', 'bg-warning', 'bg-info');
        
        // Add appropriate color class
        switch (type) {
            case 'danger':
                toast.classList.add('bg-danger');
                break;
            case 'warning':
                toast.classList.add('bg-warning');
                break;
            case 'info':
                toast.classList.add('bg-info');
                break;
            default:
                toast.classList.add('bg-success');
        }
        
        // Show toast
        const bsToast = new bootstrap.Toast(toast);
        bsToast.show();
    }
}
