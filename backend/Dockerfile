# EduSuccessAI — Google Cloud Run Production Dockerfile
# Optimized for Python 3.11, fast startup, and host 0.0.0.0:8080

FROM python:3.11-slim as base

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8080 \
    APP_HOME=/app

WORKDIR $APP_HOME

# Install minimal OS dependencies for compilation and cryptography
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy backend source code
COPY . .

# Create non-privileged user for security
RUN adduser --disabled-password --gecos "" edusuccess && \
    chown -R edusuccess:edusuccess $APP_HOME

USER edusuccess

# Google Cloud Run expects the container to listen on $PORT (default 8080)
EXPOSE 8080

# Run uvicorn server in production mode
CMD exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8080} --workers 2 --timeout-keep-alive 65
