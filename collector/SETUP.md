# Set up the anonymous stats collector

This is the tiny backend behind the dashboard's optional opt-in share button. It runs on Cloudflare's free plan, so it costs $0 at the scale of a hobby project. Setup takes about 10 minutes and you only do it once.

You need: a free [Cloudflare account](https://dash.cloudflare.com/sign-up) and [Node.js](https://nodejs.org) installed.

## 1. Deploy it

Open a terminal in this `collector` folder and run these one at a time.

```bash
npm install -g wrangler
wrangler login
wrangler d1 create job-tracker-stats
```

The third command prints a `database_id`. Paste it into `wrangler.toml` where it says `PASTE-YOUR-DATABASE-ID-HERE`. Then:

```bash
wrangler d1 execute job-tracker-stats --remote --file=schema.sql
wrangler deploy
```

`wrangler deploy` prints your collector address, something like `https://job-tracker-stats.yourname.workers.dev`.

## 2. Check that it works

```bash
curl https://job-tracker-stats.yourname.workers.dev/stats
```

You should see `{"companies":[], ...}`. An empty list is correct, nothing has been shared yet.

## 3. Point the button at it

In `skills/job-app-ghost-tracker/dashboard-template.html`, set your address:

```js
const SHARE_URL = 'https://job-tracker-stats.yourname.workers.dev';
```

The shipped template already points at the maintainer's collector. Change it only if you run your own. Leave `SHARE_MODE = 'live'` alone. The sample page in `examples/` is set to `'demo'` on purpose, so visitors can preview the button without sending fake data.

## What it collects

Per application: company name, outcome (rejected, interview, no reply), days to reply (or days of silence), month applied, and a hash used only to skip duplicates. No IP addresses, names, emails, job titles, exact dates, or email text. Logs are off in `wrangler.toml`.

Only finished stories are sent: applications with a reply, and applications with 21 or more days of silence.

## See how many people use it

```bash
wrangler d1 execute job-tracker-stats --remote --command "SELECT * FROM daily ORDER BY day DESC LIMIT 14"
wrangler d1 execute job-tracker-stats --remote --command "SELECT COUNT(*) AS applications, COUNT(DISTINCT company_key) AS companies FROM responses"
```

`daily.submissions` is how many times someone clicked Send that day. It is the closest honest measure of real usage, since the skill itself cannot report back.

## Publish the stats

`GET /stats` returns per-company numbers: applications, replies, interviews, median days to reply, and ghost rate. A company only shows up once at least 5 applications are in (`MIN_N` in `wrangler.toml`), so one person's story is never exposed. You can fetch that address from a webpage or chart.

When you publish, be clear about what it is:
- Say "self-reported by users of the Job App Ghost Tracker", not "verified".
- Show the number of applications behind every figure.
- Anyone can send fake rows. The minimum count and the median soften that, but they do not remove it. Check for odd spikes before publishing a ranking.

## Cost and limits

Cloudflare's free plan currently allows 5 million row reads and 100,000 row writes per day for D1, and 5 GB of storage. The collector stops accepting rows after 20,000 a day (`DAILY_ROW_CAP`), so a flood cannot use up your quota. If a daily limit is ever hit, requests fail until midnight UTC and nothing stored is lost. Cloudflare can change these numbers, so check their pricing page.

## Housekeeping

- You can delete a company's rows if someone asks: `wrangler d1 execute job-tracker-stats --remote --command "DELETE FROM responses WHERE company_key = 'examplecorp'"`.
- Rows are not linked to a person, so a user cannot ask you to pull back only their own rows. The share dialog says so before they send.
- This is not legal advice. If you publish rankings of named companies, consider adding a short methodology note and a way for companies to contact you.
