function toolbar(){
    const toggleBtn = document.getElementById("toggleButton");
    const toolbar = document.getElementById("toolbar");

    toggleBtn.addEventListener("click", () => {
    toolbar.style.display = toolbar.style.display === "flex" ? "none" : "flex";
  })
};

function eventbtn(){

    const toolbar = document.getElementById("toolbar");
    
    const eventbtn = document.getElementById("newevent");
    const eventpop = document.getElementById("eventpop");

    eventbtn.addEventListener("click", () => {
    eventpop.style.display ="inherit";
    toolbar.style.display = toolbar.style.display === "flex" ? "none" : "flex";})
};
document.getElementById("save").addEventListener("click", saveevent);

function saveevent() {
    const eventname = document.getElementById("eventname").value.trim();
    const eventdescription = document.getElementById("eventdescription").value.trim();
    const eventdate = document.getElementById("eventdate").value;
    const eventtime = document.getElementById("eventtime").value;
    const eventcard = document.getElementById("eventcard");
    const eventpop = document.getElementById("eventpop");
    const eventcardcontainer = document.getElementById("eventcardcontainer");

    // Only show the card if all fields are filled
    if (eventname && eventdescription && eventdate && eventtime) {
        const outputtext = `${eventname} on ${eventdate} at ${eventtime}`;
        eventcard.textContent = outputtext;
        eventcard.style.display = "block";
        eventcard.style.alignSelf="center";
        eventcard.style.color="white";
        eventpop.style.display = "none";
        eventcardcontainer.style.display= "flex";
    } 
}

document.addEventListener('DOMContentLoaded', function () {
    toolbar();
    eventbtn();
    saveevent();
});