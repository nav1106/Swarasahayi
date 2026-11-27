# Build the app, then serve the static files with nginx on port 3000.
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Optional, build-time only. The app starts fine without them.
ARG VITE_TRANSLATE_API_URL=""
ARG VITE_TRANSLATE_API_KEY=""
ENV VITE_TRANSLATE_API_URL=$VITE_TRANSLATE_API_URL
ENV VITE_TRANSLATE_API_KEY=$VITE_TRANSLATE_API_KEY
RUN npm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 3000
