// Complete Working Group Chat System - Replace your entire group_chat.js file
document.addEventListener('DOMContentLoaded', function() {
    // Ensure chat elements are hidden initially
    document.body.classList.remove('chat-loaded');
});
class GroupChatManager {
    constructor(groupId) {
        // Remove loading class and ensure elements are hidden initially
        document.body.classList.remove('chat-loaded');
        
        this.groupId = groupId;
        this.db = firebase.firestore();
        this.auth = firebase.auth();
        this.messagesListener = null;
        this.eventsListener = null;
        this.eventUnsubscribes = new Map();
        this.isInitialized = false;
        
        // Show loading overlay immediately
        this.showLoadingOverlay();
        
        this.waitForAuth();
    }

    // Show loading overlay
    showLoadingOverlay() {
        // Ensure body doesn't have chat-loaded class
        document.body.classList.remove('chat-loaded');
        
        // Your CSS already hides elements, so just add the loading overlay
        const loadingHTML = `
            <div class="chat-loading-overlay" id="chatLoadingOverlay">
                <div class="chat-loading-spinner"></div>
                <div class="chat-loading-text">Loading Chat...</div>
                <div class="chat-loading-subtext">Setting up your group conversation</div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', loadingHTML);
    }

    // Updated to work with your CSS
    hideLoadingOverlay() {
        const loadingOverlay = document.getElementById('chatLoadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.style.opacity = '0';
            setTimeout(() => {
                loadingOverlay.remove();
            }, 500);
        }
        
        // Add chat-loaded class to show all elements with smooth transition
        setTimeout(() => {
            document.body.classList.add('chat-loaded');
        }, 200);
    }

    // Update loading text
    updateLoadingText(mainText, subText) {
        const loadingTextEl = document.querySelector('.chat-loading-text');
        const loadingSubtextEl = document.querySelector('.chat-loading-subtext');
        
        if (loadingTextEl) {
            loadingTextEl.textContent = mainText;
        }
        if (loadingSubtextEl) {
            loadingSubtextEl.textContent = subText;
        }
    }

    // Wait for authentication
    async waitForAuth() {
        return new Promise((resolve, reject) => {
            // Update loading text
            this.updateLoadingText('Authenticating...', 'Verifying your access');
            
            const unsubscribe = this.auth.onAuthStateChanged(async (user) => {
                if (user) {
                    console.log('User authenticated:', user.uid, user.email);
                    try {
                        this.updateLoadingText('Checking Access...', 'Verifying group membership');
                        await this.verifyGroupAccess(user.uid);
                        
                        this.updateLoadingText('Loading Messages...', 'Setting up real-time chat');
                        await this.initializeChat();
                        
                        this.updateLoadingText('Almost Ready...', 'Finalizing setup');
                        
                        // Wait a moment for everything to load
                        setTimeout(() => {
                            this.isInitialized = true;
                            this.hideLoadingOverlay();
                            resolve(user);
                        }, 1000);
                        
                    } catch (error) {
                        console.error('Group access verification failed:', error);
                        this.updateLoadingText('Access Denied', 'Redirecting...');
                        setTimeout(() => {
                            alert('You don\'t have access to this group or it doesn\'t exist.');
                            window.location.href = '/groups';
                        }, 1500);
                        reject(error);
                    }
                } else {
                    console.error('No authenticated user found');
                    this.updateLoadingText('Not Signed In', 'Redirecting to login...');
                    setTimeout(() => {
                        window.location.href = '/login';
                    }, 1500);
                    reject(new Error('No authenticated user'));
                }
                unsubscribe();
            });
        });
    }

    // Verify group access
    async verifyGroupAccess(userId) {
        try {
            const groupDoc = await this.db.collection('groups').doc(this.groupId).get();
            
            if (!groupDoc.exists) {
                throw new Error('Group not found');
            }
            
            const groupData = groupDoc.data();
            if (!groupData.members || !groupData.members[userId]) {
                throw new Error('User is not a member of this group');
            }
            
            console.log('Group access verified for user:', userId);
            return true;
        } catch (error) {
            console.error('Group access verification error:', error);
            throw error;
        }
    }

    // Initialize chat
    async initializeChat() {
        this.updateLoadingText('Setting up Chat...', 'Loading messages');
        await this.setupMessageListener();
        
        this.updateLoadingText('Loading Events...', 'Setting up event updates');
        await this.setupEventListener();
        
        this.updateLoadingText('Preparing Interface...', 'Setting up controls');
        this.setupMessageInput();
        
        this.updateLoadingText('Loading Group Info...', 'Getting group details');
        await this.loadInitialData();
    }

    // Setup message listener
    async setupMessageListener() {
        const messagesRef = this.db.collection('groups').doc(this.groupId).collection('messages');
        
        this.messagesListener = messagesRef
            .orderBy('timestamp', 'asc')
            .onSnapshot((snapshot) => {
                snapshot.docChanges().forEach((change) => {
                    if (change.type === 'added') {
                        this.displayMessage(change.doc.data(), change.doc.id);
                    }
                });
            }, (error) => {
                console.error('Error listening to messages:', error);
            });
    }

    // Setup event listener
    async setupEventListener() {
        const eventsRef = this.db.collection('groups').doc(this.groupId).collection('events');
        
        this.eventsListener = eventsRef
            .orderBy('createdAt', 'desc')
            .onSnapshot((snapshot) => {
                // Only handle real-time updates for existing event cards in chat
                snapshot.docChanges().forEach((change) => {
                    if (change.type === 'modified') {
                        const eventData = change.doc.data();
                        const eventId = change.doc.id;
                        this.updateChatEventCard(eventId, eventData);
                    }
                });
            }, (error) => {
                console.error('Error listening to events:', error);
            });
    }

    // Send message
    async sendMessage(messageText) {
        if (!messageText.trim()) return;

        const user = this.auth.currentUser;
        if (!user) return;

        try {
            await this.db.collection('groups').doc(this.groupId).collection('messages').add({
                type: 'text',
                text: messageText.trim(),
                userId: user.uid,
                userName: user.displayName || user.email.split('@')[0],
                userPhotoURL: user.photoURL || null,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });

            await this.db.collection('groups').doc(this.groupId).update({
                lastActivity: firebase.firestore.FieldValue.serverTimestamp()
            });

        } catch (error) {
            console.error('Error sending message:', error);
            alert('Failed to send message. Please try again.');
        }
    }

    // Display message
    displayMessage(messageData, messageId) {
        const chatContent = document.querySelector('.chat-content');
        if (!chatContent) return;

        const user = this.auth.currentUser;
        const isOwnMessage = messageData.userId === user?.uid;
        const timestamp = messageData.timestamp ? 
            new Date(messageData.timestamp.seconds * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 
            'Now';

        let messageHTML = '';

        if (messageData.type === 'text') {
            messageHTML = `
                <div class="message ${isOwnMessage ? 'own-message' : 'other-message'}" data-message-id="${messageId}">
                    <div class="message-header">
                        <span class="message-author">${messageData.userName}</span>
                        <span class="message-time">${timestamp}</span>
                    </div>
                    <div class="message-content">
                        <p>${this.escapeHtml(messageData.text)}</p>
                    </div>
                </div>
            `;
        } else if (messageData.type === 'event') {
            messageHTML = this.createEventMessageHTML(messageData, messageId);
            // Set up real-time listener for this specific event
            setTimeout(() => {
                this.loadEventAttendeeInfo(messageData.eventId);
            }, 100);
        } else if (messageData.type === 'system') {
            messageHTML = `
                <div class="system-message" data-message-id="${messageId}">
                    <p>${this.escapeHtml(messageData.text)}</p>
                </div>
            `;
        }

        this.insertMessageInOrder(chatContent, messageHTML, messageData.timestamp);
        this.scrollToBottom();
    }

    // Setup message input
    setupMessageInput() {
        const messageInput = document.querySelector('.message-input');
        const sendButton = document.querySelector('.send-button');

        if (!messageInput || !sendButton) return;

        sendButton.addEventListener('click', () => {
            this.sendMessage(messageInput.value);
            messageInput.value = '';
        });

        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage(messageInput.value);
                messageInput.value = '';
            }
        });
    }

    // Create event
    async createEvent(eventData) {
        const user = this.auth.currentUser;
        if (!user) {
            throw new Error('User not authenticated');
        }

        try {
            await this.verifyGroupAccess(user.uid);

            const eventRef = await this.db.collection('groups').doc(this.groupId).collection('events').add({
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

            // Send event message to chat
            await this.sendEventMessage(eventRef.id, eventData);

            return { success: true, eventId: eventRef.id };

        } catch (error) {
            console.error('Error creating event:', error);
            
            if (error.code === 'permission-denied') {
                throw new Error('You don\'t have permission to create events in this group.');
            } else if (error.code === 'unavailable') {
                throw new Error('Service temporarily unavailable. Please try again.');
            } else {
                throw new Error('Failed to create event: ' + error.message);
            }
        }
    }

    // Send event message
    async sendEventMessage(eventId, eventData) {
        const user = this.auth.currentUser;
        
        await this.db.collection('groups').doc(this.groupId).collection('messages').add({
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

    // Join event
    async joinEvent(eventId) {
        const user = this.auth.currentUser;
        if (!user) return;

        try {
            await this.db.collection('groups').doc(this.groupId)
                .collection('events').doc(eventId).update({
                    [`attendees.${user.uid}`]: {
                        name: user.displayName || user.email.split('@')[0],
                        status: 'attending',
                        joinedAt: firebase.firestore.FieldValue.serverTimestamp()
                    }
                });
            
            this.showEventToast('You joined the event!', 'success');
            
        } catch (error) {
            console.error('Error joining event:', error);
            this.showEventToast('Failed to join event.', 'error');
        }
    }

    // Decline event
    async declineEvent(eventId) {
        const user = this.auth.currentUser;
        if (!user) return;

        try {
            await this.db.collection('groups').doc(this.groupId)
                .collection('events').doc(eventId).update({
                    [`attendees.${user.uid}`]: {
                        name: user.displayName || user.email.split('@')[0],
                        status: 'declined',
                        respondedAt: firebase.firestore.FieldValue.serverTimestamp()
                    }
                });
            
            this.showEventToast('You declined the event.', 'success');
            
        } catch (error) {
            console.error('Error declining event:', error);
            this.showEventToast('Failed to decline event.', 'error');
        }
    }

    // Create event message HTML
    createEventMessageHTML(messageData, messageId) {
        const timestamp = messageData.timestamp ? 
            new Date(messageData.timestamp.seconds * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 
            'Now';

        return `
            <div class="event-message" data-message-id="${messageId}">
                <div class="event-header">
                    <span class="event-author">${messageData.userName} created an event</span>
                    <span class="event-time">${timestamp}</span>
                </div>
                <div class="event-card chat-event-card" data-event-id="${messageData.eventId}">
                    <h4 class="event-title">${this.escapeHtml(messageData.eventName)}</h4>
                    <p class="event-description">${this.escapeHtml(messageData.eventDescription)}</p>
                    <div class="event-details">
                        <span class="event-date">
                            <i class="fas fa-calendar"></i> ${messageData.eventDate}
                        </span>
                        <span class="event-time-detail">
                            <i class="fas fa-clock"></i> ${messageData.eventTime}
                        </span>
                    </div>
                    
                    <div class="event-attendee-preview" id="attendee-preview-${messageData.eventId}">
                        <span class="loading-attendees">Loading attendee info...</span>
                    </div>
                    
                    <div class="event-actions" id="actions-${messageData.eventId}">
                        <button class="event-btn join-btn" onclick="window.groupChatManager.joinEvent('${messageData.eventId}')">
                            <i class="fas fa-check"></i> Join
                        </button>
                        <button class="event-btn decline-btn" onclick="window.groupChatManager.declineEvent('${messageData.eventId}')">
                            <i class="fas fa-times"></i> Can't Make It
                        </button>
                        <button class="event-btn details-btn primary" onclick="window.viewEventDetails('${messageData.eventId}')">
                            <i class="fas fa-map-marker-alt"></i> View Map
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    // Load event attendee info
    loadEventAttendeeInfo(eventId) {
        const eventRef = this.db.collection('groups').doc(this.groupId)
            .collection('events').doc(eventId);
        
        const unsubscribe = eventRef.onSnapshot((doc) => {
            if (doc.exists) {
                const eventData = doc.data();
                this.updateChatEventCard(eventId, eventData);
            }
        });
        
        this.eventUnsubscribes.set(eventId, unsubscribe);
    }

    // Update chat event card
    updateChatEventCard(eventId, eventData) {
        const user = this.auth.currentUser;
        const attendees = eventData.attendees || {};
        const attendingCount = Object.values(attendees).filter(a => a.status === 'attending').length;
        const declinedCount = Object.values(attendees).filter(a => a.status === 'declined').length;
        const userStatus = attendees[user?.uid]?.status || null;
        
        // Update attendee preview
        const attendeePreview = document.getElementById(`attendee-preview-${eventId}`);
        if (attendeePreview) {
            attendeePreview.innerHTML = `
                <div class="attendee-summary">
                    <span class="attending-summary">
                        <i class="fas fa-check-circle text-success"></i> ${attendingCount} attending
                    </span>
                    ${declinedCount > 0 ? `
                        <span class="declined-summary">
                            <i class="fas fa-times-circle text-muted"></i> ${declinedCount} can't make it
                        </span>
                    ` : ''}
                </div>
            `;
        }
        
        // Update buttons
        const actionsContainer = document.getElementById(`actions-${eventId}`);
        if (actionsContainer) {
            actionsContainer.innerHTML = this.renderEventActionButtons(eventId, userStatus);
            
            // Add status indicator if user has responded
            let statusContainer = actionsContainer.previousElementSibling;
            if (statusContainer && statusContainer.classList.contains('user-event-status')) {
                statusContainer.remove();
            }
            
            if (userStatus) {
                const statusHTML = this.renderUserEventStatus(userStatus);
                if (statusHTML) {
                    actionsContainer.insertAdjacentHTML('beforebegin', statusHTML);
                }
            }
        }
    }

    // Render user event status
    renderUserEventStatus(userStatus) {
        if (!userStatus) return '';
        
        const statusConfig = {
            attending: {
                class: 'attending',
                icon: 'fas fa-check-circle',
                text: "You're attending this event",
                color: 'success'
            },
            declined: {
                class: 'declined', 
                icon: 'fas fa-times-circle',
                text: "You can't make it to this event",
                color: 'danger'
            }
        };
        
        const config = statusConfig[userStatus];
        if (!config) return '';
        
        return `
            <div class="user-event-status ${config.class}">
                <div class="status-indicator text-${config.color}">
                    <i class="${config.icon}"></i>
                    <span>${config.text}</span>
                </div>
            </div>
        `;
    }

    // Render event action buttons
    renderEventActionButtons(eventId, userStatus) {
        if (userStatus === 'attending') {
            return `
                <button class="event-btn decline-btn" onclick="window.groupChatManager.declineEvent('${eventId}')">
                    <i class="fas fa-times"></i> Can't Make It
                </button>
                <button class="event-btn details-btn" onclick="window.viewEventDetails('${eventId}')">
                    <i class="fas fa-map-marker-alt"></i> View Map
                </button>
            `;
        } else if (userStatus === 'declined') {
            return `
                <button class="event-btn join-btn" onclick="window.groupChatManager.joinEvent('${eventId}')">
                    <i class="fas fa-check"></i> Join Event
                </button>
                <button class="event-btn details-btn" onclick="window.viewEventDetails('${eventId}')">
                    <i class="fas fa-map-marker-alt"></i> View Map
                </button>
            `;
        } else {
            return `
                <button class="event-btn join-btn" onclick="window.groupChatManager.joinEvent('${eventId}')">
                    <i class="fas fa-check"></i> Join
                </button>
                <button class="event-btn decline-btn" onclick="window.groupChatManager.declineEvent('${eventId}')">
                    <i class="fas fa-times"></i> Can't Make It
                </button>
                <button class="event-btn details-btn" onclick="window.viewEventDetails('${eventId}')">
                    <i class="fas fa-map-marker-alt"></i> View Map
                </button>
            `;
        }
    }

    // Show event toast
    showEventToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `event-toast toast-${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <i class="fas fa-${type === 'success' ? 'check' : type === 'error' ? 'exclamation-triangle' : 'info-circle'}"></i>
                <span>${message}</span>
            </div>
        `;

        document.body.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 100);

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }

    // Utility methods
    insertMessageInOrder(container, messageHTML, timestamp) {
        container.insertAdjacentHTML('beforeend', messageHTML);
    }

    scrollToBottom() {
        const chatContent = document.querySelector('.chat-content');
        if (chatContent) {
            chatContent.scrollTop = chatContent.scrollHeight;
        }
    }

    async loadInitialData() {
        try {
            const groupDoc = await this.db.collection('groups').doc(this.groupId).get();
            if (groupDoc.exists) {
                const groupData = groupDoc.data();
                this.updateGroupUI(groupData);
            }
        } catch (error) {
            console.error('Error loading group data:', error);
        }
    }

    updateGroupUI(groupData) {
        const titleElement = document.getElementById('groupTitle');
        if (titleElement) {
            titleElement.textContent = groupData.name;
        }

        const creationElement = document.getElementById('creationMessage');
        if (creationElement && groupData.createdBy) {
            const creator = groupData.members[groupData.createdBy];
            const creatorName = creator ? creator.name : 'Someone';
            
            if (creationElement.textContent.includes('Loading')) {
                creationElement.textContent = `${creatorName} created this group "${groupData.name}"`;
            }
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    cleanup() {
        if (this.messagesListener) {
            this.messagesListener();
        }
        if (this.eventsListener) {
            this.eventsListener();
        }
        if (this.eventUnsubscribes) {
            this.eventUnsubscribes.forEach((unsubscribe) => {
                unsubscribe();
            });
            this.eventUnsubscribes.clear();
        }
    }
}

// =============================================================================
// GLOBAL FUNCTIONS AND INITIALIZATION
// =============================================================================

let groupChatManager = null;

// Update the initialization function to work with your CSS
function initializeGroupChat(groupId) {
    // Remove chat-loaded class immediately
    document.body.classList.remove('chat-loaded');
    
    if (groupChatManager) {
        groupChatManager.cleanup();
    }
    
    groupChatManager = new GroupChatManager(groupId);
    window.groupChatManager = groupChatManager;
    
    // Initialize UI functions after loading
    setTimeout(() => {
        initializeToolbar();
        initializeEventCreation();
    }, 1200);
}

function initializeToolbar() {
    const toggleBtn = document.getElementById("toggleButton");
    const toolbar = document.getElementById("toolbar");

    if (!toggleBtn || !toolbar) return;

    toggleBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        toolbar.style.display = toolbar.style.display === "flex" ? "none" : "flex";
    });

    document.addEventListener("click", (e) => {
        if (toolbar.style.display === "flex" && 
            !toolbar.contains(e.target) && 
            e.target !== toggleBtn) {
            toolbar.style.display = "none";
        }
    });
}

function initializeEventCreation() {
    const eventBtn = document.getElementById("newevent");
    const eventPopup = document.getElementById("eventpop");
    const cancelBtn = document.getElementById("cancel");
    const saveBtn = document.getElementById("save");

    if (!eventBtn || !eventPopup) return;

    eventBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        eventPopup.style.display = "inherit";
        document.getElementById("toolbar").style.display = "none";
        
        const today = new Date().toISOString().split('T')[0];
        document.getElementById("eventdate").value = today;
    });

    if (cancelBtn) {
        cancelBtn.addEventListener("click", () => {
            eventPopup.style.display = "none";
            clearEventForm();
        });
    }

    if (saveBtn) {
        saveBtn.addEventListener("click", async () => {
            await saveEvent();
        });
    }
}

async function saveEvent() {
    const eventName = document.getElementById("eventname").value.trim();
    const eventDescription = document.getElementById("eventdescription").value.trim();
    const eventDate = document.getElementById("eventdate").value;
    const eventTime = document.getElementById("eventtime").value;

    if (!eventName) {
        alert('Please enter an event name');
        return;
    }
    if (!eventDate) {
        alert('Please select a date');
        return;
    }
    if (!eventTime) {
        alert('Please select a time');
        return;
    }

    const saveBtn = document.getElementById("save");
    const originalText = saveBtn.textContent;
    saveBtn.disabled = true;
    saveBtn.textContent = 'Creating...';

    try {
        await groupChatManager.createEvent({
            name: eventName,
            description: eventDescription,
            date: eventDate,
            time: eventTime
        });

        document.getElementById("eventpop").style.display = "none";
        clearEventForm();

    } catch (error) {
        console.error('Error creating event:', error);
        alert('Failed to create event: ' + error.message);
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = originalText;
    }
}

function clearEventForm() {
    document.getElementById("eventname").value = "";
    document.getElementById("eventdescription").value = "";
    document.getElementById("eventdate").value = "";
    document.getElementById("eventtime").value = "";
}

// Global event details function
window.viewEventDetails = async (eventId) => {
    try {
        const eventDoc = await groupChatManager.db.collection('groups')
            .doc(groupChatManager.groupId)
            .collection('events').doc(eventId).get();
        
        if (!eventDoc.exists) {
            alert('Event not found');
            return;
        }

        const eventData = eventDoc.data();
        
        const groupDoc = await groupChatManager.db.collection('groups')
            .doc(groupChatManager.groupId).get();
        
        if (!groupDoc.exists) {
            alert('Group not found');
            return;
        }

        const groupData = groupDoc.data();
        const members = groupData.members || {};
        
        const attendingMembers = [];
        if (eventData.attendees) {
            for (const [userId, attendeeData] of Object.entries(eventData.attendees)) {
                if (attendeeData.status === 'attending' && members[userId]) {
                    attendingMembers.push({
                        userId,
                        name: members[userId].name,
                        email: members[userId].email
                    });
                }
            }
        }

        const membersForMap = attendingMembers.length > 0 ? attendingMembers : 
            Object.entries(members).map(([userId, memberData]) => ({
                userId,
                name: memberData.name,
                email: memberData.email
            }));

        const params = new URLSearchParams({
            eventId: eventId,
            eventName: eventData.name,
            eventDate: eventData.date,
            eventTime: eventData.time,
            groupId: groupChatManager.groupId,
            members: JSON.stringify(membersForMap)
        });

        window.location.href = `/event_map_manager?${params.toString()}`;
        
    } catch (error) {
        console.error('Error viewing event details:', error);
        alert('Failed to view event details');
    }
};