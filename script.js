/* Small bit of script for the portfolio site. */


/* AOS setup for scroll-based fade-ins. */
AOS.init({
    duration: 700,   // how long each animation takes in milliseconds
    once: true,      // only animate once — not every time you scroll past
    offset: 80       // start animation 80px before element enters screen
});


/* Mobile menu overlay. */

// Grab DOM elements by their IDs
const navToggle  = document.getElementById('navToggle');
const navClose   = document.getElementById('navClose');
const navOverlay = document.getElementById('navOverlay');

// Open overlay when hamburger is clicked
if (navToggle) {
    navToggle.addEventListener('click', () => {
        navOverlay.classList.add('active');     // CSS shows the overlay
        navToggle.classList.add('open');        // CSS turns ≡ into X
        document.body.style.overflow = 'hidden'; // stop background scrolling
    });
}

// Close overlay when the X button is clicked
if (navClose) {
    navClose.addEventListener('click', closeNav);
}

// Close overlay when any nav link is clicked (user navigating away)
document.querySelectorAll('.overlay-link').forEach(link => {
    link.addEventListener('click', closeNav);
});

// Reusable close function
function closeNav() {
    navOverlay.classList.remove('active');
    if (navToggle) navToggle.classList.remove('open');
    document.body.style.overflow = ''; // restore scrolling
}


/* Tiny football game for the home page. */

const canvas = document.getElementById('footballCanvas');

if (canvas) { // guard: only run if canvas exists (home page only)

    const ctx = canvas.getContext('2d'); // 2D drawing context

    /* --- Canvas internal size (display size set via CSS) --- */
    const BASE_W = 600;
    const BASE_H = 380;
    canvas.width  = BASE_W;
    canvas.height = BASE_H;

    /* --- Game state --- */
    let score    = 0;       // goals scored by player
    let attempts = 0;       // total shots taken
    let gameOver = false;   // true when 5 goals scored
    // phase tracks what's happening right now:
    // 'idle' = waiting for drag, 'aiming' = dragging, 'shooting' = ball moving, 'result' = showing outcome
    let phase = 'idle';

    /* --- Ball position --- */
    const BALL_START_X = BASE_W / 2;
    const BALL_START_Y = BASE_H - 55;
    const BALL_RADIUS  = 17;
    let ballX = BALL_START_X;
    let ballY = BALL_START_Y;

    /* --- Mouse/touch drag tracking --- */
    let isDragging = false;
    let aimX = 0; // current mouse position while dragging
    let aimY = 0;

    /* --- Shot animation --- */
    let shotProgress = 0;   // goes from 0 to 1 as ball travels
    let shotTargetX  = 0;   // where the ball is flying toward
    let shotTargetY  = 0;

    /* --- Goal dimensions --- */
    const GOAL_LEFT   = BASE_W * 0.18;
    const GOAL_RIGHT  = BASE_W * 0.82;
    const GOAL_TOP    = 28;
    const GOAL_BOTTOM = 105;
    const GOAL_W      = GOAL_RIGHT - GOAL_LEFT;

    /* --- Zone boundaries (divide goal into thirds) --- */
    const ZONE_L_END    = GOAL_LEFT + GOAL_W / 3;       // left third ends here
    const ZONE_R_START  = GOAL_LEFT + (GOAL_W / 3) * 2; // right third starts here

    /* --- Goalkeeper --- */
    const GK_W = 62;
    const GK_H = 50;
    let gkX       = (GOAL_LEFT + GOAL_RIGHT) / 2 - GK_W / 2; // starts center
    let gkTargetX = gkX;
    let gkZone    = 'center'; // where keeper will dive: 'left', 'center', 'right'

    /* --- UI elements --- */
    const msgEl      = document.getElementById('gameMessage');
    const resetBtn   = document.getElementById('resetGame');
    const scoreEl    = document.getElementById('scoreDisplay');
    const attemptsEl = document.getElementById('attemptsDisplay');


    /* Drawing helpers. */

    // Pitch background
    function drawPitch() {
        // Main green base
        ctx.fillStyle = '#1a472a';
        ctx.fillRect(0, 0, BASE_W, BASE_H);

        // Alternating lighter green stripes (like real grass)
        ctx.fillStyle = '#1e5230';
        for (let i = 0; i < 7; i++) {
            ctx.fillRect(i * (BASE_W / 6), 0, BASE_W / 12, BASE_H);
        }

        // Penalty arc (decorative white arc at bottom)
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(BASE_W / 2, BASE_H + 20, 130, Math.PI, 0);
        ctx.stroke();

        // Penalty spot
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.beginPath();
        ctx.arc(BASE_W / 2, BASE_H - 110, 3, 0, Math.PI * 2);
        ctx.fill();

        // Goal line (white line across bottom of goal)
        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(GOAL_LEFT, GOAL_BOTTOM);
        ctx.lineTo(GOAL_RIGHT, GOAL_BOTTOM);
        ctx.stroke();
    }

    // Goal and net
    function drawGoal() {
        // Net grid lines
        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx.lineWidth = 1;
        // Vertical net lines
        for (let x = GOAL_LEFT; x <= GOAL_RIGHT; x += 18) {
            ctx.beginPath(); ctx.moveTo(x, GOAL_TOP); ctx.lineTo(x, GOAL_BOTTOM); ctx.stroke();
        }
        // Horizontal net lines
        for (let y = GOAL_TOP; y <= GOAL_BOTTOM; y += 14) {
            ctx.beginPath(); ctx.moveTo(GOAL_LEFT, y); ctx.lineTo(GOAL_RIGHT, y); ctx.stroke();
        }

        // White goal posts and crossbar
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 6;
        ctx.lineJoin = 'miter';
        ctx.beginPath();
        ctx.moveTo(GOAL_LEFT,  GOAL_BOTTOM); // left post bottom
        ctx.lineTo(GOAL_LEFT,  GOAL_TOP);    // left post up
        ctx.lineTo(GOAL_RIGHT, GOAL_TOP);    // crossbar
        ctx.lineTo(GOAL_RIGHT, GOAL_BOTTOM); // right post down
        ctx.stroke();
    }

    // Keeper in the pink kit
    function drawKeeper() {
        // Body
        ctx.fillStyle = '#FF2D78';
        ctx.fillRect(gkX, GOAL_BOTTOM - GK_H, GK_W, GK_H);

        // Gloves (yellow dots)
        ctx.fillStyle = '#FFD600';
        ctx.beginPath();
        ctx.arc(gkX + 6, GOAL_BOTTOM - GK_H / 2, 6, 0, Math.PI * 2);
        ctx.arc(gkX + GK_W - 6, GOAL_BOTTOM - GK_H / 2, 6, 0, Math.PI * 2);
        ctx.fill();

        // Kit number "1"
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 15px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('1', gkX + GK_W / 2, GOAL_BOTTOM - GK_H / 2 + 5);
    }

    // Ball drawing
    function drawBall(x, y) {
        // White circle
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(x, y, BALL_RADIUS, 0, Math.PI * 2);
        ctx.fill();

        // Black shadow patch shapes (simplified pentagon pattern)
        ctx.fillStyle = '#111111';
        const patches = [[0, -7], [7, 4], [-7, 4]]; // small offsets for patches
        patches.forEach(([ox, oy]) => {
            ctx.beginPath();
            ctx.arc(x + ox, y + oy, 4, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    // Aim line while dragging
    function drawAimArrow() {
        if (!isDragging || phase !== 'aiming') return;

        // Calculate direction and length (capped at 90px)
        const dx  = aimX - BALL_START_X;
        const dy  = aimY - BALL_START_Y;
        const len = Math.min(Math.sqrt(dx * dx + dy * dy), 90);
        const ang = Math.atan2(dy, dx);

        const endX = BALL_START_X + Math.cos(ang) * len;
        const endY = BALL_START_Y + Math.sin(ang) * len;

        // Dashed yellow line
        ctx.strokeStyle = 'rgba(255,214,0,0.85)';
        ctx.lineWidth = 2;
        ctx.setLineDash([7, 5]);
        ctx.beginPath();
        ctx.moveTo(BALL_START_X, BALL_START_Y);
        ctx.lineTo(endX, endY);
        ctx.stroke();
        ctx.setLineDash([]); // reset dash back to solid

        // Arrowhead at end of line
        ctx.fillStyle = 'rgba(255,214,0,0.85)';
        ctx.save();
        ctx.translate(endX, endY);
        ctx.rotate(ang);
        ctx.beginPath();
        ctx.moveTo(10, 0);
        ctx.lineTo(-6,  6);
        ctx.lineTo(-6, -6);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    // Simple instruction text when idle
    function drawInstruction() {
        if (phase !== 'idle') return;
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.font = '12px Space Mono, monospace';
        ctx.textAlign = 'center';
        ctx.fillText('CLICK & DRAG BALL TO AIM · RELEASE TO SHOOT', BASE_W / 2, BASE_H - 14);
    }


    /* Redraw the scene each frame. */
    function draw() {
        ctx.clearRect(0, 0, BASE_W, BASE_H);

        drawPitch();
        drawGoal();
        drawKeeper();

        if (phase === 'shooting' || phase === 'result') {
            // Interpolate ball from start to target using shot progress (0→1)
            const t = Math.min(shotProgress, 1);
            // easeOut: ball starts fast, slows as it reaches goal
            const eased = 1 - Math.pow(1 - t, 2);
            const cx = BALL_START_X + (shotTargetX - BALL_START_X) * eased;
            const cy = BALL_START_Y + (shotTargetY - BALL_START_Y) * eased;
            drawBall(cx, cy);
        } else {
            drawBall(ballX, ballY);
            drawAimArrow();
        }

        drawInstruction();
    }


    /* Main game loop. */
    function gameLoop() {
        if (phase === 'shooting') {
            shotProgress += 0.045; // how fast the ball moves — increase for faster shot

            // Animate keeper sliding toward their zone
            gkX += (gkTargetX - gkX) * 0.1; // eases toward target

            // Once ball reaches goal
            if (shotProgress >= 1) {
                phase = 'result';
                resolveShot(); // decide goal or save
            }
        }

        draw(); // redraw everything

        // Keep looping until game ends
        if (!gameOver) {
            requestAnimationFrame(gameLoop);
        }
    }


    /* Figure out whether the shot was a goal, save, or wide. */
    function resolveShot() {
        attempts++;

        // Which horizontal third of the goal did ball land in?
        let ballZone;
        if (shotTargetX < ZONE_L_END)    ballZone = 'left';
        else if (shotTargetX > ZONE_R_START) ballZone = 'right';
        else                               ballZone = 'center';

        // Is ball physically inside the goal rectangle?
        const onTarget = shotTargetX > GOAL_LEFT  &&
                         shotTargetX < GOAL_RIGHT &&
                         shotTargetY > GOAL_TOP   &&
                         shotTargetY < GOAL_BOTTOM;

        if (!onTarget) {
            // Ball missed the goal entirely
            showMessage('WIDE! 😬', '#888888');
        } else if (ballZone !== gkZone) {
            // Ball on target AND keeper dove the wrong way
            score++;
            showMessage('⚽ GOAL!', '#FFD600');
        } else {
            // Ball on target but keeper in same zone
            showMessage('SAVED! 🧤', '#FF2D78');
        }

        // Update scoreboard displays
        scoreEl.textContent    = `GOALS: ${score} / 5`;
        attemptsEl.textContent = `SHOTS: ${attempts}`;

        // Check if player won
        if (score >= 5) {
            setTimeout(() => {
                showMessage('🏆 HAT-TRICK HERO!', '#FFD600');
                gameOver = true;
                if (resetBtn) resetBtn.style.display = 'inline-block';
            }, 900);
        } else {
            // Reset for the next shot after a short pause
            setTimeout(resetForNextShot, 1300);
        }
    }


    /* Reset the ball and keeper for the next shot. */
    function resetForNextShot() {
        phase        = 'idle';
        ballX        = BALL_START_X;
        ballY        = BALL_START_Y;
        shotProgress = 0;
        isDragging   = false;
        gkX = (GOAL_LEFT + GOAL_RIGHT) / 2 - GK_W / 2; // keeper back to center
        if (msgEl) msgEl.textContent = '';
    }


    /* Pick a random keeper dive before each shot. */
    function pickGKZone() {
        const zones = ['left', 'center', 'right'];
        gkZone = zones[Math.floor(Math.random() * zones.length)];

        // Set the X position the keeper will slide to
        if (gkZone === 'left')        gkTargetX = GOAL_LEFT - 8;
        else if (gkZone === 'right')  gkTargetX = GOAL_RIGHT - GK_W + 8;
        else                          gkTargetX = (GOAL_LEFT + GOAL_RIGHT) / 2 - GK_W / 2;
    }


    /* Show the message under the canvas. */
    function showMessage(text, colour) {
        if (!msgEl) return;
        msgEl.textContent  = text;
        msgEl.style.color  = colour;
    }


    /* Helpers for mouse and touch input. */
    function getMousePos(e) {
        const rect   = canvas.getBoundingClientRect();
        const scaleX = BASE_W / rect.width;  // ratio if canvas displayed smaller
        const scaleY = BASE_H / rect.height;
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top)  * scaleY
        };
    }

    function getTouchPos(e) {
        const rect   = canvas.getBoundingClientRect();
        const touch  = e.touches[0] || e.changedTouches[0];
        const scaleX = BASE_W / rect.width;
        const scaleY = BASE_H / rect.height;
        return {
            x: (touch.clientX - rect.left) * scaleX,
            y: (touch.clientY - rect.top)  * scaleY
        };
    }

    // Calculate where ball should fly based on drag direction
    function calcShot(releasePos) {
        // Ball travels in the SAME direction as the drag arrow
        // (mouse position relative to ball start = shot direction)
        const dx = releasePos.x - BALL_START_X;
        const dy = releasePos.y - BALL_START_Y;

        // Multiply by 2.5 so a short drag still reaches the goal
        // Clamp X so ball stays around the goal width
        // Clamp Y so ball doesn't go below the ball start or too far above goal
        shotTargetX = Math.max(GOAL_LEFT - 60,   Math.min(GOAL_RIGHT + 60,    BALL_START_X + dx * 2.5));
        shotTargetY = Math.max(GOAL_TOP - 30,     Math.min(BALL_START_Y - 40,  BALL_START_Y + dy * 2.5));
    }


    /* Mouse events. */

    // Start drag (only if clicking on the ball)
    canvas.addEventListener('mousedown', (e) => {
        if (phase !== 'idle' || gameOver) return;
        const pos  = getMousePos(e);
        const dist = Math.hypot(pos.x - BALL_START_X, pos.y - BALL_START_Y);
        if (dist < BALL_RADIUS + 18) { // +18 makes it easier to click
            isDragging = true;
            phase      = 'aiming';
        }
    });

    // Update aim line as mouse moves
    canvas.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const pos = getMousePos(e);
        aimX = pos.x;
        aimY = pos.y;
    });

    // Release to shoot
    canvas.addEventListener('mouseup', (e) => {
        if (!isDragging) return;
        isDragging = false;
        calcShot(getMousePos(e));
        pickGKZone();       // keeper picks their zone
        phase        = 'shooting';
        shotProgress = 0;
    });


    /* Touch events for mobile. */

    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault(); // stop page scrolling while touching canvas
        if (phase !== 'idle' || gameOver) return;
        const pos  = getTouchPos(e);
        const dist = Math.hypot(pos.x - BALL_START_X, pos.y - BALL_START_Y);
        if (dist < BALL_RADIUS + 22) {
            isDragging = true;
            phase      = 'aiming';
        }
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (!isDragging) return;
        const pos = getTouchPos(e);
        aimX = pos.x;
        aimY = pos.y;
    }, { passive: false });

    canvas.addEventListener('touchend', (e) => {
        if (!isDragging) return;
        isDragging = false;
        calcShot(getTouchPos(e));
        pickGKZone();
        phase        = 'shooting';
        shotProgress = 0;
    });


    /* Reset button to start a fresh game. */
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            score    = 0;
            attempts = 0;
            gameOver = false;
            resetBtn.style.display  = 'none';
            scoreEl.textContent     = 'GOALS: 0 / 5';
            attemptsEl.textContent  = 'SHOTS: 0';
            if (msgEl) msgEl.textContent = '';
            resetForNextShot();
            gameLoop(); // restart the animation loop
        });
    }

    // Kick off the game loop!
    gameLoop();

} // end if (canvas)


/* Simple contact form feedback. */
const contactForm = document.getElementById('contactForm');

if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
        e.preventDefault(); // stop default form submit (page reload)

        const successEl = document.getElementById('formSuccess');
        if (successEl) {
            successEl.style.display = 'block'; // show the yellow success box
            contactForm.reset();               // clear all form fields

            // Auto-hide the success message after 4 seconds
            setTimeout(() => {
                successEl.style.display = 'none';
            }, 4000);
        }
    });
}

/* Lightbox for project screenshots. */


/* Grab the lightbox bits. */

const lightbox     = document.getElementById('slideshowLightbox');  // the whole overlay
const backdrop     = document.getElementById('slideshowBackdrop');   // dark background
const closeBtn     = document.getElementById('slideshowClose');      // ✕ button
const prevBtn      = document.getElementById('slidePrev');           // left arrow
const nextBtn      = document.getElementById('slideNext');           // right arrow
const slideshowImg = document.getElementById('slideshowImg');        // the <img> shown
const titleEl      = document.getElementById('slideshowTitle');      // project name
const counterEl    = document.getElementById('slideshowCounter');    // "2 / 5"
const dotsEl       = document.getElementById('slideshowDots');       // dot row


/* Only runs if the lightbox exists. */
if (lightbox) {

    /* Basic state. */
    let slideImages  = [];  // array of image src strings for the open project
    let currentIndex = 0;   // which image is showing right now


    /* Open the lightbox when a project button is clicked. */
    function openLightbox(projectId, projectTitle) {

        // Find the hidden div that holds this project's images
        const slideContainer = document.getElementById('slides-' + projectId);

        if (!slideContainer) {
            // Safety check — shouldn't happen if IDs match
            console.warn('No slide container found for:', projectId);
            return;
        }

        // Pull all <img> src values out of the hidden div
        const imgEls = slideContainer.querySelectorAll('img');
        slideImages  = Array.from(imgEls).map(img => ({ src: img.src, alt: img.alt }));

        // If no images have been added yet, show a placeholder message
        if (slideImages.length === 0) {
            slideImages = [{
                src: '',        // blank src
                alt: 'No screenshots added yet — check back soon!'
            }];
        }

        // Set title and reset to first slide
        titleEl.textContent = projectTitle;
        currentIndex        = 0;

        // Build the dot indicators (one per image)
        buildDots();

        // Show the first image
        showSlide(0);

        // Make the lightbox visible
        lightbox.style.display = 'flex';
        document.body.style.overflow = 'hidden'; // stop background scrolling
    }


    /* Close the lightbox. */
    function closeLightbox() {
        lightbox.style.display = 'none';
        document.body.style.overflow = ''; // restore scrolling
        slideImages  = [];
        currentIndex = 0;
    }


    /* Show the selected slide. */
    function showSlide(index) {

        // Clamp index to valid range (wrap around)
        if (index < 0)                  index = slideImages.length - 1;
        if (index >= slideImages.length) index = 0;

        currentIndex = index;

        const slide = slideImages[currentIndex];

        // If no real src (placeholder), show a styled empty state
        if (!slide.src) {
            slideshowImg.style.display = 'none';
            // Show or create the no-images message
            let noImgMsg = document.getElementById('noImgMessage');
            if (!noImgMsg) {
                noImgMsg = document.createElement('p');
                noImgMsg.id        = 'noImgMessage';
                noImgMsg.className = 'slideshow-no-img';
                noImgMsg.textContent = 'Screenshots coming soon.';
                slideshowImg.parentNode.insertBefore(noImgMsg, slideshowImg);
            }
            noImgMsg.style.display = 'block';
        } else {
            // Real image — show it
            slideshowImg.src        = slide.src;
            slideshowImg.alt        = slide.alt;
            slideshowImg.style.display = 'block';
            const noImgMsg = document.getElementById('noImgMessage');
            if (noImgMsg) noImgMsg.style.display = 'none';
        }

        // Update "X / Y" counter
        counterEl.textContent = `${currentIndex + 1} / ${slideImages.length}`;

        // Update which dot is highlighted
        updateDots();
    }


    /* Build the dot buttons. */
    function buildDots() {
        dotsEl.innerHTML = ''; // clear old dots

        slideImages.forEach((_, i) => {
            const dot = document.createElement('button');
            dot.className   = 'slide-dot';
            dot.setAttribute('aria-label', `Go to slide ${i + 1}`);

            // Clicking a dot jumps to that slide
            dot.addEventListener('click', () => showSlide(i));

            dotsEl.appendChild(dot);
        });
    }


    /* Highlight the active dot. */
    function updateDots() {
        const dots = dotsEl.querySelectorAll('.slide-dot');
        dots.forEach((dot, i) => {
            dot.classList.toggle('active', i === currentIndex);
        });
    }


    /* Event listeners. */

    // Prev / Next arrows
    if (prevBtn) prevBtn.addEventListener('click', () => showSlide(currentIndex - 1));
    if (nextBtn) nextBtn.addEventListener('click', () => showSlide(currentIndex + 1));

    // Close button (✕)
    if (closeBtn) closeBtn.addEventListener('click', closeLightbox);

    // Clicking the dark backdrop also closes
    if (backdrop) backdrop.addEventListener('click', closeLightbox);

    // Keyboard: Escape = close, Arrow keys = prev/next
    document.addEventListener('keydown', (e) => {
        if (lightbox.style.display === 'none') return; // only when open
        if (e.key === 'Escape')     closeLightbox();
        if (e.key === 'ArrowLeft')  showSlide(currentIndex - 1);
        if (e.key === 'ArrowRight') showSlide(currentIndex + 1);
    });

    // "VIEW PROJECT" buttons — each opens its project's slideshow
    document.querySelectorAll('.slideshow-trigger').forEach(btn => {
        btn.addEventListener('click', () => {
            const projectId    = btn.getAttribute('data-project'); // e.g. "cosmo-clash"
            const projectTitle = btn.getAttribute('data-title');   // e.g. "Cosmo Clash: Grand Gravity"
            openLightbox(projectId, projectTitle);
        });
    });

} // end if (lightbox)