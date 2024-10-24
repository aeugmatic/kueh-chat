/*
    CONSIDERATIONS:
    - Buffer messages to prevent lag (and potentially overlapping)
    - Use a better parallax algorithm / formula
*/

window.addEventListener("onEventReceived", (obj) => {
    // Check if the object received is a chat message (or if it has the checkable properties at all, hence '?.')
    if (obj?.detail?.listener?.toUpperCase() !== "MESSAGE") return;
    
    // Create variable to hold data object for less cumbersome reference
    let msgData = obj.detail.event.data;

    // Create the message div with all its styles and properties
    let msgDiv = createMessageDiv(msgData);

    // Set the message at a random height
    setMessageHeight(msgDiv);

    // Finally, attach the div to the widget
    document.querySelector(".main-container").appendChild(msgDiv);
});

/* TODO: MAKE JSDOC */
function createMessageDiv(msgData) {
    
    /* Whole Message */
    let msgDiv = document.createElement("div"); // Create the main message div
    msgDiv.className = "msgDiv";                // Set class
    setAnimation(msgDiv);                       // Set animation + parallax effect
    setMessageHeight(msgDiv);                   // Set height randomly

    /* Message Username */
    let usernameDiv = createUsernameDiv(msgData); // Create the username div

    /* Message Body */
    let msgBodyDiv = createMsgBodyDiv(msgData); // Create the message body div

    /* Putting it All Together */
    msgDiv.appendChild(usernameDiv); // Append username to whole message
    msgDiv.appendChild(msgBodyDiv);  // Append message body to whole message
    return msgDiv;                   // Return the entire message div
}

function createUsernameDiv(msgData) {
    // Create div object
    let div = document.createElement("div");
    div.className = "username";

    addUserBadges(div, msgData); // Add badges the user has

    // Check if user color has been set - if display color is `undefined` then first non-falsy value is returned
    div.style.color = msgData.displayColor || "#FFFFFF";

    // Append username text to div
    let username = document.createElement("p");
    username.innerText = escapeText(msgData.displayName);    
    div.appendChild(username);

    return div;
}

function createMsgBodyDiv(msgData) {
    // Create div object
    let div = document.createElement("div");
    div.className = "msgBody";

    let msgBody = document.createElement("p");
    msgBody.innerText = `: ${escapeText(msgData.text)}`;

    addEmotes(div, msgData); // Add emotes to the message body after setting the inner text

    div.appendChild(msgBody); // Append message text with emotes inserted to the div

    return div;
}

function setAnimation(div) {
    const size = randomSize(0.45, 1); // Generate random size value for parallax effect
    const time = 28 / Math.pow(size, 0.5);        // Adjust time (i.e speed) value according to random size value

    div.style.fontSize = `${size}em`;
	div.style.animation = `slide-in ${time}s linear forwards`;
}

function setMessageHeight(div) {
    const maxHeight = window.innerHeight - div.offsetHeight; // Ensure it doesn't go out off screen at the bottom (space added to top of text)
    const randomHeight = Math.random() * maxHeight;
    div.style.top = `${randomHeight}px`;
}

function addUserBadges(div, msgData) {
    // Check if there exist badges to add
    if (!msgData.badges) return;

    // Create `img` element for each user badge and append to beginning of username div
    for (let badge of msgData.badges) {
        let badgeImg = document.createElement("img");
        badgeImg.src = badge["url"];
		badgeImg.className = "badge";

        div.appendChild(badgeImg);
    }
}

function addEmotes(div, msgData) {
    // Check if there exist emotes to add
    if (!msgData.emotes) return;

    // Create `img` element for each emote
    for (let emote of msgData.emotes) {
        let emoteImg = document.createElement("img");
        emoteImg.src = emote["urls"]["4"];
        emoteImg.className = "emote";
    }
}

function escapeText(text) {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
}

function randomSize(minSize, maxSize) {
    return Math.random() * (maxSize - minSize) + minSize;
}