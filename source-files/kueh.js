/*
    TODO:
    - ! Allow user to enable (or even specify) easing in / out options (Implement animation for exiting with easing)
    - ! Add multiple options for what to do with messages that surpass char limit (e.g. dont show, truncate, etc.)
    - ! Add JSDoc comments to each non-anonymous function
    - ! Buffer messages to prevent lag (and potentially overlapping) (allow user to choose how many messages to display on screen at a time?)
    - Use a better parallax algorithm / formula
    - Consider using a more "consistent" method for adding images to text (since badge and emote adding functions do it differently)
    - Consider how to deal with text outline a bit more (just leave the colour up to the user?)
    - Possibly implement "deflection" physics? Make messages "deflect" each other within a certain radius so that they don't overlap and are easier to read
    - Modify the easing animations to account for different speeds so that it is more fluid
*/



/*  
    ==========================================================
        Declare variables to hold relevant JSON field data
    ==========================================================
*/

// Whole Message Appearance
let minScaleFactor, hiddenAccs, hideCommands, enableOutline, outlineColor, outlineThickness, enableTextDropShadow, textShadowColor, textShadowAngle;

// Whole Message Behaviour
let parallaxAmount, globalMsgSpeed;

// Username Appearance
let usernameColorOption, defaultUsernameColor, showUserBadges;

// Message Body Appearance
let charLimitDisplayOption, bodyCharLimit;



/*  
    ==================
        Event code
    ==================
*/  

// Initialise JSON field data variables
window.addEventListener("onWidgetLoad", (obj) => {
    // Store field data object in conveniently-accessible variable
    const fieldData = obj.detail.fieldData;

    // Whole Message Appearance
    minScaleFactor = fieldData.MinScaleFactor;
    hiddenAccs = fieldData.HiddenAccounts?.split(/,\s|,/g);
    hideCommands = fieldData.HideCommands;
    enableOutline = fieldData.EnableOutline;
    outlineColor = fieldData.OutlineColor;
    outlineThickness = fieldData.OutlineThickness
    enableTextDropShadow = fieldData.EnableTextDropShadow;
    textShadowColor = fieldData.TextShadowColor;
    textShadowAngle = fieldData.TextShadowAngle;

    // Whole Message Behaviour
    parallaxAmount = fieldData.ParallaxAmount;
    globalMsgSpeed = fieldData.GlobalMsgSpeed;

    // Username Appearance
    usernameColorOption = fieldData.UsernameColorOption;
    defaultUsernameColor = fieldData.DefaultUsernameColor;
    showUserBadges = fieldData.ShowUserBadges;

    // Message Body Appearance
    bodyCharLimit = fieldData.BodyCharLimit;
    charLimitDisplayOption = fieldData.CharLimitDisplayOption
});

window.addEventListener("onEventReceived", (obj) => {
    // Check if the object received is a chat message (or if it has the checkable properties at all, hence '?.')
    if (obj?.detail?.listener?.toUpperCase() !== "MESSAGE") return;

    // Create variable to hold data object for less cumbersome reference
    const msgData = obj.detail.event.data;

    // Check if message sender is in hidden accounts list (given that the array isn't undefined), don't show their message
    if (hiddenAccs?.includes(msgData.displayName)) return;

    // Check if message contains a command prefixed with '!'
    if (hideCommands && msgData.text[0] === "!") return;

    // Don't show message if body surpasses char limit and no display option was chosen
    if (msgData.text.length > bodyCharLimit && charLimitDisplayOption === "no_display") return;

    // Create the message div with all its styles and properties
    let msgDiv = createMessageDiv(msgData);

    // Attach the div to the widget
    document.querySelector(".main-container").appendChild(msgDiv);

    // Finally, set the message at a random height (has to be done after div is rendered in the DOM)
    setMessageHeight(msgDiv);

    // Remove message from DOM to be garbage-collected once off-screen
    msgDiv.addEventListener("animationend", (obj) => {
        if (obj.animationName === "right-to-left") document.getElementById(msgData.msgId).remove();
    });
});



/* 
    ============================
        Function definitions
    ============================
*/

/* TODO: MAKE JSDOC */
function createMessageDiv(msgData) {
    
    /* Whole Message */
    let msgDiv = document.createElement("div"); // Create the main message div
    msgDiv.id = msgData.msgId;                  // Set unique message ID for when it is needed  
    msgDiv.className = "msgDiv";                // Set class
    setAnimation(msgDiv);                       // Set animation + parallax effect
    handleOutline(msgDiv);                      // Handle rendering the outline of the message

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

    // Add badges the user has
    if (showUserBadges) { addUserBadges(div, msgData); } 

    // Holds color value to assign to style.color
    let setColor = "";
    
    // If username color already set in chat, then just set it to that 
    if (msgData.displayColor) {
        setColor = msgData.displayColor;
    }
    // If selected, choose a random default Twitch color
    else if (usernameColorOption === "twitch") {
        // Create object to store the default Twitch colors
        const twitchColors = {
            Red: "#FF0000",
            Blue: "#0000FF",
            Green: "#00FF00",
            FireBrick: "#B22222",
            Coral: "#FF7F50",
            YellowGreen: "#9ACD32",
            OrangeRed: "#FF4500",
            SeaGreen: "#2E8B57",
            GoldenRod: "#DAA520",
            Chocolate: "#D2691E",
            CadetBlue: "#5F9EA0",
            DodgerBlue: "#1E90FF",
            HotPink: "#FF69B4",
            BlueViolet: "#8A2BE2",
            SpringGreen: "#00FF7F"
        };

        // Select random color from object and then set that as the username colour
        const colorKeys = Object.keys(twitchColors);
        setColor = colorKeys[ Math.round(boundedRandom(0, colorKeys.length)) ];
    }
    // If selected, set the username color to the default one
    else if (usernameColorOption === "default_color") {
        // Check for certain if user color has been set - if display color is `undefined` then first non-falsy value is returned
        setColor = defaultUsernameColor;
    }
    div.style.color = setColor;

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

    let msgTextElement = document.createElement("p");

    // Create varaible for storing modifed message body text
    let msgText = escapeText(msgData.text);

    // Only consider display options if char limit surpassed
    if (msgData.text.length > bodyCharLimit) {
        if (charLimitDisplayOption === "simple_truncate") {
            msgText = msgText.slice(0, bodyCharLimit);
        }
        else if (charLimitDisplayOption === "ellipsis_truncate") {
            msgText = msgText.slice(0, bodyCharLimit) + "...";
        }
    }
    msgTextElement.innerHTML = `: ${escapeText(msgText)}`;

    addEmotes(msgTextElement, msgData); // Add emotes to the message body after setting the inner text
    div.appendChild(msgTextElement);    // Append message text with emotes inserted to the div

    return div;
}

function setAnimation(div) {
    const size = boundedRandom(minScaleFactor, 1);       // Generate random size value for parallax effect
    const time = calcParallaxTime(size, parallaxAmount); // Adjust time (i.e speed) value according to random size value

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
      .replace(/'/g, "&#039;")
      .replace(/`/g, "&#96;");
}

function boundedRandom(minSize, maxSize) {
    return Math.random() * (maxSize - minSize) + minSize;
}

function handleOutline(div) {
    // Initialise to include "actual" drop shadow for the text
    let shadow = handleShadow();

    // If text outline enabled, add "outline" shadow
    if (enableOutline) {
        // If handleShadow didn't return an empty string (falsey)
        if (shadow) shadow += ", ";

        // "Outline" shadow styling
        shadow += `
        -${outlineThickness}px -${outlineThickness}px 0 ${outlineColor}, 
         0                     -${outlineThickness}px 0 ${outlineColor}, 
         ${outlineThickness}px -${outlineThickness}px 0 ${outlineColor}, 
         ${outlineThickness}px  0                     0 ${outlineColor}, 
         ${outlineThickness}px  ${outlineThickness}px 0 ${outlineColor}, 
         0                      ${outlineThickness}px 0 ${outlineColor}, 
        -${outlineThickness}px  ${outlineThickness}px 0 ${outlineColor}, 
        -${outlineThickness}px  0                     0 ${outlineColor}`;
    }

    div.style.textShadow = shadow;
}

function handleShadow() {
    if (enableTextDropShadow) {
        return `3px 3px 3px ${textShadowColor}`
    }
    return "";
}

function calcParallaxTime(size, amount) {
    // Treat parallax amount value as speed offset
    const speedOffset = amount;

    /* 
        Explanation of parallax calculation:
        -> globalMsgSpeed * speedFactor         [final speed is relative to global speed * a size-dependent factor value]
        -> speedFactor = (1 - size) * amount    [the closer the size is to 100% / 1, the lesser the effect; the higher the amount, the more the effect]
    */ 
    const adjustedSpeed = globalMsgSpeed * (1 - 
        ((1 - size) * amount) // The smaller the size, the greater the variation - and hence, the smaller the total speed
    );

    // Time (s) = Distance (px) / Speed (px/s)
    return window.innerWidth / adjustedSpeed;
}