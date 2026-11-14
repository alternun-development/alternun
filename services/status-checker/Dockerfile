# Standalone, no third-party deps — a bare Node runtime is all it needs.
FROM node:22-alpine
WORKDIR /app
COPY checker.mjs page.mjs server.mjs package.json ./
ENV PORT=8787 CHECK_INTERVAL_MS=60000 STATE_DIR=/data
VOLUME /data
EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://localhost:8787/healthz || exit 1
CMD ["node", "server.mjs"]
