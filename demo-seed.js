// Baba Ji — Live Events demo seed.
//
// This app has no shared backend - every visitor's browser has its own empty
// localStorage (CLAUDE.md section 1). Without this, a demo built and tested
// in one browser is invisible to everyone else, Hafiz included, even though
// the feature is real and working. This seeds a fixed demo cleric + event +
// question + 1-on-1 queue into ANY fresh browser on first load, so the demo
// is visible without anyone creating it by hand first.
//
// Deliberately idempotent: only seeds a key that is genuinely empty, so it
// can never overwrite real data someone has since created.
(function () {
    const DEMO_CLERIC_ID = 9000000000001;
    const DEMO_EVENT_ID = "demo-tafsir-al-kahf-0001";

    function seedIfEmpty(key, value) {
        try {
            const existing = localStorage.getItem(key);
            if (existing && JSON.parse(existing).length > 0) return;
            localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {
            console.error(`[demo-seed] failed to seed ${key}:`, e);
        }
    }

    const today = new Date().toISOString().split("T")[0];
    function dateOffset(days) {
        const d = new Date();
        d.setDate(d.getDate() + days);
        return d.toISOString().split("T")[0];
    }

    seedIfEmpty("babaJiClerics", [{
        id: DEMO_CLERIC_ID,
        name: "Shaikh Yusuf Al-Amin",
        email: "demo.speaker@babaji.example",
        specialty: "Quranic Studies",
        rate: 50,
        // password: demo1234 - hashed with cleric-login.html's own hashPassword()
        passwordHash: "32fe5ca5",
        status: "approved",
        approvedAt: new Date().toISOString(),
        availability: [],
        rating: 0,
        reviews: 0,
        createdAt: new Date().toISOString(),
    }]);

    seedIfEmpty("babaJiEvents", [{
        id: DEMO_EVENT_ID,
        title: "Tafsir al-Kahf — Live Q&A",
        speakerClericId: String(DEMO_CLERIC_ID),
        speakerName: "Shaikh Yusuf Al-Amin",
        specialty: "Quranic Studies",
        location: "Online",
        date: today,
        time: "18:00",
        description: "A demo Live Events walkthrough - the live talk with its question queue. Click \"Join 1-on-1 queue\" from the cleric dashboard (End Talk button) to see that stage too - the queue data is already seeded and waiting.",
        // A real, public lecture (Zaytuna College, "Living Links: Tafsir of
        // Surah al-Kahf") embedded via YouTube - not a downloaded/rehosted
        // file, which would raise real copyright/ToS issues. Matches the
        // already-ruled streaming model: external platform, embedded here.
        youtubeVideoId: "RcGfoNVZwgA",
        joinFeePence: 500,
        oneOnOneFeePence: 2000,
        status: "live",
        startedAt: new Date().toISOString(),
    }]);

    seedIfEmpty("babaJiEventQuestions", [{
        id: "demo-question-0001",
        eventId: DEMO_EVENT_ID,
        attendeeId: "demo-attendee-0001",
        displayName: "Yusuf (demo attendee)",
        text: "What is the significance of the Cave in Surah al-Kahf?",
        askedAt: new Date().toISOString(),
        status: "answered",
    }]);

    seedIfEmpty("babaJiOneOnOneQueue", [
        {
            id: "demo-queue-0001",
            eventId: DEMO_EVENT_ID,
            attendeeId: "demo-attendee-0002",
            displayName: "Amina (demo attendee)",
            queuedAt: new Date().toISOString(),
            seen: true,
            chargedPlaceholder: true,
            seenAt: new Date().toISOString(),
        },
        {
            id: "demo-queue-0002",
            eventId: DEMO_EVENT_ID,
            attendeeId: "demo-attendee-0003",
            displayName: "Bilal (demo attendee)",
            queuedAt: new Date().toISOString(),
            seen: false,
            chargedPlaceholder: false,
        },
    ]);

    // UAT log 2026-09-23, item 7: "No mock data for past or upcoming events
    // - nothing to test against" (Cleric Dashboard's "Your Bookings"
    // section, the old one-on-one booking system predating Live Events).
    // One past, one upcoming, so both display states are visible.
    seedIfEmpty("babaJiBookings", [
        {
            id: "demo-booking-0001",
            cleric: "Shaikh Yusuf Al-Amin",
            date: dateOffset(-9),
            time: "15:00",
            duration: 30,
            topic: "Marriage counsel follow-up",
            rate: 50,
        },
        {
            id: "demo-booking-0002",
            cleric: "Shaikh Yusuf Al-Amin",
            date: dateOffset(4),
            time: "11:30",
            duration: 45,
            topic: "Ruqyah guidance session",
            rate: 50,
        },
    ]);
})();
