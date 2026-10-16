# Job Application Ghosting Tracker

**Certified Ghost detector for your job search.** A Claude skill that reads your email, scores every company on how fast it replied, and opens a dashboard (dark or light, your pick) of the evidence.

![Sample dashboard](assets/dashboard-preview.png)

*Sample data. Every company shown is made up, though you will recognize the behavior.*

## What it does

- Counts your applications, rejections, interviews, and the silence.
- Measures days to reply, per company.
- Hands out verdicts, from **Speed Demon** to **Certified Ghost**. Two weeks counts as slow, because it is.

It only reads your email. It never sends, deletes, or changes anything.

## Use it with Claude (about 3 minutes)

1. Download [`job-application-tracker.zip`](job-application-tracker.zip) from this repo. Do not unzip it.
2. In Claude (web or desktop), open [**Customize > Skills**](https://claude.ai/customize/skills) and upload the zip. Turn the skill on.
3. Connect your email to Claude. Gmail is the tested one.
4. Ask: *"How many companies ghosted me this year?"* You do not need to say the skill's name.

**Claude Code instead?** Copy `skills/job-application-tracker` into `~/.claude/skills/` and start `claude`.

## Use it without Claude

ChatGPT, Gemini and friends do not run Claude skills, but the instructions are plain English. Untested, so expect some assembly.

1. Paste [`SKILL.md`](skills/job-application-tracker/SKILL.md) into your assistant and say: "Follow this. Here are my job application emails." If it cannot read your inbox, export or paste the emails yourself.
2. Ask it to put the results into the JSON block of [`dashboard-template.html`](skills/job-application-tracker/dashboard-template.html).
3. Open that file in any browser. The dashboard needs no AI, only a browser.

## What the verdicts mean

| Verdict | Plain English |
|---|---|
| Speed Demon | Replied within 2 days |
| Respectful | Within a week |
| Slow Burn | 1 to 2 weeks |
| Emotionally Unavailable | More than 2 weeks |
| Certified Ghost | 3+ weeks of nothing |
| Left on Read | No reply yet, still waiting |
| Too Early to Tell | Applied under a week ago |

Need it work-safe? Say "use clean labels" (Fast, Slow, No response) or flip the toggle in the dashboard.

## Email support

| Inbox | Status |
|---|---|
| Gmail | Tested |
| Outlook / Microsoft 365 | Should work through Claude's connector. Untested. |
| Yahoo and others | Forward job mail to Gmail, or export a mailbox file. Untested. |

## Privacy

It runs in your own session, so your data goes nowhere. The dashboard can include an optional, preview-first **Share anonymously** button that sends only company, outcome, days to reply and month applied to a stats collector. It appears only once a collector address is set in the template.

## For tinkerers

- **How it works:** three email searches (confirmations, rejections, interviews), rule-based classification for the common job-board templates, and all math done in code. A small `job-tracker.csv` remembers the last scan, so reruns read only new mail.
- **Scoring:** speed score is `100 - 5 * (days - 1)`, floored at 0. Interviews add 15. Ghosted means no reply after 21 days.
- **Dashboard data:** one JSON block. Example row: `{"id":"a1","company":"Example Co","role":"Senior PM","applied_at":"2026-09-01T16:00:00Z","replied_at":"2026-09-03T10:00:00Z","status":"Rejected","as_of":"2026-10-16T18:56:00Z","engaged":false}`. See [`examples/`](examples/) for 49 fake ones.
- **Stats collector:** [`collector/`](collector/SETUP.md) is a Cloudflare Worker plus D1 database on the free plan, with strict validation and no IP storage.
- **Limits:** email only, so portal-only updates are invisible. Classification is judgment, so check the caveats it lists. A dashboard is a snapshot, not a live feed.

Issues and ideas welcome, especially new job-board templates and better insults.

---

Made by [Kao Smith](https://kaosmith.com) · MIT license
