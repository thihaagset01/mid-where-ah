/**
 * Friends API Adapter - Handles the new standardized API format
 * Add this to friends.html to fix the response format issue
 */

// Override the friends loading function to handle new API format
document.addEventListener('DOMContentLoaded', function() {
    // Wait a bit for friends.js to load, then override the methods
    setTimeout(() => {
        if (window.friendsManager && window.friendsManager.loadFriends) {
            // Override the loadFriends method
            const originalLoadFriends = window.friendsManager.loadFriends.bind(window.friendsManager);
            
            window.friendsManager.loadFriends = function() {
                // Use the API endpoint to get friends
                fetch('/api/friends')
                    .then(response => response.json())
                    .then(result => {
                        console.log('Friends API response:', result);
                        
                        // Handle new API format
                        if (result.status === 'success' && result.data && result.data.friends) {
                            this.friends = result.data.friends;
                        } else if (result.friends) {
                            // Fallback for old format
                            this.friends = result.friends;
                        } else {
                            this.friends = [];
                        }
                        
                        // Dispatch friends loaded event
                        document.dispatchEvent(new CustomEvent('friendsLoaded', {
                            detail: { friends: this.friends }
                        }));
                    })
                    .catch(error => {
                        console.error('Error loading friends:', error);
                        this.friends = [];
                        document.dispatchEvent(new CustomEvent('friendsLoaded', {
                            detail: { friends: [] }
                        }));
                    });
            };
            
            // Trigger initial load
            window.friendsManager.loadFriends();
        }
        
        // Also override the API response handling in search and requests
        if (window.friendsPageManager) {
            // Override search users method
            const originalSearchUsers = window.friendsPageManager.searchUsers.bind(window.friendsPageManager);
            
            window.friendsPageManager.searchUsers = function(query) {
                const searchResults = document.getElementById('search-results');
                if (!searchResults) return;
                
                // Call search API
                fetch(`/api/friends/search?q=${encodeURIComponent(query)}`)
                    .then(response => response.json())
                    .then(result => {
                        console.log('Search API response:', result);
                        
                        let users = [];
                        if (result.status === 'success' && result.data && result.data.users) {
                            users = result.data.users;
                        } else if (result.users) {
                            users = result.users;
                        }
                        
                        this.displaySearchResults(users);
                    })
                    .catch(error => {
                        console.error('Search error:', error);
                        searchResults.innerHTML = `
                            <div class="empty-state error">
                                <i class="fas fa-exclamation-circle"></i>
                                <p>Error searching users</p>
                            </div>
                        `;
                    });
            };
            
            // Override load friend requests
            const originalLoadFriendRequests = window.friendsPageManager.loadFriendRequests.bind(window.friendsPageManager);
            
            window.friendsPageManager.loadFriendRequests = function() {
                fetch('/api/friends/requests')
                    .then(response => response.json())
                    .then(result => {
                        console.log('Friend requests API response:', result);
                        
                        let requests = [];
                        if (result.status === 'success' && result.data && result.data.requests) {
                            requests = result.data.requests;
                        } else if (result.requests) {
                            requests = result.requests;
                        }
                        
                        this.displayFriendRequests(requests);
                    })
                    .catch(error => {
                        console.error('Error loading friend requests:', error);
                        if (requestsContainer) {
                            requestsContainer.innerHTML = `
                                <div class="empty-state error">
                                    <i class="fas fa-exclamation-circle"></i>
                                    <p>Error loading friend requests</p>
                                </div>
                            `;
                        }
                    });
            };
        }
    }, 1000);
});

// Debug function to test friends API
window.testFriendsAPI = function() {
    console.log('Testing friends API...');
    
    fetch('/api/friends')
        .then(response => response.json())
        .then(result => {
            console.log('Friends API test result:', result);
            alert(`Friends API test:\nStatus: ${result.status}\nFriends count: ${result.data?.friends?.length || 0}`);
        })
        .catch(error => {
            console.error('Friends API test error:', error);
            alert('Friends API test failed: ' + error.message);
        });
};