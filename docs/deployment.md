# Deployment

JotiGlobe is a folder of static files behind nginx, published with Tailscale Funnel. The public site is not updated
automatically from this repository; it's deployed by hand.

## Server

On a fresh Debian 13 machine or container, as root:

```sh
bash deploy/setup.sh                        # nginx (with brotli) + Tailscale, site on 127.0.0.1:8080
TS_AUTHKEY=tskey-... bash deploy/setup.sh   # also join the tailnet and switch on Funnel
```

`deploy/nginx-jotiglobe.conf`:

- serves the prerendered pages (`/stats` → `stats.html`, `/groups/x` → `groups/x.html`) and the precompressed
  `.br`/`.gz` files next to them;
- sends the same strict security headers on every page; SvelteKit's own start-up script is allowed by hash;
- shows its own page for every error (`/_errors/<code>.html`), with real status codes. `/errors` lists them all and
  `/errors/<code>` triggers one, including 418;
- keeps no visitor logs. With usage statistics on, it writes one anonymous line per request: no IP address, browser
  or referrer.

## Deploying

```sh
deploy/deploy.sh root@<server>   # pnpm build, then copy build/ to /srv/jotiglobe
```

## Usage statistics (optional)

Set `GRAFANA_URL` in `.env` before building. Each page view then sends an anonymous `/hit` that nginx logs, and the
privacy notice mentions it. On the server:

```sh
bash deploy/monitoring/setup.sh   # Prometheus, Loki, Alloy and exporters, kept for 30 days
GRAFANA_URL=… GRAFANA_TOKEN=… JG_IP=… OWNER=… deploy/monitoring/grafana.sh   # data sources, private folder, dashboard
```

The dashboard (`deploy/monitoring/grafana-dashboard.json`) shows visitors, page views and requests, the most used
pages, response times, CPU, memory, disk, network and the anonymous log.
