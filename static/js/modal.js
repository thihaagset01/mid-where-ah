// This code handles showing and hiding the modal

document.addEventListener('DOMContentLoaded', () => {
    // Get all the necessary elements from the page
    const filterButton = document.querySelector('.filter-btn');
    const modal = document.getElementById('activities-modal');
    const overlay = document.getElementById('modal-overlay');
    const closeButton = document.getElementById('modal-close-btn');

    // Function to open the modal
    const openModal = () => {
        modal.classList.remove('hidden');
        overlay.classList.remove('hidden');
    };  

    // Function to close the modal
    const closeModal = () => {
        modal.classList.add('hidden');
        overlay.classList.add('hidden');
    };

    // Add click event listeners
    if (filterButton) {
        filterButton.addEventListener('click', openModal);
    }
    
    if (closeButton) {
        closeButton.addEventListener('click', closeModal);
    }

    if (overlay) {
        // Also close the modal if the user clicks on the dark background
        overlay.addEventListener('click', closeModal);
    }
});