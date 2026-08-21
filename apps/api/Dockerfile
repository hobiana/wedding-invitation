# apps/api/Dockerfile
#
# Base image is node:22-slim (not node:20-slim) because `corepack enable`
# installs the pnpm version pinned by this repo's lockfile (pnpm 11.x,
# lockfileVersion 9.0), which requires Node >= 22.13. Root package.json's
# engines field only requires Node >= 20, so this stays compatible.
FROM node:22-slim AS build
WORKDIR /app
# Prisma's engines need OpenSSL to be present to detect the libssl version;
# node:*-slim images don't include it by default.
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
RUN corepack enable
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api
# apps/web is a workspace member referenced in the lockfile; only its
# package.json is needed so `pnpm install --frozen-lockfile` can resolve
# the full workspace without pulling in the web app's source.
COPY apps/web/package.json ./apps/web/package.json
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @invitation-app/api exec prisma generate
RUN pnpm --filter @invitation-app/api build

FROM node:22-slim AS runtime
WORKDIR /app
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
RUN corepack enable
COPY --from=build /app ./
ENV NODE_ENV=production
EXPOSE 3000
CMD ["sh", "-c", "pnpm --filter @invitation-app/api exec prisma migrate deploy && node apps/api/dist/src/main.js"]
