# Playwright's own image already carries Chromium and every system library it needs.
FROM mcr.microsoft.com/playwright:v1.63.0-noble AS build

WORKDIR /app

COPY package.json package-lock.json ./
# The browser is already in the image; skip the postinstall download.
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
RUN npm ci --no-audit --no-fund --ignore-scripts

COPY tsconfig.json ./
COPY src ./src
RUN npx tsc -p tsconfig.json

FROM mcr.microsoft.com/playwright:v1.63.0-noble AS runtime

WORKDIR /app
ENV NODE_ENV=production
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund --ignore-scripts && npm cache clean --force

COPY --from=build /app/dist ./dist

ENV BROWSER_HEADLESS=true
ENV ACTION_TIMEOUT=30000
ENV NAVIGATION_TIMEOUT=60000
ENV OBSERVATION_TIMEOUT=10000
ENV SESSION_IDLE_TIMEOUT=1800
ENV MAX_SESSIONS=10
ENV MCP_TRANSPORT=http
ENV MCP_PORT=8932

USER pwuser
EXPOSE 8932

# STOPSIGNAL is the default SIGTERM: the server closes every Chromium before exiting.
CMD ["node", "dist/server.js"]
