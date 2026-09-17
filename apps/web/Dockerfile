# syntax=docker/dockerfile:1.7

FROM node:22-bookworm-slim AS build

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN corepack enable && corepack prepare pnpm@11.25.0 --activate

WORKDIR /workspace

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY patches ./patches
COPY packages/config/package.json ./packages/config/package.json
COPY packages/shared/package.json ./packages/shared/package.json
COPY apps/web/package.json ./apps/web/package.json

RUN pnpm install --frozen-lockfile --filter . --filter @sei/web...

COPY packages/config ./packages/config
COPY packages/shared ./packages/shared
COPY apps/web ./apps/web

ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN node -e "const value=process.env.VITE_API_BASE_URL;const url=new URL(value);if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||!url.pathname.replace(/\/+$/,'').endsWith('/api/v1'))throw new Error('VITE_API_BASE_URL must be a credential-free HTTPS URL ending in /api/v1')"
RUN pnpm --filter @sei/shared build && pnpm --filter @sei/web build

FROM nginx:1.27-alpine AS runtime

COPY apps/web/nginx.conf /etc/nginx/nginx.conf
COPY --from=build /workspace/apps/web/dist /usr/share/nginx/html

USER nginx

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
