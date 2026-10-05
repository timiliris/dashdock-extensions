# Compte à rebours / Countdown

Choose an event name and date in the settings sheet. The target is converted from your browser’s local time to an ISO UTC timestamp and persisted per widget through `config.get` and `config.save`. The countdown recalculates from the current clock every second and survives reloads; completed events display zero. No background worker, external API or permissions are required. Keep your device clock accurate.

French/English, theme, colors and font follow DashDock. Preview cannot write. Dates in a daylight-saving gap are rejected; an ambiguous fall-back hour uses the browser’s earlier occurrence.
