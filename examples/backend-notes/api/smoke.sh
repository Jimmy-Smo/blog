#!/usr/bin/env bash
set -euo pipefail

# 从示例目录执行；需要 curl、jq 和已启动的 QuoteServer / WireMock。
# 仅操作本地专用模拟服务，切换场景会删除该服务现有映射。
cd "$(dirname "$0")/.."
result_dir=$(mktemp -d)
trap 'rm -rf "$result_dir"' EXIT

for scenario in success timeout error; do
  case "$scenario" in
    success) expected_status=200; expected_body='{"shippingFee":1299}' ;;
    timeout) expected_status=504; expected_body='{"code":"UPSTREAM_TIMEOUT"}' ;;
    error) expected_status=502; expected_body='{"code":"UPSTREAM_ERROR"}' ;;
  esac
  curl --fail-with-body -sS --max-time 5 -X DELETE \
    http://127.0.0.1:8089/__admin/mappings > /dev/null
  curl --fail-with-body -sS --max-time 5 -X POST \
    http://127.0.0.1:8089/__admin/mappings \
    -H 'Content-Type: application/json' \
    --data-binary "@api/$scenario.json" > /dev/null
  request_id="smoke-$scenario"
  # 故障场景预期非 2xx，因此在这里显式检查状态和响应，不使用 --fail。
  actual_status=$(curl -sS --max-time 5 \
    -D "$result_dir/headers" -o "$result_dir/body" -w '%{http_code}' \
    -H "X-Request-Id: $request_id" http://127.0.0.1:8080/quote)
  [[ "$actual_status" == "$expected_status" ]]
  jq -e --argjson expected "$expected_body" '. == $expected' "$result_dir/body" > /dev/null
  tr -d '\r' < "$result_dir/headers" | \
    awk -v expected="$request_id" 'tolower($1) == "x-request-id:" && $2 == expected { found=1 } END { exit !found }'
  echo "$scenario: HTTP $actual_status, response and request ID verified"
done
