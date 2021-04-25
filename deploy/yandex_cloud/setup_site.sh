#!/usr/bin/env bash
set -euo pipefail

cur_dir="$(cd "$(dirname "$0")" && pwd)"
source "$cur_dir/common.sh"

ip_addr="$(get_prod_machine)"
inventory_file="$TMPDIR/$MACHINE_NAME-inventory"
echo "$ip_addr ansible_ssh_private_key_file=$ID_RSA ansible_ssh_user=$HOST_USER host_user=$HOST_USER" >"$inventory_file"

#cd "$PROJECT_DIR"
#npm ci
#npm run build

ansible-playbook -i "$inventory_file" "$cur_dir/setup.yml"
