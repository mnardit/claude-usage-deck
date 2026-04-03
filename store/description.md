# Chrome Web Store Listing

## Short description (manifest.json, ≤132 chars)

Monitor your Claude.ai usage limits at a glance — badge shows weekly usage %, popup shows all metrics with countdowns.

## Detailed description

Stop navigating to Settings every time you want to check your Claude.ai limits.

Claude Usage Deck shows your usage right in the browser toolbar — color-coded badge icon, countdown timer, and a clean popup with all three metrics.

━━━ WHAT YOU SEE ━━━

🔵 Badge icon — adaptive design:
  • Small sizes: solid colored circle (green / amber / red)
  • Large sizes: ring showing usage % with number in center
  • Badge text: time until reset ("2h", "45m", "3d")

📊 Popup dashboard:
  • Status summary — instant "Safe / Moderate / High" for each metric
  • Session (5h) — current session utilization + countdown
  • Weekly All Models (7d) — combined usage across all models
  • Sonnet (7d) — Sonnet model tracked separately
  • Progress bars color-coded: green (0-49%), amber (50-79%), red (80-100%)

━━━ FEATURES ━━━

• Window Anchor Insight — see when your 5h session window started and when it resets. Pro tip: send a quick "hi" early to anchor your window to a predictable schedule.

• Badge metric selector — choose which metric the toolbar icon shows (Session / Weekly / Sonnet).

• Light & dark theme — follows your browser/OS preference automatically.

• Auto-refresh every 5 minutes + manual refresh button.

━━━ PRIVACY ━━━

• No analytics, no tracking, no accounts
• No external servers — only talks to claude.ai
• All data stored locally in your browser
• Open source (MIT) — read every line on GitHub

━━━ HOW IT WORKS ━━━

The extension polls claude.ai/api/organizations/{org_id}/usage every 5 minutes using your existing browser cookies. No login required beyond your normal Claude.ai session.

Permissions:
  • alarms — schedule 5-minute polling
  • storage — cache usage data locally
  • host_permissions (claude.ai) — read usage API

━━━━━━━━━━━━━━━━━━━━

Free and open source. MIT license.
https://github.com/mnardit/claude-usage-deck

## Category

Productivity

## Language

English

## Privacy policy URL

https://max.nardit.com/claude-usage-deck/privacy

## Homepage URL

https://max.nardit.com/claude-usage-deck
