# Claude Usage Deck

Chrome extension that shows your Claude.ai usage limits at a glance — no more navigating to Settings every time.

## Features

- **Badge icon** with two rings: usage % (color-coded) and time remaining (blue)
- **Popup** with all three metrics: Session (5h), Weekly All Models, Weekly Sonnet
- **Progress bars** and countdown timers for each metric
- **Badge metric selector** — choose which metric the badge displays (Session / Weekly / Sonnet)
- **Manual refresh** button
- **Window Anchor Insight** — see exactly when your 5h session window started and when it resets

## Window Anchor Insight

**Power user tip:** Your 5-hour usage window starts when you send your first message, floored to the clock hour.

If you send a quick "hi" using Haiku at **6:00 AM**, your window anchors to **6:00–11:00 AM** — even if you don't start real work until 8 AM. This gives you a predictable reset schedule instead of having the window start mid-morning when you're deep in work.

The extension shows this window in the Session metric: `Window: 6:00 AM–11:00 AM`

## Install

1. Clone this repo
2. Open `chrome://extensions`
3. Enable **Developer Mode**
4. Click **Load unpacked** → select the `extension/` folder

## How It Works

The extension polls `claude.ai/api/organizations/{org_id}/usage` every 5 minutes using your browser cookies. All data stays local — nothing is sent anywhere.

## Color Thresholds

| Usage | Color |
|-------|-------|
| 0–50% | Green |
| 51–80% | Yellow |
| 81–100% | Red |

## License

MIT
