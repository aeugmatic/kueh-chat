/*
    TODO:
    - ! Allow user to enable (or even specify) easing in / out options
    - Buffer messages to prevent lag (and potentially overlapping)
    - Use a better parallax algorithm / formula
    - Consider using a more "consistent" method for adding images to text (since badge and emote adding functions do it differently)
    - Flesh out the `escapeText` function / XSS prevention further
    - Consider potentially deleting message divs once they disappear off-screen, if allowing them to remain affects performance
*/

window.addEventListener("onEventReceived", (obj) => {
    // Check if the object received is a chat message (or if it has the checkable properties at all, hence '?.')
    if (obj?.detail?.listener?.toUpperCase() !== "MESSAGE") return;
    
    // Create variable to hold data object for less cumbersome reference
    const msgData = obj.detail.event.data;

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

    let msgText = document.createElement("p");
    msgText.innerHTML = `: ${escapeText(msgData.text)}`;

    addEmotes(msgText, msgData); // Add emotes to the message body after setting the inner text

    div.appendChild(msgText); // Append message text with emotes inserted to the div

    return div;
}

function setAnimation(div) {
    const size = randomSize(0.45, 1);      // Generate random size value for parallax effect
    const time = 20 / Math.pow(size, 0.5); // Adjust time (i.e speed) value according to random size value

    div.style.fontSize = `${size}em`;
	div.style.animation = `appear-ease 0.5s cubic-bezier(.24,.59,.33,.67) forwards, right-to-left ${time}s linear 0.5s forwards`;
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
        badgeImg.src = badge.url;
		badgeImg.className = "badge";

        div.appendChild(badgeImg);
    }
}

function addEmotes(msgText, msgData) {
    // Check if there exist emotes to add
    if (!msgData.emotes) return;

    // Create `img` element string for each emote, and replace each instance of emote text with it
    for (let emote of msgData.emotes) {
        let emoteImg = `<img class="emote" src="${emote.urls["4"]}" />`;
        msgText.innerHTML = msgText.innerHTML.replace(emote.name, emoteImg);
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