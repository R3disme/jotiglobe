#!/bin/bash
# Usage: GRAFANA_URL=http://grafana:3000 GRAFANA_TOKEN=glsa_... JG_IP=<server eth0 address> OWNER=<grafana login> deploy/monitoring/grafana.sh
set -eu
HERE=$(cd "$(dirname "$0")" && pwd)
: "${GRAFANA_URL:?}" "${GRAFANA_TOKEN:?}" "${JG_IP:?}" "${OWNER:?}"
api() { curl -fsS -H "Authorization: Bearer $GRAFANA_TOKEN" -H 'Content-Type: application/json' "$@"; }

for ds in "jotiglobe-prom|JotiGlobe Prometheus|prometheus|http://$JG_IP:9090" "jotiglobe-loki|JotiGlobe Loki|loki|http://$JG_IP:3100"; do
	IFS='|' read -r uid name type url <<<"$ds"
	body="{\"uid\":\"$uid\",\"name\":\"$name\",\"type\":\"$type\",\"url\":\"$url\",\"access\":\"proxy\"}"
	if api -o /dev/null "$GRAFANA_URL/api/datasources/uid/$uid" 2>/dev/null; then
		api -X PUT "$GRAFANA_URL/api/datasources/uid/$uid" -d "$body" >/dev/null
	else
		api -X POST "$GRAFANA_URL/api/datasources" -d "$body" >/dev/null
	fi
	echo "data source $name: $(api "$GRAFANA_URL/api/datasources/uid/$uid/health" 2>/dev/null | python3 -c 'import sys,json; print(json.load(sys.stdin).get("status"))' || echo 'not reachable yet')"
done

api -o /dev/null "$GRAFANA_URL/api/folders/jotiglobe" 2>/dev/null ||
	api -X POST "$GRAFANA_URL/api/folders" -d '{"uid":"jotiglobe","title":"JotiGlobe"}' >/dev/null
owner=$(api "$GRAFANA_URL/api/org/users/lookup?query=$OWNER" | python3 -c "import sys,json; print(next(u['userId'] for u in json.load(sys.stdin) if u['login']=='$OWNER'))")
api -X POST "$GRAFANA_URL/api/folders/jotiglobe/permissions" -d "{\"items\":[{\"userId\":$owner,\"permission\":4}]}" >/dev/null
echo "folder JotiGlobe: only $OWNER (and server admins)"

python3 -c "import json,sys; print(json.dumps({'dashboard': json.load(open(sys.argv[1])), 'folderUid': 'jotiglobe', 'overwrite': True}))" "$HERE/grafana-dashboard.json" |
	api -X POST "$GRAFANA_URL/api/dashboards/db" -d @- | python3 -c 'import sys,json; d=json.load(sys.stdin); print("dashboard:", d.get("url"))'
