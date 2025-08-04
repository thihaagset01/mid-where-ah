// MidWhereAh - Results and Leaderboard

// Global variables
let groupId = '';
let venuesWithVotes = [];
let unsubscribeVotes = null;

// Initialize results page
function initResultsPage(groupIdParam) {
    groupId = groupIdParam;
    
    // Get results container
    const resultsContainer = document.getElementById('results-container');
    if (!resultsContainer) return;
    
    // Show loading state
    resultsContainer.innerHTML = `
        <div class="text-center p-5">
            <div class="spinner-border" style="color: var(--primary-purple);" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
            <p class="mt-3">Loading voting results...</p>
        </div>
    `;
    
    // Load venues with votes from Firestore
    loadVenuesWithVotes(groupId);
}

// Load venues with votes from Firestore
function loadVenuesWithVotes(groupId) {
    if (!groupId) return;
    
    // Get venues collection reference
    const venuesRef = db.collection('groups').doc(groupId).collection('venues');
    
    // Set up real-time listener for venues with votes
    unsubscribeVotes = venuesRef
        .where('addedToVoting', '==', true)
        .onSnapshot(snapshot => {
            // Process snapshot
            processVenuesSnapshot(snapshot);
        }, error => {
            console.error('Error loading venues with votes:', error);
            showNotification('Error loading voting results', 'danger');
        });
}

// Process venues snapshot
function processVenuesSnapshot(snapshot) {
    if (snapshot.empty) {
        showNoVotesMessage();
        return;
    }
    
    // Reset venues array
    venuesWithVotes = [];
    
    // Process each venue document
    snapshot.forEach(doc => {
        const venue = {
            id: doc.id,
            ...doc.data(),
            likeCount: 0,
            dislikeCount: 0,
            totalVotes: 0,
            score: 0
        };
        
        // Calculate vote counts
        if (venue.votes) {
            Object.values(venue.votes).forEach(vote => {
                if (vote === 'like') {
                    venue.likeCount++;
                } else if (vote === 'dislike') {
                    venue.dislikeCount++;
                }
            });
            
            venue.totalVotes = venue.likeCount + venue.dislikeCount;
            venue.score = venue.likeCount - venue.dislikeCount;
        }
        
        venuesWithVotes.push(venue);
    });
    
    // Sort venues by score (likes - dislikes)
    venuesWithVotes.sort((a, b) => {
        // First sort by score
        const scoreDiff = b.score - a.score;
        if (scoreDiff !== 0) return scoreDiff;
        
        // If scores are equal, sort by total votes
        const voteDiff = b.totalVotes - a.totalVotes;
        if (voteDiff !== 0) return voteDiff;
        
        // If total votes are equal, sort by rating
        return (b.rating || 0) - (a.rating || 0);
    });
    
    // Display results
    displayResults(venuesWithVotes);
}

// Display results
function displayResults(venues) {
    const resultsContainer = document.getElementById('results-container');
    if (!resultsContainer) return;
    
    // Check if there are any votes
    const hasVotes = venues.some(venue => venue.totalVotes > 0);
    
    if (!hasVotes) {
        showNoVotesMessage();
        return;
    }
    
    // Create HTML for results
    let html = '';
    
    // Add winner card if there is one
    if (venues.length > 0 && venues[0].score > 0) {
        const winner = venues[0];
        html += createWinnerCard(winner);
    }
    
    // Add leaderboard
    html += `
        <div class="card shadow-sm mb-4">
            <div class="card-header bg-white">
                <h5 class="mb-0">Leaderboard</h5>
            </div>
            <div class="list-group list-group-flush">
                ${venues.map((venue, index) => createLeaderboardItem(venue, index)).join('')}
            </div>
        </div>
    `;
    
    // Add voting stats
    const totalVotes = venues.reduce((sum, venue) => sum + venue.totalVotes, 0);
    const totalVoters = calculateTotalVoters(venues);
    
    html += `
        <div class="card shadow-sm">
            <div class="card-header bg-white">
                <h5 class="mb-0">Voting Stats</h5>
            </div>
            <div class="card-body">
                <div class="row text-center">
                    <div class="col-4">
                        <h3>${venues.length}</h3>
                        <p class="text-muted">Venues</p>
                    </div>
                    <div class="col-4">
                        <h3>${totalVotes}</h3>
                        <p class="text-muted">Total Votes</p>
                    </div>
                    <div class="col-4">
                        <h3>${totalVoters}</h3>
                        <p class="text-muted">Voters</p>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Update container
    resultsContainer.innerHTML = html;
}

// Create winner card
function createWinnerCard(venue) {
    if (!venue) return '';
    
    const likePercentage = venue.totalVotes > 0 
        ? Math.round((venue.likeCount / venue.totalVotes) * 100) 
        : 0;
    
    return `
        <div class="card shadow winner-card mb-4">
            <div class="winner-badge">
                <i class="fas fa-trophy"></i>
            </div>
            <div class="card-header bg-white">
                <h5 class="mb-0">Winner</h5>
            </div>
            <div class="card-body">
                <div class="row">
                    <div class="col-md-4">
                        <div class="venue-image mb-3">
                            ${venue.photoUrl ? 
                                `<img src="${venue.photoUrl}" class="img-fluid rounded" alt="${venue.name}">` : 
                                `<div class="d-flex align-items-center justify-content-center bg-light rounded" style="height: 150px;">
                                    <i class="fas fa-utensils fa-3x text-secondary"></i>
                                </div>`
                            }
                        </div>
                    </div>
                    <div class="col-md-8">
                        <h4>${venue.name}</h4>
                        <p class="text-muted">${venue.address}</p>
                        <div class="mb-3">
                            <span class="text-warning">★</span> ${venue.rating || 'N/A'}
                            <small class="text-muted">(${venue.userRatingsTotal || 0})</small>
                            <span class="ms-3">${getPriceLevel(venue.priceLevel)}</span>
                        </div>
                        <div class="d-flex align-items-center mb-3">
                            <div class="vote-count me-3">
                                <i class="fas fa-thumbs-up text-success me-1"></i> ${venue.likeCount}
                            </div>
                            <div class="vote-count">
                                <i class="fas fa-thumbs-down text-danger me-1"></i> ${venue.dislikeCount}
                            </div>
                            <div class="ms-auto vote-percentage">
                                ${likePercentage}% approval
                            </div>
                        </div>
                        <div class="d-flex">
                            <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue.name + ' ' + venue.address)}" 
                               class="preload-link btn btn-sm btn-outline-primary me-2" target="_blank">
                                <i class="fas fa-map-marker-alt me-1"></i>View on Map
                            </a>
                            ${venue.website ? 
                                `<a href="${venue.website}" class="preload-link btn btn-sm btn-outline-primary" target="_blank">
                                    <i class="fas fa-external-link-alt me-1"></i>Website
                                </a>` : ''
                            }
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Create leaderboard item
function createLeaderboardItem(venue, index) {
    if (!venue) return '';
    
    const likePercentage = venue.totalVotes > 0 
        ? Math.round((venue.likeCount / venue.totalVotes) * 100) 
        : 0;
    
    let badgeClass = 'bg-secondary';
    if (index === 0) badgeClass = 'bg-success';
    else if (index === 1) badgeClass = 'bg-primary';
    else if (index === 2) badgeClass = 'bg-info';
    
    return `
        <div class="list-group-item">
            <div class="d-flex align-items-center">
                <div class="me-3">
                    <span class="badge ${badgeClass} rounded-pill">${index + 1}</span>
                </div>
                <div class="flex-grow-1">
                    <h6 class="mb-0">${venue.name}</h6>
                    <small class="text-muted">${venue.address}</small>
                </div>
                <div class="text-end">
                    <div class="vote-count">
                        <i class="fas fa-thumbs-up text-success me-1"></i> ${venue.likeCount}
                        <i class="fas fa-thumbs-down text-danger ms-2 me-1"></i> ${venue.dislikeCount}
                    </div>
                    <small class="text-muted">${likePercentage}% approval</small>
                </div>
            </div>
        </div>
    `;
}

// Show no votes message
function showNoVotesMessage() {
    const resultsContainer = document.getElementById('results-container');
    if (!resultsContainer) return;
    
    resultsContainer.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-vote-yea"></i>
            <h4>No Votes Yet</h4>
            <p class="text-muted">No one has voted on venues yet.</p>
            <a href="/swipe/${groupId}" class="preload-link btn btn-primary mt-3">
                <i class="fas fa-thumbs-up me-2"></i>Start Voting
            </a>
        </div>
    `;
}

// Calculate total number of unique voters
function calculateTotalVoters(venues) {
    const voters = new Set();
    
    venues.forEach(venue => {
        if (venue.votes) {
            Object.keys(venue.votes).forEach(userId => {
                voters.add(userId);
            });
        }
    });
    
    return voters.size;
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

// Clean up when leaving the page
function cleanupResultsPage() {
    // Unsubscribe from Firestore listeners
    if (unsubscribeVotes) {
        unsubscribeVotes();
        unsubscribeVotes = null;
    }
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
