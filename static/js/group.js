/*this is for group page*/
// Bottom navigation is now handled by mobile.js

function showCreateGroupModal(event){
    if (event) {
        event.stopPropagation(); // Prevent immediate propagation to document
    }
    
    const menu = document.getElementById('dropdown-menu');
    const text_bar = document.getElementById('text-bar');
    
    // Toggle visibility
    menu.classList.toggle('hidden');
    if (text_bar) {
        text_bar.classList.toggle('hidden');
    }
    
    // Add click-outside-to-close handler if menu is visible
    if (!menu.classList.contains('hidden')) {
        setTimeout(() => {
            document.addEventListener('click', closeCreateGroupModal);
        }, 10);
    } else {
        document.removeEventListener('click', closeCreateGroupModal);
    }
}

function closeCreateGroupModal(event) {
    const menu = document.getElementById('dropdown-menu');
    const text_bar = document.getElementById('text-bar');
    const createButton = document.querySelector('.nav-item[data-page="create"]');
    
    // If clicking outside the menu and not on the create button
    if (!menu.contains(event.target) && event.target !== createButton && !createButton.contains(event.target)) {
        menu.classList.add('hidden');
        text_bar.classList.add('hidden');
        document.removeEventListener('click', closeCreateGroupModal);
    }
}
// Navigation is now initialized in the base template
// No need for additional initialization here