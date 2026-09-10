# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# dft-admin
#
# The admin console: a Vite/React SPA compiled to static files and served by
# nginx. Nothing executes on the server — the panel talks straight to the API
# from the operator's browser.
#
# Build:
#   docker build -t dft-admin --build-arg VITE_API_URL=https://api.dft.market .
#   docker run -p 8080:8080 -e API_ORIGIN=https://api.dft.market dft-admin
# ---------------------------------------------------------------------------


# ---------------------------------------------------------------------------
# Dependencies, in their own stage.
#
# Only package.json and package-lock.json land here, so editing application
# source does not invalidate the install layer.
# ---------------------------------------------------------------------------
FROM node:22-bookworm-slim AS deps

ENV NPM_CONFIG_UPDATE_NOTIFIER=false \
    NPM_CONFIG_FUND=false

WORKDIR /app

COPY package.json package-lock.json ./
# devDependencies are the build: vite, typescript and tailwind all live there.
RUN --mount=type=cache,target=/root/.npm \
    npm ci --include=dev


# ---------------------------------------------------------------------------
# The build.
#
# VITE_API_URL is a build argument, not a runtime variable, because Vite inlines
# import.meta.env into the JavaScript it emits. An image built against staging
# cannot be repointed at production by setting an environment variable — it has
# to be rebuilt. That is a property of every Vite app; naming it here is the
# difference between knowing it and discovering it during an incident.
#
# It is also why this value must never be a secret: whatever is passed here is
# readable in the served bundle by anyone who can open the panel.
# ---------------------------------------------------------------------------
FROM deps AS build

ARG VITE_API_URL
# Public Turnstile site key for the "I'm a human" check on log in. Leave unset
# only if the API does not list this panel's origin in TURNSTILE_ORIGINS.
ARG VITE_TURNSTILE_SITE_KEY
ENV VITE_API_URL=${VITE_API_URL} \
    VITE_TURNSTILE_SITE_KEY=${VITE_TURNSTILE_SITE_KEY}

COPY . .

# `npm run build` runs `tsc -b` first, so a type error fails the image build
# rather than shipping a bundle that only breaks in a browser.
RUN test -n "$VITE_API_URL" || (echo "ERROR: --build-arg VITE_API_URL is required" && exit 1) \
    && npm run build


# ---------------------------------------------------------------------------
# The serving image. Last stage, so a plain `docker build` produces this one.
# ---------------------------------------------------------------------------
FROM nginxinc/nginx-unprivileged:1.27-alpine AS app

# The unprivileged image already runs as uid 101 and listens on 8080, so no
# capability is needed to bind the port and a container escape lands on a user
# that owns nothing.
USER 101

# Only API_ORIGIN is substituted. Left unfiltered, envsubst would also try to
# expand nginx's own $uri and $dft_cache_control and blank them out.
ENV NGINX_ENVSUBST_FILTER=API_ORIGIN
ENV API_ORIGIN=""

# Templates in this directory are rendered into /etc/nginx/conf.d at start-up
# by the image's own entrypoint scripts.
COPY docker/default.conf.template /etc/nginx/templates/default.conf.template

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080

# Static files, so liveness is only ever "is nginx answering". wget is in the
# alpine base already; curl is not.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1
