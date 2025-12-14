@echo off
echo ===================================================
echo      Deploying v8 FINAL to GitHub (and Render) - AUTO
echo ===================================================
echo.
echo 1. Initializing Git...
"C:\Users\Mio\Downloads\PortableGit\cmd\git.exe" init

echo.
echo 2. Configuring Helper Identity...
"C:\Users\Mio\Downloads\PortableGit\cmd\git.exe" config user.email "deploy@drahmi.app"
"C:\Users\Mio\Downloads\PortableGit\cmd\git.exe" config user.name "Drahmi Deployer"

echo.
echo 3. Configuring Remote...
"C:\Users\Mio\Downloads\PortableGit\cmd\git.exe" remote remove origin 2>nul
"C:\Users\Mio\Downloads\PortableGit\cmd\git.exe" remote add origin https://github.com/selmenealex/my-finance

echo.
echo 4. Setting branch to 'main'...
"C:\Users\Mio\Downloads\PortableGit\cmd\git.exe" branch -M main

echo.
echo 5. Adding changes...
"C:\Users\Mio\Downloads\PortableGit\cmd\git.exe" add .
"C:\Users\Mio\Downloads\PortableGit\cmd\git.exe" commit -m "v8.1 Auth Fixes and Cache Update"

echo.
echo 6. Pushing code to https://github.com/selmenealex/my-finance...
"C:\Users\Mio\Downloads\PortableGit\cmd\git.exe" push -u origin main --force

echo.
echo ===================================================
echo      Done! Check your Render dashboard.
echo ===================================================
