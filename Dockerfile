# ---- Build stage ----
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy solution and project files first for layer caching
COPY *.sln Directory.Build.props Directory.Packages.props ./
COPY src/BloodTracker.Api/BloodTracker.Api.csproj src/BloodTracker.Api/
COPY src/BloodTracker.Application/BloodTracker.Application.csproj src/BloodTracker.Application/
COPY src/BloodTracker.Domain/BloodTracker.Domain.csproj src/BloodTracker.Domain/
COPY src/BloodTracker.Infrastructure/BloodTracker.Infrastructure.csproj src/BloodTracker.Infrastructure/

RUN dotnet restore -r linux-x64

# Copy everything and publish
COPY . .

# Frontend build: TypeScript → bundled JS via Vite
RUN apt-get update && apt-get install -y --no-install-recommends nodejs npm \
    && rm -rf /var/lib/apt/lists/*
RUN cd src/BloodTracker.Api/wwwroot && npm ci && npm run build

RUN dotnet publish src/BloodTracker.Api/BloodTracker.Api.csproj \
    -c Release \
    -r linux-x64 \
    --no-self-contained \
    -o /app/publish

# ---- Runtime stage ----
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime

# Install native dependencies for OCR and image processing
RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    tesseract-ocr-rus \
    tesseract-ocr-eng \
    libgdiplus \
    libc6-dev \
    libgomp1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Symlink tessdata for Tesseract NuGet package
RUN ln -s /usr/share/tesseract-ocr/5/tessdata /app/tessdata 2>/dev/null || \
    ln -s /usr/share/tesseract-ocr/4/tessdata /app/tessdata 2>/dev/null || true

# Create data directory for LiteDB
RUN mkdir -p /data

# Create non-root user
RUN groupadd -r appuser && useradd -r -g appuser -s /bin/false appuser \
    && chown -R appuser:appuser /data

COPY --from=build /app/publish .

# Ensure appuser owns the app directory
RUN chown -R appuser:appuser /app

ENV ASPNETCORE_URLS=http://+:5000
ENV ASPNETCORE_ENVIRONMENT=Production
ENV Database__ConnectionString="Filename=/data/bloodtracker.db;Connection=shared"

EXPOSE 5000

# Entrypoint: fix /data ownership then drop to appuser
RUN printf '#!/bin/sh\nchown -R appuser:appuser /data 2>/dev/null || true\nexec gosu appuser dotnet BloodTracker.Api.dll\n' > /app/entrypoint.sh \
    && chmod +x /app/entrypoint.sh

# Install gosu for privilege dropping
RUN apt-get update && apt-get install -y --no-install-recommends gosu && rm -rf /var/lib/apt/lists/*

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:5000/healthz || exit 1

ENTRYPOINT ["/app/entrypoint.sh"]
