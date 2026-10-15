# ---------- Build the React frontend ----------
FROM node:20-slim AS client-build
WORKDIR /app/client
COPY client/package.json ./
RUN npm install --no-audit --no-fund
COPY client/ ./
# Firebase web config is baked in at build time. Pass each VITE_FIREBASE_*
# var as --build-arg (see README); an empty build still serves browse-only,
# with the auth UI reporting "not configured".
ARG VITE_FIREBASE_API_KEY=""
ARG VITE_FIREBASE_AUTH_DOMAIN=""
ARG VITE_FIREBASE_PROJECT_ID=""
ARG VITE_FIREBASE_STORAGE_BUCKET=""
ARG VITE_FIREBASE_MESSAGING_SENDER_ID=""
ARG VITE_FIREBASE_APP_ID=""
ARG VITE_USE_FIREBASE_EMULATORS=""
ENV VITE_FIREBASE_API_KEY=$VITE_FIREBASE_API_KEY \
    VITE_FIREBASE_AUTH_DOMAIN=$VITE_FIREBASE_AUTH_DOMAIN \
    VITE_FIREBASE_PROJECT_ID=$VITE_FIREBASE_PROJECT_ID \
    VITE_FIREBASE_STORAGE_BUCKET=$VITE_FIREBASE_STORAGE_BUCKET \
    VITE_FIREBASE_MESSAGING_SENDER_ID=$VITE_FIREBASE_MESSAGING_SENDER_ID \
    VITE_FIREBASE_APP_ID=$VITE_FIREBASE_APP_ID \
    VITE_USE_FIREBASE_EMULATORS=$VITE_USE_FIREBASE_EMULATORS
RUN npm run build

# ---------- Runtime: Express + Firebase ----------
FROM node:20-slim
ENV NODE_ENV=production
WORKDIR /app

COPY server/package.json ./server/
RUN cd server && npm install --omit=dev --no-audit --no-fund

COPY server/ ./server/
COPY --from=client-build /app/client/dist ./client/dist

EXPOSE 4000
ENV PORT=4000
CMD ["node", "server/src/index.js"]
