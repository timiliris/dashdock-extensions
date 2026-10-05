# Tailscale

Read-only tailnet inventory, device addresses, approval status and last-seen timestamps. Last seen is not a live connectivity guarantee. Store previews are explicitly marked demo data. Credentials stay in the DashDock server environment. Refresh/cache: 60 seconds, 2 MiB / 2,000 devices maximum, first 20 matching devices displayed.

## Setup / Configuration

Create a Tailscale OAuth client with **Devices → Core → Read** (`devices:core:read`). Set `DASHDOCK_TAILSCALE_CLIENT_ID` and `DASHDOCK_TAILSCALE_CLIENT_SECRET` in the server `.env`. Tokens renew automatically. Alternatively set `DASHDOCK_TAILSCALE_API_KEY` to an API access token (`tskey-api`), which takes precedence. An enrollment auth key (`tskey-auth`) is not an API access token.

`DASHDOCK_TAILSCALE_TAILNET=-` selects the default network associated with your credentials; an explicit tailnet identifier is also supported. Run `docker compose up -d --build`, add the widget, then use its settings to check the connection and optionally save a device filter. No device changes, ACL changes or approval actions are exposed.

[Official OAuth guide](https://tailscale.com/docs/features/oauth-clients) · [Read-only scope reference](https://tailscale.com/docs/reference/trust-credentials)
