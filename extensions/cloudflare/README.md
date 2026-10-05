# Cloudflare

## Setup in the interface / Configuration dans l’interface

Open **Connections** in the DashDock sidebar, or **Configure connection** in widget settings. Enter credentials in the trusted DashDock panel, then **Save** and **Test connection**. No .env edit or Docker restart is required. Keys stay on the server and are never returned to extensions or included in dashboard exports. Blank password fields preserve an existing key; Disconnect clears the saved connection. Provider connections are shared; zone/device filters remain per widget. Requires DashDock server support for saved connections.

Create a Cloudflare token with Zone Read and DNS Read scoped to your zones. Select a zone in widget settings after connecting. Up to 200 zones and ten DNS records displayed; DNS contents are omitted.

Read-only, zero external frontend dependencies. Store previews use labeled fictional data and cannot request private provider data. Refresh/cache: 60 seconds.
