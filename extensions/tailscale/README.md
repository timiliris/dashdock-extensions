# Tailscale

## Setup in the interface / Configuration dans l’interface

Open **Connections** in the DashDock sidebar, or **Configure connection** in widget settings. Enter credentials in the trusted DashDock panel, then **Save** and **Test connection**. No .env edit or Docker restart is required. Keys stay on the server and are never returned to extensions or included in dashboard exports. Blank password fields preserve an existing key; Disconnect clears the saved connection. Provider connections are shared; zone/device filters remain per widget. Requires DashDock server support for saved connections.

Use OAuth with Devices → Core → Read (devices:core:read), client ID and secret; tokens renew automatically. Alternatively use an API access token (tskey-api), not an enrollment key (tskey-auth). Tailnet “-” selects your credential’s network. Last seen is an API observation, not a live connectivity guarantee. Up to 2,000 devices / 2 MiB; first twenty matching devices displayed.

Read-only, zero external frontend dependencies. Store previews use labeled fictional data and cannot request private provider data. Refresh/cache: 60 seconds.
