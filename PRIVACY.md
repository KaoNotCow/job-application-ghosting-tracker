# Privacy Policy: Job App Ghost Tracker

Effective October 16, 2026. Made by Kao Smith ([kaosmith.com](https://kaosmith.com)).

Short version: the skill reads your email inside your own Claude session and keeps everything there. Nothing leaves unless you press a button that says so, and that button only sends a few boring fields.

## What the skill does with your email

- It searches your inbox, through the email connector you gave Claude, for job application confirmations, rejections and interview invites.
- It is read-only. It never sends, deletes, labels or drafts anything.
- Your email, your results and your dashboard stay in your Claude account and on any files you save. The author of this skill never receives them.
- How Claude itself handles your conversations is covered by Anthropic's terms and privacy policy and your own settings, not by this document.

## What is saved on your side

A small file called `job-tracker.csv` in a folder you choose. It holds one row per application (company, role, dates, outcome) plus your settings (theme, scan range, last scan date). It is yours. Delete it any time and the skill starts fresh.

## The optional share button (opt-in only)

The dashboard has a button called **Opt-In to Share Company Response Data with Job GhostTracker**. It does nothing until you click it, preview every row, and press Confirm. You can say no with "No thanks".

**What is sent, per application:**
- company name
- outcome: rejected, interview, or no reply
- days from applying to the first reply (or days of silence so far)
- the month you applied, like 2026-09
- a scrambled fingerprint (a one-way hash of company, role and apply date) used only so the same application is never counted twice

**What is never sent:** your name, email address, job titles, exact dates, email text, or anything else from your inbox.

**Left out on purpose:** unknown companies, applications with no apply date, and applications still inside the 3 week window.

**Where it goes:** a small database run by the author on Cloudflare. The collector code is public in this repo (`collector/`), so you can read exactly what it accepts and rejects.

## What the collector stores and logs

- It stores the fields above, plus the day the data was received and daily totals (how many times the button was used).
- It stores no names, emails, job titles or exact dates.
- The collector code does not read or record IP addresses, and request logging is turned off in its configuration. Cloudflare, as the network provider, handles connections to its servers under its own privacy policy and may process technical data such as IP addresses at the network level. That data does not reach the author's database.

## How shared data is used

The author may publish aggregate statistics, such as how fast a company tends to reply or how often it never replies. A company only appears once at least 5 applications are in, and published figures are described as self-reported by users, not verified. Individual rows are not published and nothing is sold.

## Keeping or removing shared data

- Shared rows are not linked to you, so there is no way to find and pull back only your rows. That is why the dialog says so before you confirm.
- If you share by accident, or a company wants its name removed from the statistics, contact the author through [kaosmith.com](https://kaosmith.com) and the company's rows can be deleted.
- Shared data is kept until deleted.

## Children

This skill is for people applying to jobs. It is not directed at children.

## Changes

If this policy changes, the new version will be published in this repo with a new effective date.

## Contact

[kaosmith.com](https://kaosmith.com)

*This is a plain-language policy for a hobby project, not legal advice.*
