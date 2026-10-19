#!/bin/bash
# Server setup for JotiGlobe (Debian 13, run as root on the server). Safe to run again.
#   bash setup.sh                        nginx + Tailscale installed, site served on 127.0.0.1:8080
#   TS_AUTHKEY=tskey-... bash setup.sh   also join the tailnet (tag:jotiglobe) and switch on Funnel
# Funnel makes https://<hostname>.<tailnet>.ts.net reachable from the whole internet, with no port forwarding.
# The tailnet policy needs a "funnel" nodeAttr for tag:jotiglobe, and Funnel switched on once for the tailnet.
set -eu
HERE=$(cd "$(dirname "$0")" && pwd)
export DEBIAN_FRONTEND=noninteractive

apt-get update -qq
apt-get install -y -qq nginx libnginx-mod-http-brotli-static curl ca-certificates >/dev/null

if ! command -v tailscale >/dev/null; then
	. /etc/os-release
	curl -fsSL "https://pkgs.tailscale.com/stable/debian/$VERSION_CODENAME.noarmor.gpg" -o /usr/share/keyrings/tailscale-archive-keyring.gpg
	curl -fsSL "https://pkgs.tailscale.com/stable/debian/$VERSION_CODENAME.tailscale-keyring.list" -o /etc/apt/sources.list.d/tailscale.list
	apt-get update -qq
	apt-get install -y -qq tailscale >/dev/null
fi
# Unprivileged containers have no /dev/net/tun. Userspace networking is enough: Funnel proxies to localhost.
if [ ! -e /dev/net/tun ]; then
	sed -i 's/^FLAGS=.*/FLAGS="--tun=userspace-networking"/' /etc/default/tailscaled
	systemctl restart tailscaled
fi

# nginx: only this site, no access logs (the privacy notice promises that)
install -d -m 755 /srv/jotiglobe
[ -e /srv/jotiglobe/index.html ] || echo '<!doctype html><title>JotiGlobe</title><p>Not deployed yet.</p>' >/srv/jotiglobe/index.html
install -d -m 755 /etc/nginx/jotiglobe.d
install -m 644 "$HERE/nginx-jotiglobe.conf" /etc/nginx/sites-available/jotiglobe
ln -sf /etc/nginx/sites-available/jotiglobe /etc/nginx/sites-enabled/jotiglobe
rm -f /etc/nginx/sites-enabled/default
sed -i 's#^\(\s*\)access_log .*;#\1access_log off;#' /etc/nginx/nginx.conf
nginx -t
systemctl enable --now nginx >/dev/null
systemctl reload nginx

if [ -n "${TS_AUTHKEY:-}" ]; then
	tailscale up --auth-key="$TS_AUTHKEY" --hostname="${TS_HOSTNAME:-jotiglobe}" --advertise-tags=tag:jotiglobe \
		--accept-dns=false --accept-routes=false
fi
if tailscale status >/dev/null 2>&1; then
	# --bg keeps it configured across restarts; times out instead of hanging if Funnel isn't enabled yet
	timeout 20 tailscale funnel --bg 8080 </dev/null || echo "Funnel not on yet - enable it with the link above, then run this again."
	tailscale funnel status || true
fi

curl -fsS -o /dev/null -w 'local check: HTTP %{http_code}\n' http://127.0.0.1:8080/
