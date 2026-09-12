FROM node:22-alpine AS dependencies

WORKDIR /application
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

FROM node:22-alpine AS build

WORKDIR /application
ENV NEXT_TELEMETRY_DISABLED=1 \
    NEXT_OUTPUT=standalone
COPY --from=dependencies /application/node_modules ./node_modules
COPY . .
RUN npm run test && npm run build

FROM node:22-alpine AS runtime

RUN addgroup --system --gid 1001 afinco \
    && adduser --system --uid 1001 --ingroup afinco afinco

WORKDIR /application
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000 \
    API_PROXY_TARGET=http://host.docker.internal:8080/api/v1

COPY --from=build --chown=afinco:afinco /application/.next/standalone ./
COPY --from=build --chown=afinco:afinco /application/.next/static ./.next/static

USER afinco
EXPOSE 3000

CMD ["node", "server.js"]
