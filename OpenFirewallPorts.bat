@echo off
:: This script auto-elevates to Administrator to open firewall ports
net session >nul 2>&1
if %errorLevel% == 0 (
    echo Running as Administrator - Opening firewall ports...
    netsh advfirewall firewall delete rule name="TourMate AI Port 8000" >nul 2>&1
    netsh advfirewall firewall delete rule name="TourMate Backend Port 5000" >nul 2>&1
    netsh advfirewall firewall add rule name="TourMate AI Port 8000" dir=in action=allow protocol=TCP localport=8000
    netsh advfirewall firewall add rule name="TourMate Backend Port 5000" dir=in action=allow protocol=TCP localport=5000
    echo.
    echo Done! Ports 8000 and 5000 are now open.
    echo Test from your phone: http://192.168.8.100:8000/health
    pause
) else (
    echo Requesting Administrator privileges...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
)
