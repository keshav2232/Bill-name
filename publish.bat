@echo off
echo ==========================================
echo   Publishing Updates to Live Website...
echo ==========================================
echo.

:: Check if git is initialized
IF NOT EXIST ".git" (
    echo [Error] Git is not initialized.
    pause
    exit /b
)

:: Ensure the remote repository is configured
git remote remove origin 2>nul
git remote add origin https://github.com/keshav2232/Bill-name.git

:: Add all changed files
echo [1/3] Gathering modified files...
git add .

:: Commit the changes with the current date and time
echo [2/3] Saving changes...
for /f "tokens=2-4 delims=/ " %%a in ('date /t') do (set mydate=%%c-%%a-%%b)
for /f "tokens=1-2 delims=/:" %%a in ('time /t') do (set mytime=%%a:%%b)
git commit -m "Auto-update: %mydate% %mytime%"

:: Push the changes to GitHub
echo [3/3] Uploading to live website (GitHub)...
git push -u origin main

echo.
echo ==========================================
echo   Success! Your live website will update 
echo   automatically in the next 30-60 seconds.
echo ==========================================
pause
