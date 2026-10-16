---
name: job-application-tracker
description: Scans the user's email inbox (Gmail tested, Outlook and others via fallbacks) to track job applications and report stats (applied, rejected, interviewed, ghosted, average days to reply, which companies), scores how fast each company replied, and shows a dark or light dashboard automatically. Use whenever the user asks about their job search numbers, such as "how many companies ghosted me", "how many rejections this year", "my reply rate", "which jobs haven't replied", "how long do companies take to respond", or mentions a job tracker, even if they do not name this skill.
---

# Job Application Tracker

Turn the user's email inbox into a job search scoreboard, with a speed score for every company and a dashboard that opens automatically (dark or light, your pick on first run). Read-only: never send, label, delete, or draft anything.

Created by Kao Smith, kaosmith.com. MIT license.

## Requirements
- An email source Claude can search. Gmail is the tested path. Outlook or Microsoft 365 should work through its connector but is untested. Anything else needs one of the fallbacks in Step 0.
- Somewhere to keep a small state file (`job-tracker.csv`) between runs. Use the working folder or ask the user once where to keep it. If nothing can be saved, rescan each time and say so.

## Step 0: Detect which inbox to read
Look at the tools available in this session. Do not ask the user if the answer is obvious.
- **Gmail tools present** (search threads, get thread or message): use the Gmail path. This is the tested path.
- **Microsoft 365 or Outlook mail tools present**: use the Outlook path. Say once that it is untested, so edge cases may slip through.
- **Both present**: ask which inbox holds the job search, or offer to read both and merge duplicates.
- **Neither present**: say so plainly and offer these fallbacks, easiest first:
  1. Forward job mail from the other account (Yahoo, iCloud and so on) into a Gmail address, then use Gmail. Forwarding only covers new mail unless the user also imports old mail.
  2. Export the mailbox (an `.mbox` or `.eml` file) and read it in code. Python's standard `mailbox` and `email` modules can do it. This needs a session that can read the user's files.
  3. Paste the confirmation and rejection emails into the chat, and work from those.
Save the choice as `source` in the `job-tracker.csv` header so the next run does not ask again.

## Settings (ask once, remember)
- **Theme**: `dark` or `light`. On the user's FIRST run (no `theme` in the `job-tracker.csv` header, or no file at all), ask before building the dashboard: "Dark or light mode for your dashboard?" Use a quick multiple-choice question if the interface has one, with dark as the first option. Save the answer as `theme` in the header and never ask again. The dashboard also has an in-page Dark/Light switch, so the choice is easy to undo.
- **Label style**: `spicy` (default, funny names) or `clean` (plain names). If the user says they want it work-safe, or will screen-share it, use `clean`.
- **Ghost cutoff**: days of silence before a company counts as ghosting. Default 21.

## Step 1: Decide the scan window
- If `job-tracker.csv` exists, read it and only search mail newer than the `last_scan` date stored in it. Do not rescan old mail.
- If it does not exist, ask for the start of the job search (default: 6 months back, or Jan 1 for "this year" questions). State the window you used in the answer.

## Step 2: Search the inbox (3 passes)
Run the same three passes on every provider. The queries below are written in Gmail syntax. For another provider, translate the same keyword groups into its search, filter by received date, skip junk, promotions and social folders, and page through all results.

For Gmail: use short keyword queries with `after:YYYY/MM/DD`, exclude `category:promotions` and `category:social`, 50 results per page, and follow `nextPageToken` until results run out or go past the window.

1. Confirmations: "thank you for applying" OR "thanks for applying" OR "application received" OR "we received your application" OR "application submitted" OR "your application to" OR "application for"
2. Rejections: "not moving forward" OR "decided not to move forward" OR "move forward with other" OR "other candidates" OR "regret to inform" OR "unable to move forward" OR "position has been filled" OR "unfortunately"
3. Interviews: interview OR "phone screen" OR "schedule a call" OR "next steps" OR "availability" (exclude the user's own sent mail)

Search previews can show only part of a thread (Gmail shows just the oldest messages), so open the full thread, in minimal or plain text form, for any thread where the outcome is unclear. Never fetch bodies in bulk.

## Step 3: Classify each email
- **Confirmation**: automated "we got your application". Marks an application and its apply date.
- **Rejection**: any decline, including "role closed" and "after careful consideration".
- **Interview**: a human or scheduling message inviting the user to talk (recruiter screen, video interview, hiring manager call).
- **Ignore**: newsletters, job alerts and digests, security or verification codes, "continue your application" reminders, recruiter cold outreach the user did not apply to, and anything the user sent.

Applicant tracking platforms (Greenhouse, Lever, Ashby, Workday, Jobvite, Workable, iCIMS, Rippling, SmartRecruiters) send very consistent templates. Rule-based matching handles most emails, so save judgment for odd threads.

## Step 4: Build one row per application
Group by company plus role.
- Merge duplicate emails sent seconds apart for the same role.
- Treat a re-application to the same role as a separate row.
- If a decision email has no matching confirmation, still count the outcome but leave the apply date blank. Exclude those rows from day averages and say how many were excluded.
- Some confirmations (for example job board apply emails) do not name the company. List them as "Unknown" instead of guessing.

Columns: `company, role, applied_at, first_reply_at, outcome, days_to_reply`
Outcome is one of `rejected`, `interview`, `no_reply`. Stored in the file header: `last_scan`, `source` and `theme`.

## Step 5: Compute the stats in code
Do the arithmetic in a script, never by eye.
- Counts by outcome and percent of total.
- Average and median days to first reply (apply date to first rejection or interview). Always show the median too, since a few very slow replies skew the average.
- **Ghosted** = no reply after the ghost cutoff. Applications younger than 7 days are "too early to tell" and never counted as ghosted.
- Reply rate on mature applications only (replied, or older than the ghost cutoff).
- Optional breakdowns: by month applied, by company when there are repeats.

## Step 6: Report
Lead with the answer to what was asked, in one or two sentences. Then, as needed:
1. Headline table (applied, rejected, interviewed, no reply, ghosted).
2. Average and median days to reply.
3. Company list grouped by outcome (company, role, days).
4. Caveats: scan window, rows without apply dates, judgment calls (merges, ambiguous emails), and the fact that portal-only updates are invisible to email.

Keep it short. Do not narrate the search steps.

## Step 7: Score how fast each company replied
Two weeks is already too slow, so the tiers are tight. Compute in code from apply date to first reply.

| Spicy label | Clean label | Rule | Plain-English tooltip |
|---|---|---|---|
| Speed Demon | Fast | 2 days or less | Replied within 2 days. Fast and respectful of your time. |
| Respectful | On time | 3 to 7 days | Replied within a week. Normal and decent. |
| Slow Burn | Slow | 8 to 14 days | Slow to respond. Took 1 to 2 weeks. |
| Emotionally Unavailable | Very slow | over 14 days | Very slow to respond. Took more than 2 weeks. |
| Certified Ghost | No response | no reply after the ghost cutoff | Did not respond. Nothing for 3 or more weeks. |
| Left on Read | Still waiting | no reply, 7 days up to the cutoff | No reply yet, still waiting. |
| Too Early to Tell | Too early | applied under 7 days ago | Too soon to judge. |
| Mystery Timing | Unknown timing | replied, apply date unknown | Reply time unknown, original confirmation not found. |

Speed score (0 to 100): 100 for a reply within a day, minus 5 points per extra day, 0 at 3 weeks. Interviews get +15 (cap 100). Ghosted scores 0. A company's score is the average of its replies. If a company interviewed the user, keep its unanswered applications at "Left on Read", not ghosted.

Always show the plain-English tooltip text on hover or next to the label, so the joke never hides the meaning.

## Step 8: Dashboard (always show it)
Build and display the dashboard at the end of every run, without being asked, right after the short Step 6 answer. Do not offer it, just show it. If the user's question was narrow (for example "how many ghosted me"), answer it first in a line, then show the dashboard. Display it the best way the session allows: publish it as an artifact if an Artifact tool exists, otherwise save the HTML file and send or open it. When publishing as an artifact, declare `capabilities: {downloads: true}`. Artifact viewers usually block outside network calls, so the Share button may fail to send from inside the viewer. The dashboard then offers a "Save dashboard file" button, and the saved file sends fine when opened in a normal browser. Tell the user this once, in one line, when you mention the Share button. If nothing can display HTML, say so and give the Step 6 report only.

1. Open `dashboard-template.html` from this skill folder. It is a complete, self-contained dashboard with a dark and a light theme.
2. Replace the JSON inside `<script id="job-data" type="application/json">` with the user's rows. Each row: `id, company, role, applied_at, replied_at, status, as_of, engaged`. `status` is `Rejected`, `Interview` or `No reply`. Dates are ISO strings, or `null`. `as_of` is the scan time. `engaged` is true only when a company with an unanswered application has also interviewed the user.
3. Set the theme: in the line `const DEFAULT_THEME = 'dark';` change `'dark'` to the user's saved `theme`.
4. Remove the "sample data, all companies are made up" line in the header, and the sample banner.
5. Keep the footer credit "Made with the Job Application Tracker skill, kaosmith.com". Do not remove it.
6. Leave the "Share anonymously" button, `SHARE_URL` and `SHARE_MODE` exactly as the template has them. Do not change the wording of its privacy dialog. The button is always visible. If the collector is not connected yet, its dialog says so and cannot send. Mention once that the button exists, that it is optional, and that it sends only company, outcome, days to reply and month applied, after the user previews every row.
7. Tell the user it is a snapshot: the email sorting is a judgment call, so it is not live. Offer to refresh it with new mail only.

The page already has quick filters (status, verdict, search, company or application view), sortable columns, hover tooltips, and a Dark/Light theme switch, and a Spicy/Clean label toggle.

## Step 9: Save and offer a weekly run
Update `job-tracker.csv` and `last_scan`. Offer once to schedule a weekly refresh (a scheduled task that only reads new mail since `last_scan`). Do not offer again if they decline.

## Privacy rules
- Everything stays in the user's own session. Never send inbox contents, company lists, or stats to any outside service yourself. The only exception is the dashboard's optional Share anonymously button, which the user clicks and previews. Never click it for them, and never post to its address.
- If the user wants to share results, offer a version with company names removed.
- Do not include the user's email address, name, or salary details in anything saved or shared.

## Token efficiency
- Incremental scans only (new mail since `last_scan`).
- Search results are usually enough; fetch full threads for ambiguous emails only.
- Compute once in code, then answer follow-up questions from the saved file instead of re-searching Gmail.
