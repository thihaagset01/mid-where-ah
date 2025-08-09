// static/js/swipe.js

class SwipeInterface {
    constructor() {
        this.groupId = null;
        this.venues = [];
        this.currentIndex = 0;
        this.votes = {};
        this.isAnimating = false;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.isDragging = false;
        this.members = [];
        this.currentUser = null;
        
        // DOM elements
        this.swipeContainer = null;
        this.loadingContainer = null;
        this.emptyContainer = null;
        this.instructionsElement = null;
        this.progressBar = null;
        this.progressText = null;
        this.membersContainer = null;
        this.actionButtons = null;
    }

    async initialize(groupId) {
        console.log('🎯 Initializing Swipe Interface for group:', groupId);
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
        
        console.log('✅ Swipe Interface initialized');
    }

    initializeDOMElements() {
        this.swipeContainer = document.getElementById('swipe-container');
        this.loadingContainer = document.getElementById('loading-container');
        this.emptyContainer = document.getElementById('empty-container');
        this.instructionsElement = document.getElementById('swipe-instructions');
        this.progressBar = document.getElementById('progress-bar');
        this.progressText = document.getElementById('progress-text');
        this.membersContainer = document.getElementById('members-container');
        this.actionButtons = document.querySelectorAll('.action-btn');
    }

    async waitForAuth() {
        return new Promise((resolve) => {
            if (firebase.auth().currentUser) {
                this.currentUser = firebase.auth().currentUser;
                resolve();
            } else {
                const unsubscribe = firebase.auth().onAuthStateChanged((user) => {
                    if (user) {
                        this.currentUser = user;
                        unsubscribe();
                        resolve();
                    }
                });
            }
        });
    }

    async loadGroupMembers() {
        try {
            const groupDoc = await firebase.firestore()
                .collection('groups')
                .doc(this.groupId)
                .get();

            if (groupDoc.exists) {
                const groupData = groupDoc.data();
                this.members = Object.values(groupData.members || {});
                this.displayMembers();
                console.log('✅ Loaded', this.members.length, 'group members');
            }
        } catch (error) {
            console.error('Error loading group members:', error);
        }
    }

    displayMembers() {
        if (!this.membersContainer) return;

        this.membersContainer.innerHTML = '';
        this.members.forEach(member => {
            const memberElement = document.createElement('div');
            memberElement.className = 'member-avatar';
            memberElement.title = member.name || member.email;
            
            // Get initials
            const name = member.name || member.email;
            const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
            
            memberElement.innerHTML = `
                ${initials}
                <div class="vote-indicator" style="display: none;">
                    <i class="fas fa-check"></i>
                </div>
            `;
            
            this.membersContainer.appendChild(memberElement);
        });
    }

    async loadVenues() {
        try {
            console.log('🔍 Loading venues for voting...');
            
            // First, get all venues to debug
            const allVenuesSnapshot = await firebase.firestore()
                .collection('groups')
                .doc(this.groupId)
                .collection('venues')
                .get();
                
            console.log('🔍 Found', allVenuesSnapshot.size, 'total venues in collection');
            
            // Log all venues and their addedToVoting status
            allVenuesSnapshot.forEach(doc => {
                const data = doc.data();
                console.log(`Venue ${doc.id}:`, {
                    name: data.name,
                    addedToVoting: data.addedToVoting,
                    hasAddedToVoting: 'addedToVoting' in data
                });
            });
            
            // Now get only venues added to voting
            const venuesSnapshot = await firebase.firestore()
                .collection('groups')
                .doc(this.groupId)
                .collection('venues')
                .where('addedToVoting', '==', true)
                .get();

            this.venues = [];
            venuesSnapshot.forEach(doc => {
                this.venues.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            console.log('✅ Loaded', this.venues.length, 'venues for voting');

            // Load existing votes
            await this.loadExistingVotes();

            // Filter out already voted venues
            this.filterUnvotedVenues();

            // Display venues
            this.displayVenues();

        } catch (error) {
            console.error('Error loading venues:', error);
            this.showError('Failed to load venues');
        }
    }

    async loadExistingVotes() {
        if (!this.currentUser) return;

        try {
            const voteDoc = await firebase.firestore()
                .collection('groups')
                .doc(this.groupId)
                .collection('votes')
                .doc(this.currentUser.uid)
                .get();

            if (voteDoc.exists) {
                this.votes = voteDoc.data().votes || {};
                console.log('✅ Loaded existing votes:', Object.keys(this.votes).length);
            }
        } catch (error) {
            console.error('Error loading votes:', error);
        }
    }

    filterUnvotedVenues() {
        // Filter out venues that user has already voted on
        const unvotedVenues = this.venues.filter(venue => {
            const venueId = venue.id || venue.placeId || venue.place_id;
            return !this.votes[venueId];
        });

        this.venues = unvotedVenues;
        console.log('📊 Unvoted venues:', this.venues.length);
    }

    displayVenues() {
        this.hideLoading();

        if (this.venues.length === 0) {
            this.showEmptyState();
            return;
        }

        // Create venue cards
        this.venues.forEach((venue, index) => {
            const card = this.createVenueCard(venue, index);
            this.swipeContainer.appendChild(card);
        });

        // Hide instructions after first card
        if (this.venues.length > 0) {
            setTimeout(() => {
                this.instructionsElement.style.opacity = '0';
                setTimeout(() => {
                    this.instructionsElement.style.display = 'none';
                }, 300);
            }, 2000);
        }

        // Update progress
        this.updateProgress();

        // Enable action buttons
        this.enableActionButtons();
    }

    createVenueCard(venue, index) {
        const card = document.createElement('div');
        card.className = 'swipe-card entering';
        card.dataset.venueId = venue.id || venue.placeId || venue.place_id;
        card.dataset.index = index;

        const photoUrl = this.getVenuePhotoUrl(venue);
        const rating = venue.rating ? venue.rating.toFixed(1) : 'N/A';
        const priceLevel = venue.price_level ? '$'.repeat(venue.price_level) : '$';
        const address = venue.vicinity || venue.formatted_address || 'Address not available';
        const venueTypes = venue.types ? venue.types.slice(0, 3) : [];

        card.innerHTML = `
            <div class="card-image">
                ${photoUrl 
                    ? `<img src="${photoUrl}" alt="${venue.name}" loading="lazy">`
                    : `<div class="card-image-placeholder">
                         <i class="fas fa-utensils"></i>
                       </div>`
                }
                <div class="vote-overlay like">
                    <i class="fas fa-heart me-2"></i>LIKE
                </div>
                <div class="vote-overlay dislike">
                    <i class="fas fa-times me-2"></i>SKIP
                </div>
            </div>
            <div class="card-content">
                <div class="venue-name">${venue.name || 'Unnamed Venue'}</div>
                <div class="venue-details">
                    <div class="venue-rating">
                        <i class="fas fa-star"></i>
                        ${rating}
                    </div>
                    <div class="venue-price">${priceLevel}</div>
                </div>
                <div class="venue-address">
                    <i class="fas fa-map-marker-alt"></i>
                    ${address}
                </div>
                <div class="venue-tags">
                    ${venueTypes.map(type => 
                        `<span class="venue-tag">${this.formatVenueType(type)}</span>`
                    ).join('')}
                </div>
            </div>
        `;

        // Add touch/mouse event listeners
        this.addCardEventListeners(card);

        return card;
    }

    addCardEventListeners(card) {
        // Touch events
        card.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
        card.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        card.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });

        // Mouse events
        card.addEventListener('mousedown', this.handleMouseDown.bind(this));
        card.addEventListener('mousemove', this.handleMouseMove.bind(this));
        card.addEventListener('mouseup', this.handleMouseUp.bind(this));
        card.addEventListener('mouseleave', this.handleMouseUp.bind(this));
    }

    handleTouchStart(e) {
        if (this.isAnimating) return;
        e.preventDefault();
        
        const touch = e.touches[0];
        this.startDrag(touch.clientX, touch.clientY, e.target);
    }

    handleTouchMove(e) {
        if (!this.isDragging || this.isAnimating) return;
        e.preventDefault();
        
        const touch = e.touches[0];
        this.updateDrag(touch.clientX, touch.clientY);
    }

    handleTouchEnd(e) {
        if (!this.isDragging || this.isAnimating) return;
        e.preventDefault();
        
        this.endDrag();
    }

    handleMouseDown(e) {
        if (this.isAnimating) return;
        e.preventDefault();
        
        this.startDrag(e.clientX, e.clientY, e.target);
    }

    handleMouseMove(e) {
        if (!this.isDragging || this.isAnimating) return;
        e.preventDefault();
        
        this.updateDrag(e.clientX, e.clientY);
    }

    handleMouseUp(e) {
        if (!this.isDragging || this.isAnimating) return;
        e.preventDefault();
        
        this.endDrag();
    }

    startDrag(x, y, target) {
        const card = target.closest('.swipe-card');
        if (!card || parseInt(card.dataset.index) !== this.currentIndex) return;

        this.isDragging = true;
        this.dragStartX = x;
        this.dragStartY = y;
        this.currentCard = card;
        
        card.classList.add('dragging');
    }

    updateDrag(x, y) {
        if (!this.currentCard) return;

        const deltaX = x - this.dragStartX;
        const deltaY = y - this.dragStartY;
        const rotation = deltaX * 0.1;
        const opacity = Math.max(0.7, 1 - Math.abs(deltaX) / 300);

        // Update card position and rotation
        this.currentCard.style.transform = `translateX(${deltaX}px) translateY(${deltaY}px) rotate(${rotation}deg)`;
        this.currentCard.style.opacity = opacity;

        // Show vote overlays based on drag direction
        const likeOverlay = this.currentCard.querySelector('.vote-overlay.like');
        const dislikeOverlay = this.currentCard.querySelector('.vote-overlay.dislike');

        if (Math.abs(deltaX) > 50) {
            if (deltaX > 0) {
                // Dragging right - show like
                likeOverlay.classList.add('show');
                dislikeOverlay.classList.remove('show');
                this.currentCard.classList.add('like-hint');
                this.currentCard.classList.remove('dislike-hint');
            } else {
                // Dragging left - show dislike
                dislikeOverlay.classList.add('show');
                likeOverlay.classList.remove('show');
                this.currentCard.classList.add('dislike-hint');
                this.currentCard.classList.remove('like-hint');
            }
        } else {
            // Not far enough - hide overlays
            likeOverlay.classList.remove('show');
            dislikeOverlay.classList.remove('show');
            this.currentCard.classList.remove('like-hint', 'dislike-hint');
        }
    }

    endDrag() {
        if (!this.currentCard) return;

        const deltaX = parseInt(this.currentCard.style.transform.match(/translateX\(([^)]+)px\)/)?.[1] || 0);
        const threshold = 100;

        this.isDragging = false;
        this.currentCard.classList.remove('dragging');

        if (Math.abs(deltaX) > threshold) {
            // Swipe detected
            if (deltaX > 0) {
                this.performSwipe('right');
            } else {
                this.performSwipe('left');
            }
        } else {
            // Snap back to center
            this.currentCard.style.transform = '';
            this.currentCard.style.opacity = '';
            this.currentCard.classList.remove('like-hint', 'dislike-hint');
            
            // Hide overlays
            this.currentCard.querySelectorAll('.vote-overlay').forEach(overlay => {
                overlay.classList.remove('show');
            });
        }

        this.currentCard = null;
    }

    async performSwipe(direction) {
        if (this.isAnimating) return;
        
        this.isAnimating = true;
        const card = this.getCurrentCard();
        if (!card) return;

        const venueId = card.dataset.venueId;
        const vote = direction === 'right' ? 'yes' : 'no';

        // Animate card exit
        card.classList.add(direction === 'right' ? 'swiped-right' : 'swiped-left');
        
        // Submit vote
        await this.submitVote(venueId, vote);

        // Show vote confirmation
        this.showVoteConfirmation(vote, this.venues[this.currentIndex]);

        // Pulse corresponding action button
        const button = direction === 'right' ? document.querySelector('.like-btn') : document.querySelector('.dislike-btn');
        button.classList.add('pulse');
        setTimeout(() => button.classList.remove('pulse'), 300);

        // Move to next card
        setTimeout(() => {
            this.nextCard();
            this.isAnimating = false;
        }, 300);
    }

    async submitVote(venueId, vote) {
        try {
            if (!this.currentUser) return;

            // Update local votes
            this.votes[venueId] = vote;

            // Update Firestore
            const voteRef = firebase.firestore()
                .collection('groups')
                .doc(this.groupId)
                .collection('votes')
                .doc(this.currentUser.uid);

            await voteRef.set({
                userId: this.currentUser.uid,
                userName: this.currentUser.displayName || this.currentUser.email.split('@')[0],
                votes: this.votes,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });

            console.log('✅ Vote submitted:', vote, 'for venue', venueId);

        } catch (error) {
            console.error('Error submitting vote:', error);
        }
    }

    showVoteConfirmation(vote, venue) {
        const modal = document.getElementById('vote-modal');
        const icon = document.getElementById('vote-result-icon');
        const text = document.getElementById('vote-result-text');
        const venueName = document.getElementById('vote-result-venue');

        // Update modal content
        icon.className = `vote-result-icon ${vote === 'yes' ? 'like' : 'dislike'}`;
        icon.innerHTML = vote === 'yes' 
            ? '<i class="fas fa-heart fa-3x"></i>' 
            : '<i class="fas fa-times fa-3x"></i>';
            
        text.textContent = vote === 'yes' ? 'You liked this venue!' : 'You skipped this venue';
        venueName.textContent = venue.name || 'Venue';

        // Show modal briefly
        const bootstrapModal = new bootstrap.Modal(modal);
        bootstrapModal.show();

        setTimeout(() => {
            bootstrapModal.hide();
        }, 1500);
    }

    nextCard() {
        this.currentIndex++;
        
        // Remove the swiped card
        const swipedCard = this.swipeContainer.querySelector('.swipe-card');
        if (swipedCard) {
            swipedCard.remove();
        }

        // Update progress
        this.updateProgress();

        // Check if we're done
        if (this.currentIndex >= this.venues.length) {
            this.showCompletionState();
        }
    }

    getCurrentCard() {
        return this.swipeContainer.querySelector(`.swipe-card[data-index="${this.currentIndex}"]`);
    }

    updateProgress() {
        const progress = this.venues.length > 0 ? (this.currentIndex / this.venues.length) * 100 : 0;
        const remaining = this.venues.length - this.currentIndex;

        if (this.progressBar) {
            this.progressBar.style.width = `${progress}%`;
        }

        if (this.progressText) {
            this.progressText.textContent = `${this.currentIndex} of ${this.venues.length} venues`;
        }

        console.log('📊 Progress:', `${this.currentIndex}/${this.venues.length}`, `(${progress.toFixed(1)}%)`);
    }

    showCompletionState() {
        console.log('🎉 Voting completed!');
        
        // Hide action buttons
        this.disableActionButtons();

        // Show completion message
        setTimeout(() => {
            this.showEmptyState();
        }, 500);

        // Update member avatar to show completion
        this.markUserAsCompleted();
    }

    markUserAsCompleted() {
        // Find current user's avatar and mark as voted
        const userEmail = this.currentUser?.email;
        const memberElements = this.membersContainer.querySelectorAll('.member-avatar');
        
        memberElements.forEach(element => {
            if (element.title.includes(userEmail)) {
                element.classList.add('voted');
                element.querySelector('.vote-indicator').style.display = 'flex';
            }
        });
    }

    // Button actions
    swipeLeft() {
        if (this.isAnimating) return;
        const card = this.getCurrentCard();
        if (card) {
            this.currentCard = card;
            this.performSwipe('left');
        }
    }

    swipeRight() {
        if (this.isAnimating) return;
        const card = this.getCurrentCard();
        if (card) {
            this.currentCard = card;
            this.performSwipe('right');
        }
    }

    // Setup event listeners
    setupEventListeners() {
        // Disable default touch behaviors
        document.addEventListener('touchmove', (e) => {
            if (e.target.closest('.swipe-card')) {
                e.preventDefault();
            }
        }, { passive: false });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (this.isAnimating) return;
            
            switch(e.key) {
                case 'ArrowLeft':
                    e.preventDefault();
                    this.swipeLeft();
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    this.swipeRight();
                    break;
            }
        });
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
    }

    showError(message) {
        console.error('❌ Swipe Interface Error:', message);
        
        if (this.loadingContainer) {
            this.loadingContainer.innerHTML = `
                <div class="text-center">
                    <i class="fas fa-exclamation-triangle fa-3x text-warning mb-3"></i>
                    <h4>Error Loading Venues</h4>
                    <p class="text-muted">${message}</p>
                    <button class="btn btn-primary" onclick="location.reload()">
                        Try Again
                    </button>
                </div>
            `;
        }
    }

    enableActionButtons() {
        this.actionButtons.forEach(btn => {
            btn.disabled = false;
        });
    }

    disableActionButtons() {
        this.actionButtons.forEach(btn => {
            btn.disabled = true;
        });
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