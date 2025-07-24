// =============================================================================
// FRIENDS MANAGER CLASS
// =============================================================================

class FriendsManager {
    constructor() {
        this.friends = [];
        this.loadFriends();
    }
    
    loadFriends() {
        // Get current user
        const user = firebase.auth().currentUser;
        if (!user) return;
        
        // Reference to user's friends collection
        const friendsRef = firebase.firestore()
            .collection('users')
            .doc(user.uid)
            .collection('friends');
            
        // Listen for friends
        friendsRef.onSnapshot(snapshot => {
            this.friends = [];
            snapshot.forEach(doc => {
                this.friends.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            // Dispatch event when friends are loaded
            document.dispatchEvent(new CustomEvent('friendsLoaded', {
                detail: { friends: this.friends }
            }));
        });
    }
    
    getFriends() {
        return this.friends;
    }
}

// =============================================================================
// ENHANCED NOTIFICATION SYSTEM FOR FRIENDS
// =============================================================================

class FriendsNotificationManager {
    constructor() {
        this.setupRealtimeNotifications();
        this.setupPushNotifications();
    }

    setupRealtimeNotifications() {
        // Listen for friend requests
        if (firebase.auth().currentUser) {
            this.listenToFriendRequests();
        } else {
            firebase.auth().onAuthStateChanged(user => {
                if (user) {
                    this.listenToFriendRequests();
                }
            });
        }
    }

    listenToFriendRequests() {
        const currentUser = firebase.auth().currentUser;
        if (!currentUser) return;

        firebase.firestore()
            .collection('friend_requests')
            .where('toUserId', '==', currentUser.uid)
            .where('status', '==', 'pending')
            .onSnapshot(snapshot => {
                const newRequests = snapshot.docChanges()
                    .filter(change => change.type === 'added')
                    .map(change => change.doc.data());

                // Show notifications for new requests
                newRequests.forEach(request => {
                    this.showFriendRequestNotification(request);
                });

                // Update badge count
                this.updateNotificationBadges(snapshot.docs.length);
            });
    }

    showFriendRequestNotification(request) {
        // Show browser notification if permitted
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('New Friend Request', {
                body: `${request.fromUserName} wants to be your friend`,
                icon: request.fromUserPhotoURL || '/static/images/default-avatar.png',
                tag: 'friend-request-' + request.id
            });
        }

        // Show in-app notification
        if (typeof showNotification === 'function') {
            showNotification(
                `${request.fromUserName} sent you a friend request`, 
                'info'
            );
        }
    }

    updateNotificationBadges(count) {
        // Update navigation badge
        const navBadge = document.getElementById('friends-notification-badge');
        if (navBadge) {
            if (count > 0) {
                navBadge.textContent = count;
                navBadge.style.display = 'inline-flex';
            } else {
                navBadge.style.display = 'none';
            }
        }

        // Update requests tab badge
        const requestsBadge = document.getElementById('requests-notification-badge');
        if (requestsBadge) {
            if (count > 0) {
                requestsBadge.textContent = count;
                requestsBadge.style.display = 'inline-flex';
            } else {
                requestsBadge.style.display = 'none';
            }
        }
    }

    async setupPushNotifications() {
        // Request notification permission
        if ('Notification' in window && Notification.permission === 'default') {
            await Notification.requestPermission();
        }
    }
}

// =============================================================================
// TAB MANAGEMENT
// =============================================================================

class FriendsTabManager {
    constructor() {
        this.currentTab = 'search';
        this.friendsManager = new FriendsManager();
        this.setupTabNavigation();
        this.loadFriendRequests();
        this.setupFriendRequestHandlers();
        this.setupSearchFunctionality();
        
        // Listen for friends loaded event
        document.addEventListener('friendsLoaded', (event) => {
            this.displayFriendsList(event.detail.friends);
        });
    }
    
    setupSearchFunctionality() {
        const searchInput = document.getElementById('user-search-input');
        const searchResults = document.getElementById('search-results');
        
        if (!searchInput || !searchResults) return;
        
        // Debounce function to limit API calls
        let searchTimeout;
        
        searchInput.addEventListener('input', () => {
            const query = searchInput.value.trim();
            
            // Clear previous timeout
            clearTimeout(searchTimeout);
            
            // Don't search if query is too short
            if (query.length < 2) {
                searchResults.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-search"></i>
                        <p>Search for friends by name, username, or email address</p>
                    </div>
                `;
                return;
            }
            
            // Show loading state
            searchResults.innerHTML = `
                <div class="loading">
                    <i class="fas fa-spinner fa-spin"></i>
                    <p>Searching...</p>
                </div>
            `;
            
            // Debounce search to prevent too many API calls
            searchTimeout = setTimeout(() => {
                this.searchUsers(query);
            }, 800);
        });
    }
    
    searchUsers(query) {
        const searchResults = document.getElementById('search-results');
        if (!searchResults) return;
        
        // Call search API
        fetch(`/api/friends/search?q=${encodeURIComponent(query)}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                if (data.users && data.users.length > 0) {
                    this.displaySearchResults(data.users);
                } else {
                    searchResults.innerHTML = `
                        <div class="empty-state">
                            <i class="fas fa-user-times"></i>
                            <p>No users found matching "${query}"</p>
                        </div>
                    `;
                }
            })
            .catch(error => {
                console.error('Error searching users:', error);
                searchResults.innerHTML = `
                    <div class="empty-state error">
                        <i class="fas fa-exclamation-circle"></i>
                        <p>Error searching users</p>
                    </div>
                `;
            });
    }
    
    displaySearchResults(users) {
        const searchResults = document.getElementById('search-results');
        if (!searchResults) return;
        
        let html = '';
        users.forEach(user => {
            // Determine button state based on relationship
            let buttonHtml;
            if (user.isFriend) {
                buttonHtml = `
                    <button class="btn btn-sm btn-success" disabled>
                        <i class="fas fa-check"></i> Friends
                    </button>
                `;
            } else if (user.requestPending) {
                buttonHtml = `
                    <button class="btn btn-sm btn-secondary" disabled>
                        <i class="fas fa-clock"></i> Request Sent
                    </button>
                `;
            } else {
                buttonHtml = `
                    <button class="btn btn-sm btn-primary send-request" data-user-id="${user.userId}">
                        <i class="fas fa-user-plus"></i> Add Friend
                    </button>
                `;
            }
            
            html += `
                <div class="user-card" data-user-id="${user.userId}">
                    <div class="user-info">
                        <div class="user-avatar">
                            <img src="${user.photoURL || '/static/images/default-avatar.png'}" alt="${user.name}">
                        </div>
                        <div class="user-details">
                            <h5>${user.name}</h5>
                            <p>${user.email}</p>
                        </div>
                    </div>
                    <div class="user-actions">
                        ${buttonHtml}
                    </div>
                </div>
            `;
        });
        
        searchResults.innerHTML = html;
        
        // Add event listeners for send request buttons
        const sendRequestButtons = searchResults.querySelectorAll('.send-request');
        sendRequestButtons.forEach(button => {
            button.addEventListener('click', () => {
                const userId = button.getAttribute('data-user-id');
                this.sendFriendRequest(userId, button);
            });
        });
    }
    
    sendFriendRequest(userId, button) {
        if (!userId) return;
        
        // Disable button to prevent multiple clicks
        button.disabled = true;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
        
        // Send API request to send friend request
        fetch('/api/friends/request', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ toUserId: userId })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Update button to show request sent
                button.classList.remove('btn-primary');
                button.classList.add('btn-secondary');
                button.innerHTML = '<i class="fas fa-clock"></i> Request Sent';
                
                // Show success notification
                showNotification('Friend request sent!', 'success');
            } else {
                throw new Error(data.error || 'Failed to send friend request');
            }
        })
        .catch(error => {
            console.error('Error sending friend request:', error);
            showNotification('Failed to send friend request', 'error');
            
            // Re-enable button
            button.disabled = false;
            button.innerHTML = '<i class="fas fa-user-plus"></i> Add Friend';
        });
    }
    
    setupTabNavigation() {
        const tabButtons = document.querySelectorAll('.tab-navigation .nav-link');
        const tabPanes = document.querySelectorAll('.tab-pane');
        
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const tabId = button.getAttribute('data-tab');
                
                // Update active tab button
                tabButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                
                // Show selected tab content, hide others
                tabPanes.forEach(pane => {
                    if (pane.id === tabId + '-tab') {
                        pane.style.display = 'block';
                    } else {
                        pane.style.display = 'none';
                    }
                });
                
                this.currentTab = tabId;
                
                // Load data for the selected tab if needed
                if (tabId === 'requests') {
                    this.loadFriendRequests();
                } else if (tabId === 'friends') {
                    // Friends are already loaded via the FriendsManager
                } else if (tabId === 'search') {
                    // Initialize search tab with default state
                    this.initializeSearchTab();
                }
            });
        });
    }
    initializeSearchTab() {
        const searchInput = document.getElementById('user-search-input');
        const searchResults = document.getElementById('search-results');
        
        if (!searchInput || !searchResults) return;
        
        // Clear search input
        searchInput.value = '';
        
        // Reset search results to default state
        searchResults.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-search"></i>
                <p>Search for friends by name, username, or email address</p>
            </div>
        `;
    }
    
    loadFriendRequests() {
        const user = firebase.auth().currentUser;
        if (!user) return;
        
        const requestsContainer = document.getElementById('pending-requests');
        if (!requestsContainer) return;
        
        // Show loading state
        requestsContainer.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i><p>Loading requests...</p></div>';
        
        // Fetch friend requests
        fetch('/api/friends/requests')
            .then(response => response.json())
            .then(data => {
                if (data.requests && data.requests.length > 0) {
                    this.displayFriendRequests(data.requests);
                } else {
                    requestsContainer.innerHTML = `
                        <div class="empty-state">
                            <i class="fas fa-user-plus"></i>
                            <p>No pending friend requests</p>
                        </div>
                    `;
                }
            })
            .catch(error => {
                console.error('Error fetching friend requests:', error);
                requestsContainer.innerHTML = `
                    <div class="empty-state error">
                        <i class="fas fa-exclamation-circle"></i>
                        <p>Error loading friend requests</p>
                    </div>
                `;
            });
    }
    
    displayFriendRequests(requests) {
        const requestsContainer = document.getElementById('pending-requests');
        if (!requestsContainer) return;
        
        let html = '';
        requests.forEach(request => {
            html += `
                <div class="friend-request-card" data-request-id="${request.id}">
                    <div class="user-info">
                        <div class="user-avatar">
                            <img src="${request.fromUserPhotoURL || '/static/images/default-avatar.png'}" alt="${request.fromUserName}">
                        </div>
                        <div class="user-details">
                            <h5>${request.fromUserName}</h5>
                            <p>${request.fromUserEmail}</p>
                        </div>
                    </div>
                    <div class="request-actions">
                        <button class="btn btn-sm btn-success accept-request" data-request-id="${request.id}">
                            <i class="fas fa-check"></i> Accept
                        </button>
                        <button class="btn btn-sm btn-outline-danger reject-request" data-request-id="${request.id}">
                            <i class="fas fa-times"></i> Reject
                        </button>
                    </div>
                </div>
            `;
        });
        
        requestsContainer.innerHTML = html;
    }
    
    displayFriendsList(friends) {
        const friendsContainer = document.getElementById('friends-list');
        const friendsCount = document.getElementById('friends-count');
        
        if (!friendsContainer) return;
        
        if (friends.length === 0) {
            friendsContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-users"></i>
                    <p>You don't have any friends yet</p>
                </div>
            `;
            
            if (friendsCount) {
                friendsCount.textContent = '0 friends';
            }
            return;
        }
        
        let html = '';
        friends.forEach(friend => {
            html += `
                <div class="friend-card" data-friend-id="${friend.userId}">
                    <div class="user-info">
                        <div class="user-avatar">
                            <img src="${friend.photoURL || '/static/images/default-avatar.png'}" alt="${friend.name}">
                        </div>
                        <div class="user-details">
                            <h5>${friend.name}</h5>
                            <p>${friend.email}</p>
                        </div>
                    </div>
                    <div class="friend-actions">
                        <button class="btn btn-sm btn-primary invite-to-group" data-friend-id="${friend.userId}">
                            <i class="fas fa-user-plus"></i> Invite
                        </button>
                        <button class="btn btn-sm btn-outline-secondary message-friend" data-friend-id="${friend.userId}">
                            <i class="fas fa-comment"></i> Message
                        </button>
                    </div>
                </div>
            `;
        });
        
        friendsContainer.innerHTML = html;
        
        if (friendsCount) {
            friendsCount.textContent = `${friends.length} ${friends.length === 1 ? 'friend' : 'friends'}`;
        }
    }
    
    setupFriendRequestHandlers() {
        // Use event delegation for dynamically added elements
        document.addEventListener('click', event => {
            // Accept friend request
            if (event.target.closest('.accept-request')) {
                const button = event.target.closest('.accept-request');
                const requestId = button.getAttribute('data-request-id');
                this.acceptFriendRequest(requestId, button);
            }
            
            // Reject friend request
            if (event.target.closest('.reject-request')) {
                const button = event.target.closest('.reject-request');
                const requestId = button.getAttribute('data-request-id');
                this.rejectFriendRequest(requestId, button);
            }
        });
    }
    
    acceptFriendRequest(requestId, button) {
        if (!requestId) return;
        
        // Disable button to prevent multiple clicks
        button.disabled = true;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Accepting...';
        
        // Send API request to accept friend request
        fetch(`/api/friends/request/${requestId}/accept`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Remove the request card
                const requestCard = button.closest('.friend-request-card');
                if (requestCard) {
                    requestCard.remove();
                }
                
                // Show success notification
                showNotification('Friend request accepted!', 'success');
                
                // Reload friend requests and friends list
                this.loadFriendRequests();
                this.friendsManager.loadFriends();
            } else {
                throw new Error(data.error || 'Failed to accept friend request');
            }
        })
        .catch(error => {
            console.error('Error accepting friend request:', error);
            showNotification('Failed to accept friend request', 'error');
            
            // Re-enable button
            button.disabled = false;
            button.innerHTML = '<i class="fas fa-check"></i> Accept';
        });
    }
    
    rejectFriendRequest(requestId, button) {
        if (!requestId) return;
        
        // Disable button to prevent multiple clicks
        button.disabled = true;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Rejecting...';
        
        // Send API request to reject friend request
        fetch(`/api/friends/request/${requestId}/decline`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Remove the request card
                const requestCard = button.closest('.friend-request-card');
                if (requestCard) {
                    requestCard.remove();
                }
                
                // Show success notification
                showNotification('Friend request rejected', 'info');
                
                // Reload friend requests
                this.loadFriendRequests();
            } else {
                throw new Error(data.error || 'Failed to reject friend request');
            }
        })
        .catch(error => {
            console.error('Error rejecting friend request:', error);
            showNotification('Failed to reject friend request', 'error');
            
            // Re-enable button
            button.disabled = false;
            button.innerHTML = '<i class="fas fa-times"></i> Reject';
        });
    }
}

// =============================================================================
// INITIALIZATION
// =============================================================================

// Initialize friends integration when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize friends integration
    window.friendsGroupIntegration = new FriendsGroupIntegration();
    
    // Initialize notification manager
    window.friendsNotificationManager = new FriendsNotificationManager();
    
    // Initialize tab manager
    window.friendsTabManager = new FriendsTabManager();
    
    // Handle URL parameters for pre-selecting friends in group creation
    const urlParams = new URLSearchParams(window.location.search);
    const inviteFriends = urlParams.get('inviteFriends');
    
    if (inviteFriends && document.getElementById('createGroupModal')) {
        // Pre-select friends when creating group
        const friendIds = inviteFriends.split(',');
        // This would be handled in your group creation form
        console.log('Pre-selecting friends for group:', friendIds);
    }
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        FriendsGroupIntegration,
        FriendsNotificationManager
    };
}