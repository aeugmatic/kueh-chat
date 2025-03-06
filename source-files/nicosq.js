/*
    TODO:
    - !!! CLEAN UP animation calcs (read up on finished.then()) and REPLACE MAGIC NUMBERS
    - ! Clean up code in general (e.g. make `let`s into `const`s where needed, and so on)
    - ! Do JSDOC
    - ! Consider letting users set animations with `#` or some other symbol? e.g. `#wavy` makes the message become wavy as it travels across the screen
    - Additional option to link message buffer to number of messages / message size? e.g. if emotes are spammed in a raid then they can fill the screen
    - Consider using a more "consistent" method for adding images to text (since badge and emote adding functions do it differently)
    - Consider how to deal with text outline a bit more (just leave the colour up to the user?)
    - Possibly implement "deflection" physics? Make messages "deflect" each other within a certain radius so that they don't overlap and are easier to read
*/



/*  
    ========================
        GLOBAL VARIABLES
    ========================
*/

/*
    JSON Field Data
*/

// Whole Message Appearance
let minScaleFactor, hiddenAccs, hideCommands, enableOutline, outlineColor, outlineThickness, enableTextDropShadow, textShadowColor, textShadowAngle;

// Whole Message Behaviour
let parallaxAmount, globalMsgSpeed, enableMsgBuffer, preBufferMsgLimit, easingAcceleration, enableAppearanceEasing, appearanceEaseThresh, enableDisappearanceEasing, disappearanceEaseThresh;

// Username Appearance
let usernameColorOption, defaultUsernameColor, showUserBadges;

// Message Body Appearance
let charLimitDisplayOption, bodyCharLimit;

/* 
    Message Buffer Values
*/

const msgQueue = [];  // Message buffer queue
let onscreenMsgs = 0; // Number of onscreen messages



/*  
    ==================
        EVENT CODE
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
    enableMsgBuffer = fieldData.EnableMsgBuffer;
    preBufferMsgLimit = fieldData.PreBufferMsgLimit;
    easingAcceleration = fieldData.EasingAcceleration;
    enableAppearanceEasing = fieldData.EnableAppearanceEasing;
    appearanceEaseThresh = fieldData.AppearanceEaseThresh;
    enableDisappearanceEasing = fieldData.EnableDisappearanceEasing;
    disappearanceEaseThresh = fieldData.DisappearanceEaseThresh;

    // Username Appearance
    usernameColorOption = fieldData.UsernameColorOption;
    defaultUsernameColor = fieldData.DefaultUsernameColor;
    showUserBadges = fieldData.ShowUserBadges;

    // Message Body Appearance
    bodyCharLimit = fieldData.BodyCharLimit;
    charLimitDisplayOption = fieldData.CharLimitDisplayOption
});

window.addEventListener("onEventReceived", (msgObj) => {
    if (msgObj?.detail?.listener?.toUpperCase() !== "MESSAGE") return;

    // Check if message fulfills necessary criteria to be displayed in the first place
    const msgData = msgObj.detail.event.data;
    if (hiddenAccs?.includes(msgData.displayName)) return; 
    if (hideCommands && msgData.text[0] === "!") return;   
    if (msgData.text.length > bodyCharLimit && charLimitDisplayOption === "no_display") return;

    // Handle message queueing
    if (onscreenMsgs >= preBufferMsgLimit && enableMsgBuffer) {
        msgQueue.push(msgObj);
    }
    else {
        handleMsgDisplay(msgData);
    }
});



/* 
    ============================
        FUNCTION DEFINITIONS
    ============================
*/

/* TODO: JSDOC */
function handleMsgDisplay(msgData) {
    let msgDiv = createMsgDiv(msgData);
    document.querySelector(".main-container").appendChild(msgDiv);
    onscreenMsgs++;

    // Must be set after appending because offset distances unknown before div is rendered in DOM
    setMsgHeight(msgDiv);
    const finalAnim = setAnimation(msgDiv);

    // When the final animation (i.e. the one that brings the message offscreen ends)
    finalAnim.finished.then((anim) => {
        // Remove current message from DOM and dequeue next message waiting to be displayed
        document.getElementById(msgData.msgId).remove();
        onscreenMsgs--;

        // Check if queue even has any divs in it before displaying them
        if (msgQueue.length) handleMsgDisplay(msgQueue.shift().detail.event.data);
    });
}

/**
 * Creates a div to represent the entire message (username + message body).
 * 
 * @param {object} msgData an object holding the message data from the StreamElements API.
 * @returns the entire message div object.
 */
function createMsgDiv(msgData) {
    
    /* Whole Message */
    let msgDiv = document.createElement("div"); // Create the main message div
    msgDiv.id = msgData.msgId;                  // Set unique message ID for when it is needed  
    msgDiv.className = "msgDiv";                // Set class
    handleOutline(msgDiv);                      // Handle rendering the outline of the message

    /* Message Username */
    let usernameDiv = createUsernameDiv(msgData);

    /* Message Body */
    let msgBodyDiv = createMsgBodyDiv(msgData);

    /* Putting it All Together */
    
    // Set random font size (mainly for use in parallax effect)
    const size = boundedRandom(minScaleFactor, 1);
    msgDiv.style.fontSize = `${size}em`;

    msgDiv.appendChild(usernameDiv);
    msgDiv.appendChild(msgBodyDiv);
    return msgDiv;
}

/**
 * Creates a div to represent the username,
 * 
 * @param {object} msgData an object holding the message data from the StreamElements API.
 * @returns the username div object.
 */
function createUsernameDiv(msgData) {
    let div = document.createElement("div");
    div.className = "username";

    if (showUserBadges) { addUserBadges(div, msgData); } 

    // Holds color value to assign to style.color
    let setColor = "";
    if (msgData.displayColor) {
        setColor = msgData.displayColor;
    }
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
    else if (usernameColorOption === "default_color") {
        setColor = defaultUsernameColor;
    }
    div.style.color = setColor;

    // Append username text to div
    let username = document.createElement("p");
    username.innerText = escapeText(msgData.displayName);    
    div.appendChild(username);

    return div;
}

/**
 * Creates a div to represent the message body text.
 * 
 * @param {object} msgData an object holding the message data from the StreamElements API.
 * @returns the message body div object.
 */
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
    msgTextElement.innerHTML = `: ${msgText}`;

    addEmotes(msgTextElement, msgData); // Add emotes to the message body after setting the inner text
    div.appendChild(msgTextElement);

    return div;
}

/* TODO: JSDOC */
function setAnimation(msgDiv) {
    const size = +msgDiv.style.fontSize.replace("em", "");
    const offscreenDist = (-(msgDiv.offsetWidth / window.innerWidth) * 100) - 10; // Calculate offscreen distance (in vw) with a "margin of error" of 10
    const msgSpeed = calcParallaxSpeed(size);


    const easeAnimSteps = 25;
    if (enableAppearanceEasing && enableDisappearanceEasing) {
        const AEDuration = calcAEDuration(100, appearanceEaseThresh, msgSpeed);
        const RLDuration = calcRLDuration(appearanceEaseThresh, disappearanceEaseThresh, msgSpeed);
        const DEDuration = calcDEDuration(disappearanceEaseThresh, offscreenDist, msgSpeed, AEDuration);

        // Appearance easing
        const {keyframes: AEKeyframes, animDetails: AEAnimDetails} = createAnimation(
            AEDuration,    // Duration of this animation
            0,             // Duration of preceding animation
            msgSpeed,      // Message speed in vw / s
            easeAnimSteps, // Number of steps in animation
            AEFunc         // Easing function to use
        );
        msgDiv.animate(AEKeyframes, AEAnimDetails);

        // Right-to-left
        const {keyframes: RLKeyframes, animDetails: RLAnimDetails} = createAnimation(
            RLDuration, // Duration of this animation
            AEDuration, // Duration of preceding animation
            msgSpeed,   // Message speed in vw / s
            2,          // Number of steps in animation
            RLFunc      // Easing function to use
        );
        msgDiv.animate(RLKeyframes, RLAnimDetails);

        // Disappearance easing - LAST
        const {keyframes: DEKeyframes, animDetails: DEAnimDetails} = createAnimation(
            DEDuration,              // Duration of this animation
            AEDuration + RLDuration, // Duration of preceding animation
            msgSpeed,                // Message speed in vw / s
            easeAnimSteps,           // Number of steps in animation
            DEFunc                   // Easing function to use
        );
        return msgDiv.animate(DEKeyframes, DEAnimDetails);
    }
    else if (enableAppearanceEasing) {
        const AEDuration = calcAEDuration(100, appearanceEaseThresh, msgSpeed);
        const RLDuration = calcRLDuration(appearanceEaseThresh, offscreenDist, msgSpeed);

        // Appearance easing
        const {keyframes: AEKeyframes, animDetails: AEAnimDetails} = createAnimation(
            AEDuration,    // Duration of this animation
            0,             // Duration of preceding animation
            msgSpeed,      // Message speed in vw / s
            easeAnimSteps, // Number of steps in animation
            AEFunc         // Easing function to use
        );
        msgDiv.animate(AEKeyframes, AEAnimDetails);

        // Right-to-left - LAST
        const {keyframes: RLKeyframes, animDetails: RLAnimDetails} = createAnimation(
            RLDuration, // Duration of this animation
            AEDuration, // Duration of preceding animation
            msgSpeed,   // Message speed in vw / s
            2,          // Number of steps in animation
            RLFunc      // Easing function to use
        );
        return msgDiv.animate(RLKeyframes, RLAnimDetails);
    }
    else if (enableDisappearanceEasing) {
        const RLDuration = calcRLDuration(100, disappearanceEaseThresh, msgSpeed);
        const DEDuration = calcDEDuration(disappearanceEaseThresh, offscreenDist, msgSpeed, 0);

        // Right-to-left
        const {keyframes: RLKeyframes, animDetails: RLAnimDetails} = createAnimation(
            RLDuration, // Duration of this animation
            0,          // Duration of preceding animation
            msgSpeed,   // Message speed in vw / s
            2,          // Number of steps in animation
            RLFunc      // Easing function to use
        );
        msgDiv.animate(RLKeyframes, RLAnimDetails);

        // Disappearance easing - LAST
        const {keyframes: DEKeyframes, animDetails: DEAnimDetails} = createAnimation(
            DEDuration,    // Duration of this animation
            RLDuration,    // Duration of preceding animation
            msgSpeed,      // Message speed in vw / s
            easeAnimSteps, // Number of steps in animation
            DEFunc         // Easing function to use
        );
        return msgDiv.animate(DEKeyframes, DEAnimDetails);
    }
    else {
        const RLDuration = calcRLDuration(100, offscreenDist, msgSpeed);

        // Right-to-left - LAST
        const {keyframes: RLKeyframes, animDetails: RLAnimDetails} = createAnimation(
            RLDuration, // Duration of this animation
            0,          // Duration of preceding animation
            msgSpeed,   // Message speed in vw / s
            2,          // Number of steps in animation
            RLFunc      // Easing function to use
        );

        return msgDiv.animate(RLKeyframes, RLAnimDetails);
    }
}

/* TODO: JSDOC */
function createKeyframes(duration, prevDuration, msgSpeed, steps, easingFunc) {
    const keyframes = [];

    const timeStep = duration / steps;
    for (let s = 0; s <= steps; s++) {
        const t = timeStep*s + prevDuration;
        const leftVal = (prevDuration)? easingFunc(t, msgSpeed, prevDuration) : easingFunc(t, msgSpeed);

        keyframes.push({
            left: `${leftVal}vw`
        });
    }

    
    return keyframes;
}

/* TODO: JSDOC */
function createAnimation(duration, prevDuration, msgSpeed, steps, easingFunc) {
    return {
        keyframes: createKeyframes(duration, prevDuration, msgSpeed, steps, easingFunc),
        animDetails: {
            duration: duration * 1000,
            easing: "linear",
            fill: "forwards",
            delay: prevDuration * 1000
        }
    };
}

/* TODO: JSDOC */
function calcRLDuration(s_l, f_l, v) {    
    return (s_l - f_l) / v;
}

/* TODO: JSDOC */
function calcAEDuration(s_a, f_a, v) {
    const k = easingAcceleration;
    return (1/k) * Math.log( (k * (s_a - f_a)) / v );
}

/* TODO: JSDOC */
function calcDEDuration(s_d, f_d, v, t_1) {
    const k = easingAcceleration;
	return (Math.log( (k/v) * (s_d - f_d) + 1 ) - t_1) / k;
}

/* TODO: JSDOC */
function AEFunc(t, v) {
    const s_a = 100,
          f_a = appearanceEaseThresh,
          k = easingAcceleration; 
    const yComp = f_a - (v / k);

    return ( (s_a - f_a) / Math.exp(k*t) ) + yComp;
}

/* TODO: JSDOC */
function RLFunc(t, v, t_1) {
    const f_a = appearanceEaseThresh,
          yComp = (enableAppearanceEasing)? (v*t_1 + f_a) : 100;
        
    return -v*t + yComp;
}

/* TODO: JSDOC */
function DEFunc(t, v, t_2) {
    const s_d = disappearanceEaseThresh,
          k = easingAcceleration;

    return (v / k) * (1 - Math.exp( k*(t - t_2) )) + s_d;
}

/**
 * Sets the whole message height to a random value (adjusted to fit within the screen).
 * 
 * @param {object} msgDiv object that represents the entire message div.
 */
function setMsgHeight(msgDiv) {
    const maxHeight = window.innerHeight - msgDiv.offsetHeight; // Ensure it doesn't go out off screen at the bottom (space added to top of text)
    const randomHeight = Math.random() * maxHeight;
    msgDiv.style.top = `${randomHeight}px`;
}

/**
 * Adds any user badges to the username div.
 * 
 * @param {object} usernameDiv object that represents the username div.
 * @param {object} msgData an object holding the message data from the StreamElements API.
 * @returns nothing (if there's no badges to add)
 */
function addUserBadges(usernameDiv, msgData) {
    // Check if there exist badges to add
    if (!msgData.badges) return;

    for (let badge of msgData.badges) {
        let badgeImg = document.createElement("img");
        badgeImg.src = badge.url;
		badgeImg.className = "badge";

        usernameDiv.appendChild(badgeImg);
    }
}

/**
 * Adds emote images to the message body text.
 * 
 * @param {*} msgTextElement HTML element representing the message body text. 
 * @param {*} msgData an object holding the message data from the StreamElements API.
 * @returns nothing (if there's no emotes to add).
 */
function addEmotes(msgTextElement, msgData) {
    if (!msgData.emotes) return;

    for (let emote of msgData.emotes) {
        let emoteImg = `<img class="emote" src="${emote.urls["4"]}" />`;
        msgTextElement.innerHTML = msgTextElement.innerHTML.replace(emote.name, emoteImg);
    }
}

/**
 * Escapes / sanitises the message body text to prevent XSS attacks.
 * 
 * @param {string} text text to escape / sanitise.
 * @returns the escaped text.
 */
function escapeText(text) {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;")
      .replace(/`/g, "&#96;");
}

/**
 * Generates a random real value between a lower and upper bound value.
 * 
 * @param {number} minSize lower bound.
 * @param {number} maxSize upper bound.
 * @returns random real value.
 */
function boundedRandom(minSize, maxSize) {
    return Math.random() * (maxSize - minSize) + minSize;
}

/**
 * Handles the outline and drop shadow for the entire message.
 * 
 * @param {object} msgDiv object that represents the entire message div.
 */
function handleOutline(msgDiv) {
    // Initialise to include "actual" drop shadow for the text
    let shadow = "";

    // Set the drop shadow if enabled
    if (enableTextDropShadow) {
        shadow =  `3px 3px 3px ${textShadowColor}`
    }

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

    msgDiv.style.textShadow = shadow;
}

/* TODO: JSDOC */
function calcParallaxSpeed(size) {
    // If parallaxAmount = 0, then size^parallaxAmount = 1, so each message has the same speed
    return globalMsgSpeed * (Math.pow(size, parallaxAmount));
}