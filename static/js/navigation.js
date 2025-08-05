class NavigationManager {
    constructor() {
        this.currentPath = window.location.pathname;
        this.initialized = false;
        this.navItems = [];
        this._boundHandleNewEventClick = null;
        this._boundClosePopup = this.closePopup.bind(this); // bound close
        this.friends = []; // Store friends list
        this.setupSearchFunctionality();
        

        if (window.navigationManager) {
            return window.navigationManager;
        }
        window.navigationManager = this;
    }

    init() {
        if (this.initialized) return;

        this.setupNavigation();

        const close = document.getElementById('close');
        if (close) {
            console.log('close avail')
            close.addEventListener('click', () => this.closePopup('close'));
        }
        const close2 = document.getElementById('close2');
        if (close2) {
            console.log('close 2 avail')
            close2.addEventListener('click', () => this.closePopup('close2'));
        }
        const close3 = document.getElementById('close3');
        if (close3) {
            console.log('close 3 avail')
            close3.addEventListener('click', () => this.closePopup('close3'));
        }
        this.initialized = true;
    }

    setupNavigation() {
        const navItems = document.querySelectorAll('.nav-item');
        if (navItems.length === 0) return;

        this.navItems.forEach(item => {
            item.removeEventListener('click', this.handleNavClick);
        });

        this.navItems = Array.from(navItems);
        this.navItems.forEach(item => {
            item.addEventListener('click', this.handleNavClick.bind(this));
        });

        this.updateActiveState();
    }

    handleNavClick(event) {
        const navItem = event.currentTarget;
        const page = navItem.getAttribute('data-page');

        this.setActiveNavItem(navItem);

        switch (page) {
            case 'home':
                window.location.href = '/app';
                break;
            case 'groups':
                window.location.href = '/mobile/groups';
                break;
            case 'profile':
                window.location.href = '/mobile/profile';
                break;
            case 'compass':
                window.location.href = '/mobile/explore';
                break;
            case 'create':
                this.handleCreateClick();
                break;
            default:
                break;
        }
    }

    handleCreateClick() {
    const dropdown = document.getElementById('dropdown-menu');
    if (!dropdown) {
        console.warn('#dropdown-menu not found in DOM.');
        return;
    }

    dropdown.classList.toggle('hidden');

    const new_event = document.getElementById('new_event');
    const add_friend = document.getElementById('add_friend');
    const new_group = document.getElementById('new_group');

    // Remove previously bound event listener if it exists
    if (this._boundHandleNewEventClick) {
        new_event.removeEventListener('click', this._boundHandleNewEventClick);
        add_friend.removeEventListener('click', this._boundHandleNewEventClick);
        new_group.removeEventListener('click', this._boundHandleNewEventClick);
    }

    // Bind the method once and store it so it can be removed later
    this._boundHandleNewEventClick = this.handle_newevent_click.bind(this);
    new_event.addEventListener('click', this._boundHandleNewEventClick);
    add_friend.addEventListener('click', this._boundHandleNewEventClick);
    new_group.addEventListener('click', this._boundHandleNewEventClick);
}

   async handle_newevent_click(event) {
    const clickedId = event.target.id;
    const popup = document.getElementById('groupslist');
    const dropdown = document.getElementById('dropdown-menu');
    const banner = document.getElementById('header-container');

    const searchfriend = document.getElementById('searchfriend');
    const banner2 = document.getElementById('header-container2');

    const newgroup = document.getElementById('newgroup');
    const banner3 = document.getElementById('header-container3');

    switch (clickedId) {
        case 'new_event':
            console.log('clicked');
            searchfriend.classList.add('hidden');
            newgroup.classList.add('hidden');
            popup.classList.toggle('hidden');

            // Insert new title
            banner?.insertAdjacentHTML("beforeend", `
                <p style="margin: 0; font-size: 16px; position: absolute; left: 50%; transform: translateX(-50%);" id="title">
                    Select a group
                </p>
            `);

            dropdown?.classList.toggle('hidden');
            await this.loadUserGroups();
            break;

        case 'add_friend':
            popup.classList.add('hidden');
            newgroup.classList.add('hidden');
            searchfriend.classList.toggle('hidden');  // Ensure it's shown

            // Insert new title
            banner2?.insertAdjacentHTML("beforeend", `
                <p style="margin: 0; font-size: 16px; position: absolute; left: 50%; transform: translateX(-50%);" id="title">
                    Search friend
                </p>
            `);

            dropdown?.classList.toggle('hidden');
            break;
        case 'new_group':
            popup.classList.add('hidden');
            searchfriend.classList.add('hidden');
            newgroup.classList.toggle('hidden');
            banner3?.insertAdjacentHTML("beforeend", `
                <p style="margin: 0; font-size: 16px; position: absolute; left: 50%; transform: translateX(-50%);" id="title">
                    Enter group details
                </p>
            `);
            break
    }
}

closePopup(action) {
    console.log(action);
    switch (action) {
        case 'close':
            const popup = document.getElementById('groupslist');
            if (popup && !popup.classList.contains('hidden')) {
                popup.classList.add('hidden');
            }
            break;
        case 'close2':
            const popup2 = document.getElementById('searchfriend');
            if (popup2 && !popup2.classList.contains('hidden')) {
                popup2.classList.add('hidden');
            }
            break;
        case 'close3':
            const popup3 = document.getElementById('newgroup');
            if (popup3 && !popup3.classList.contains('hidden')) {
                popup3.classList.add('hidden');
            }
            break;
        default:
            console.warn('Unknown action:', action);
    }
}
    async loadUserGroups() {
        const currentUser = firebase.auth().currentUser;
        if (!currentUser) {
            console.log('User not authenticated');
            this.showEmptyGroupsState();
            return;
        }

        const db = firebase.firestore();
        const groupsContainer = document.getElementById('popupgroupslist');
        const loadingElement = document.getElementById('loadingGroups');

        if (!groupsContainer) return;

        loadingElement?.style.setProperty('display', 'flex');

        try {
            const snapshot = await db.collection('groups')
                .where(`members.${currentUser.uid}`, '!=', null)
                .get();

            loadingElement?.style.setProperty('display', 'none');

            if (snapshot.empty) {
                this.showEmptyGroupsState();
                return;
            }

            groupsContainer.innerHTML = '';

            const groups = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            groups.sort((a, b) =>
                (b.lastActivity?.seconds || 0) - (a.lastActivity?.seconds || 0)
            );

            for (const group of groups) {
                const memberCount = Object.keys(group.members || {}).length;
                const lastActivity = group.lastActivity
                    ? this.formatLastActivity(group.lastActivity.toDate())
                    : 'Recently';

                const groupItem = document.createElement('a');
                groupItem.className = 'grp-card';
                groupItem.setAttribute('data-group-id', group.id);

                groupItem.innerHTML = `
                    <div class="grp-img-wrap">
                        <img src="${group.avatar || '/static/images/group-placeholder.png'}" alt="Group">
                    </div>
                    <div class="grp-details">
                        <h3 class="grp-title" style="margin: 0;">${this.escapeHtml(group.name)}</h3>
                        <p class="grp-subtext" style="margin: 2px 0;">${memberCount} member${memberCount !== 1 ? 's' : ''}</p>
                        <p class="grp-desc" style="margin: 2px 0;">${this.escapeHtml(group.description || 'Tap to open chat')}</p>
                    </div>
                    <div class="grp-meta" style="margin-left: auto; text-align: right;">
                        <span class="invite-code" style="display: block;">Code: ${group.inviteCode}</span>
                        <span class="member-count" style="display: block;">${lastActivity}</span>
                    </div>
                `;

                // Track clicked group
                groupItem.addEventListener('click', () => {
                    console.log('Clicked group ID:', group.id);
                    this.selectedGroupId = group.id; // Store selected group ID
                    this.create_eventfield();
                });

                groupsContainer.appendChild(groupItem);
            }

            console.log(`Successfully loaded ${groups.length} groups`);
        } catch (error) {
            console.error('Error loading groups:', error);
            alert('Error loading groups: ' + error.message);
            this.showEmptyGroupsState();
        }
    }

// Called when user selects a group
handleGroupClick(groupId) {
    this.selectedGroupId = groupId;
    this.create_eventfield();
}

create_eventfield() {
    const p = document.getElementById('title');
    p.textContent = 'Enter Details';

    const body = document.getElementById('popupgroupslist');
    body.innerHTML = `
        <div class="eventpop group-col" id="eventpop" style="display: block;">
            <span class="event-title">New Event</span>
            <input type="text" placeholder="Event Name" id="eventname" class="event-input">
            <input type="text" placeholder="Event Description" id="eventdescription" class="event-input">

            <div class="event-date-time">
                <input type="date" id="eventdate" class="event-date-input">
                <input type="time" id="eventtime" class="event-time-input">
            </div>
            <div class="event-buttons" style="display: flex; justify-content: center; gap: 10px; margin-top: 10px;">
                <button class="event-cancel-btn" id="cancel">Cancel</button>
                <button class="event-save-btn" id="save">Save</button>
            </div>
        </div>
    `;

    document.getElementById('cancel').addEventListener('click', () => {
        p.textContent = 'Your Groups';
        this.loadUserGroups();
    });

    document.getElementById('save').addEventListener('click', () => {
        this.saveEvent();
    });
}

async saveEvent() {
    const eventName = document.getElementById('eventname').value.trim();
    const eventDescription = document.getElementById('eventdescription').value.trim();
    const eventDate = document.getElementById('eventdate').value;
    const eventTime = document.getElementById('eventtime').value;

    const errors = this.validateEventData({ name: eventName, description: eventDescription, date: eventDate, time: eventTime });
    if (errors.length > 0) {
        this.showToast(errors[0], 'error');
        return;
    }

    const saveBtn = document.getElementById('save');
    const originalText = saveBtn?.textContent || 'Save';

    try {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';

        const result = await this.createEvent({
            name: eventName,
            description: eventDescription,
            date: eventDate,
            time: eventTime
        });

        this.showToast('Event created successfully!', 'success');

        document.getElementById('title').textContent = 'Your Groups';
        this.loadUserGroups();

        const new_event = document.getElementById('groupslist');
        if (new_event){
            new_event.classList.toggle("hidden")
        };

        

    } catch (error) {
        console.error('Error creating event:', error);
        this.showToast('Failed to create event: ' + error.message, 'error');
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = originalText;
    }
}

async createEvent(eventData) {
    const user = firebase.auth().currentUser;
    if (!user) throw new Error('User not authenticated');

    const groupId = this.selectedGroupId;
    if (!groupId) throw new Error('No group selected');

    try {
        const eventRef = await firebase.firestore()
            .collection('groups')
            .doc(groupId)
            .collection('events')
            .add({
                name: eventData.name,
                description: eventData.description,
                date: eventData.date,
                time: eventData.time,
                createdBy: user.uid,
                createdByName: user.displayName || user.email.split('@')[0],
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                status: 'active',
                attendees: {},
                locations: {}
            });

        await this.sendEventMessage(groupId, eventRef.id, eventData);

        return { success: true, eventId: eventRef.id };
    } catch (error) {
        if (error.code === 'permission-denied') {
            throw new Error("You don't have permission to create events in this group");
        } else if (error.code === 'unavailable') {
            throw new Error("Service temporarily unavailable. Please try again");
        } else {
            throw new Error("Failed to create event: " + error.message);
        }
    }
}

async sendEventMessage(groupId, eventId, eventData) {
    const user = firebase.auth().currentUser;

    await firebase.firestore()
        .collection('groups')
        .doc(groupId)
        .collection('messages')
        .add({
            type: 'event',
            eventId: eventId,
            eventName: eventData.name,
            eventDescription: eventData.description,
            eventDate: eventData.date,
            eventTime: eventData.time,
            userId: user.uid,
            userName: user.displayName || user.email.split('@')[0],
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        
}

validateEventData(data) {
    const errors = [];

    if (!data.name) {
        errors.push('Event name is required');
    } else if (data.name.length > 50) {
        errors.push('Event name must be 50 characters or less');
    }

    if (!data.date) {
        errors.push('Event date is required');
    } else {
        const eventDate = new Date(data.date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (eventDate < today) {
            errors.push('Event date cannot be in the past');
        }
    }

    if (!data.time) {
        errors.push('Event time is required');
    }

    return errors;
}

showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            <i class="fas fa-${type === 'success' ? 'check' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${this.escapeHtml(message)}</span>
        </div>
    `;

    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 100);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => document.body.removeChild(toast), 300);
    }, 3000);
}

escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

    setActiveNavItem(activeItem) {
        this.navItems.forEach(item => {
            item.classList.remove('active');
        });
        activeItem.classList.add('active');
    }

    updateActiveState() {
        const path = window.location.pathname;
        let activePage = 'home';

        if (path.includes('/groups')) activePage = 'groups';
        else if (path.includes('/profile')) activePage = 'profile';
        else if (path === '/app') activePage = 'home';
        else if (path === '/mobile/explore') activePage = 'compass';

        const activeNavItem = document.querySelector(`[data-page="${activePage}"]`);
        if (activeNavItem) {
            this.setActiveNavItem(activeNavItem);
        }
    }

    formatLastActivity(date) {
        return date.toLocaleString();
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showEmptyGroupsState() {
        const container = document.getElementById('popupgroupsList') || document.querySelector('.group-list');
        if (container) {
            container.innerHTML = '<p class="empty-state">No groups found</p>';
        }
    }

    setupSearchFunctionality() {
        const searchInput = document.getElementById('nav-user-search-input');
        const searchResults = document.getElementById('nav-search-results');
        
        if (!searchInput || !searchResults) {
            console.warn('Search input or search results container not found in DOM');
            return;
        }

        console.log('Search input and results container found. Setting up listener.');

        // Debounce function to limit API calls
        let searchTimeout;

        searchInput.addEventListener('input', () => {
            const query = searchInput.value.trim();
            console.log(`Search input changed: "${query}"`);

            // Clear previous timeout
            clearTimeout(searchTimeout);

            if (query.length < 2) {
                console.log('Query too short, showing default prompt');
                searchResults.innerHTML = `
                    <div class="nav-empty-state">
                        <i class="fas fa-search"></i>
                        <p>Search for friends by name, username, or email address</p>
                    </div>
                `;
                return;
            }

            // Show loading state
            console.log('Valid query, showing loading spinner...');
            searchResults.innerHTML = `
                <div class="nav-loading">
                    <i class="fas fa-spinner fa-spin"></i>
                    <p>Searching...</p>
                </div>
            `;

            // Debounce search to prevent too many API calls
            searchTimeout = setTimeout(() => {
                console.log('Executing debounced search for:', query);
                this.searchUsers(query);
            }, 800);
        });
    }
    
    /**
     * Enhanced searchUsers method with improved API response handling
     */
    searchUsers(query) {
        const searchResults = document.getElementById('nav-search-results');
        if (!searchResults) {
            console.warn('Search results container not found');
            return;
        }

        console.log(`Searching for users with query: "${query}"`);

        fetch(`/api/friends/search?q=${encodeURIComponent(query)}`)
            .then(response => {
                console.log(`Received response with status: ${response.status}`);
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.json();
            })
            .then(result => {
                console.log('Search API response:', result);
                
                // Handle both new and old API response formats
                let users = [];
                if (result.status === 'success' && result.data && result.data.users) {
                    users = result.data.users;
                } else if (result.users) {
                    users = result.users;
                }
                
                if (users.length > 0) {
                    this.displaySearchResults(users);
                } else {
                    this.showNoResultsMessage(query);
                }
            })
            .catch(error => {
                console.error('Error searching users:', error);
                this.showSearchError();
            });
    }

    /**
     * Helper method to display no results message
     */
    showNoResultsMessage(query) {
        const searchResults = document.getElementById('nav-search-results');
        if (!searchResults) return;
        
        searchResults.innerHTML = `
            <div class="nav-empty-state">
                <i class="fas fa-user-times"></i>
                <p>No users found matching "${this.escapeHtml(query)}"</p>
            </div>
        `;
    }

    /**
     * Helper method to display search error
     */
    showSearchError() {
        const searchResults = document.getElementById('nav-search-results');
        if (!searchResults) return;
        
        searchResults.innerHTML = `
            <div class="nav-empty-state error">
                <i class="fas fa-exclamation-circle"></i>
                <p>Error searching users. Please try again.</p>
            </div>
        `;
    }

    /**
     * Load the current user's friends list
     */
    loadFriends() {
        return fetch('/api/friends')
            .then(response => response.json())
            .then(result => {
                console.log('Friends API response:', result);
                
                // Handle both response formats
                if (result.status === 'success' && result.data && result.data.friends) {
                    this.friends = result.data.friends;
                } else if (result.friends) {
                    this.friends = result.friends;
                } else {
                    this.friends = [];
                }
                
                // Dispatch event for other components
                document.dispatchEvent(new CustomEvent('friendsLoaded', {
                    detail: { friends: this.friends }
                }));
                
                return this.friends;
            })
            .catch(error => {
                console.error('Error loading friends:', error);
                this.friends = [];
                return [];
            });
    }
    
    displaySearchResults(users) {
        const searchResults = document.getElementById('nav-search-results');
        if (!searchResults) return;
        
        let html = '';
        users.forEach(user => {
            // Determine button state based on relationship
            let buttonClass, buttonText, buttonIcon, disabled = '';
            if (user.isFriend) {
                buttonClass = 'nav-btn-friends';
                buttonText = 'Friends';
                buttonIcon = 'fa-check';
                disabled = 'disabled';
            } else if (user.requestPending) {
                buttonClass = 'nav-btn-request-sent';
                buttonText = 'Request Sent';
                buttonIcon = 'fa-clock';
                disabled = 'disabled';
            } else {
                buttonClass = 'nav-btn-add-friend';
                buttonText = 'Add Friend';
                buttonIcon = 'fa-user-plus';
            }
            
            html += `
                <div class="nav-user-card" data-user-id="${user.userId}">
                    <div class="nav-user-info">
                        <div class="nav-user-details">
                            <h5>${user.name}</h5>
                            <p>${user.email}</p>
                        </div>
                    </div>
                    <div class="nav-user-actions">
                        <button class="nav-btn-friend-status ${buttonClass} ${!disabled ? 'send-request' : ''}" 
                                data-user-id="${user.userId}" ${disabled}>
                            <i class="fas ${buttonIcon}"></i> ${buttonText}
                        </button>
                    </div>
                </div>
            `;
        });
        
        // Wrap results in a container with the nav-specific class
        searchResults.innerHTML = `
            <div class="nav-search-results">
                ${html || `
                <div class="nav-empty-state">
                    <i class="fas fa-user-times"></i>
                    <p>No users found</p>
                </div>`}
            </div>
        `;
        
        // Add event listeners for send request buttons
        const sendRequestButtons = searchResults.querySelectorAll('.send-request');
        sendRequestButtons.forEach(button => {
            button.addEventListener('click', () => {
                const userId = button.getAttribute('data-user-id');
                this.sendFriendRequest(userId, button);
            });
        });
    }

    /**
     * Send friend request to a user
     */
    sendFriendRequest(userId, buttonElement) {
        if (!userId) {
            console.error('No user ID provided for friend request');
            return;
        }

        const requestData = {
            userId: userId
        };

        fetch('/api/friends/requests', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestData)
        })
        .then(response => response.json())
        .then(result => {
            if (result.status === 'success') {
                // Update UI to show request sent
                if (buttonElement) {
                    buttonElement.innerHTML = '<i class="fas fa-clock"></i> Request Sent';
                    buttonElement.classList.remove('btn-primary', 'send-request');
                    buttonElement.classList.add('btn-secondary');
                    buttonElement.disabled = true;
                }
                this.showToast('Friend request sent!', 'success');
            } else {
                throw new Error(result.message || 'Failed to send friend request');
            }
        })
        .catch(error => {
            console.error('Error sending friend request:', error);
            this.showToast('Failed to send friend request', 'error');
        });
    }

}

// Initialize after DOM is loaded
document.addEventListener('DOMContentLoaded', function () {
    if (!window.navigationManager) {
        const navManager = new NavigationManager();
        navManager.init();
        
        // Load friends when the page loads
        navManager.loadFriends().then(() => {
            console.log('Friends loaded:', navManager.friends);
        });
    }
});