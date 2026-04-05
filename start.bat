@echo off
REM =============================================
REM  EduRank — start.bat
REM  Starts Flask backend server on Windows
REM =============================================

echo Starting EduRank Flask Server...
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    color 0C
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python and add it to your system PATH
    pause
    exit /b 1
)

REM Check if pip is available
pip --version >nul 2>&1
if errorlevel 1 (
    color 0C
    echo ERROR: pip is not available
    echo Please check your Python installation
    pause
    exit /b 1
)

REM Install requirements if not already installed
echo [1/3] Checking dependencies...
pip install -q -r requirements.txt

if errorlevel 1 (
    color 0C
    echo ERROR: Failed to install dependencies
    echo Please run: pip install -r requirements.txt
    pause
    exit /b 1
)

echo [2/3] Dependencies installed successfully
echo.

REM Start Flask server
echo [3/3] Starting Flask server...
echo.
color 0A
echo =============================================
echo  EDURANK FLASK SERVER
echo =============================================
echo  Server: http://localhost:5000
echo  API:    http://localhost:5000/api
echo.
echo  Press CTRL+C to stop the server
echo =============================================
echo.

python app.py

pause
