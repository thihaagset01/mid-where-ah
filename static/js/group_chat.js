/**
 * Complete Group Chat System
 * Handles messaging, events, real-time updates, and UI management
 */

class GroupChatManager {
    constructor() {
        this.groupId = null;
        this.auth = null;
        this.db = null;
        this.unsubscribes = [];
        this.messagesListener = null;
        this.eventsListener = null;
        this.initialized = false;
        
        console.log('GroupChatManager created');
    }

    // Initialize the chat system
    async init() {
        if (this.initialized) return;
        
        console.log('Initializing GroupChatManager...');
        
        try {
            // Get group ID from URL
            this.groupId = this.getGroupIdFromUrl();
            if (!this.groupId) {
                throw new Error('No group ID found in URL');
            }

            // Initialize Firebase
            this.auth = firebase.auth();
            this.db = firebase.firestore();

            // Wait for auth
            await this.waitForAuth();
            
            // Set up UI
            this.setupUI();
            
            // Load group info
            await this.loadGroupInfo();
            
            // Set up real-time listeners
            this.setupMessageListener();
            this.setupEventListener();
            
            // Set up event handlers
            this.setupEventHandlers();
            
            this.initialized = true;
            console.log('✅ GroupChatManager initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize GroupChatManager:', error);
            this.showError('Failed to load chat: ' + error.message);
        }
    }

    // ===============================================================
    // INITIALIZATION HELPERS
    // ===============================================================

    getGroupIdFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('groupId');
    }

    async waitForAuth() {
        return new Promise((resolve, reject) => {
            const unsubscribe = this.auth.onAuthStateChanged((user) => {
                unsubscribe();
                if (user) {
                    resolve(user);
                } else {
                    reject(new Error('User not authenticated'));
                }
            });
        });
    }

    async loadGroupInfo() {
        try {
            const groupDoc = await this.db.collection('groups').doc(this.groupId).get();
            
            if (!groupDoc.exists) {
                throw new Error('Group not found');
            }
            
            const groupData = groupDoc.data();
            
            // Update UI with group info
            const groupTitle = document.getElementById('groupTitle');
            if (groupTitle) {
                groupTitle.textContent = groupData.name || 'Group Chat';
            }
            
            console.log('Group info loaded:', groupData.name);
            
        } catch (error) {
            console.error('Error loading group info:', error);
            throw error;
        }
    }

    // ===============================================================
    // UI SETUP
    // ===============================================================

    setupUI() {
        this.setupMessageInput();
        this.setupToolbar();
        this.setupEventPopup();
        this.hideLoadingSpinner();
    }

    setupMessageInput() {
        const messageInput = document.querySelector('.message-input');
        const sendButton = document.querySelector('.send-button');

        if (!messageInput || !sendButton) {
            console.warn('Message input elements not found');
            return;
        }

        // Send button click
        sendButton.addEventListener('click', () => {
            const message = messageInput.value.trim();
            if (message) {
                this.sendMessage(message);
                messageInput.value = '';
            }
        });

        // Enter key press
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                const message = messageInput.value.trim();
                if (message) {
                    this.sendMessage(message);
                    messageInput.value = '';
                }
            }
        });

        console.log('Message input setup complete');
    }

    setupToolbar() {
        const toolbarToggle = document.querySelector('.toolbar-toggle');
        const toolbar = document.getElementById('toolbar');

        if (!toolbarToggle || !toolbar) return;

        // Toggle toolbar visibility
        toolbarToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            toolbar.style.display = toolbar.style.display === 'flex' ? 'none' : 'flex';
        });

        // Close toolbar when clicking outside
        document.addEventListener('click', (e) => {
            if (toolbar.style.display === 'flex' && 
                !toolbar.contains(e.target) && 
                e.target !== toolbarToggle) {
                toolbar.style.display = 'none';
            }
        });

        console.log('Toolbar setup complete');
    }

    setupEventPopup() {
        const eventBtn = document.getElementById('newevent');
        const eventPopup = document.getElementById('eventpop');
        const cancelBtn = document.getElementById('cancel');
        const saveBtn = document.getElementById('save');

        if (!eventBtn || !eventPopup) {
            console.warn('Event popup elements not found');
            return;
        }

        // Open event creation popup
        eventBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.openEventPopup();
        });

        // Cancel event creation
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                this.closeEventPopup();
            });
        }

        // Save event
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                this.saveEvent();
            });
        }

        // Close popup when clicking outside
        eventPopup.addEventListener('click', (e) => {
            if (e.target === eventPopup) {
                this.closeEventPopup();
            }
        });

        console.log('Event popup setup complete');
    }

    setupEventHandlers() {
        // Global event handlers
        window.viewEventDetails = (eventId) => this.viewEventDetails(eventId);
        window.joinEvent = (eventId) => this.joinEvent(eventId);
        window.declineEvent = (eventId) => this.declineEvent(eventId);
        
        console.log('Global event handlers setup complete');
    }

    hideLoadingSpinner() {
        const spinner = document.querySelector('.chat-loading-spinner');
        if (spinner) {
            spinner.style.display = 'none';
        }
    }

    // ===============================================================
    // MESSAGING SYSTEM
    // ===============================================================

    async sendMessage(content) {
        const user = this.auth.currentUser;
        if (!user || !content.trim()) return;
        console.log('Current user:', user);
        if (!user) {
            console.error('No authenticated user');
            return;
        }
        try {
            const messageData = {
                type: 'text',
                content: content.trim(),
                userId: user.uid,
                userName: user.displayName || user.email.split('@')[0],
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            };
            console.log('Sending message data:', JSON.stringify(messageData, null, 2));
            
            await this.db.collection('groups')
                .doc(this.groupId)
                .collection('messages')
                .add(messageData);
    
            console.log('Message sent successfully');
            
        } catch (error) {
            console.error('Error sending message:', error);
            this.showToast('Failed to send message: ' + error.message, 'error');
        }
    }

    setupMessageListener() {
        if (this.messagesListener) {
            this.messagesListener();
        }
    
        console.log('🔧 Setting up message listener for group:', this.groupId);
    
        this.messagesListener = this.db
            .collection('groups')
            .doc(this.groupId)
            .collection('messages')
            .orderBy('timestamp', 'asc')
            .onSnapshot((snapshot) => {
                console.log('📨 Messages snapshot received, size:', snapshot.size);
                
                if (snapshot.empty) {
                    console.log('📭 No messages found in this group');
                    const chatContent = document.getElementById('chatContent');
                    if (chatContent && !chatContent.querySelector('.no-messages')) {
                        chatContent.innerHTML = `
                            <div class="no-messages" style="text-align: center; padding: 40px; color: #FFFFFF;">
                                <i class="fas fa-comments" style="font-size: 48px; margin-bottom: 16px; opacity: 0.5;"></i>
                                <p>No messages yet. Start the conversation!</p>
                            </div>
                        `;
                    }
                    return;
                }
    
                // Clear "no messages" placeholder
                const noMessages = document.querySelector('.no-messages');
                if (noMessages) {
                    noMessages.remove();
                }
    
                snapshot.docChanges().forEach((change) => {
                    console.log('📝 Message change:', change.type, change.doc.data());
                    
                    if (change.type === 'added') {
                        this.displayMessage(change.doc.data(), change.doc.id);
                    } else if (change.type === 'modified') {
                        // Handle message updates
                        console.log('🔄 Message updated:', change.doc.id);
                    } else if (change.type === 'removed') {
                        // Handle message deletion
                        console.log('🗑️ Message removed:', change.doc.id);
                        const messageElement = document.querySelector(`[data-message-id="${change.doc.id}"]`);
                        if (messageElement) {
                            messageElement.remove();
                        }
                    }
                });
            }, (error) => {
                console.error('❌ Error listening to messages:', error);
                this.showToast('Error loading messages: ' + error.message, 'error');
                
                // Show error in chat
                const chatContent = document.getElementById('chatContent');
                if (chatContent) {
                    chatContent.innerHTML = `
                        <div class="chat-error" style="text-align: center; padding: 40px; color: #f56565;">
                            <i class="fas fa-exclamation-triangle" style="font-size: 48px; margin-bottom: 16px;"></i>
                            <h3>Error Loading Messages</h3>
                            <p>${error.message}</p>
                            <button onclick="location.reload()" style="margin-top: 16px; padding: 8px 16px; background: #8B5DB8; color: white; border: none; border-radius: 4px; cursor: pointer;">
                                <i class="fas fa-redo"></i> Retry
                            </button>
                        </div>
                    `;
                }
            });
    
        console.log('✅ Message listener setup complete');
    }   

    displayMessage(messageData, messageId) {
        console.log('🎨 Displaying message:', messageId, messageData);
        
        const chatContent = document.getElementById('chatContent');
        if (!chatContent) {
            console.error('❌ Chat content container not found!');
            return;
        }
    
        // Check if message already exists
        if (document.querySelector(`[data-message-id="${messageId}"]`)) {
            console.log('⚠️ Message already exists, skipping:', messageId);
            return;
        }
    
        let messageHTML = '';
    
        if (messageData.type === 'text') {
            messageHTML = this.createTextMessageHTML(messageData, messageId);
            console.log('📝 Created text message HTML');
        } else if (messageData.type === 'event') {
            messageHTML = this.createEventMessageHTML(messageData, messageId);
            console.log('📅 Created event message HTML');
        } else if (messageData.type === 'system') {
            messageHTML = this.createSystemMessageHTML(messageData, messageId);
            console.log('🔧 Created system message HTML');
        } else {
            console.warn('⚠️ Unknown message type:', messageData.type);
            // Still try to display as text message fallback
            messageHTML = this.createTextMessageHTML({
                ...messageData,
                content: messageData.text || messageData.content || 'System message',
                userName: 'System'
            }, messageId);
        }
    
        if (messageHTML) {
            console.log('➕ Inserting message into chat');
            this.insertMessageInOrder(chatContent, messageHTML, messageData.timestamp);
            this.scrollToBottom();
            
            // Load attendee info for event messages
            if (messageData.type === 'event') {
                setTimeout(() => this.loadEventAttendeeInfo(messageData.eventId), 100);
            }
            
            console.log('✅ Message displayed successfully');
        } else {
            console.error('❌ Failed to create message HTML');
        }
    }

    createSystemMessageHTML(messageData, messageId) {
        const timestamp = this.formatTimestamp(messageData.timestamp);
        
        return `
            <div class="system-message" data-message-id="${messageId}" data-timestamp="${messageData.timestamp?.seconds || Date.now() / 1000}">
                <div class="system-message-content">
                    <span>${this.escapeHtml(messageData.text || messageData.content || 'System message')}</span>
                </div>
                <div class="system-message-time">${timestamp}</div>
            </div>
        `;
    }

    createTextMessageHTML(messageData, messageId) {
        const timestamp = this.formatTimestamp(messageData.timestamp);
        const currentUser = this.auth.currentUser;
        const isOwnMessage = currentUser && messageData.userId === currentUser.uid;

        return `
            <div class="message ${isOwnMessage ? 'own-message' : 'other-message'}" data-message-id="${messageId}">
                ${!isOwnMessage ? `<div class="message-author">${this.escapeHtml(messageData.userName)}</div>` : ''}
                <div class="message-content">${this.escapeHtml(messageData.content)}</div>
                <div class="message-time">${timestamp}</div>
            </div>
        `;
    }

    createEventMessageHTML(messageData, messageId) {
        const timestamp = this.formatTimestamp(messageData.timestamp);

        return `
            <div class="event-message" data-message-id="${messageId}">
                <div class="event-header">
                    <span class="event-author">${this.escapeHtml(messageData.userName)} created an event</span>
                    <span class="event-time">${timestamp}</span>
                </div>
                <div class="event-card" data-event-id="${messageData.eventId}">
                    <div class="event-card-header">
                        <h4 class="event-title">
                            <i class="fas fa-calendar-alt"></i>
                            ${this.escapeHtml(messageData.eventName)}
                        </h4>
                    </div>
                    
                    <div class="event-card-body">
                        ${messageData.eventDescription ? `
                            <p class="event-description">${this.escapeHtml(messageData.eventDescription)}</p>
                        ` : ''}
                        
                        <div class="event-details">
                            <div class="event-detail">
                                <i class="fas fa-calendar"></i>
                                <span>${this.formatEventDate(messageData.eventDate)}</span>
                            </div>
                            <div class="event-detail">
                                <i class="fas fa-clock"></i>
                                <span>${this.formatEventTime(messageData.eventTime)}</span>
                            </div>
                        </div>
                        
                        <div class="event-attendee-preview" id="attendee-preview-${messageData.eventId}">
                            <div class="loading-attendees">
                                <i class="fas fa-spinner fa-spin"></i>
                                Loading responses...
                            </div>
                        </div>
                    </div>
                    
                    <div class="event-card-actions" id="actions-${messageData.eventId}">
                        <button class="event-btn join-btn" onclick="window.joinEvent('${messageData.eventId}')">
                            <i class="fas fa-check"></i> Join
                        </button>
                        <button class="event-btn decline-btn" onclick="window.declineEvent('${messageData.eventId}')">
                            <i class="fas fa-times"></i> Can't Make It
                        </button>
                        <button class="event-btn details-btn" onclick="window.viewEventDetails('${messageData.eventId}')">
                            <i class="fas fa-map-marker-alt"></i> View Map
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    insertMessageInOrder(container, messageHTML, timestamp) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = messageHTML;
        const newMessage = tempDiv.firstElementChild;
    
        // If no timestamp or invalid timestamp, append to end
        if (!timestamp || !timestamp.seconds) {
            container.appendChild(newMessage);
            return;
        }
    
        const messageTime = timestamp.seconds;
        const messages = container.querySelectorAll('.message, .event-message, .system-message');
        
        let inserted = false;
        for (let i = messages.length - 1; i >= 0; i--) {
            const existingMessage = messages[i];
            const existingTimestamp = existingMessage.dataset.timestamp;
            
            if (existingTimestamp && parseFloat(existingTimestamp) <= messageTime) {
                existingMessage.insertAdjacentElement('afterend', newMessage);
                inserted = true;
                break;
            }
        }
        
        if (!inserted) {
            container.insertBefore(newMessage, container.firstChild);
        }
        
        // Store timestamp for future ordering
        newMessage.dataset.timestamp = messageTime;
    }

    scrollToBottom() {
        const chatContent = document.getElementById('chatContent');
        if (chatContent) {
            chatContent.scrollTop = chatContent.scrollHeight;
        }
    }

    // ===============================================================
    // EVENT SYSTEM
    // ===============================================================

    openEventPopup() {
        const eventPopup = document.getElementById('eventpop');
        const toolbar = document.getElementById('toolbar');
        
        if (eventPopup) {
            // Set default date to today
            const today = new Date().toISOString().split('T')[0];
            const dateInput = document.getElementById('eventdate');
            if (dateInput) {
                dateInput.value = today;
            }
            
            eventPopup.style.display = 'flex';
            
            // Focus on name input
            const nameInput = document.getElementById('eventname');
            if (nameInput) {
                setTimeout(() => nameInput.focus(), 100);
            }
        }
        
        // Hide toolbar
        if (toolbar) {
            toolbar.style.display = 'none';
        }
    }

    closeEventPopup() {
        const eventPopup = document.getElementById('eventpop');
        if (eventPopup) {
            eventPopup.style.display = 'none';
            this.clearEventForm();
        }
    }

    clearEventForm() {
        const inputs = ['eventname', 'eventdescription', 'eventdate', 'eventtime'];
        inputs.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.value = '';
            }
        });
    }

    async saveEvent() {
        const eventName = document.getElementById('eventname').value.trim();
        const eventDescription = document.getElementById('eventdescription').value.trim();
        const eventDate = document.getElementById('eventdate').value;
        const eventTime = document.getElementById('eventtime').value;

        // Validation
        const errors = this.validateEventData({
            name: eventName,
            description: eventDescription,
            date: eventDate,
            time: eventTime
        });

        if (errors.length > 0) {
            this.showToast(errors[0], 'error');
            return;
        }

        const saveBtn = document.getElementById('save');
        const originalText = saveBtn?.textContent || 'Save';
        
        try {
            // Update button state
            if (saveBtn) {
                saveBtn.disabled = true;
                saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';
            }

            await this.createEvent({
                name: eventName,
                description: eventDescription,
                date: eventDate,
                time: eventTime
            });

            this.closeEventPopup();
            this.showToast('Event created successfully!', 'success');

        } catch (error) {
            console.error('Error creating event:', error);
            this.showToast('Failed to create event: ' + error.message, 'error');
        } finally {
            // Reset button state
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.textContent = originalText;
            }
        }
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

    async createEvent(eventData) {
        const user = this.auth.currentUser;
        if (!user) {
            throw new Error('User not authenticated');
        }

        try {
            // Create event document
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
                throw new Error('You don\'t have permission to create events in this group');
            } else if (error.code === 'unavailable') {
                throw new Error('Service temporarily unavailable. Please try again');
            } else {
                throw new Error('Failed to create event: ' + error.message);
            }
        }
    }

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

    setupEventListener() {
        if (this.eventsListener) {
            this.eventsListener();
        }

        this.eventsListener = this.db
            .collection('groups')
            .doc(this.groupId)
            .collection('events')
            .onSnapshot((snapshot) => {
                snapshot.docChanges().forEach((change) => {
                    if (change.type === 'modified') {
                        const eventId = change.doc.id;
                        // Reload attendee info when event is updated
                        setTimeout(() => this.loadEventAttendeeInfo(eventId), 100);
                    }
                });
            }, (error) => {
                console.error('Error listening to events:', error);
            });

        console.log('Event listener setup complete');
    }

    async loadEventAttendeeInfo(eventId) {
        try {
            const eventDoc = await this.db
                .collection('groups')
                .doc(this.groupId)
                .collection('events')
                .doc(eventId)
                .get();
                
            if (!eventDoc.exists) {
                console.warn('Event not found:', eventId);
                return;
            }
            
            const eventData = eventDoc.data();
            const attendees = eventData.attendees || {};
            
            // Count responses
            const attending = Object.values(attendees).filter(a => a.status === 'attending').length;
            const declined = Object.values(attendees).filter(a => a.status === 'declined').length;
            
            // Update attendee preview
            const previewElement = document.getElementById(`attendee-preview-${eventId}`);
            if (previewElement) {
                let attendeeHTML = '';
                
                if (attending === 0 && declined === 0) {
                    attendeeHTML = '<div class="no-responses"><i class="fas fa-users"></i> No responses yet</div>';
                } else {
                    attendeeHTML = `
                        <div class="attendee-summary">
                            ${attending > 0 ? `
                                <span class="attending-count">
                                    <i class="fas fa-check text-success"></i> 
                                    ${attending} attending
                                </span>
                            ` : ''}
                            ${declined > 0 ? `
                                <span class="declined-count">
                                    <i class="fas fa-times text-danger"></i> 
                                    ${declined} can't make it
                                </span>
                            ` : ''}
                        </div>
                    `;
                }
                
                previewElement.innerHTML = attendeeHTML;
            }
            
            // Update action buttons based on current user's status
            this.updateEventActionButtons(eventId, attendees);
            
        } catch (error) {
            console.error('Error loading attendee info:', error);
            const previewElement = document.getElementById(`attendee-preview-${eventId}`);
            if (previewElement) {
                previewElement.innerHTML = '<div class="error-loading"><i class="fas fa-exclamation-triangle"></i> Error loading responses</div>';
            }
        }
    }

    updateEventActionButtons(eventId, attendees) {
        const currentUser = this.auth.currentUser;
        if (!currentUser) return;
        
        const userResponse = attendees[currentUser.uid];
        const actionsContainer = document.getElementById(`actions-${eventId}`);
        
        if (!actionsContainer) return;
        
        const joinBtn = actionsContainer.querySelector('.join-btn');
        const declineBtn = actionsContainer.querySelector('.decline-btn');
        
        // Reset button states
        if (joinBtn) {
            joinBtn.classList.remove('active');
            joinBtn.disabled = false;
            joinBtn.innerHTML = '<i class="fas fa-check"></i> Join';
        }
        
        if (declineBtn) {
            declineBtn.classList.remove('active');
            declineBtn.disabled = false;
            declineBtn.innerHTML = '<i class="fas fa-times"></i> Can\'t Make It';
        }
        
        // Update based on user response
        if (userResponse) {
            if (userResponse.status === 'attending') {
                if (joinBtn) {
                    joinBtn.innerHTML = '<i class="fas fa-check"></i> Joined';
                    joinBtn.classList.add('active');
                }
            } else if (userResponse.status === 'declined') {
                if (declineBtn) {
                    declineBtn.innerHTML = '<i class="fas fa-times"></i> Declined';
                    declineBtn.classList.add('active');
                }
            }
        }
    }

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
            
            this.showToast('You joined the event!', 'success');
            
        } catch (error) {
            console.error('Error joining event:', error);
            this.showToast('Failed to join event', 'error');
        }
    }

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
            
            this.showToast('Response updated', 'success');
            
        } catch (error) {
            console.error('Error declining event:', error);
            this.showToast('Failed to update response', 'error');
        }
    }

    viewEventDetails(eventId) {
        const eventUrl = `/event_map_manager?eventId=${eventId}&groupId=${this.groupId}`;
        window.location.href = eventUrl;
    }

    // ===============================================================
    // UTILITY FUNCTIONS
    // ===============================================================

    formatTimestamp(timestamp) {
        if (!timestamp) return 'Now';
        
        const date = timestamp.seconds ? 
            new Date(timestamp.seconds * 1000) : 
            new Date(timestamp);
            
        return date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    }

    formatEventDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString([], {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    formatEventTime(timeString) {
        const [hours, minutes] = timeString.split(':');
        const date = new Date();
        date.setHours(parseInt(hours), parseInt(minutes));
        return date.toLocaleTimeString([], {hour: 'numeric', minute:'2-digit'});
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showToast(message, type = 'info') {
        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <i class="fas fa-${type === 'success' ? 'check' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
                <span>${this.escapeHtml(message)}</span>
            </div>
        `;
        
        // Add to page
        document.body.appendChild(toast);
        
        // Show with animation
        setTimeout(() => toast.classList.add('show'), 100);
        
        // Remove after delay
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => document.body.removeChild(toast), 300);
        }, 3000);
    }

    showError(message) {
        console.error('GroupChat Error:', message);
        
        const chatContent = document.getElementById('chatContent');
        if (chatContent) {
            chatContent.innerHTML = `
                <div class="chat-error">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Error</h3>
                    <p>${this.escapeHtml(message)}</p>
                    <button onclick="location.reload()" class="retry-btn">
                        <i class="fas fa-redo"></i> Retry
                    </button>
                </div>
            `;
        }
    }

    // ===============================================================
    // CLEANUP
    // ===============================================================

    destroy() {
        // Remove listeners
        if (this.messagesListener) {
            this.messagesListener();
        }
        
        if (this.eventsListener) {
            this.eventsListener();
        }
        
        // Clear global handlers
        window.viewEventDetails = null;
        window.joinEvent = null;
        window.declineEvent = null;
        
        console.log('GroupChatManager destroyed');
    }
}

// ===============================================================
// INITIALIZATION
// ===============================================================

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Initializing Group Chat...');
    
    try {
        // Create global instance
        window.groupChatManager = new GroupChatManager();
        
        // Wait for Firebase to be ready
        if (typeof firebase !== 'undefined') {
            window.groupChatManager.init();
        } else {
            // Wait for Firebase to load
            const checkFirebase = setInterval(() => {
                if (typeof firebase !== 'undefined') {
                    clearInterval(checkFirebase);
                    window.groupChatManager.init();
                }
            }, 100);
        }
        
    } catch (error) {
        console.error('❌ Failed to initialize Group Chat:', error);
    }
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (window.groupChatManager) {
        window.groupChatManager.destroy();
    }
});