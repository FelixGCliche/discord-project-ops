FROM oven/bun:1-slim AS base

ARG OPENCODE_VERSION=latest

RUN apt-get update -qq \
    && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && bun install -g opencode-ai@${OPENCODE_VERSION}

RUN useradd --create-home --uid 10001 opencode
WORKDIR /home/opencode/app

# Workspace manifests only, so this layer -- and the install below -- is
# cached across builds that don't touch a package.json. `bun install
# --frozen-lockfile` needs every workspace member's package.json present
# (verified: a partial copy makes bun report "lockfile had changes" and
# fail), so all five have to come along even though this image only runs
# apps/opencode.
COPY package.json bun.lock tsconfig.json ./
COPY apps/bot/package.json apps/bot/package.json
COPY apps/opencode/package.json apps/opencode/package.json
COPY packages/core/package.json packages/core/package.json
COPY packages/github/package.json packages/github/package.json
COPY packages/linear/package.json packages/linear/package.json
RUN bun install --frozen-lockfile

# Full monorepo context (see the root .dockerignore for exclusions) for
# everything the manifest-only layer above didn't bring in.
COPY . .
RUN chown -R opencode:opencode /home/opencode

USER opencode
WORKDIR /home/opencode/app/apps/opencode

# opencode's own default; overridden by $PORT if the platform sets one
# (Cloud Run does this later -- not needed for local docker-compose).
ENV OPENCODE_SERVER_PORT=4096
# Bind all interfaces, not just loopback -- createOpencodeServer()'s own
# default (127.0.0.1) would be unreachable from outside the container.
ENV OPENCODE_SERVER_HOSTNAME=0.0.0.0
EXPOSE 4096

# VERIFY: confirm `opencode serve` exposes GET /global/health (used by
# the compose healthcheck) on your pinned version -- seen in current
# docs/examples but worth a quick curl before trusting it in CI.
HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=5 \
    CMD ["sh", "-c", "wget -qO- http://127.0.0.1:${OPENCODE_SERVER_PORT}/global/health || exit 1"]

# entrypoint.ts calls createOpencodeServer() from @opencode-ai/sdk directly --
# no shell entrypoint script. It still spawns the `opencode` binary installed
# above, but the config (including the three pipeline agents built from
# core/src/prompts.ts) is assembled in TypeScript and handed through in
# memory instead of via a generated config file.
ENTRYPOINT ["bun", "run", "entrypoint.ts"]
