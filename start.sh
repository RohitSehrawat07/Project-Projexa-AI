#!/bin/bash

# =============================================
#  EduRank — start.sh
#  Starts Flask backend server on Linux/macOS
# =============================================

echo "Starting EduRank Flask Server..."
echo ""

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "ERROR: Python 3 is not installed"
    echo "Please install Python 3 and try again"
    exit 1
fi

# Check if pip is available
if ! command -v pip3 &> /dev/null; then
    echo "ERROR: pip3 is not available"
    echo "Please check your Python 3 installation"
    exit 1
fi

# Install requirements if not already installed
echo "[1/3] Checking dependencies..."
pip3 install -q -r requirements.txt

if [ $? -ne 0 ]; then
    echo "ERROR: Failed to install dependencies"
    echo "Please run: pip3 install -r requirements.txt"
    exit 1
fi

echo "[2/3] Dependencies installed successfully"
echo ""

# Start Flask server
echo "[3/3] Starting Flask server..."
echo ""
echo "============================================="
echo "  EDURANK FLASK SERVER"
echo "============================================="
echo "  Server: http://localhost:5000"
echo "  API:    http://localhost:5000/api"
echo ""
echo "  Press CTRL+C to stop the server"
echo "============================================="
echo ""

python3 app.py
