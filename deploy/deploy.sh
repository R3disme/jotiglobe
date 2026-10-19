#!/bin/bash
# Build the site and copy it to the server. Run on the build machine:
#   deploy/deploy.sh root@<container-ip>
# Uses rsync over ssh (or a tar stream if rsync is missing); only /srv/jotiglobe on the container is touched.
set -eu
TARGET=${1:?usage: deploy/deploy.sh root@<container-ip>}
cd "$(dirname "$0")/.."
pnpm install --frozen-lockfile
pnpm check
pnpm build
if command -v rsync >/dev/null; then
	rsync -a --delete --chmod=D755,F644 build/ "$TARGET:/srv/jotiglobe/"
else
	# no rsync here: stream a tarball and swap the directory in one go
	tar -C build -cf - . | ssh "$TARGET" 'set -e; rm -rf /srv/jotiglobe.new; mkdir -p /srv/jotiglobe.new
		tar -xf - -C /srv/jotiglobe.new --no-same-owner; chmod -R u=rwX,go=rX /srv/jotiglobe.new
		rm -rf /srv/jotiglobe.old; [ -d /srv/jotiglobe ] && mv /srv/jotiglobe /srv/jotiglobe.old; mv /srv/jotiglobe.new /srv/jotiglobe; rm -rf /srv/jotiglobe.old'
fi
echo "deployed $(du -sh build | cut -f1) to $TARGET:/srv/jotiglobe"
