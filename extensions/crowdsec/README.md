# Crowdsec

## Setup in the interface / Configuration dans l’interface

Open **Connections** in the DashDock sidebar, or **Configure connection** in widget settings. Enter credentials in the trusted DashDock panel, then **Save** and **Test connection**. No .env edit or Docker restart is required. Keys stay on the server and are never returned to extensions or included in dashboard exports. Blank password fields preserve an existing key; Disconnect clears the saved connection. Provider connections are shared; zone/device filters remain per widget. Requires DashDock server support for saved connections.

Use the local or remote LAPI root without /v1, plus a read-only bouncer key from cscli bouncers add dashdock. Remote servers should use valid HTTPS. Active engine/manual decisions only, excluding community lists. Twenty decisions displayed; maximum 10,000 / 2 MiB.

Read-only, zero external frontend dependencies. Store previews use labeled fictional data and cannot request private provider data. Refresh/cache: 60 seconds.
