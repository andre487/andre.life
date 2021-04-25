export IAM_TOKEN="$(yc iam create-token)"
export PROJECT_DIR="$(realpath "$(cd "$(dirname "$0")/../.." && pwd)")"
export SECRET_DIR="$PROJECT_DIR/.secret"

export ZONE=ru-central1-c
export MACHINE_NAME=andre-life

export SERVICE_ACCOUNT=robot-service
export CONTAINER_NAME=nginx
export DOCKER_IMAGE=nginx:1.19.10-alpine

export LOCKBOX_SECRET_URL=https://payload.lockbox.api.cloud.yandex.net/lockbox/v1/secrets
export SSH_KEY_SECRET=e6q6vfo2vo565h0cb0nq
export DEPLOY_USER_SECRET=e6qg4280406q9aj6uvkv

export GH_REPO="andre487/andre.life"
export ID_RSA="$HOME/.ssh/id_rsa_cloud"
export HOST_USER=yc-user

get_main_user_public_key() {
    local secret_file
    local payload

    secret_file="$SECRET_DIR/main_user_id_rsa.pub"

    if [[ ! -f "$secret_file" ]]; then
        payload="$(curl -s --fail -H "Authorization: Bearer $IAM_TOKEN" "$LOCKBOX_SECRET_URL/$SSH_KEY_SECRET/payload")"
        jq <<< "$payload" -r '.entries | map(select(.key == "id_rsa.pub")) | .[0].textValue' >"$secret_file"
    fi

    echo "$secret_file"
}

get_deploy_user_data() {
    local secret_file
    local payload

    payload="$(curl -s --fail -H "Authorization: Bearer $IAM_TOKEN" "$LOCKBOX_SECRET_URL/$DEPLOY_USER_SECRET/payload")"
    jq <<< "$payload" -r '.entries | map(select(.key == "id_rsa")) | .[0].textValue' >"$SECRET_DIR/deploy_user_id_rsa"
    jq <<< "$payload" -r '.entries | map(select(.key == "id_rsa.pub")) | .[0].textValue' >"$SECRET_DIR/deploy_user_id_rsa.pub"
    jq <<< "$payload" -r '.entries | map(select(.key == "user_name")) | .[0].textValue' >"$SECRET_DIR/deploy_user_name"
    jq <<< "$payload" -r '.entries | map(select(.key == "deploy_host")) | .[0].textValue' >"$SECRET_DIR/deploy_host"
}

get_prod_machine() {
    yc compute instance list --format json | \
    jq -r "
        map(select(.labels.machine_type == \"$MACHINE_NAME\" and .zone_id == \"$ZONE\")) |
        first |
        .network_interfaces | first |
        .primary_v4_address.one_to_one_nat.address
    "
}


is_prod_machine_online() {
    local ip_addr

    ip_addr="$(get_prod_machine)"
    if ssh -o "StrictHostKeyChecking no" -i "$ID_RSA" "$HOST_USER@$ip_addr" true; then
        echo 1
    else
        echo 0
    fi
}
