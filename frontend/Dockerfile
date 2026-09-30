# syntax=docker/dockerfile:1

# Build do Angular com o mesmo Node do backend; o Node 25+ não inclui o Corepack (research R1).
FROM node:26.10-bookworm-slim AS deps
RUN npm install -g pnpm@11.21.0
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .

FROM deps AS build
RUN pnpm build

# Testes dos componentes (Vitest + jsdom):
#   docker build --target test -t cieepr-frontend-test ./frontend && docker run --rm cieepr-frontend-test
FROM deps AS test
CMD ["pnpm", "test"]

# Nginx alpine serve o SPA e faz proxy de /api para o backend.
FROM nginx:1.30-alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/frontend/browser /usr/share/nginx/html
EXPOSE 80
