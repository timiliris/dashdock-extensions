# CrowdSec

Read-only integration with credentials on the DashDock server. Configure the variables below in the DashDock server `.env`, then run `docker compose up -d --build`. Never store keys in widget configuration. The preview uses explicitly labeled fictional data; real widgets never fabricate counts after an API failure.

Refresh/cache: 60 seconds. No external frontend dependencies or browser-side API keys.

## Setup

`DASHDOCK_CROWDSEC_URL`: local or remote LAPI root without `/v1`, e.g. `http://host.docker.internal:8081` or `https://crowdsec.example.com`. `DASHDOCK_CROWDSEC_BOUNCER_KEY`: read-only key from `cscli bouncers add dashdock`. Valid HTTPS is recommended for remote servers. No paid cloud console required. Counts include active engine/manual decisions only; community lists are excluded. First 20 decisions displayed, maximum 10,000 local decisions. [Official bouncer guide](https://docs.crowdsec.net/docs/local_api/bouncers/).
