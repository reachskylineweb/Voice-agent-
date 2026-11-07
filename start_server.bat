@echo off
title Reach Skyline - Outbound AI Voice Agent Server (AI4Bharat VITS-Rasa-13)
cd /d "%~dp0"
echo ====================================================================
echo   Reach Skyline Outbound AI Voice Agent Console
echo   Approved Voice: AI4Bharat VITS-Rasa-13 Conversational (24kHz)
echo   Opening http://localhost:8000 ...
echo ====================================================================
start "" "http://localhost:8000"
python -m uvicorn backend.server:app --host 0.0.0.0 --port 8000
pause
