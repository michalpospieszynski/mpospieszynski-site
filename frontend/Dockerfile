# Web image (docs/IMPLEMENTATION-PLAN.md, I2): Angular SSR on Node, non-root, no secrets.
# jsdom is external to the server bundle (isomorphic-dompurify), so the runtime keeps production node_modules.
# Every setting comes from the environment at runtime (infra/docker-compose.yml, infra/.env.example).
#   docker build -t site-web frontend
# The generated API client (src/app/api) is committed, so the build needs no running API.

FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY . .
RUN npm run build

FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production \
    PORT=4000 \
    NODE_OPTIONS=--max-old-space-size=384
COPY --from=deps /app/node_modules node_modules
COPY --from=build /app/dist/frontend dist/frontend
# The image's built-in non-root user; files stay root-owned and read-only for it.
USER node
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:4000/healthz > /dev/null || exit 1
CMD ["node", "dist/frontend/server/server.mjs"]
