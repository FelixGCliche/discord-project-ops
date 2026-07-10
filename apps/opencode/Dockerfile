FROM oven/bun:1-slim AS base

ARG OPENCODE_VERSION=latest

ENV BUN_INSTALL=/usr/local

RUN apt-get update -qq \
    && apt-get install -y --no-install-recommends ca-certificates wget \
    && rm -rf /var/lib/apt/lists/* \
    && bun install -g opencode-ai@${OPENCODE_VERSION}

RUN useradd --create-home --uid 10001 opencode
WORKDIR /home/opencode/app

COPY package.json bun.lock tsconfig.json ./
COPY apps/bot/package.json apps/bot/package.json
COPY apps/opencode/package.json apps/opencode/package.json
COPY packages/core/package.json packages/core/package.json
COPY packages/github/package.json packages/github/package.json
COPY packages/linear/package.json packages/linear/package.json
RUN bun install --frozen-lockfile

COPY . .
RUN chown -R opencode:opencode /home/opencode

USER opencode
WORKDIR /home/opencode/app/apps/opencode

ENV OPENCODE_SERVER_PORT=4096
ENV OPENCODE_SERVER_HOSTNAME=0.0.0.0
EXPOSE 4096

HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=5 \
    CMD ["sh", "-c", "wget -qO- http://127.0.0.1:${OPENCODE_SERVER_PORT}/global/health || exit 1"]

ENTRYPOINT ["bun", "run", "src/entrypoint.ts"]
