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
COPY apps/api/package.json ./apps/api/package.json

RUN pnpm install --frozen-lockfile --filter . --filter @sei/api...

COPY packages/config ./packages/config
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api

RUN pnpm --filter @sei/api build
RUN pnpm --filter @sei/api deploy --prod --legacy /opt/sei-api

FROM node:22-bookworm-slim AS runtime

ENV APP_ENV=production
ENV NODE_ENV=production
ENV PORT=3000

RUN groupadd --system --gid 1001 sei \
  && useradd --system --uid 1001 --gid sei --home-dir /app --shell /usr/sbin/nologin sei

WORKDIR /app

COPY --from=build --chown=sei:sei /opt/sei-api ./
COPY --from=build --chown=sei:sei /workspace/apps/api/src/drizzle/migrations ./dist/drizzle/migrations

USER sei

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/v1/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

CMD ["node", "dist/main.js"]
