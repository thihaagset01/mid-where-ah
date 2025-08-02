// =============================================================================
// FRIENDS INTEGRATION WITH EXISTING GROUP FEATURES
// =============================================================================

class FriendsGroupIntegration {
    constructor() {
        this.friendsManager = new FriendsManager();
        this.setupGroupIntegration();
    }

    setupGroupIntegration() {
        // Enhanced group creation with friend invitations
        this.enhanceGroupCreation();
        
        // Add friends to existing groups
        this.enhanceGroupMemberManagement();
        
        // Quick group creation from friends list
        this.setupQuickGroupCreation();
    }

    // Enhance group creation form to include friend selection
    enhanceGroupCreation() {
        const groupForm = document.getElementById('create-group-form');
        if (!groupForm) return;

        // Add friends selection section to group creation
        const friendsSection = this.createFriendsSelectionSection();
        
        // Insert after group name/description fields
        const submitButton = groupForm.querySelector('button[type="submit"]');
        if (submitButton) {
            submitButton.parentNode.insertBefore(friendsSection, submitButton);
        }

        // Load friends when form is shown
        const groupModal = document.getElementById('createGroupModal');
        if (groupModal) {
            groupModal.addEventListener('shown.bs.modal', () => {
                this.loadFriendsForSelection();
            });
        }
    }

    createFriendsSelectionSection() {
        const section = document.createElement('div');
        section.className = 'mb-3';
        section.innerHTML = `
            <label class="form-label">
                <i class="fas fa-user-friends me-2"></i>Invite Friends
            </label>
            <div class="friends-selection-container">
                <div class="input-group mb-2">
                    <input type="text" 
                           class="form-control" 
                           id="friend-search-input" 
                           placeholder="Search friends to invite...">
                    <span class="input-group-text">
                        <i class="fas fa-search"></i>
                    </span>
                </div>
                <div id="friends-selection-list" class="friends-selection-list">
                    <div class="text-center text-muted py-3">
                        <i class="fas fa-spinner fa-spin"></i>
                        <span class="ms-2">Loading friends...</span>
                    </div>
                </div>
                <div id="selected-friends" class="selected-friends mt-2">
                    <!-- Selected friends will appear here -->
                </div>
            </div>
            <small class="form-text text-muted">
                You can also invite friends later from the group page
            </small>
        `;

        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            .friends-selection-list {
                max-height: 200px;
                overflow-y: auto;
                border: 1px solid #dee2e6;
                border-radius: 8px;
                background: white;
            }
            
            .friend-selection-item {
                padding: 10px 15px;
                border-bottom: 1px solid #f8f9fa;
                cursor: pointer;
                transition: background-color 0.2s;
            }
            
            .friend-selection-item:last-child {
                border-bottom: none;
            }
            
            .friend-selection-item:hover {
                background: #f8f9fa;
            }
            
            .friend-selection-item.selected {
                background: #e3f2fd;
                border-left: 4px solid #2196f3;
            }
            
            .selected-friends {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
            }
            
            .selected-friend-badge {
                background: #e3f2fd;
                color: #1976d2;
                padding: 6px 12px;
                border-radius: 20px;
                font-size: 14px;
                display: flex;
                align-items: center;
                gap: 6px;
            }
            
            .selected-friend-badge .remove-btn {
                background: none;
                border: none;
                color: #1976d2;
                cursor: pointer;
                padding: 0;
                font-size: 16px;
            }
        `;
        document.head.appendChild(style);

        return section;
    }

    async loadFriendsForSelection() {
        const friendsList = document.getElementById('friends-selection-list');
        if (!friendsList) return;

        try {
            const friends = await this.friendsManager.getFriends();
            
            if (friends.length === 0) {
                friendsList.innerHTML = `
                    <div class="text-center text-muted py-3">
                        <i class="fas fa-users"></i>
                        <div class="mt-2">No friends to invite</div>
                        <small>Add friends first to invite them to groups</small>
                    </div>
                `;
                return;
            }

            friendsList.innerHTML = friends.map(friend => `
                <div class="friend-selection-item" 
                     data-friend-id="${friend.userId}"
                     data-friend-name="${friend.name}"
                     data-friend-email="${friend.email}">
                    <div class="d-flex align-items-center">
                        <img src="${friend.photoURL || '/static/images/profile_photo-placeholder.png'}" 
                             class="rounded-circle me-3" 
                             width="32" height="32" alt="Profile">
                        <div>
                            <div class="fw-bold">${friend.name}</div>
                            <small class="text-muted">${friend.email}</small>
                        </div>
                    </div>
                </div>
            `).join('');

            // Add click handlers
            friendsList.querySelectorAll('.friend-selection-item').forEach(item => {
                item.addEventListener('click', () => this.toggleFriendSelection(item));
            });

            // Add search functionality
            const searchInput = document.getElementById('friend-search-input');
            if (searchInput) {
                searchInput.addEventListener('input', (e) => {
                    this.filterFriendsList(e.target.value);
                });
            }

        } catch (error) {
            console.error('Error loading friends for selection:', error);
            friendsList.innerHTML = `
                <div class="text-center text-danger py-3">
                    <i class="fas fa-exclamation-triangle"></i>
                    <div class="mt-2">Error loading friends</div>
                </div>
            `;
        }
    }

    toggleFriendSelection(item) {
        const friendId = item.dataset.friendId;
        const friendName = item.dataset.friendName;
        const friendEmail = item.dataset.friendEmail;
        
        if (item.classList.contains('selected')) {
            // Deselect
            item.classList.remove('selected');
            this.removeSelectedFriend(friendId);
        } else {
            // Select
            item.classList.add('selected');
            this.addSelectedFriend(friendId, friendName, friendEmail);
        }
    }

    addSelectedFriend(friendId, friendName, friendEmail) {
        const selectedContainer = document.getElementById('selected-friends');
        if (!selectedContainer) return;

        const badge = document.createElement('span');
        badge.className = 'selected-friend-badge';
        badge.dataset.friendId = friendId;
        badge.innerHTML = `
            <span>${friendName}</span>
            <button type="button" class="remove-btn" onclick="this.closest('.selected-friend-badge').remove(); friendsGroupIntegration.deselectFriend('${friendId}')">
                <i class="fas fa-times"></i>
            </button>
        `;

        selectedContainer.appendChild(badge);
    }

    removeSelectedFriend(friendId) {
        const selectedContainer = document.getElementById('selected-friends');
        if (!selectedContainer) return;

        const badge = selectedContainer.querySelector(`[data-friend-id="${friendId}"]`);
        if (badge) {
            badge.remove();
        }
    }

    deselectFriend(friendId) {
        const friendItem = document.querySelector(`[data-friend-id="${friendId}"]`);
        if (friendItem) {
            friendItem.classList.remove('selected');
        }
    }

    filterFriendsList(query) {
        const friendItems = document.querySelectorAll('.friend-selection-item');
        const searchTerm = query.toLowerCase();

        friendItems.forEach(item => {
            const name = item.dataset.friendName.toLowerCase();
            const email = item.dataset.friendEmail.toLowerCase();
            
            if (name.includes(searchTerm) || email.includes(searchTerm)) {
                item.style.display = 'block';
            } else {
                item.style.display = 'none';
            }
        });
    }

    // Get selected friend IDs for group creation
    getSelectedFriendIds() {
        const selectedBadges = document.querySelectorAll('.selected-friend-badge');
        return Array.from(selectedBadges).map(badge => badge.dataset.friendId);
    }

    // Enhanced group member management
    enhanceGroupMemberManagement() {
        // Add "Add Friends" button to existing group member sections
        const memberSections = document.querySelectorAll('.group-members-section');
        
        memberSections.forEach(section => {
            const addFriendsBtn = document.createElement('button');
            addFriendsBtn.className = 'btn btn-outline-primary btn-sm mt-2';
            addFriendsBtn.innerHTML = '<i class="fas fa-user-plus me-1"></i>Add Friends';
            addFriendsBtn.onclick = () => this.showAddFriendsModal(section.dataset.groupId);
            
            section.appendChild(addFriendsBtn);
        });
    }

    showAddFriendsModal(groupId) {
        // Create and show modal for adding friends to existing group
        const modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.innerHTML = `
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">
                            <i class="fas fa-user-plus me-2"></i>Add Friends to Group
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="mb-3">
                            <input type="text" 
                                   class="form-control" 
                                   id="add-friends-search" 
                                   placeholder="Search friends...">
                        </div>
                        <div id="add-friends-list" style="max-height: 300px; overflow-y: auto;">
                            <!-- Friends list will be loaded here -->
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-primary" onclick="friendsGroupIntegration.addSelectedFriendsToGroup('${groupId}')">
                            Add Selected Friends
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();

        // Load friends not already in group
        this.loadAvailableFriendsForGroup(groupId);

        // Clean up modal when hidden
        modal.addEventListener('hidden.bs.modal', () => {
            document.body.removeChild(modal);
        });
    }

    async loadAvailableFriendsForGroup(groupId) {
        const friendsList = document.getElementById('add-friends-list');
        if (!friendsList) return;

        try {
            // Get all friends
            const allFriends = await this.friendsManager.getFriends();
            
            // Get current group members
            const db = firebase.firestore();
            const groupDoc = await db.collection('groups').doc(groupId).get();
            const groupData = groupDoc.data();
            const currentMembers = Object.keys(groupData.members || {});

            // Filter out friends already in group
            const availableFriends = allFriends.filter(friend => 
                !currentMembers.includes(friend.userId)
            );

            if (availableFriends.length === 0) {
                friendsList.innerHTML = `
                    <div class="text-center text-muted py-4">
                        <i class="fas fa-users"></i>
                        <div class="mt-2">All your friends are already in this group</div>
                    </div>
                `;
                return;
            }

            friendsList.innerHTML = availableFriends.map(friend => `
                <label class="d-flex align-items-center p-2 border rounded mb-2 cursor-pointer">
                    <input type="checkbox" class="me-3" value="${friend.userId}">
                    <img src="${friend.photoURL || '/static/images/profile_photo-placeholder.png' }" 
                         class="rounded-circle me-3" 
                         width="32" height="32" alt="Profile">
                    <div>
                        <div class="fw-bold">${friend.name}</div>
                        <small class="text-muted">${friend.email}</small>
                    </div>
                </label>
            `).join('');

        } catch (error) {
            console.error('Error loading available friends:', error);
            friendsList.innerHTML = `
                <div class="text-center text-danger py-4">
                    <i class="fas fa-exclamation-triangle"></i>
                    <div class="mt-2">Error loading friends</div>
                </div>
            `;
        }
    }

    async addSelectedFriendsToGroup(groupId) {
        const selectedCheckboxes = document.querySelectorAll('#add-friends-list input[type="checkbox"]:checked');
        const selectedFriendIds = Array.from(selectedCheckboxes).map(cb => cb.value);

        if (selectedFriendIds.length === 0) {
            alert('Please select at least one friend to add');
            return;
        }

        try {
            const db = firebase.firestore();
            const batch = db.batch();
            const groupRef = db.collection('groups').doc(groupId);

            // Get friend data and add them to group
            for (const friendId of selectedFriendIds) {
                const userDoc = await db.collection('users').doc(friendId).get();
                const userData = userDoc.data();

                // Add friend to group members
                batch.update(groupRef, {
                    [`members.${friendId}`]: {
                        name: userData.name,
                        email: userData.email,
                        photoURL: userData.photoURL || '',
                        joinedAt: firebase.firestore.FieldValue.serverTimestamp(),
                        role: 'member'
                    }
                });
            }

            await batch.commit();

            // Close modal
            const modal = document.querySelector('.modal.show');
            if (modal) {
                bootstrap.Modal.getInstance(modal).hide();
            }

            // Show success message
            if (typeof showNotification === 'function') {
                showNotification(`${selectedFriendIds.length} friend(s) added to group!`, 'success');
            }

            // Refresh page or update UI
            window.location.reload();

        } catch (error) {
            console.error('Error adding friends to group:', error);
            if (typeof showNotification === 'function') {
                showNotification('Error adding friends to group', 'danger');
            }
        }
    }

    // Quick group creation from friends page
    setupQuickGroupCreation() {
        // Add this method to the friends UI
        window.createGroupWithFriends = (selectedFriendIds) => {
            // Redirect to group creation with pre-selected friends
            const params = new URLSearchParams();
            params.set('inviteFriends', selectedFriendIds.join(','));
            window.location.href = `/group?${params.toString()}`;
        };
    }
}

