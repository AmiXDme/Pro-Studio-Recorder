@echo off
echo Starting Audio Recorder App...
echo.

REM Check if virtual environment exists
if not exist "venv\Scripts\activate.bat" (
    echo Virtual environment not found. Creating one...
    python -m venv venv
    echo Virtual environment created successfully!
    echo.
)

REM Activate virtual environment
echo Activating virtual environment...
call venv\Scripts\activate.bat

REM Install required packages if not already installed
echo Installing required packages...
pip install flask pyOpenSSL psutil pydub

REM Run the application
echo.
echo Starting the application...
echo The app will be available at: https://localhost:5000
echo Admin panel: https://localhost:5000/admin (PC ONLY - for security)
echo Network access: https://YOUR_IP_ADDRESS:5000 (recording interface only)
echo Press Ctrl+C to stop the application
echo.
python app.py

pause
