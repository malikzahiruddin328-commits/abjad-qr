# Baba Ji — Scope v2: Live Events (speaker Q&A + 1-on-1 booking)

**Status: SCOPED, NOT BUILT.** Agreed with Zahir 2026-09-14. Build starts next
session ("we will build tomorrow, we are just staging the build right now" —
Zahir, 2026-09-14). Nothing in this document has been implemented.

**This supersedes `docs/scope-v1.md` decision #6** ("list-and-link model," no
in-app streaming) and the frozen-phases ruling in `CLAUDE.md` §5 ("Phase 1
static is the only live lane; Phases 2-4 are frozen"). Zahir ruled 2026-09-14
to move forward into the next phase. `docs/scope-v1.md` and `CLAUDE.md` are
left as-is per this repo's own standard (name the drift, don't silently edit
the old doc to match) — **Baba Ji-Documentor still needs to update `CLAUDE.md`
§5 and `scope-v1.md` decision #6 to point here** (flagged on the board).

## What triggered this

Zahir asked to confirm whether the app had a "life [live] sermons" section.
It does not — decision #6 was explicitly list-and-link, and Phase 3 (events)
was frozen. He then asked to scope a materially bigger version: in-app
speaker login, admin-created events, a live question queue, and paid 1-on-1
booking with the speaker after the talk.

## The four things Zahir ruled, 2026-09-14

1. **Streaming model: both, in phases.** *"1 and 2 both and yes we are moving
   forward for next phase and the features that you added last night was a
   prelude."* — external-platform link-out (today's decision #6 shape)
   **and** in-app hosted audio/video, eventually. ("Last night" = the Arabic
   Lots tab, commit `cde4139` — read as: the new top-level tab-bar pattern
   (`.toptabs`) it introduced is the scaffold an "Events" tab can reuse, not
   that Arabic Lots is feature-related. Stated as a reading, not confirmed
   verbatim by Zahir — correct if wrong.) **v2 scope below covers the
   companion-page layer only** (schedule, login-gated live status, queue,
   booking) — actual in-app media hosting is a later, separate build with
   its own infra/cost questions, not started here.
2. **Speaker accounts = existing cleric accounts.** No new role. A cleric can
   both build talismans (Phase 1) and speak at events. Reuses the
   signup/approval model already designed in `scope-v1.md` decision #1.
3. **Question queue: public, anonymous.** Every attendee sees the live list
   of questions (so nobody asks a duplicate) but not who asked them. The
   asker's identity is visible to the speaker/cleric and admin, not the
   audience. *(Assumption, not explicitly confirmed: the speaker sees the
   asker's name — needed to correlate a question with a later 1-on-1 booking.
   Flag if that's wrong and identity should be fully hidden even from the
   speaker.)*
4. **1-on-1 booking: live queue, charge-on-fulfillment.** No pre-set time
   slots. Once the talk ends, anyone who wants a 1-on-1 joins a first-come
   queue. The speaker has a fixed time budget (Zahir's example: 50 minutes)
   and works through the queue in whatever order and to whatever depth they
   choose — 3 people or all 10, their call. **Payment is only taken for
   people the speaker actually gets to**, not for joining the queue. Nobody
   left in the queue when time runs out is charged.

## Feature list (companion-page layer, this scope)

- **Schedule page**: lists upcoming events — speaker (cleric), topic, date/
  time. Populated by admin-created events, not by clerics directly.
- **Admin**: creates events (assigns a cleric as speaker, sets topic and
  date/time). Matches the existing admin-gated pattern (`admin.html`).
- **Speaker (cleric) login**: existing cleric login, reused. A logged-in
  cleric sees their own scheduled event(s) and a "Start event" action that
  flips the event to live.
- **Join fee**: attendees pay to join a live event. **Placeholder only** —
  see Payment below.
- **Live question queue**: attendees submit text questions while the event
  is live; publicly visible list, anonymous to other attendees, speaker/
  admin see the asker. Speaker marks questions answered/skipped as they go.
- **Post-talk 1-on-1 queue**: opens when the speaker ends the talk portion.
  Attendees join a first-come queue. Speaker works through it at their own
  pace within their available time; charge fires only for those actually
  seen.
- **Payment placeholder, both fee points**: join-fee and 1-on-1-fee are
  **stubbed / commented-out call sites**, per Zahir — *"i just want remed
  [sic] out place holder for the payment that will come later on. dont build
  right now."* No real processor, no live charge, this build or next.

## Backend, auth, hosting — all placeholders for the prototyping stage

**Corrected 2026-09-14.** A first pass at this section ruled a real Supabase
design (RLS, two-tier auth, anonymous sessions) before checking what stage
this actually is. Zahir corrected it: *"right now we are in prototyping we
do not need user name and password or the concerns you have raised. what we
will need to have place holders for all these good things. we also have to
work out the hosting nuances as well but that is for later just record it
as place holders."* The real design questions below were not wrong, just
premature — recorded as future placeholders, not built or decided now:

- **Data/queue storage**: prototype stage uses local/mock data — the same
  `DevMockAdapter` (localStorage-backed, same interface a real adapter would
  use) pattern `Baba-Ji-Talaq` already proved for exactly this situation. A
  real shared backend (Supabase is the leading candidate — see superseded
  note below) is a placeholder for later, not decided now.
- **Speaker/admin login**: a placeholder login step in the UI (so the
  flow — admin creates event, speaker "logs in" and starts it — can be
  clicked through), **not real username/password authentication**. No
  Supabase Auth, no password hashing, nothing security-real yet.
- **Payment**: already placeholder per the original scope above (join fee,
  1-on-1 fee) — unchanged.
- **Hosting**: placeholder, explicitly deferred — "work out the hosting
  nuances later." Not addressed at all in the prototype.

*Superseded detail, kept for later rather than deleted:* the first-pass
design — Supabase + `services-database.js`'s existing `SupabaseAdapter`,
polling over WebSocket realtime, two-tier auth (real accounts for
clerics/admin, anonymous sessions for attendees), and RLS-based masking for
the anonymous public question queue — is a reasonable real design and a
sensible starting point *when* this moves past prototyping. Nothing there
was rejected on the merits; it was just the wrong altitude for right now.

## Data shape (sketch, not final — for the build session to refine)

```
events
  id, cleric_id (speaker), topic, scheduled_at, status (scheduled/live/ended),
  join_fee_pence, one_on_one_fee_pence

event_attendees
  id, event_id, attendee_ref, joined_at, join_payment_status (placeholder)

event_questions
  id, event_id, attendee_ref (hidden from other attendees), question_text,
  asked_at, status (open/answered/skipped)

one_on_one_queue
  id, event_id, attendee_ref, queued_at, seen (bool),
  payment_status (placeholder — charged only if seen=true)
```

## Deliberately not in this scope

- Real payment processing (Stripe or otherwise) — placeholders only, per
  Zahir's explicit "don't build right now."
- Real in-app audio/video hosting — named as a future phase in decision 1
  above, not started.
- A backend/database choice — named as a dependency, not decided here.
- Anything for khula/contested cases or non-event features — unrelated to
  this scope.

## Open items to confirm before or during build

1. Does the speaker see the asker's name on questions (assumed yes, for
   1-on-1 correlation), or should identity be hidden even from the speaker?
2. Can one attendee ask more than one question, or queue for more than one
   1-on-1 slot, per event? Not specified — assume yes unless told otherwise.
3. Is the join fee refundable/waived under any condition (event cancelled,
   speaker never starts)? Not specified.
