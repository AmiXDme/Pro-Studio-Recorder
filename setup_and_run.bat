@echo off
echo ========================================
echo Audio Recorder App - High Quality Setup
echo ========================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python is not installed or not in PATH
    echo Please install Python 3.8+ from https://python.org
    pause
    exit /b 1
)

echo ✅ Python found
python --version

REM Check if virtual environment exists
if not exist "venv" (
    echo.
    echo 🔧 Creating virtual environment...
    python -m venv venv
    if errorlevel 1 (
        echo ❌ Failed to create virtual environment
        pause
        exit /b 1
    )
    echo ✅ Virtual environment created
) else (
    echo ✅ Virtual environment already exists
)

REM Activate virtual environment
echo.
echo 🔄 Activating virtual environment...
call venv\Scripts\activate.bat
if errorlevel 1 (
    echo ❌ Failed to activate virtual environment
    pause
    exit /b 1
)

REM Upgrade pip
echo.
echo 📦 Upgrading pip...
python -m pip install --upgrade pip

REM Install dependencies
echo.
echo 📦 Installing dependencies...
pip install -r requirements.txt
if errorlevel 1 (
    echo ❌ Failed to install dependencies
    echo.
    echo 🔧 Trying alternative installation...
    pip install Flask pydub psutil
    if errorlevel 1 (
        echo ❌ Failed to install dependencies
        pause
        exit /b 1
    )
)

echo ✅ Dependencies installed

REM Check if recordings directory exists
if not exist "recordings" (
    echo.
    echo 📁 Creating recordings directory...
    mkdir recordings
    echo ✅ Recordings directory created
) else (
    echo ✅ Recordings directory exists
)

echo.
echo 🎤 Audio Recorder App Setup Complete!
echo.
echo 📋 Quality Settings Available:
echo    • High Quality: 48kHz, 24-bit, Stereo
echo    • Medium Quality: 44.1kHz, 16-bit, Stereo  
echo    • Low Quality: 22.05kHz, 16-bit, Mono
echo.
echo 🚀 Starting the app...
echo.

REM Run the Flask app
python app.py

pause

