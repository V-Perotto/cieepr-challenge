# syntax=docker/dockerfile:1

# O Node 25+ não inclui mais o Corepack: o pnpm é instalado via npm (research R1).
FROM node:26.10-bookworm-slim AS base
RUN npm install -g pnpm@11.21.0
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN pnpm build

FROM base AS prod-deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --prod

# Testes (unitários, HTTP e de integração). Os PDFs de samples/ ficam fora do contexto de build:
#   docker build --target test -t cieepr-backend-test ./backend
#   docker run --rm -v "$PWD/samples:/samples:ro" cieepr-backend-test
FROM deps AS test
COPY . .
CMD ["pnpm", "test"]

FROM node:26.10-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --chown=node:node package.json ./
COPY --chown=node:node --from=prod-deps /app/node_modules ./node_modules
COPY --chown=node:node --from=build /app/dist ./dist
COPY --chown=node:node db/migrations ./db/migrations
USER node
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=5s --start-period=20s --retries=6 \
  CMD node -e "fetch('http://localhost:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/server.js"]
