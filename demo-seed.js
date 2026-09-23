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
        description: "A demo Live Events walkthrough - question queue, then 1-on-1 booking, both mid-flow so the mechanics are visible without needing to click through them.",
        joinFeePence: 500,
        oneOnOneFeePence: 2000,
        status: "one_on_one",
        startedAt: new Date().toISOString(),
        oneOnOneOpenedAt: new Date().toISOString(),
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
})();
