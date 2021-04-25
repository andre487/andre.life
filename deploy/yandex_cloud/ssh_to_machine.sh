#!/usr/bin/env bash
set -euo pipefail

cur_dir="$(cd "$(dirname "$0")" && pwd)"
source "$cur_dir/common.sh"

ip_addr="$(get_prod_machine)"
ssh -o "StrictHostKeyChecking no" -i "$ID_RSA" "$HOST_USER@$ip_addr"
