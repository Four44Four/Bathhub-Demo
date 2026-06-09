FROM node:24.15.0-alpine AS base
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY ./package*.json ./
RUN npm install

FROM base AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY ./ ./
RUN npm run build \
  && mkdir -p public/cesium \
  && cp -r node_modules/cesium/Build/Cesium/. public/cesium/

FROM base AS run
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs \
  && npm install -g @dotenvx/dotenvx@1.71.0
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=build --chown=nextjs:nodejs /app/public ./public
COPY --chown=nextjs:nodejs .env.production.vault ./
USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
CMD ["dotenvx", "run", "--strict", "-f", ".env.production.vault", "--", "node", "server.js"]