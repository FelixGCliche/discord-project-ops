FROM oven/bun:1-slim AS base

ARG OPENCODE_VERSION=latest

RUN apt-get update -qq \
    && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && bun install -g opencode-ai@${OPENCODE_VERSION}

RUN useradd --create-home --uid 10001 opencode
WORKDIR /home/opencode/app

# Canonical prompts, copied in unmodified. build-agents.mjs only ever
# *prepends* frontmatter -- it never edits this content -- so these
# stay the single source of truth per your existing convention.
COPY prompts/*.md ./prompts/
COPY apps/opencode/scripts/build-agents.mjs ./scripts/build-agents.mjs
COPY apps/opencode/opencode.json ./opencode.json
COPY apps/opencode/docker-entrypoint.sh ./docker-entrypoint.sh

RUN node scripts/build-agents.mjs --prompts ./prompts --out ./.opencode/agents \
    && chmod +x docker-entrypoint.sh \
    && chown -R opencode:opencode /home/opencode

USER opencode

# opencode's own default; overridden by $PORT if the platform sets one
# (Cloud Run does this later -- not needed for local docker-compose).
ENV OPENCODE_SERVER_PORT=4096
EXPOSE 4096

# VERIFY: confirm `opencode serve` exposes GET /global/health (used by
# the compose healthcheck) on your pinned version -- seen in current
# docs/examples but worth a quick curl before trusting it in CI.
HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=5 \
    CMD ["sh", "-c", "wget -qO- http://127.0.0.1:${OPENCODE_SERVER_PORT}/global/health || exit 1"]

ENTRYPOINT ["./docker-entrypoint.sh"]