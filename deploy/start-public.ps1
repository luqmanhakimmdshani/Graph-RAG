# Serve the public (Vercel) site from this PC: a read-only copy of the backend
# on port 8001, exposed through the ngrok tunnel. Your normal backend on 8000
# (full access, for local use) is separate and unaffected.
#
# Needs OmniRoute running (the backend calls it on localhost - it is never
# exposed). Run from anywhere:  powershell -File D:\RAG\deploy\start-public.ps1
# Close the two windows it opens to take the public site offline.

$backend = Join-Path $PSScriptRoot "..\backend" | Resolve-Path

Start-Process powershell -WorkingDirectory $backend -ArgumentList @(
    "-NoExit", "-Command",
    "`$Host.UI.RawUI.WindowTitle = 'Graph RAG public API (read-only, :8001)'; `$env:READ_ONLY = 'true'; .\.venv\Scripts\python -m uvicorn app.main:app --port 8001"
)

Start-Process powershell -ArgumentList @(
    "-NoExit", "-Command",
    "`$Host.UI.RawUI.WindowTitle = 'ngrok: graph-rag-api'; ngrok start graph-rag-api"
)

Write-Host "Started the read-only API on :8001 and the ngrok tunnel in two new windows."
