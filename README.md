# DC Social Events

A phone-first static site listing upcoming social events in Washington, DC: music, comedy, theatre, food, nightlife, markets, outdoors, and the rest of what is happening in the city. List and calendar views, filters, add-to-calendar, share links, and an installable home-screen app, with a coral, teal, plum, and sunshine palette.

The site is plain HTML, CSS, and JavaScript. There is no build step. GitHub Pages should be served from the root of `main` (the repository owner turns Pages on; this repo does not enable it).

Published URL: https://sfox2006.github.io/DC-Social-Events/

## What you can do

- Browse upcoming events in a three-day list, or switch to a week calendar. On a phone, the header stays compact, days swipe in a strip, and Filters opens a full-screen sheet.
- Filter by category, format (in person, hybrid, online), cost (free, paid, unknown), age (all ages, 18+, 21+), time of day, free entry, free food, free drinks, and outdoor. Search matches the title, description, organizer, or venue.
- Open an event for its description, then add it to Google Calendar, download an ICS file, or open it in Outlook.
- Share a link that deep-links to that event by id (`?event=`).
- Install the page as an app. Refresh re-fetches `data/events.json`. The service worker keeps a shell cache named `dc-social-v7` and a network-first data cache named `dc-social-data-v7`.
- The list and week calendar include events from today through the next 31 days (Eastern Time). The date picker and day strip stop at that horizon.
- “Get the weekly email” opens a short note that the signup form is not open yet. It does not leave this site.

When `events` is empty, the page says “First events arriving shortly”.

## Data

`data/events.json` is the only event source. A daily pipeline pushes the file; do not hand-edit it for production, and do not commit sample events.

```json
{
  "generated": "2026-10-01T00:00:00-04:00",
  "timezone": "America/New_York",
  "window": { "start": "2026-10-02", "end": "2026-11-02" },
  "events": []
}
```

`generated` is an ISO 8601 timestamp with an Eastern Time offset. `timezone` is `America/New_York`. `window` is optional. When the pipeline includes it, the value carries the file’s two cut-off dates (for example the object above, or a pair of `YYYY-MM-DD` strings). The page reads `events` and ignores `window`, so the site still loads when the field is missing or has another shape. `events` is an array of objects:

| Field | Meaning |
| --- | --- |
| `id` | Stable string. Share links use `?event=` plus this id. |
| `title` | Event name. |
| `org` | Organiser or venue name. |
| `start` | ISO 8601 start with an Eastern offset, for example `2026-10-03T19:00:00-04:00`. |
| `end` | ISO 8601 end with an Eastern offset. If it is missing or not after `start`, calendar exports use one hour. |
| `venue` | Place name. |
| `address` | Street address. |
| `maps_url` | Link opened from the venue line. |
| `url` | Event page. |
| `category` | One of `music`, `comedy`, `theatre`, `food_drink`, `nightlife`, `festival`, `market`, `sports_fitness`, `outdoors`, `arts_museums`, `film`, `community`, `family`, `networking`, `other`. |
| `format` | `in_person`, `hybrid`, or `online`. |
| `cost` | `Free`, a price such as `$15`, or `Unknown`. Unknown is never treated as free. |
| `age` | `all_ages`, `18+`, `21+`, or `unknown`. The age filter matches this field exactly. |
| `tags` | Booleans: `free_food`, `free_drinks`, `free_entry`, `young_adults`, `outdoor`. |
| `description` | Plain text shown when the event is opened. |
| `source` | Where the pipeline found the event. |

Times on the page are Eastern (`America/New_York`).

## Fonts

Inter and Crimson Pro are shipped in `fonts/` under the SIL Open Font License.
