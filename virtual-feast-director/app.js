const reconnect_delay = 2000; // 2 seconds
const numeber_of_events_shown = 4; // number of events to show in the list including the current event

// the functions expects a up to data eventList and the current event id
async function showEvents(current_event_id = null) {
    // console.log("showEvents() called with current_event_id: ", current_event_id);
    if (!backend_eventList) {
        console.log("No backend eventList available yet. requesting it now...");

        backend_eventList = await getRundownList();
        console.log("eventList received know.");
    }

    if (!current_event_id) {
        if (previous_current_event_id) {
            current_event_id = previous_current_event_id;
            console.log("No current_event_id given. Using previous_current_event_id: ", previous_current_event_id);
        } else {
            console.log("No current_event_id and no previous_current_event_id available. Exiting showEvents() now.");
            return;
        }
    } else {
        previous_current_event_id = current_event_id;
    }

    // console.log("showEvents() before foreach eventlist: ", backend_eventList);
    let previous_public_event;
    let after_current_event = false;
    shown_eventList = [];
    backend_eventList.forEach(event => {
        if (event.isPublic && !after_current_event) {
            previous_public_event = event;
        }
        if (event.id === current_event_id) {
            after_current_event = true;
            if (previous_public_event) {
                shown_eventList.push(previous_public_event);
            }
            // shown_eventList.push(previous_public_event);
        } else if (after_current_event && event.isPublic && !event.skip) {
            shown_eventList.push(event);
        }
    });

    html_eventList.innerHTML = "";
    for (let i = 0; i < shown_eventList.length && i < numeber_of_events_shown; i++) {
        const event = shown_eventList[i];
        // console.log(`Event ${i + 1}:`, event);

        const listItem = document.createElement("li");
        if (i === 0) {
            listItem.id = "current-event";
        }
        const event_string = `${event.title}`;
        listItem.textContent = event_string;
        html_eventList.appendChild(listItem);
    }

}

async function getRundownList() {
    const response = await fetch("http://" + server_address + "/data/rundown");
    const data = await response.json();
    // console.log("Type of backend_eventList: ", typeof backend_eventList);
    // console.log("Backend event list:", backend_eventList);
    return data;
}

const server_address = `${window.location.hostname}:${window.location.port}`;

let backend_eventList;
const html_eventList = document.getElementById("event-list");

let previous_current_event_id = null;

async function main() {
    console.log("Welcome to the Virtual-Feast-Director");
    connectWebSocket();
    
    backend_eventList = await getRundownList();
    // console.log("main() Backend event list: ", backend_eventList);
}

main();


function connectWebSocket() {
    const socket = new WebSocket("ws://" + server_address + "/ws");
    socket.onopen = () => {
        console.log("WebSocket connection established");
    };
    socket.onerror = (error) => {
        console.error("WebSocket error:", error);
    }
    socket.onclose = (event) => {
        console.warn('WebSocket closed:', event.code, event.reason, event.wasClean);
        setTimeout(connectWebSocket, reconnect_delay);
        console.log("Reconnecting to WebSocket...");
    };

    socket.onmessage = async (message) => {
        const data = JSON.parse(message.data);
        const { type, payload } = data;

        switch (type) {
            case 'ontime': {
                // console.log("ontime message payload: ", payload);

                if (payload.onAir) {
                    // console.log("eventNow.id: ", payload.eventNow.id);
                    showEvents(payload.eventNow.id);
                    document.body.style.opacity = "1";
                } else {
                    document.body.style.opacity = "0";
                }

                break;
            }
            // case 'ontime-timer': {
            //     console.log("ontime-timer message");
            //     // const { current, playback } = payload;
            //     // updateTimerElement(playback, current);
            //     break;
            // }
            // case 'ontime-clock': {
            //     console.log("ontime-clock message");
            //     break;
            // }
            // case 'ontime-flush': {
            //     console.log("ontime-flush message");
            //     break;
            // }
            // case 'ontime-runtime': {
            //     console.log("ontime-runtime message");
            //     console.log("ontime-runtime message payload: ", payload);
            //     break;
            // }
            case 'ontime-refetch': {    // this message is sent when a event got edited
                console.log("ontime-refetch message");
                console.log("ontime-refetch message payload: ", payload);
                backend_eventList = await getRundownList();
                showEvents();
                break;
            }
            case 'ontime-eventNow': {   // returns the complete current event object
                console.log("ontime-eventNow message");

                if (payload) {
                    // console.log("ontime-eventNow message payload: ", payload);
                    showEvents(payload.id);
                    document.body.style.opacity = "1";
                } else {
                    document.body.style.opacity = "0";
                }
                break;
            }
            // default: {
            //     console.log("Unknown message type:", type);
            // }
        }
    };

}