# Multi-Stage Dockerfile for EcoLoop Building Agent
# Compatible with HuggingFace Spaces, Render, Railway, and Cloud Run

FROM python:3.11-slim as base

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8000

# Set working directory
WORKDIR /app

# Install system dependencies & Node.js 20
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    git \
    build-essential \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copy Python requirements and install
COPY server/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy project source code
COPY . .

# Build React frontend static bundle
RUN cd frontend && npm install && npm run build

# Expose server port
EXPOSE 8000

# Command to run FastAPI server (serves REST API + React Web UI)
CMD ["python", "server/api_server.py"]

