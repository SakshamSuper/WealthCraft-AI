@echo off
echo ===================================================
echo               Stockify AI Start Script            
echo ===================================================

:: Check for python virtual environment
if not exist "venv\Scripts\activate.bat" (
    echo Error: Python virtual environment not found at .\venv
    echo Please run 'python -m venv venv' and install requirements first.
    pause
    exit /b
)

echo Activating Python Virtual Environment...
call venv\Scripts\activate

:: Check if database needs seeding
if not exist "backend\stockify.db" (
    echo Database stockify.db not found. Running seed script...
    python database\seed.py
    if %errorlevel% neq 0 (
        echo Error: Seeding failed.
        pause
        exit /b
    )
) else (
    echo Database file stockify.db exists. Skipping seeding.
)

echo.
echo Launching FastAPI development server at http://127.0.0.1:8000
echo Swagger UI docs available at http://127.0.0.1:8000/docs
echo ===================================================
echo Press Ctrl+C to terminate the server.
echo.

uvicorn backend.app.main:app --reload --port 8000
pause
