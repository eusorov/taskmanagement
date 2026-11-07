# syntax=docker/dockerfile:1

# Build: static files in dist/
FROM node:24.22.2-alpine3.24 AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-fund --no-audit
COPY . .
RUN npm run build

# Serve: nginx without root, listening on 8080
FROM nginxinc/nginx-unprivileged:1.30.6-alpine3.24
# The image's entrypoint renders templates/*.template into conf.d at start. Only these variables are substituted,
# so nginx's own $variables stay untouched
ENV NGINX_ENTRYPOINT_LOCAL_RESOLVERS=1 \
    NGINX_ENVSUBST_FILTER="^(NGINX_LOCAL_RESOLVERS|BACKEND_HOST)$" \
    BACKEND_HOST=backend
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
