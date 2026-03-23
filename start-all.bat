@echo off
echo === Levantando stack Aluri ===

echo [1/5] Frontend (puerto 3000)
start "Aluri Frontend" cmd /k "cd /d C:\Users\pacec\Documents\GitHub\AluriWebPage && npm run dev"

echo [2/5] Titulos (puerto 8000)
start "Aluri Titulos" cmd /k "cd /d C:\Users\pacec\GoogleAntigravity\agentes-aluri\aluri-agent-titulos && venv\Scripts\python -m uvicorn app.main:app --port 8000 --host 0.0.0.0"

echo [3/5] KYC (puerto 8001)
start "Aluri KYC" cmd /k "cd /d C:\Users\pacec\GoogleAntigravity\agentes-aluri\aluri-agent-KYC && venv\Scripts\python -m uvicorn app.main:app --port 8001 --host 0.0.0.0"

echo [4/5] Credit Score (puerto 8002)
start "Aluri Credit" cmd /k "cd /d C:\Users\pacec\GoogleAntigravity\agentes-aluri\aluri-agent-credit-score && venv\Scripts\python -m uvicorn app.main:app --port 8002 --host 0.0.0.0"

echo [5/5] Orchestrator (puerto 3001)
start "Aluri Orchestrator" cmd /k "cd /d C:\Users\pacec\GoogleAntigravity\agentes-aluri\aluri-agent-ficha-orchestrator && node --env-file=.env dist/server.js"

echo.
echo === Todo levantado ===
echo Frontend:     http://localhost:3000
echo Titulos:      http://localhost:8000
echo KYC:          http://localhost:8001
echo Credit Score: http://localhost:8002
echo Orchestrator: http://localhost:3001
echo.
pause
