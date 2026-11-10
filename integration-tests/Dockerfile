# Alpine >=3.24.4 includes the OpenSSH mitigation for musl crypt()
# (CVE-2026-123158 / *sshole). Pin alpine3.24 and apk upgrade so rebuilds
# pick up current security patches.
FROM node:24.22.2-alpine3.24

ENV SUPABASE_URL=http://127.0.0.1:54323

RUN apk upgrade --no-cache \
  && apk add --no-cache libc6-compat bash docker iptables postgresql-client util-linux \
  && npm install -g supabase@2.109.0

WORKDIR /workspace

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

RUN chmod +x ./integration-tests/*.sh

ENTRYPOINT ["./integration-tests/entrypoint.sh"]
