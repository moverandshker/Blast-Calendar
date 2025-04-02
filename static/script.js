document.addEventListener('DOMContentLoaded', () => {
    const calendarGrid = document.getElementById('calendar-grid');
    const monthYearTitle = document.getElementById('month-year');
    const prevMonthButton = document.getElementById('prev-month');
    const nextMonthButton = document.getElementById('next-month');
    const themeToggleButton = document.getElementById('theme-toggle');
    const bodyElement = document.body;

    let currentMoment = new Date(); // Use native Date for simplicity now

    const detectedTheme = bodyElement.dataset.theme || 'default';
    let userPrefersDefault = localStorage.getItem('forceDefaultTheme') === 'true';

    // Apply user preference on load if applicable
    if (userPrefersDefault && detectedTheme !== 'default') {
        bodyElement.dataset.theme = 'default';
    }

    // --- Theme Toggle Logic ---
    if (detectedTheme === 'default') {
        // Hide toggle if no special theme is active initially
        // AND the user hasn't previously forced default (edge case)
        if (themeToggleButton && !userPrefersDefault) { 
            themeToggleButton.style.display = 'none';
        }
    } else {
        // Show the button if a theme is detected (it might be hidden by default)
        if (themeToggleButton) themeToggleButton.style.display = 'inline-block'; 
        
        if (themeToggleButton) {
            themeToggleButton.addEventListener('click', () => {
                const currentTheme = bodyElement.dataset.theme;
                const newTheme = (currentTheme === 'default') ? detectedTheme : 'default';
                bodyElement.dataset.theme = newTheme;

                // Update localStorage
                if (newTheme === 'default') {
                    localStorage.setItem('forceDefaultTheme', 'true');
                } else {
                    localStorage.removeItem('forceDefaultTheme');
                }
                applyThemeAnimations(); // Re-apply animations after theme change
            });
        }
    }
    // -------------------------

    async function fetchEvents(year, month) {
        console.log(`Fetching events for ${year}-${month}...`);
        try {
            // Month in JS Date is 0-indexed, but our API expects 1-indexed
            const response = await fetch(`/events/${year}/${month + 1}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const events = await response.json();
            console.log('Fetched events:', events);
            return events;
        } catch (error) {
            console.error('Error fetching events:', error);
            calendarGrid.innerHTML = '<p style="color: red; grid-column: 1 / -1;">Error loading events. Check console and backend.</p>';
            return []; // Return empty array on error
        }
    }

    function renderCalendar(date, events) {
        calendarGrid.innerHTML = ''; // Clear previous grid
        const year = date.getFullYear();
        const month = date.getMonth(); // 0-indexed

        monthYearTitle.textContent = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

        const firstDayOfMonth = new Date(year, month, 1);
        const lastDayOfMonth = new Date(year, month + 1, 0);
        const daysInMonth = lastDayOfMonth.getDate();
        const firstDayWeekday = firstDayOfMonth.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat

        // Add day headers (Sun, Mon, etc.)
        const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        weekdays.forEach(day => {
            const dayHeader = document.createElement('div');
            dayHeader.classList.add('calendar-day-header');
            dayHeader.textContent = day;
            calendarGrid.appendChild(dayHeader);
        });

        // Calculate number of rows needed for the days (weeks)
        const totalDaysCells = firstDayWeekday + daysInMonth;
        const numRows = Math.ceil(totalDaysCells / 7);

        // Adjust grid row heights: Fixed small height for header row, distribute rest
        const headerRowHeight = '30px'; // Or use 'auto'
        calendarGrid.style.gridTemplateRows = `${headerRowHeight} repeat(${numRows}, minmax(0, 1fr))`;

        // Add empty cells for days before the 1st of the month
        for (let i = 0; i < firstDayWeekday; i++) {
            const emptyCell = document.createElement('div');
            emptyCell.classList.add('calendar-day', 'other-month');
            calendarGrid.appendChild(emptyCell);
        }

        // Add cells for each day of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const dayCell = document.createElement('div');
            dayCell.classList.add('calendar-day');
            const currentDate = new Date(year, month, day);
            const currentDateStr = currentDate.toISOString().split('T')[0]; // YYYY-MM-DD

            const dateNumber = document.createElement('div');
            dateNumber.classList.add('date-number');
            dateNumber.textContent = day;
            dayCell.appendChild(dateNumber);

            const eventsContainer = document.createElement('div');
            eventsContainer.classList.add('day-events');

            // Find events for this specific day
            const dayEvents = events.filter(event => {
                if (!event.start) return false;
                // Basic date matching (ignores timezones for now)
                // Assumes event.start is YYYY-MM-DDTHH:mm:ss... format from backend
                const eventStartDateStr = event.start.split('T')[0]; // Extract YYYY-MM-DD
                return eventStartDateStr === currentDateStr;
                // TODO: Handle multi-day events properly
            });

            dayEvents.sort((a, b) => {
                 // Sort by start time if available, otherwise no sort
                 if (a.start && b.start) {
                     return new Date(a.start) - new Date(b.start);
                 } return 0;
            }); // Sort events by start time

            dayEvents.forEach(event => {
                const eventElement = document.createElement('div');
                eventElement.classList.add('event');
                let displayTime = '';
                try {
                    // Check if start time includes time component
                    if (event.start.includes('T')) {
                         displayTime = new Date(event.start).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true
                        });
                    } else {
                        displayTime = 'All Day'; // Or handle date-only events differently
                    }
                } catch (e) {
                    console.warn(`Could not parse time for event: ${event.summary}`, event.start);
                    displayTime = '--:--'; // Placeholder if time parsing fails
                }

                eventElement.textContent = `${displayTime} ${event.summary}`;
                // Add tooltip with more details if needed
                let tooltip = `${event.summary} (${displayTime})`;
                if (event.location) tooltip += `\nLocation: ${event.location}`;
                if (event.description) tooltip += `\nDescription: ${event.description}`;
                eventElement.title = tooltip;

                eventsContainer.appendChild(eventElement);
            });

            dayCell.appendChild(eventsContainer);
            calendarGrid.appendChild(dayCell);
        }

         // Add empty cells for days after the end of the month to fill the grid
         const totalCells = numRows * 7;
         const remainingCells = totalCells - totalDaysCells;
         for (let i = 0; i < remainingCells; i++) {
            const emptyCell = document.createElement('div');
            emptyCell.classList.add('calendar-day', 'other-month');
            calendarGrid.appendChild(emptyCell);
        }
    }

    async function loadCalendar(date) {
        calendarGrid.innerHTML = '<p style="grid-column: 1 / -1; text-align: center;">Loading events...</p>'; // Show loading indicator
        const year = date.getFullYear();
        const month = date.getMonth(); // 0-indexed
        try {
            const events = await fetchEvents(year, month);
            renderCalendar(date, events);
        } catch (error) {
            // Error already logged in fetchEvents, message shown in grid
            console.error("Failed to load calendar", error);
        }
    }

    prevMonthButton.addEventListener('click', () => {
        currentMoment.setMonth(currentMoment.getMonth() - 1);
        loadCalendar(currentMoment);
    });

    nextMonthButton.addEventListener('click', () => {
        currentMoment.setMonth(currentMoment.getMonth() + 1);
        loadCalendar(currentMoment);
    });

    // Initial load
    loadCalendar(currentMoment);

    // Optional: Auto-refresh every N minutes (matching cache interval?)
    // setInterval(() => loadCalendar(currentMoment), 15 * 60 * 1000);

    applyThemeAnimations(); // Add this call
});

// --- Theme Animations ---

/**
 * Applies animations based on the current theme.
 */
function applyThemeAnimations() {
    const theme = document.body.getAttribute('data-theme');
    const container = document.getElementById('animation-container');
    if (!container) {
        console.error("Animation container not found!");
        return; // Exit if container not found
    }
    container.innerHTML = ''; // Clear previous animations

    console.log("Applying animations for theme:", theme); // Debug log

    // Map themes to animation parameters
    const animationMap = {
        'winter': { character: '❄️', className: 'snowflake', animationName: 'fall', quantity: 50 },
        'christmas': { character: '❄️', className: 'snowflake', animationName: 'fall', quantity: 50 },
        'valentines': { character: '❤️', className: 'heart', animationName: 'fall-heart', quantity: 30 },
        'stpatrick': { character: '☘️', className: 'shamrock', animationName: 'fall-shamrock', quantity: 40 },
        'easter': { character: '🥚', className: 'easter-egg', animationName: 'fall-egg', quantity: 30 },
        'spring': { character: '🌸', className: 'flower', animationName: 'fall-flower', quantity: 40 },
        'summer': { character: '☀️', className: 'sun', animationName: 'fall-sun', quantity: 20 },
        'canadaday': { character: '🍁', className: 'maple-leaf', animationName: 'fall-leaf', quantity: 30 },
        'autumn': { character: '🍂', className: 'autumn-leaf', animationName: 'fall-leaf', quantity: 40 },
        'halloween': { character: '🦇', className: 'bat', animationName: 'fall-bat', quantity: 25 }
        // Add other themes here if they need animations
    };

    if (animationMap[theme]) {
        const params = animationMap[theme];
        createFallingElements(container, params.quantity, params.character, params.className, params.animationName);
    } else {
        console.log("No animation defined for theme:", theme); // Debug log
    }
}

/**
 * Creates multiple falling elements (like snowflakes, hearts, etc.) and adds them to the container.
 * @param {HTMLElement} container - The container to add elements to.
 * @param {number} quantity - The number of elements to create.
 * @param {string} character - The character/emoji to display.
 * @param {string} className - The CSS class to apply to each element.
 * @param {string} animationName - The base name for the CSS animation.
 */
function createFallingElements(container, quantity, character, className, animationName) {
    if (!container) return;
    console.log(`Creating ${quantity} ${className} elements with character '${character}' using animation '${animationName}'`); // Debug

    for (let i = 0; i < quantity; i++) {
         const element = document.createElement('div');
         element.classList.add(className); // Use the specific class name
         element.textContent = character; // Use the specific character

          // Randomize properties for natural look
          element.style.left = `${Math.random() * 100}vw`; // Random horizontal start
          const duration = 8 + Math.random() * 10; // Random duration (8-18s) - slightly longer base
          element.style.animationDuration = `${duration}s`;
          element.style.animationDelay = `${Math.random() * duration}s`; // Random delay (start staggered)
          element.style.fontSize = `${0.8 + Math.random() * 0.7}em`; // Random size (0.8em to 1.5em)

          // Set the animation name
          element.style.animationName = animationName;

          // Optional: Adjust drift slightly per element if needed (can be done in CSS keyframes too)
          // const drift = (Math.random() - 0.5) * 10; // Example drift
          // element.style.setProperty('--drift', `${drift}vw`); // Use CSS variable in keyframes if desired

          container.appendChild(element);
     }
}
