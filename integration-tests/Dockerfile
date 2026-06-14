FROM node:24.15.0-alpine

ENV SUPABASE_URL=http://127.0.0.1:54323

RUN apk add --no-cache libc6-compat bash docker iptables util-linux \
  && npm install -g supabase@2.105.0

WORKDIR /workspace

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

RUN chmod +x ./integration-tests/*.sh

ENTRYPOINT ["./integration-tests/entrypoint.sh"]
