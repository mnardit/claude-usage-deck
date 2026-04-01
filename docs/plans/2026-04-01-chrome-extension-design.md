# Claude Usage Deck — Design Document

**Date:** 2026-04-01
**Status:** Approved
**Repo:** github.com/mnardit/claude-usage-deck

## Problem

Claude.ai users have no easy way to monitor their usage limits outside the Settings page. During periods of high usage (rate limiting waves), people get frustrated by the lack of visibility. There's no way to see usage at a glance — you have to navigate to Settings > Usage every time.

## Solution

**Claude Usage Deck** — Chrome Extension + Stream Deck plugin that shows Claude usage stats in real-time.

- **Chrome Extension**: badge with weekly usage %, popup with all metrics
- **Stream Deck Plugin**: physical button showing usage with color-coded background

## Architecture

```
┌─────────────────┐     WebSocket      ┌──────────────────┐
│ Chrome Extension │ ──────────────────→│ Stream Deck      │
│                  │    localhost:9170   │ Plugin           │
│ - cookies auth   │                    │                  │
│ - polls /usage   │  { utilization,    │ - WS server      │
│ - badge + popup  │    resets_at,      │ - renders button │
│ - every 5 min    │    color }         │ - color coding   │
└─────────────────┘                    └──────────────────┘
```

## API

**Endpoint:** `GET https://claude.ai/api/organizations/{org_id}/usage`

**Auth:** Browser cookies (extension has access via `claude.ai` host permission)

**Response:**
```json
{
  "five_hour": {
    "utilization": 5.0,
    "resets_at": "2026-04-01T11:00:00.858239+00:00"
  },
  "seven_day": {
    "utilization": 79.0,
    "resets_at": "2026-04-03T04:00:00.858262+00:00"
  },
  "seven_day_sonnet": {
    "utilization": 3.0,
    "resets_at": "2026-04-04T12:00:00.858273+00:00"
  },
  "seven_day_opus": null,
  "seven_day_cowork": null,
  "extra_usage": {
    "is_enabled": false,
    "monthly_limit": null,
    "used_credits": null,
    "utilization": null
  }
}
```

**Getting org_id:** From bootstrap API response or by intercepting any `claude.ai/api/organizations/` request. Cache after first fetch.

## Chrome Extension

### Manifest (v3)

- `host_permissions`: `https://claude.ai/*`
- `permissions`: `alarms`, `storage`
- Background: service worker
- Popup: HTML page with metrics

### Badge

- Shows weekly usage % as text (e.g. "79")
- Background color:
  - Green (#22C55E): 0-49%
  - Amber (#F59E0B): 50-79%
  - Red (#EF4444): 80-100%
  - Gray (#71717A): no data / not logged in

### Popup

Mini dashboard showing:
- **Session** (5h): progress bar + % + countdown to reset
- **Weekly All Models** (7d): progress bar + % + countdown
- **Weekly Sonnet** (7d): progress bar + % + countdown
- Last updated timestamp
- Link to claude.ai/settings/usage

### Data Flow

1. On install/startup: fetch org_id from `claude.ai/api/bootstrap/*/app_start` or storage
2. Set alarm for every 5 minutes
3. On alarm: `GET /api/organizations/{org_id}/usage` with cookies
4. Parse response, update badge, store in `chrome.storage.local`
5. If WebSocket connected → push to Stream Deck
6. On popup open → read from storage, render

### org_id Discovery

Option A: Hit `claude.ai/api/organizations` — returns list of user's orgs
Option B: Use `webRequest` listener to capture org_id from any claude.ai API call

Start with Option A — simpler, one extra API call on first setup.

## Stream Deck Plugin

### Communication

- Plugin starts WebSocket server on `localhost:9170`
- Extension connects on startup + reconnects on disconnect
- Protocol: JSON messages

```json
// Extension → Stream Deck
{
  "type": "usage_update",
  "data": {
    "five_hour": { "utilization": 5.0, "resets_at": "..." },
    "seven_day": { "utilization": 79.0, "resets_at": "..." },
    "seven_day_sonnet": { "utilization": 3.0, "resets_at": "..." }
  }
}
```

### Button Display

- One button, default metric: `seven_day` (weekly all models)
- Shows: large % number + small label ("Weekly" / "Session" / "Sonnet")
- Background: color-coded (green/yellow/red)
- Short press: cycle through metrics (Weekly → Session → Sonnet → Weekly)
- Long press: open claude.ai/settings/usage in browser

### Color Thresholds

Same as extension badge:
- 0-49% → green
- 50-79% → amber
- 80-100% → red

## Project Structure

```
claude-usage-deck/
├── extension/              # Chrome Extension (Manifest V3)
│   ├── manifest.json
│   ├── background.js       # Service worker: alarms, API calls, WS client
│   ├── popup.html          # Popup UI
│   ├── popup.js            # Popup logic
│   ├── popup.css           # Popup styles
│   └── icons/              # Extension icons (16, 48, 128)
├── streamdeck-plugin/      # Stream Deck Plugin
│   ├── manifest.json       # SD plugin manifest
│   ├── plugin.js           # WS server + button rendering
│   └── icons/              # Button icons
├── docs/
│   └── plans/
└── README.md
```

## Phase Plan

### Phase 1: Chrome Extension (ship ASAP)
- Badge + popup
- 5-min polling
- Chrome Web Store publish

### Phase 2: Stream Deck Plugin
- WebSocket server in SD plugin
- Extension connects as WS client
- Button rendering with color coding

### Phase 3: Polish
- Options page (custom thresholds, poll interval)
- Notification when approaching limit (optional)
- Firefox support (if demand)

## Risks

1. **API stability** — `/usage` is an internal API, may change without notice. Mitigation: version detection, graceful fallback
2. **Auth** — cookies may expire if user logs out. Mitigation: gray badge + "Please log in" in popup
3. **Rate limiting** — polling every 5 min = 288 requests/day. Should be fine for an internal API, but monitor
4. **Chrome Web Store review** — may flag `host_permissions` for `claude.ai`. Mitigation: clear description of purpose, privacy policy

## Feature: Window Anchor Insight

Community tip: the 5-hour usage window starts when you send your first message, floored to the clock hour. If you send a throwaway "hi" using Haiku at 6 AM, the window anchors to 6-11 AM instead of starting at 8 AM when you actually begin working.

**Implementation:**
- Calculate window start from `five_hour.resets_at - 5h`
- Show in popup: "Window started at 6:00 AM, resets at 11:00 AM"
- Tooltip or small text under the Session metric
- Mention this tip in Chrome Web Store description and README — viral potential
