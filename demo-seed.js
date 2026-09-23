// Baba Ji — Live Events demo seed.
//
// This app has no shared backend - every visitor's browser has its own empty
// localStorage (CLAUDE.md section 1). Without this, a demo walked through in
// one browser is invisible to everyone else's, Hafiz included, even when the
// feature is real and working. This seeds a fixed demo cleric + event +
// question + 1-on-1 queue + bookings into any browser on first load.
//
// VERSIONED, not just "seed if empty" - found the hard way, 2026-09-23:
// Zahir clicked through the site before the video-embed fix shipped, which
// seeded the OLD shape (no video, wrong status) into HIS browser's
// localStorage. A plain "only seed an empty array" check then means no
// future fix to this file - however many times he hard-refreshes - ever
// reaches him again, because the array is no longer empty. A hard refresh
// busts HTTP cache; it does nothing to localStorage.
//
// The fix: DEMO_SEED_VERSION. On load, if the stored version is behind the
// script's version, every demo-tagged record (matched by its fixed id) is
// replaced with the current one, in every collection below - not appended,
// not skipped. Anything NOT demo-tagged (a real event an admin created, a
// real availability slot a real cleric added) is left alone, filtered out
// of the "records to drop" set rather than the records kept. Below the
// current version - i.e. between two visits at the SAME version - nothing
// here touches the data again, so a tester's own clicks (marking a queue
// entry seen, closing the event) persist across reloads as they should.
(function () {
    const DEMO_SEED_VERSION = 2; // bump this whenever the seed data below changes shape
    const VERSION_KEY = "babaJiDemoSeedVersion";

    const DEMO_CLERIC_ID = 9000000000001;
    const DEMO_EVENT_ID = "demo-tafsir-al-kahf-0001";

    function storedVersion() {
        return parseInt(localStorage.getItem(VERSION_KEY) || "0", 10) || 0;
    }

    // Removes any existing record whose id is in `demoIds`, then appends the
    // fresh set - so re-seeding never duplicates and never touches a
    // non-demo record that happens to share the collection.
    function replaceDemoRecords(key, demoIds, freshRecords) {
        try {
            const idSet = new Set(demoIds.map(String));
            const existing = JSON.parse(localStorage.getItem(key) || "[]");
            const kept = Array.isArray(existing) ? existing.filter(r => !idSet.has(String(r.id))) : [];
            localStorage.setItem(key, JSON.stringify([...kept, ...freshRecords]));
        } catch (e) {
            console.error(`[demo-seed] failed to seed ${key}:`, e);
        }
    }

    if (storedVersion() >= DEMO_SEED_VERSION) return; // already current - do not disturb live interactive state

    const today = new Date().toISOString().split("T")[0];
    function dateOffset(days) {
        const d = new Date();
        d.setDate(d.getDate() + days);
        return d.toISOString().split("T")[0];
    }

    replaceDemoRecords("babaJiClerics", [DEMO_CLERIC_ID], [{
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

    replaceDemoRecords("babaJiEvents", [DEMO_EVENT_ID], [{
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

    replaceDemoRecords("babaJiEventQuestions", ["demo-question-0001"], [{
        id: "demo-question-0001",
        eventId: DEMO_EVENT_ID,
        attendeeId: "demo-attendee-0001",
        displayName: "Yusuf (demo attendee)",
        text: "What is the significance of the Cave in Surah al-Kahf?",
        askedAt: new Date().toISOString(),
        status: "answered",
    }]);

    replaceDemoRecords("babaJiOneOnOneQueue", ["demo-queue-0001", "demo-queue-0002"], [
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
    replaceDemoRecords("babaJiBookings", ["demo-booking-0001", "demo-booking-0002"], [
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

    localStorage.setItem(VERSION_KEY, String(DEMO_SEED_VERSION));
})();
