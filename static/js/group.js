/*this is for group page*/
function setupBottomNavigation() {
    const navItems = document.querySelectorAll('.nav-item');

    navItems.forEach(item => {
        item.addEventListener('click', function() {
            navItems.forEach(navItem => navItem.classList.remove('active'));
            
            this.classList.add('active');
            
            const page = this.getAttribute('data-page');
            
            switch(page) {
                case 'home':
                    // Check if user is authenticated before redirecting
                    if (firebase.auth().currentUser) {
                        window.location.href = '/app';
                    } else {
                        window.location.href = '/login';
                    }
                    break;
                case 'groups':
                    window.location.href = '/groups';
                    break;
                case 'profile':
                    window.location.href = '/profile';
                    break;
                case 'compass':
                    break;
                case 'create':
                    showCreateGroupModal();
                    break;
            }
        });
    });
}

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
document.addEventListener('DOMContentLoaded', function () {
    setupBottomNavigation();
});