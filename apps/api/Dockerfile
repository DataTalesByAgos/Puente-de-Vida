# syntax=docker/dockerfile:1
# Imagen liviana multi-stage. Contexto de build = raíz del repo.

FROM node:20-alpine AS build
WORKDIR /app
COPY apps/api/package.json ./package.json
RUN npm install --no-audit --no-fund
COPY apps/api/tsconfig.json ./tsconfig.json
COPY apps/api/src ./src
RUN npm run build

FROM node:20-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY apps/api/package.json ./package.json
RUN npm install --omit=dev --no-audit --no-fund && npm cache clean --force
COPY --from=build /app/dist ./dist
EXPOSE 4000
CMD ["node", "dist/server.js"]
