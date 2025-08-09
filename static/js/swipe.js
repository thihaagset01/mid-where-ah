// static/js/swipe.js - CLEAN MINIMAL VERSION with fixed CSS classes

class SwipeInterface {
    constructor() {
        this.groupId = null;
        this.venues = [];
        this.currentIndex = 0;
        this.votes = {};
        this.isAnimating = false;
        this.members = [];
        this.currentUser = null;
        
        // DOM elements
        this.swipeContainer = null;
        this.loadingContainer = null;
        this.emptyContainer = null;
        this.instructionsElement = null;
        this.membersContainer = null;
        this.actionButtons = null;
    }

    async initialize(groupId) {
        console.log('🎯 Initializing Clean Swipe Interface for group:', groupId);
        this.groupId = groupId;
        
        // Initialize DOM elements
        this.initializeDOMElements();
        
        // Wait for Firebase auth
        await this.waitForAuth();
        
        // Load group members
        await this.loadGroupMembers();
        
        // Load venues for voting
        await this.loadVenues();
        
        // Set up event listeners
        this.setupEventListeners();
        
        console.log('✅ Clean Swipe Interface initialized');
    }

    initializeDOMElements() {
        this.swipeContainer = document.getElementById('swipe-container');
        this.loadingContainer = document.getElementById('loading-container');
        this.emptyContainer = document.getElementById('empty-container');
        this.instructionsElement = document.getElementById('swipe-instructions');
        this.membersContainer = document.getElementById('members-container');
        this.actionButtons = document.querySelectorAll('.swipe-action-btn');
    }

    async waitForAuth() {
        return new Promise((resolve) => {
            const checkAuth = () => {
                if (window.firebase && window.firebase.auth && window.firebase.auth().currentUser) {
                    this.currentUser = window.firebase.auth().currentUser;
                    console.log('✅ Auth ready for swipe interface');
                    resolve();
                } else {
                    setTimeout(checkAuth, 100);
                }
            };
            checkAuth();
        });
    }

    async loadGroupMembers() {
        try {
            console.log('🔍 Loading group members...');
            
            const groupRef = firebase.firestore().collection('groups').doc(this.groupId);
            const groupDoc = await groupRef.get();
            
            if (groupDoc.exists) {
                const groupData = groupDoc.data();
                // Ensure members is always an array
                this.members = Array.isArray(groupData.members) ? groupData.members : [];
                
                // If no members in the group data, create a default member for current user
                if (this.members.length === 0) {
                    this.members = [{
                        userId: this.currentUser.uid,
                        name: this.currentUser.displayName || this.currentUser.email.split('@')[0] || 'User',
                        email: this.currentUser.email,
                        role: 'admin'
                    }];
                }
                
                console.log(`✅ Loaded ${this.members.length} group members`);
                this.renderMembers();
            } else {
                // Group doesn't exist, create default member
                console.log('⚠️ Group not found, creating default member');
                this.members = [{
                    userId: this.currentUser.uid,
                    name: this.currentUser.displayName || this.currentUser.email.split('@')[0] || 'User',
                    email: this.currentUser.email,
                    role: 'admin'
                }];
                console.log(`✅ Created default member: ${this.members[0].name}`);
                this.renderMembers();
            }
        } catch (error) {
            console.error('❌ Error loading group members:', error);
            // Fallback to current user as only member
            this.members = [{
                userId: this.currentUser.uid,
                name: this.currentUser.displayName || this.currentUser.email.split('@')[0] || 'User',
                email: this.currentUser.email,
                role: 'admin'
            }];
            console.log('🔧 Fallback: Using current user as only member');
            this.renderMembers();
        }
    }

    async loadVenues() {
        try {
            console.log('🔍 Loading venues for voting...');
            
            // First try to load from Firebase
            let venues = await this.loadVenuesFromFirebase();
            
            // If no venues in Firebase, try to load from sessionStorage and save to Firebase
            if (venues.length === 0) {
                console.log('📱 No venues in Firebase, checking sessionStorage...');
                venues = await this.loadVenuesFromSessionStorage();
                
                if (venues.length > 0) {
                    console.log(`💾 Found ${venues.length} venues in sessionStorage, saving to Firebase...`);
                    await this.saveVenuesToFirebase(venues);
                }
            }
            
            // Filter out venues already voted on by current user
            const unvotedVenues = venues.filter(venue => {
                const userVote = venue.votes && venue.votes[this.currentUser.uid];
                return !userVote;
            });
            
            this.venues = unvotedVenues;
            console.log(`✅ Loaded ${this.venues.length} venues for voting`);
            
            // Hide loading and show appropriate content
            this.hideLoading();
            
            if (this.venues.length === 0) {
                this.showEmptyState();
            } else {
                this.renderCurrentVenue();
                this.updateProgress();
            }
            
        } catch (error) {
            console.error('❌ Error loading venues:', error);
            this.hideLoading();
            this.showError('Failed to load venues for voting');
        }
    }

    async loadVenuesFromFirebase() {
        try {
            const venuesRef = firebase.firestore()
                .collection('groups')
                .doc(this.groupId)
                .collection('venues');
            
            const snapshot = await venuesRef.get();
            console.log(`🔍 Found ${snapshot.size} total venues in collection`);
            
            const venues = [];
            snapshot.forEach(doc => {
                const venueData = doc.data();
                venues.push({
                    id: doc.id,
                    ...venueData
                });
            });
            
            return venues;
        } catch (error) {
            console.error('Error loading venues from Firebase:', error);
            return [];
        }
    }

    async loadVenuesFromSessionStorage() {
        try {
            // Try multiple sessionStorage keys for venue data
            const storageKeys = ['tempVenues', 'optimizationResult', 'venues'];
            let venues = [];
            
            for (const key of storageKeys) {
                const data = sessionStorage.getItem(key);
                if (!data) continue;
                
                console.log(`📱 Found data in sessionStorage.${key}`);
                const parsed = JSON.parse(data);
                
                // Extract venues from different data structures
                if (parsed.venues && Array.isArray(parsed.venues)) {
                    venues = parsed.venues;
                    console.log(`✅ Extracted ${venues.length} venues from ${key}`);
                    break;
                } else if (Array.isArray(parsed)) {
                    venues = parsed;
                    console.log(`✅ Found ${venues.length} venues directly in ${key}`);
                    break;
                }
            }
            
            // Ensure venues have required fields for swipe interface
            return venues.map(venue => ({
                name: venue.name || 'Unknown Venue',
                vicinity: venue.vicinity || venue.formatted_address || 'No address available',
                rating: venue.rating || 0,
                price_level: venue.price_level || 0,
                place_id: venue.place_id || venue.id || Math.random().toString(36).substr(2, 9),
                photos: venue.photos || [],
                geometry: venue.geometry || { location: { lat: 0, lng: 0 } },
                types: venue.types || [],
                votes: {} // Initialize empty votes object
            }));
        } catch (error) {
            console.error('Error loading venues from sessionStorage:', error);
            return [];
        }
    }

    async saveVenuesToFirebase(venues) {
        try {
            const batch = firebase.firestore().batch();
            const venuesRef = firebase.firestore()
                .collection('groups')
                .doc(this.groupId)
                .collection('venues');
            
            venues.forEach(venue => {
                const venueRef = venuesRef.doc(venue.place_id);
                batch.set(venueRef, {
                    ...venue,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    createdBy: this.currentUser.uid
                });
            });
            
            await batch.commit();
            console.log(`✅ Saved ${venues.length} venues to Firebase`);
        } catch (error) {
            console.error('❌ Error saving venues to Firebase:', error);
            throw error;
        }
    }

    renderMembers() {
        if (!this.membersContainer || !this.members || !Array.isArray(this.members)) {
            console.log('⚠️ Cannot render members: missing container or invalid members data');
            return;
        }
        
        const membersHTML = this.members.map(member => {
            const isCurrentUser = member.userId === this.currentUser.uid;
            const avatarClass = isCurrentUser ? 'current' : '';
            const memberName = member.name || member.email?.split('@')[0] || 'User';
            
            return `
                <div class="swipe-member">
                    <div class="swipe-avatar ${avatarClass}">
                        ${memberName.charAt(0).toUpperCase()}
                    </div>
                    <span class="swipe-member-name">${memberName}</span>
                </div>
            `;
        }).join('');
        
        this.membersContainer.innerHTML = membersHTML;
        console.log(`✅ Rendered ${this.members.length} member avatars`);
    }

    renderCurrentVenue() {
        if (this.venues.length === 0 || this.currentIndex >= this.venues.length) {
            this.showEmptyState();
            return;
        }

        const venue = this.venues[this.currentIndex];
        
        // Hide instructions once first venue is shown
        if (this.instructionsElement) {
            this.instructionsElement.style.display = 'none';
        }
        
        const venueCard = this.createVenueCard(venue);
        this.swipeContainer.innerHTML = venueCard;
        
        // Show swipe container
        if (this.swipeContainer) {
            this.swipeContainer.style.display = 'block';
        }
        
        // Set up swipe gestures for the new card
        this.setupSwipeGestures();
    }

    createVenueCard(venue) {
        const photoUrl = this.getVenuePhotoUrl(venue);
        const priceLevel = venue.price_level ? '$'.repeat(venue.price_level) : '$';
        const venueType = venue.types && venue.types.length > 0 
            ? this.formatVenueType(venue.types[0])
            : 'Restaurant';

        return `
            <div class="swipe-venue-card top" data-venue-id="${venue.place_id}">
                <div class="swipe-card-image">
                    ${photoUrl ? 
                        `<img src="${photoUrl}" alt="${venue.name}" loading="lazy">` :
                        `<div class="swipe-image-placeholder">
                            <i class="fas fa-utensils"></i>
                        </div>`
                    }
                    <div class="swipe-rating-badge">
                        <span class="star">★</span>
                        ${venue.rating || 'N/A'}
                    </div>
                </div>
                
                <div class="swipe-card-content">
                    <div>
                        <h3 class="swipe-venue-name">${venue.name}</h3>
                        <p class="swipe-venue-address">
                            <i class="fas fa-map-marker-alt"></i>
                            ${venue.vicinity}
                        </p>
                    </div>
                    <div class="swipe-venue-meta">
                        <span class="swipe-venue-type">${venueType}</span>
                        <span class="swipe-venue-price">${priceLevel}</span>
                    </div>
                </div>
                
                <div class="swipe-overlay like">LIKE</div>
                <div class="swipe-overlay pass">PASS</div>
            </div>
        `;
    }

    setupSwipeGestures() {
        // Handle both full-screen and regular container classes
        const venueCard = this.swipeContainer.querySelector('.swipe-venue-card.top') || 
                          this.swipeContainer.querySelector('.swipe-venue-card');
        if (!venueCard) return;

        let startX = 0;
        let startY = 0;
        let currentX = 0;
        let currentY = 0;
        let isDragging = false;

        const onStart = (e) => {
            if (this.isAnimating) return;
            
            isDragging = true;
            const touch = e.touches ? e.touches[0] : e;
            startX = touch.clientX;
            startY = touch.clientY;
            
            venueCard.style.transition = 'none';
        };

        const onMove = (e) => {
            if (!isDragging || this.isAnimating) return;
            
            e.preventDefault();
            const touch = e.touches ? e.touches[0] : e;
            currentX = touch.clientX - startX;
            currentY = touch.clientY - startY;
            
            const rotation = currentX * 0.1;
            venueCard.style.transform = `translateX(${currentX}px) translateY(${currentY}px) rotate(${rotation}deg)`;
            
            // Show/hide overlays based on swipe direction
            const likeOverlay = venueCard.querySelector('.swipe-overlay.like');
            const passOverlay = venueCard.querySelector('.swipe-overlay.pass');
            
            if (currentX < -50) {
                passOverlay.style.opacity = Math.min(1, Math.abs(currentX) / 100);
                likeOverlay.style.opacity = 0;
            } else if (currentX > 50) {
                likeOverlay.style.opacity = Math.min(1, currentX / 100);
                passOverlay.style.opacity = 0;
            } else {
                passOverlay.style.opacity = 0;
                likeOverlay.style.opacity = 0;
            }
        };

        const onEnd = () => {
            if (!isDragging) return;
            isDragging = false;
            
            venueCard.style.transition = 'transform 0.3s ease-out';
            
            const threshold = 100;
            
            if (Math.abs(currentX) > threshold) {
                // Trigger swipe
                if (currentX > 0) {
                    this.swipeRight();
                } else {
                    this.swipeLeft();
                }
            } else {
                // Snap back
                venueCard.style.transform = 'translateX(0) translateY(0) rotate(0deg)';
                // Reset overlays
                const overlays = venueCard.querySelectorAll('.swipe-overlay');
                overlays.forEach(overlay => overlay.style.opacity = 0);
            }
        };

        // Touch events
        venueCard.addEventListener('touchstart', onStart, { passive: false });
        venueCard.addEventListener('touchmove', onMove, { passive: false });
        venueCard.addEventListener('touchend', onEnd);

        // Mouse events for desktop
        venueCard.addEventListener('mousedown', onStart);
        venueCard.addEventListener('mousemove', onMove);
        venueCard.addEventListener('mouseup', onEnd);
        venueCard.addEventListener('mouseleave', onEnd);
    }

    setupEventListeners() {
        // Disable action buttons initially
        this.disableActionButtons();
        
        // Enable them once venues are loaded
        if (this.venues.length > 0) {
            this.enableActionButtons();
        }
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (this.isAnimating || this.venues.length === 0) return;
            
            switch(e.key) {
                case 'ArrowLeft':
                    this.swipeLeft();
                    break;
                case 'ArrowRight':
                    this.swipeRight();
                    break;
            }
        });
    }

    swipeLeft() {
        this.performSwipe('dislike');
    }

    swipeRight() {
        this.performSwipe('like');
    }

    async performSwipe(action) {
        if (this.isAnimating || this.currentIndex >= this.venues.length) return;
        
        this.isAnimating = true;
        this.disableActionButtons();
        
        const venue = this.venues[this.currentIndex];
        const venueCard = this.swipeContainer.querySelector('.swipe-venue-card.top');
        
        if (venueCard) {
            // Animate card out
            const direction = action === 'like' ? 1 : -1;
            venueCard.style.transition = 'transform 0.4s ease-out, opacity 0.4s ease-out';
            venueCard.style.transform = `translateX(${direction * window.innerWidth}px) rotate(${direction * 30}deg)`;
            venueCard.style.opacity = '0';
        }
        
        // Save vote to Firebase
        try {
            await this.saveVote(venue.place_id, action);
            console.log(`✅ Voted ${action} for ${venue.name}`);
        } catch (error) {
            console.error('❌ Error saving vote:', error);
        }
        
        // Move to next venue after animation
        setTimeout(() => {
            this.currentIndex++;
            this.isAnimating = false;
            this.enableActionButtons();
            
            if (this.currentIndex < this.venues.length) {
                this.renderCurrentVenue();
                this.updateProgress();
            } else {
                this.showEmptyState();
            }
        }, 400);
    }

    async saveVote(venueId, vote) {
        try {
            const venueRef = firebase.firestore()
                .collection('groups')
                .doc(this.groupId)
                .collection('venues')
                .doc(venueId);
            
            await venueRef.update({
                [`votes.${this.currentUser.uid}`]: {
                    vote,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                    userName: this.currentUser.displayName || this.currentUser.email
                }
            });
            
            // Update sessionStorage with vote counts for venues page
            this.updateSessionStorageVoteCounts(venueId, vote);
            
        } catch (error) {
            console.error('Error saving vote:', error);
            throw error;
        }
    }

    /**
     * Update vote counts in sessionStorage so venues page shows updated counts
     */
    updateSessionStorageVoteCounts(venueId, vote) {
        try {
            const tempVenues = sessionStorage.getItem('tempVenues');
            if (!tempVenues) return;

            const data = JSON.parse(tempVenues);
            if (!data.venues) return;

            // Find the venue and update its vote count
            const venue = data.venues.find(v => v.place_id === venueId);
            if (venue) {
                // Initialize votes structure if it doesn't exist
                if (!venue.votes) {
                    venue.votes = {};
                }
                if (!venue.voteCount) {
                    venue.voteCount = { likes: 0, dislikes: 0, total: 0 };
                }

                // Add/update the current user's vote
                const previousVote = venue.votes[this.currentUser.uid];
                venue.votes[this.currentUser.uid] = vote;

                // Recalculate vote counts
                let likes = 0;
                let total = 0;
                Object.values(venue.votes).forEach(userVote => {
                    total++;
                    if (userVote === 'like') likes++;
                });

                venue.voteCount = {
                    likes: likes,
                    dislikes: total - likes,
                    total: total
                };

                // Calculate vote score for sorting
                venue.voteScore = total > 0 ? likes / total : 0;

                // Update sessionStorage
                sessionStorage.setItem('tempVenues', JSON.stringify(data));
                
                console.log(`✅ Updated vote counts for ${venue.name}: ${likes}/${total} likes`);
            }
        } catch (error) {
            console.error('Error updating sessionStorage vote counts:', error);
        }
    }

    /**
     * Sync all vote counts from Firebase to sessionStorage
     */
    async syncAllVoteCounts() {
        try {
            console.log('🔄 Syncing all vote counts from Firebase...');
            
            // Get all venues with their votes from Firebase
            const venuesSnapshot = await firebase.firestore()
                .collection('groups')
                .doc(this.groupId)
                .collection('venues')
                .get();

            const venueVotes = {};
            venuesSnapshot.forEach(doc => {
                const venueData = doc.data();
                if (venueData.votes) {
                    const venueId = doc.id;
                    
                    // Calculate vote counts
                    let likes = 0;
                    let total = 0;
                    Object.values(venueData.votes).forEach(vote => {
                        total++;
                        if (vote.vote === 'like') likes++;
                    });

                    venueVotes[venueId] = {
                        votes: venueData.votes,
                        voteCount: {
                            likes: likes,
                            dislikes: total - likes,
                            total: total
                        },
                        voteScore: total > 0 ? likes / total : 0
                    };
                }
            });

            // Update sessionStorage
            const tempVenues = sessionStorage.getItem('tempVenues');
            if (tempVenues) {
                const data = JSON.parse(tempVenues);
                if (data.venues) {
                    data.venues.forEach(venue => {
                        const venueId = venue.place_id;
                        if (venueVotes[venueId]) {
                            venue.votes = venueVotes[venueId].votes;
                            venue.voteCount = venueVotes[venueId].voteCount;
                            venue.voteScore = venueVotes[venueId].voteScore;
                        }
                    });

                    sessionStorage.setItem('tempVenues', JSON.stringify(data));
                    console.log(`✅ Synced vote counts for ${Object.keys(venueVotes).length} venues`);
                }
            }
        } catch (error) {
            console.error('❌ Error syncing vote counts:', error);
        }
    }

    updateProgress() {
        const totalVenues = this.venues.length;
        const votedVenues = this.currentIndex;
        
        console.log(`📊 Unvoted venues: ${totalVenues - votedVenues}`);
        
        // Update progress display in the progress container
        let progressContainer = document.querySelector('.swipe-progress');
        
        if (!progressContainer) {
            // Create progress container if it doesn't exist
            progressContainer = document.createElement('div');
            progressContainer.className = 'swipe-progress';
            progressContainer.textContent = `${votedVenues} / ${totalVenues}`;
            document.body.appendChild(progressContainer);
        } else {
            progressContainer.textContent = `${votedVenues} / ${totalVenues}`;
        }
    }

    // Helper methods
    getVenuePhotoUrl(venue) {
        if (!venue.photos || venue.photos.length === 0) return null;
        
        const photo = venue.photos[0];
        if (photo.getUrl) {
            return photo.getUrl({ maxWidth: 400, maxHeight: 300 });
        }
        
        // Fallback for photo reference
        if (photo.photo_reference && window.googleMapsApiKey) {
            return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photo.photo_reference}&key=${window.googleMapsApiKey}`;
        }
        
        return null;
    }

    formatVenueType(type) {
        return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    // UI State Management
    hideLoading() {
        if (this.loadingContainer) {
            this.loadingContainer.style.display = 'none';
        }
    }

    showEmptyState() {
        if (this.emptyContainer) {
            this.emptyContainer.style.display = 'block';
        }
        
        // Hide swipe container
        if (this.swipeContainer) {
            this.swipeContainer.style.display = 'none';
        }
        
        // Hide instructions
        if (this.instructionsElement) {
            this.instructionsElement.style.display = 'none';
        }
    }

    showError(message) {
        console.error('❌ Swipe Interface Error:', message);
        
        if (this.loadingContainer) {
            this.loadingContainer.innerHTML = `
                <div style="text-align: center;">
                    <div style="font-size: 48px; color: #ff4444; margin-bottom: 16px;">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <h3>Error Loading Venues</h3>
                    <p style="color: #6c757d; margin-bottom: 20px;">${message}</p>
                    <button class="swipe-empty-btn" onclick="location.reload()">
                        Try Again
                    </button>
                </div>
            `;
        }
    }

    enableActionButtons() {
        if (this.actionButtons) {
            this.actionButtons.forEach(btn => {
                btn.disabled = false;
            });
        }
    }

    disableActionButtons() {
        if (this.actionButtons) {
            this.actionButtons.forEach(btn => {
                btn.disabled = true;
            });
        }
    }
}

// Global swipe interface instance
let swipeInterface = null;

// Global functions for template usage
function initializeSwipeInterface(groupId) {
    swipeInterface = new SwipeInterface();
    swipeInterface.initialize(groupId);
}

function swipeLeft() {
    if (swipeInterface) {
        swipeInterface.swipeLeft();
    }
}

function swipeRight() {
    if (swipeInterface) {
        swipeInterface.swipeRight();
    }
}

function goBackToVenues() {
    try {
        // Sync all vote counts before navigating back
        if (swipeInterface && swipeInterface.groupId) {
            swipeInterface.syncAllVoteCounts();
        }

        // Use VenueNavigationService if available
        if (window.venueNavigationService) {
            const venueNavService = window.venueNavigationService;
            const source = sessionStorage.getItem(venueNavService.STORAGE_KEYS.SOURCE_PAGE) || 'homepage';
            
            // Navigate back using the service
            venueNavService.navigateToVenueExploration({
                source: source,
                swipeMode: false
            });
        } else {
            // Fallback to direct navigation
            const returnPath = sessionStorage.getItem('swipe_return_path');
            if (returnPath) {
                window.location.href = returnPath;
            } else {
                window.location.href = '/mobile/venues/temp';
            }
        }
    } catch (error) {
        console.error('Error navigating back to venues:', error);
        // Fallback to default behavior
        window.location.href = '/mobile/venues/temp';
    }
}

function toggleToResults() {
    // Navigate back to results view using the unified method
    goBackToVenues();
}

function showResults() {
    // Navigate to results/top picks page using the unified method
    goBackToVenues();
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SwipeInterface;
}