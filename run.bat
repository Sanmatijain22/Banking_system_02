@echo off
setlocal
cd /d "%~dp0"

if not exist "lib\json-20231013.jar" (
    echo Downloading org.json dependency...
    mkdir lib 2>nul
    powershell -Command "Invoke-WebRequest -Uri 'https://repo1.maven.org/maven2/org/json/json/20231013/json-20231013.jar' -OutFile 'lib\json-20231013.jar'"
)

if not exist "target\classes\com\banking\Main.class" (
    echo Compiling backend...
    mkdir target\classes 2>nul
    dir /s /b src\main\java\*.java > sources.txt
    javac --release 17 -cp lib\json-20231013.jar -d target\classes @sources.txt
    del sources.txt
)

if exist "frontend\package.json" (
    if not exist "frontend\node_modules" (
        echo Installing frontend dependencies...
        cd frontend
        call npm install
        cd ..
    )
    if not exist "frontend\dist\index.html" (
        echo Building React frontend...
        cd frontend
        call npm run build
        cd ..
    )
)

echo Starting VaultAI Bank on http://localhost:8080
java -cp "target\classes;lib\json-20231013.jar" com.banking.Main
