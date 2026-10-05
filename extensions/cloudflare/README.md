# Cloudflare

Read-only integration with credentials on the DashDock server. Configure the variables below in the DashDock server `.env`, then run `docker compose up -d --build`. Never store keys in widget configuration. The preview uses explicitly labeled fictional data; real widgets never fabricate counts after an API failure.

Refresh/cache: 60 seconds. No external frontend dependencies or browser-side API keys.

## Setup

`DASHDOCK_CLOUDFLARE_TOKEN`: Cloudflare API token with Zone Read and DNS Read scoped to your zones. Select a zone in the widget settings. Up to 200 zones; first 10 DNS records displayed. DNS values are omitted. [Official API](https://developers.cloudflare.com/api/resources/dns/subresources/records/methods/list/).
