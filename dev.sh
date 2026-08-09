#!/usr/bin/env bash
# ==============================================================================
# Antigravity DocQ&A — Local Development Launcher
# Starts both the FastAPI backend (port 8001) and Next.js frontend (port 3001)
# ==============================================================================

set -e

# Terminal formatting
BOLD="\033[1m"
GREEN="\033[1;32m"
CYAN="\033[1;36m"
PURPLE="\033[1;35m"
YELLOW="\033[1;33m"
RESET="\033[0m"

# Get absolute path to the root folder
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo -e "${BOLD}${CYAN}====================================================${RESET}"
echo -e "${BOLD}${CYAN} 🚀 Starting DocQ&A Full-Stack Platform ${RESET}"
echo -e "${BOLD}${CYAN}====================================================${RESET}"

# Function to cleanly shut down both servers on Ctrl+C or script termination
cleanup() {
  echo -e "\n${BOLD}${YELLOW}[System] Shutting down development servers...${RESET}"
  if [ -n "$BACKEND_PID" ]; then
    kill -TERM "$BACKEND_PID" 2>/dev/null || true
  fi
  if [ -n "$FRONTEND_PID" ]; then
    kill -TERM "$FRONTEND_PID" 2>/dev/null || true
  fi
  # Wait briefly for graceful shutdown
  wait "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
  echo -e "${BOLD}${GREEN}[System] Clean shutdown complete. Goodbye! 👋${RESET}"
  exit 0
}

# Register the cleanup trap for SIGINT (Ctrl+C) and SIGTERM
trap cleanup SIGINT SIGTERM

# Check if PostgreSQL / environment variables are ready in backend
if [ ! -f "${ROOT_DIR}/doc-qa-api/.env" ]; then
  echo -e "${YELLOW}[Warning] No .env file found in doc-qa-api. Using default environment configuration.${RESET}"
fi

# 1. Start FastAPI Backend in background
echo -e "${BOLD}${CYAN}[Backend]${RESET} Launching FastAPI + Uvicorn server on ${BOLD}http://localhost:8001${RESET} ..."
cd "${ROOT_DIR}/doc-qa-api"
uv sync --quiet 2>/dev/null || true
uv run python -m uvicorn app.main:app --reload --port 8001 --host 0.0.0.0 &
BACKEND_PID=$!

# Give backend 2 seconds to initialize before launching frontend
sleep 2

# 2. Start Next.js Frontend in background
echo -e "${BOLD}${PURPLE}[Frontend]${RESET} Launching Next.js 16 App Router on ${BOLD}http://localhost:3001${RESET} ..."
cd "${ROOT_DIR}/doc-qa-frontend"
npm run dev &
FRONTEND_PID=$!

echo -e "\n${BOLD}${GREEN}✔ All services are running!${RESET}"
echo -e "  🌐 Frontend Web App : ${BOLD}http://localhost:3001${RESET}"
echo -e "  ⚡ Backend API Docs : ${BOLD}http://localhost:8001/docs${RESET}"
echo -e "\n${YELLOW}Press Ctrl+C to terminate both servers simultaneously.${RESET}\n"

# Wait indefinitely for background jobs so that the trap handles termination
wait "$BACKEND_PID" "$FRONTEND_PID"
