#!/usr/bin/env bash
set -euo pipefail

cur_dir="$(cd "$(dirname "$0")" && pwd)"
source "$cur_dir/common.sh"

if ! which gh >/dev/null; then
    echo "There is no GitHub cli. Please install it: brew install gh"
    exit 1
fi

get_deploy_user_data

gh secret set DEPLOY_HOST --repos "$GH_REPO" --body "$(cat "$SECRET_DIR/deploy_host")"
gh secret set DEPLOY_KEY --repos "$GH_REPO" --body "$(cat "$SECRET_DIR/deploy_user_id_rsa")"
gh secret set DEPLOY_USER --repos "$GH_REPO" --body "$(cat "$SECRET_DIR/deploy_user_name")"

ip_addr="$(get_prod_machine)"
inventory_file="$TMPDIR/$MACHINE_NAME-inventory"
echo "$ip_addr ansible_ssh_private_key_file=$ID_RSA ansible_ssh_user=$HOST_USER host_user=$HOST_USER secret_dir=$SECRET_DIR" >"$inventory_file"

cd "$PROJECT_DIR"
if [[ ! -d node_modules ]]; then
    npm ci
fi
npm run build

ansible-playbook -i "$inventory_file" "$cur_dir/setup.yml"
