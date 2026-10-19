#!/bin/bash
# Run as root on the server after deploying the site: bash deploy/monitoring/setup.sh
set -eu
HERE=$(cd "$(dirname "$0")" && pwd)
export DEBIAN_FRONTEND=noninteractive
IP=${JG_INTERNAL_IP:-$(ip -4 -o addr show eth0 | awk '{print $4}' | cut -d/ -f1 | head -1)}
[ -n "$IP" ] || { echo "no address on eth0; set JG_INTERNAL_IP" >&2; exit 1; }

apt-get update -qq
apt-get install -y -qq curl gpg ca-certificates >/dev/null
install -d -m 755 /etc/apt/keyrings
curl -fsSL https://apt.grafana.com/gpg.key | gpg --dearmor --yes -o /etc/apt/keyrings/grafana.gpg
echo "deb [signed-by=/etc/apt/keyrings/grafana.gpg] https://apt.grafana.com stable main" >/etc/apt/sources.list.d/grafana.list
apt-get update -qq
apt-get install -y -qq --no-install-recommends prometheus prometheus-node-exporter prometheus-nginx-exporter loki alloy >/dev/null

echo 'ARGS="--web.listen-address=127.0.0.1:9100"' >/etc/default/prometheus-node-exporter
echo 'ARGS="--web.listen-address=127.0.0.1:9113 --nginx.scrape-uri=http://127.0.0.1:8080/nginx_status"' >/etc/default/prometheus-nginx-exporter
echo "ARGS=\"--web.listen-address=$IP:9090 --storage.tsdb.retention.time=30d\"" >/etc/default/prometheus
sed "s/@IP@/$IP/g" "$HERE/prometheus.yml" >/etc/prometheus/prometheus.yml
sed "s/@IP@/$IP/g" "$HERE/loki.yaml" >/etc/loki/config.yml
sed "s/@IP@/$IP/g" "$HERE/config.alloy" >/etc/alloy/config.alloy
install -d -o loki -g "$(id -gn loki)" -m 750 /var/lib/loki
usermod -aG adm alloy

cat >/etc/logrotate.d/jotiglobe-stats <<'EOF'
/var/log/nginx/jotiglobe-stats.log {
	daily
	rotate 14
	missingok
	notifempty
	compress
	delaycompress
	create 0640 www-data adm
	sharedscripts
	postrotate
		invoke-rc.d nginx rotate >/dev/null 2>&1 || true
	endscript
}
EOF

install -m 644 "$HERE/../nginx-jotiglobe.conf" /etc/nginx/sites-available/jotiglobe
nginx -t
systemctl reload nginx

services="prometheus-node-exporter prometheus-nginx-exporter prometheus loki alloy"
for s in $services; do systemctl enable "$s" >/dev/null 2>&1; systemctl restart "$s"; done
sleep 5
for s in $services; do printf '%-28s %s\n' "$s" "$(systemctl is-active "$s")"; done
curl -fsS -o /dev/null -w 'prometheus %{http_code}\n' "http://$IP:9090/-/ready" || true
curl -fsS -o /dev/null -w 'loki %{http_code}\n' "http://$IP:3100/ready" || true
