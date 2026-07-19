# Body Recomposition Tracker — Full Project Plan

A SaaS-style fitness tracker covering workouts (progressive overload), runs, steps, diet logging, streaks, and analytics.

---

## 1. Tech Stack Recommendation

You already know React, Node/Express, Postgres, Mongo, TypeScript, Prisma, and BullMQ — so lean into that instead of learning new tools.

| Layer | Choice | Why |
|---|---|---|
| Frontend | React + TypeScript + Vite | Fast dev loop, you already know it |
| UI Library | Tailwind CSS + shadcn/ui | Full control over styling, easy to make it look non-templated, works great for dashboards/charts |
| Charts | Recharts or Tremor | Both pair well with shadcn, good for analytics dashboards |
| Backend | Node.js + Express + TypeScript | Matches your stack |
| ORM | Prisma | You already use it, great DX with Postgres |
| **Primary DB** | **PostgreSQL** | See reasoning below |
| **Secondary store** | **MongoDB (optional, later)** | Only if you want to dump raw synced data (e.g. full Google Fit/Strava payloads) before normalizing |
| Background jobs | BullMQ + Redis | Sync jobs (Google Fit/Strava pulls), streak recalculation, daily reminder jobs |
| Auth | JWT + refresh tokens, or Auth.js (NextAuth-style) if you switch to Next.js | Since it's multi-user, you need proper auth, password reset, OAuth (for Google Fit login) |
| Hosting (backend) | Railway / Render / Fly.io | Free/cheap tier, Postgres + Redis add-ons available |
| Hosting (frontend) | Vercel / Netlify | Easiest for React/Vite |
| File storage | Cloudflare R2 / AWS S3 | For meal/progress photos |

### Why PostgreSQL as primary DB
Your core data — users, workouts, sets, reps, runs, steps, diet logs — is **relational and analytics-heavy**. You want queries like "average weight lifted per exercise per week" or "7-day rolling step average." Postgres:
- Handles joins, aggregations, window functions (perfect for progressive overload trend analysis) far better than Mongo.
- Works great with Prisma, which you already use.
- Has extensions like `TimescaleDB` if your time-series data (steps/runs) grows large — not needed on day one, good to know it's an upgrade path.

**Mongo isn't necessary as a primary store here.** Use it only later, and only if you want a landing zone for raw, unstructured third-party sync payloads (Google Fit/Strava JSON blobs) before you parse and insert the clean data into Postgres. Don't add this complexity until it's actually needed — one database (Postgres) is enough to launch.

---

## 2. High-Level Architecture

```
┌─────────────┐        ┌──────────────────┐        ┌─────────────┐
│   React App │ ─────▶ │  Express REST API │ ─────▶ │  PostgreSQL │
│ (Vite + TS) │ ◀───── │   (Node + TS)     │ ◀───── │  (Prisma)   │
└─────────────┘        └────────┬──────────┘        └─────────────┘
                                 │
                         ┌───────┴────────┐
                         │  BullMQ + Redis │  → background jobs:
                         └───────┬────────┘     - Google Fit / Strava sync
                                 │               - Streak recalculation
                        ┌────────┴─────────┐     - Daily reminders/notifications
                        │ Google Fit API   │
                        │ Health Connect   │
                        │ Strava API       │
                        └──────────────────┘
```

---

## 3. Module Breakdown (build in this order)

### Module 1 — Auth & User Management
- Signup/login (email+password, and Google OAuth since you'll need Google Fit access anyway)
- JWT access + refresh token flow
- User profile (height, weight, goals, unit preference kg/lb)
- This is the foundation everything else depends on — build it first.

### Module 2 — Workout Split & Exercise Library
- CRUD for workout splits (e.g. "Push/Pull/Legs", "Bro Split")
- CRUD for exercises within a split (name, muscle group, equipment, optional custom exercise creation)
- Assign exercises to days within a split

### Module 3 — Workout Logging (core feature)
- Daily workout session tied to a split-day
- Per exercise: log sets, each set has weight + reps
- Notes field per exercise per session (for your "what to improve next time" loop)
- Auto-pull last session's numbers for the same exercise as a reference while logging (huge UX win for progressive overload)
- Edit/delete past logs

### Module 4 — Streaks & Gamification
- Daily activity streak (workout done, OR steps goal hit, OR diet logged — define your own rule)
- Longest streak, current streak display
- Simple badges/milestones (7-day, 30-day, 100-day) — optional but cheap to add and motivating

### Module 5 — Steps & Runs Tracking
- Manual entry forms (steps count, run distance/duration/pace)
- Google Fit / Health Connect / Strava OAuth integration (background sync via BullMQ)
- Dedupe logic: if a day has both manual entry and synced data, decide precedence (synced overrides manual, or manual is a fallback when no sync exists)

### Module 6 — Diet Logging
- Simple meal log: text description + optional photo upload
- Timestamp + meal type (breakfast/lunch/dinner/snack)
- No macro calculation needed per your requirements — keep this module intentionally lightweight

### Module 7 — Analytics Dashboard
This is where it becomes genuinely useful, not just a logging app:
- **Progressive overload chart** per exercise: weight × reps (volume) over time, with trendline
- **Weekly summary**: workouts completed, total volume, avg steps, runs logged, diet logging consistency
- **Body recomposition view**: if you log weight/measurements periodically, chart weight trend against workout volume
- **Consistency heatmap** (GitHub-contribution-style calendar) for workouts/steps/diet logging
- **PR (personal record) tracker**: auto-detect and highlight new max weight/reps per exercise

### Module 8 — Polish & SaaS-readiness
- Responsive layout (mobile-first, since you'll log from your phone at the gym)
- Settings (units, timezone, notification preferences)
- Data export (CSV/JSON download of your own logs)
- Since it's meant to be usable by others eventually: onboarding flow, empty states, basic rate-limiting on the API

---

## 4. Suggested Postgres Schema (starting point)

```
User            (id, email, password_hash, name, unit_pref, created_at)
WorkoutSplit    (id, user_id, name, is_active)
SplitDay        (id, split_id, day_name, order_index)  -- e.g. "Push Day"
Exercise        (id, user_id, name, muscle_group, is_custom)
SplitDayExercise (id, split_day_id, exercise_id, order_index)
WorkoutSession  (id, user_id, split_day_id, date, notes)
SetLog          (id, session_id, exercise_id, set_number, weight, reps, note)
StepLog         (id, user_id, date, steps, source[manual/googlefit/healthconnect])
RunLog          (id, user_id, date, distance_km, duration_sec, pace, source)
DietLog         (id, user_id, date, meal_type, description, photo_url)
Streak          (id, user_id, current_streak, longest_streak, last_active_date)
```

Prisma will map cleanly onto this — you can paste this straight into `schema.prisma` and refine types/relations.

---

## 5. UI/UX Inspiration Sources

Since fitness dashboards live or die on clarity of numbers and charts, look at:

- **Dribbble** — search "fitness dashboard", "workout tracker app", "progressive overload UI"
- **Mobbin** (mobbin.com) — real production app screens, filter by "Health & Fitness" category; great for seeing how Strava, Whoop, Hevy, Strong actually lay out logging screens
- **Land-book** (land-book.com) — SaaS landing page inspiration, useful for your marketing/signup page later
- **Behance** — search "fitness app UI kit" for full-flow case studies
- Real apps worth screenshotting for reference (not to copy pixel-for-pixel, but to study UX patterns):
  - **Strong** (workout logging — best-in-class for exactly your set/rep/weight logging flow)
  - **Hevy** (workout logging + social)
  - **Strava** (run tracking, activity feed, heatmaps)
  - **Whoop / Oura app** (streaks, recovery analytics, weekly summary cards)
  - **MacroFactor** (clean diet logging UX, even though you won't need macro math)
- **Tremor.so** — component library specifically for analytics dashboards, good visual reference even if you don't use it directly

---

## 6. Third-Party Integration Notes

- **Google Fit API**: being deprecated by Google in favor of **Health Connect** on Android — worth building against Health Connect if targeting Android sync long-term, but Google Fit REST API still works for web-based OAuth pulls for now. Double check current status before building, since Google's timeline shifts.
- **Strava API**: well-documented, OAuth2, webhook support for real-time run sync — good developer experience, start here if runs are the priority.
- Build the sync as a **background job (BullMQ)**, not a request-blocking call — OAuth token refresh + external API latency shouldn't block your UI.

---

## 7. Build Order Summary

1. Auth & user management
2. Workout split + exercise library (CRUD)
3. Workout session logging (the core daily-use feature)
4. Streaks
5. Steps & runs (manual entry first, integrations after)
6. Diet logging
7. Analytics dashboard (this is what turns raw logs into insight — save it for once you have real data flowing in)
8. Polish, responsiveness, SaaS touches

Build and use Module 1–3 yourself first — you'll be dogfooding it at the gym almost immediately, which will surface UX issues faster than any amount of planning.
