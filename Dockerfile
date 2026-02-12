# ── Stage 1: Node.js — frontend build ─────────────────────────────────────────
FROM node:20-slim AS frontend
WORKDIR /app/wwwroot
COPY src/BloodTracker.Api/wwwroot/package*.json ./
RUN npm ci --ignore-scripts
COPY src/BloodTracker.Api/wwwroot/ ./
RUN npm run build

# ── Stage 2: .NET SDK — restore + publish ────────────────────────────────────
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy project files first for NuGet restore layer caching
COPY *.sln Directory.Build.props Directory.Packages.props ./
COPY src/BloodTracker.Api/BloodTracker.Api.csproj src/BloodTracker.Api/
COPY src/BloodTracker.Application/BloodTracker.Application.csproj src/BloodTracker.Application/
COPY src/BloodTracker.Domain/BloodTracker.Domain.csproj src/BloodTracker.Domain/
COPY src/BloodTracker.Infrastructure/BloodTracker.Infrastructure.csproj src/BloodTracker.Infrastructure/

RUN dotnet restore src/BloodTracker.Api/BloodTracker.Api.csproj -r linux-x64

# Copy source and built frontend
COPY . .
COPY --from=frontend /app/wwwroot/dist/ src/BloodTracker.Api/wwwroot/dist/

RUN dotnet publish src/BloodTracker.Api/BloodTracker.Api.csproj \
    -c Release \
    -r linux-x64 \
    --no-self-contained \
    -o /app/publish

# ── Stage 3: Runtime ─────────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/aspnet:8.0-jammy AS runtime

# Native dependencies (OCR + image processing) in a single layer
RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr tesseract-ocr-rus tesseract-ocr-eng \
    libgdiplus libc6-dev libgomp1 \
    curl gosu \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Tessdata symlink for Tesseract NuGet
RUN ln -s /usr/share/tesseract-ocr/5/tessdata /app/tessdata 2>/dev/null || \
    ln -s /usr/share/tesseract-ocr/4/tessdata /app/tessdata 2>/dev/null || true

# Data directory for LiteDB + non-root user
RUN mkdir -p /data \
    && groupadd -r appuser && useradd -r -g appuser -s /bin/false appuser \
    && chown -R appuser:appuser /data

COPY --from=build /app/publish .
RUN chown -R appuser:appuser /app

ENV ASPNETCORE_URLS=http://+:5000
ENV ASPNETCORE_ENVIRONMENT=Production
ENV Database__ConnectionString="Filename=/data/bloodtracker.db;Connection=shared"

EXPOSE 5000

# Entrypoint: fix /data ownership then drop to appuser
RUN printf '#!/bin/sh\nchown -R appuser:appuser /data 2>/dev/null || true\nexec gosu appuser dotnet BloodTracker.Api.dll\n' > /app/entrypoint.sh \
    && chmod +x /app/entrypoint.sh

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:5000/healthz || exit 1

ENTRYPOINT ["/app/entrypoint.sh"]
