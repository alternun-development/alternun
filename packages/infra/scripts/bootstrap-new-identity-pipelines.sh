#!/usr/bin/env bash
set -euo pipefail

# A CodePipeline source event happens before the production pipeline reconciles
# its child pipelines. When an identity pipeline is created by that same release,
# it therefore misses that event. Record missing identity pipelines before the
# deploy and start only those after it succeeds.

COMMAND=${1:-}
case "$COMMAND" in
  record | start-recorded) ;;
  *)
    echo "Usage: $0 <record|start-recorded>" >&2
    exit 2
    ;;
esac

stage=$(printf '%s' "${SST_STAGE:-}" | tr '[:upper:]' '[:lower:]' | tr '_' '-')
case "$stage" in
  production)
    ;;
  *)
    echo "Skipping identity pipeline bootstrap for non-production stage: ${SST_STAGE:-unset}"
    exit 0
    ;;
esac

if ! command -v aws >/dev/null 2>&1; then
  echo "ERROR: aws CLI is required to bootstrap identity pipelines." >&2
  exit 1
fi

pipeline_suffix_for_key() {
  case "$1" in
    identity-dev) printf '%s\n' 'auth-dev' ;;
    identity-prod) printf '%s\n' 'auth-prod' ;;
    *) return 1 ;;
  esac
}

PIPELINE_PREFIX=${INFRA_PIPELINE_PREFIX:-alternun}
REGION=${AWS_REGION:-us-east-1}
STATE_DIR=${IDENTITY_PIPELINE_BOOTSTRAP_STATE_DIR:-"/tmp/alternun-identity-pipeline-bootstrap-${CODEBUILD_BUILD_ID:-local}"}
STATE_FILE="$STATE_DIR/missing-pipelines"
IDENTITY_PIPELINE_KEYS=(identity-dev identity-prod)

pipeline_name_for_key() {
  local suffix
  suffix=$(pipeline_suffix_for_key "$1")
  printf '%s-%s-pipeline\n' "$PIPELINE_PREFIX" "$suffix"
}

record_missing_pipelines() {
  mkdir -p "$STATE_DIR"
  : > "$STATE_FILE"

  for pipeline_key in "${IDENTITY_PIPELINE_KEYS[@]}"; do
    pipeline_name=$(pipeline_name_for_key "$pipeline_key")
    if aws codepipeline get-pipeline --name "$pipeline_name" --region "$REGION" >/dev/null 2>&1; then
      echo "Identity pipeline already exists: $pipeline_name"
    else
      echo "Identity pipeline will be bootstrapped after deploy: $pipeline_name"
      printf '%s\n' "$pipeline_name" >> "$STATE_FILE"
    fi
  done
}

start_recorded_pipelines() {
  if [ ! -f "$STATE_FILE" ]; then
    echo "No identity pipeline bootstrap record was created; nothing to start."
    return 0
  fi

  while IFS= read -r pipeline_name; do
    [ -n "$pipeline_name" ] || continue

    if ! aws codepipeline get-pipeline --name "$pipeline_name" --region "$REGION" >/dev/null 2>&1; then
      echo "ERROR: Identity pipeline was not created by the production deploy: $pipeline_name" >&2
      return 1
    fi

    latest_execution=$(aws codepipeline list-pipeline-executions \
      --pipeline-name "$pipeline_name" \
      --max-results 1 \
      --region "$REGION" \
      --query 'pipelineExecutionSummaries[0].status' \
      --output text)

    case "$latest_execution" in
      '' | None | null)
        echo "Starting newly created identity pipeline: $pipeline_name"
        aws codepipeline start-pipeline-execution --name "$pipeline_name" --region "$REGION" >/dev/null
        ;;
      *)
        echo "Identity pipeline already has an execution ($latest_execution): $pipeline_name"
        ;;
    esac
  done < "$STATE_FILE"
}

case "$COMMAND" in
  record) record_missing_pipelines ;;
  start-recorded) start_recorded_pipelines ;;
esac
