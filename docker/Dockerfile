# syntax=docker/dockerfile:1

ARG PRODUCT=aligner

FROM oven/bun:1.3.14 AS web-build
ARG PRODUCT

WORKDIR /app

COPY package.json bun.lock turbo.json tsconfig.base.json ./
COPY apps ./apps
COPY packages ./packages
COPY assets ./assets
COPY scripts/install-electron.mjs ./scripts/install-electron.mjs

RUN bun install --frozen-lockfile --ignore-scripts

RUN bun x turbo run build --filter=@lisca/${PRODUCT}-web...

FROM rust:1-bookworm AS rust-build
ARG PRODUCT

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends pkg-config libssl-dev \
  && rm -rf /var/lib/apt/lists/*

COPY Cargo.toml Cargo.lock ./
COPY crates ./crates
COPY apps ./apps

RUN cargo build --release -p ${PRODUCT}-server

FROM debian:bookworm-slim AS runtime
ARG PRODUCT

# aligner=8765, annotator=8766, studio=8767
ARG PUBLIC_PORT=8765

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    ca-certificates \
    gettext-base \
    nginx \
  && rm -rf /var/lib/apt/lists/*

COPY docker/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

COPY --from=rust-build /app/target/release/${PRODUCT}-server /usr/local/bin/lisca-server
COPY --from=web-build /app/apps/${PRODUCT}/web/dist /srv/web

ENV PRODUCT=${PRODUCT} \
    PUBLIC_PORT=${PUBLIC_PORT} \
    HOST=0.0.0.0 \
    PORT=3000 \
    HOME=/data

VOLUME ["/data"]
EXPOSE ${PUBLIC_PORT}

ENTRYPOINT ["/entrypoint.sh"]
