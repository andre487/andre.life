#!/usr/bin/env bash
set -euo pipefail

cur_dir="$(cd "$(dirname "$0")" && pwd)"
source "$cur_dir/common.sh"

echo "===> Create VM"
yc compute instance create-with-container \
    --name "$MACHINE_NAME" \
    --description "Site andre.life" \
    --labels "machine_type=$MACHINE_NAME" \
    --zone="$ZONE" \
    --ssh-key "$(get_main_user_public_key)" \
    --service-account-name "$SERVICE_ACCOUNT" \
    --network-interface "subnet-name=default-$ZONE,nat-ip-version=ipv4" \
    --cores 2 \
    --core-fraction 5 \
    --memory 512MB \
    --container-name "$CONTAINER_NAME" \
    --container-image "$DOCKER_IMAGE" \
    --container-tty \
    --container-restart-policy Always \
    --container-volume-host-path 'name=www,mount-path=/usr/share/nginx/html,host-path=/var/www,ro=true'

echo "===> Waiting online"
while [[ "$(is_prod_machine_online)" == 0 ]]; do
    echo "Waiting for machine $MACHINE_NAME online…"
    sleep 5
done

echo "===> Setup site"
"$cur_dir/setup_site.sh"
