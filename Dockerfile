# ============================================================
# Stage 1: BASE — Install dependencies
# ============================================================
# WHY multi-stage? Each stage discards unnecessary files.
# The final image only contains what's needed to RUN the app,
# not build tools, source code, or dev dependencies.
# This makes the image smaller (faster pulls) and more secure.

FROM node:20-alpine AS base

# WHY alpine? It's a minimal Linux distro (~5MB vs ~900MB for full Ubuntu).
# Smaller image = faster CI builds, faster pulls on EC2, less storage.

# Install pnpm globally
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

WORKDIR /app

# ============================================================
# Stage 2: DEPENDENCIES — Install all node_modules
# ============================================================
FROM base AS dependencies

# Copy dependency manifests first (before source code)
# WHY? Docker caches layers. If package.json hasn't changed,
# Docker reuses the cached node_modules layer — saves minutes on rebuilds.
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/db/package.json ./packages/db/
COPY packages/types/package.json ./packages/types/

# Install ALL dependencies (including devDependencies for building)
RUN pnpm install --frozen-lockfile

# ============================================================
# Stage 3: BUILD — Compile TypeScript
# ============================================================
FROM dependencies AS build

# Now copy the actual source code
COPY tsconfig.base.json ./
COPY packages/types/ ./packages/types/
COPY packages/db/ ./packages/db/
COPY apps/api/ ./apps/api/

# Build workspace packages first (API depends on them)
# WHY this order? Turborepo's ^build handles this locally,
# but in Docker we do it explicitly for clarity.
RUN pnpm --filter @shasansetu/types run build
RUN pnpm --filter @shasansetu/db run build
RUN pnpm --filter @shasansetu/api run build

# ============================================================
# Stage 4: PRODUCTION — Minimal runtime image
# ============================================================
FROM base AS production

# WHY a separate stage? The build stage has TypeScript, dev tools,
# source code — none of that is needed to RUN the compiled JS.
# This stage starts fresh and copies only the compiled output.

WORKDIR /app

# Copy dependency manifests and install ONLY production dependencies
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/db/package.json ./packages/db/
COPY packages/types/package.json ./packages/types/

RUN pnpm install --frozen-lockfile --prod

# Copy compiled JavaScript output from the build stage
COPY --from=build /app/packages/types/dist ./packages/types/dist
COPY --from=build /app/packages/db/dist ./packages/db/dist
COPY --from=build /app/apps/api/dist ./apps/api/dist

# Copy drizzle config/migrations if needed at runtime
COPY --from=build /app/packages/db/drizzle ./packages/db/drizzle
COPY --from=build /app/packages/db/drizzle.config.js ./packages/db/drizzle.config.js

# Set environment
ENV NODE_ENV=production

# Expose the API port (documentation — doesn't actually publish the port)
EXPOSE 3001

# Start the API
# WHY not npm start? We run the compiled JS directly.
# The dist/index.js is the output of tsc from apps/api/src/index.ts
CMD ["node", "apps/api/dist/index.js"]
