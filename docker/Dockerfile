# syntax=docker/dockerfile:1

ARG PRODUCT=aligner

# --- Web: install layer + cached vp/vite build ---
FROM oven/bun:1.3.14 AS web-build
ARG PRODUCT

WORKDIR /app

# Install deps with a cached bun install layer. Lockfile is copied first so the
# expensive install only re-runs when dependencies change.
COPY package.json bun.lock bunfig.toml vite.config.ts tsconfig.base.json ./
COPY packages ./packages
COPY apps ./apps
COPY scripts ./scripts
COPY assets ./assets
COPY docs ./docs
RUN --mount=type=cache,target=/root/.bun/install/cache,id=lisca-bun-cache \
    bun install --frozen-lockfile --ignore-scripts

# Build the product web app and its workspace dependencies.
# vp run --filter <pkg>... resolves the transitive dependency graph from package.json.
RUN --mount=type=cache,target=/app/node_modules/.cache,id=lisca-node-cache,sharing=locked \
    vp run --no-cache --filter @lisca/${PRODUCT}-web... build

# --- Rust: cargo-chef dep layer + cached target ---
# Trixie (glibc ≥ 2.38) is required: ort prebuilt ONNX Runtime references __isoc23_* symbols.
FROM rust:1-trixie AS chef
RUN cargo install cargo-chef --locked
WORKDIR /app

FROM chef AS rust-planner
COPY Cargo.toml Cargo.lock ./
COPY crates ./crates
COPY apps ./apps
RUN cargo chef prepare --recipe-path recipe.json

FROM chef AS rust-build
ARG PRODUCT

RUN apt-get update \
  && apt-get install -y --no-install-recommends pkg-config libssl-dev \
  && rm -rf /var/lib/apt/lists/*

COPY --from=rust-planner /app/recipe.json recipe.json
RUN --mount=type=cache,target=/usr/local/cargo/registry,id=lisca-cargo-registry \
    --mount=type=cache,target=/usr/local/cargo/git,id=lisca-cargo-git \
    --mount=type=cache,target=/app/target,id=lisca-cargo-target,sharing=locked \
    cargo chef cook --release --recipe-path recipe.json

COPY Cargo.toml Cargo.lock ./
COPY crates ./crates
COPY apps ./apps
RUN --mount=type=cache,target=/usr/local/cargo/registry,id=lisca-cargo-registry \
    --mount=type=cache,target=/usr/local/cargo/git,id=lisca-cargo-git \
    --mount=type=cache,target=/app/target,id=lisca-cargo-target,sharing=locked \
    cargo build --release -p ${PRODUCT}-server \
 && cp /app/target/release/${PRODUCT}-server /app/lisca-server

FROM debian:trixie-slim AS runtime
ARG PRODUCT

# aligner=8765, annotator=8766, studio=8767
ARG PUBLIC_PORT=8765

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    ca-certificates \
    gettext-base \
    nginx \
  && if [ "$PRODUCT" = "studio" ]; then \
    apt-get install -y --no-install-recommends libfontconfig1; \
  fi \
  && rm -rf /var/lib/apt/lists/*

COPY docker/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

COPY --from=rust-build /app/lisca-server /usr/local/bin/lisca-server
COPY --from=web-build /app/apps/${PRODUCT}/web/dist /srv/web

ENV PRODUCT=${PRODUCT} \
    PUBLIC_PORT=${PUBLIC_PORT} \
    PORT=3000

VOLUME ["/root/workspace", "/root/source"]
EXPOSE ${PUBLIC_PORT}

ENTRYPOINT ["/entrypoint.sh"]
