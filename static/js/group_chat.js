function toolbar(){
    const toggleBtn = document.getElementById("toggleButton");
    const toolbar = document.getElementById("toolbar");

    toggleBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        toolbar.style.display = toolbar.style.display === "flex" ? "none" : "flex";
    });
    
    // Close toolbar when clicking outside
    document.addEventListener("click", (e) => {
        if (toolbar.style.display === "flex" && 
            !toolbar.contains(e.target) && 
            e.target !== toggleBtn) {
            toolbar.style.display = "none";
        }
    });
};

function eventbtn(){
    const toolbar = document.getElementById("toolbar");
    const eventbtn = document.getElementById("newevent");
    const eventpop = document.getElementById("eventpop");
    const cancelBtn = document.getElementById("cancel");

    // Show event popup when clicking the event button
    eventbtn.addEventListener("click", (e) => {
        e.stopPropagation();
        eventpop.style.display = "inherit";
        toolbar.style.display = "none";
        
        // Clear previous input values
        document.getElementById("eventname").value = "";
        document.getElementById("eventdescription").value = "";
        document.getElementById("eventdate").value = "";
        document.getElementById("eventtime").value = "";
    });
    
    // Close event popup when clicking the cancel button
    cancelBtn.addEventListener("click", () => {
        eventpop.style.display = "none";
    });
};

function saveevent() {
    const eventname = document.getElementById("eventname").value.trim();
    const eventdescription = document.getElementById("eventdescription").value.trim();
    const eventdate = document.getElementById("eventdate").value;
    const eventtime = document.getElementById("eventtime").value;
    const eventcard = document.getElementById("eventcard");
    const eventpop = document.getElementById("eventpop");
    const eventcardcontainer = document.getElementById("eventcardcontainer");
    
    // Validate input fields
    if (!eventname) {
        alert("Please enter an event name");
        return;
    }
    
    if (!eventdate) {
        alert("Please select a date for the event");
        return;
    }

    // Only show the card if all fields are filled
    if (eventname && eventdescription && eventdate && eventtime) {
        // Format the date and time for display
        const dateObj = new Date(eventdate);
        const day = dateObj.getDate().toString().padStart(2, '0');
        const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
        const year = dateObj.getFullYear();
        const formattedDate = `${day}/${month}/${year}`;
        
        // Create the event card HTML
        const cardHTML = `
            <div class="event-card">
                <div class="event-card-header">You started a new meet up!</div>
                <div class="event-card-header">${eventname}</div>
                <div class="event-card-date">
                    <div class="event-card-date-icon">
                        <i class="far fa-calendar-alt"></i>
                    </div>
                    <div class="event-card-date-text">TODAY ${formattedDate} ${eventtime}</div>
                </div>
                <div class="event-card-description">${eventdescription}</div>
                <div style="display: flex; gap: 10px; justify-content: center; align-items: center;">
                    <button class="event-card-join" id="join">Join</button>
                    <button class="event-card-nojoin" id="no-join">No Join</button>
                </div>
                <div style="display: flex; gap: 10px; justify-content: center; align-items: center;">
                    <button class="event-card-join" style="width: 100%;" id = "view-map">View Map</button>
                </div>
                
            </div>
        `;
        /* <div class="event-card-footer">
                    <i class="far fa-clock"></i> Indicate by ${eventtime}
        </div> 
        ADD THIS IN FUTURE
        
        */
        // Update the event card and show it
        eventcard.innerHTML = cardHTML;
        eventcard.style.display = "block";
        eventpop.style.display = "none";
        eventcardcontainer.style.display = "flex";

        const joinbtn = document.getElementById("join");
        if (joinbtn) {
            joinbtn.addEventListener("click", () => joinevent(eventname, formattedDate, eventtime, eventdescription));
        }
    }
}

function joinevent(eventname, formattedDate, eventtime, eventdescription) {
    console.log("triggered")
    const eventcard = document.getElementById("eventcard");
    const cardHTML = `
            <div class="event-card">
                <div class="event-card-header">You have joined ${eventname}!</div>
                <div class="event-card-date">
                    <div class="event-card-date-icon">
                        <i class="far fa-calendar-alt"></i>
                    </div>
                    <div class="event-card-date-text">TODAY ${formattedDate} ${eventtime}</div>
                </div>
                <div class="event-card-description">${eventdescription}</div>
                <div style="display: flex; gap: 10px; justify-content: center; align-items: center;">
                    <button class="event-card-join" id="join">Join</button>
                    <button class="event-card-nojoin" id="no-join">No Join</button>
                </div>
                
            </div>
    `
    eventcard.innerHTML = cardHTML;
    eventcard.style.display = "block";
    const eventcardcontainer = document.getElementById("eventcardcontainer");
    eventcardcontainer.style.display = "flex";
}

document.addEventListener('DOMContentLoaded', function () {
    toolbar();
    eventbtn();
    
    // Add event listener for save button
    const saveBtn = document.getElementById("save");
    if (saveBtn) {
        saveBtn.addEventListener("click", saveevent);
    }
    
});