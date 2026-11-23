@echo off
set "PATH=%LOCALAPPDATA%\hwa-hackathon\tools\npm;%PATH%"
set "OPENCODE_CONFIG_CONTENT="
set "OPENCODE_CONFIG="
set "OPENCODE_CONFIG_DIR="
set "OPENCODE_DISABLE_AUTOUPDATE=1"
set "OPENCODE_DISABLE_EXTERNAL_SKILLS=1"
set "OPENCODE_DISABLE_CLAUDE_CODE=1"
cd /d "%~dp0"
echo.
echo   ONLY OPEN-SOURCE MODELS ARE ALLOWED: pick one in /models (Qwen, DeepSeek, Kimi, GLM, gpt-oss, Llama, Mistral).
echo   Closed models (Claude, GPT, Gemini, Grok) are against the rules; any provider or your own API key is fine for open-source models.
echo.
start "" /b "C:\Program Files\nodejs\node.EXE" .hwa\hwa-collect.mjs watch - >nul 2>&1
"C:\Program Files\nodejs\node.EXE" .hwa\hwa-collect.mjs pick - --report .hwa\pick.txt
set "S="
if exist .hwa\pick.txt set /p S=<.hwa\pick.txt
if "%S%"=="stop" exit /b 1
if defined S ("%LOCALAPPDATA%\hwa-hackathon\tools\npm\opencode.cmd" -s %S%) else ("%LOCALAPPDATA%\hwa-hackathon\tools\npm\opencode.cmd")
"C:\Program Files\nodejs\node.EXE" -e "if(process.stdout.isTTY)process.stdout.write('\x1b[0m\x1b[?25h\x1b[?1000l\x1b[?1002l\x1b[?1003l\x1b[?1006l\x1b[?2004l')"
"C:\Program Files\nodejs\node.EXE" .hwa\hwa-collect.mjs seal - >nul 2>&1
"C:\Program Files\nodejs\node.EXE" -e "if(process.stdout.isTTY)process.stdout.write('\n\x1b[1m OpenCode has closed. Next, send your entry:\x1b[0m\n  In this terminal, run: \x1b[1;7m py submit.py \x1b[0m\n  Your GitHub repo:  \x1b[1;36mhttps://github.com/ishan0579/67263716-hwa-hackathon\x1b[0m\n  Your live site:    \x1b[1;36mhttps://67263716-hwa-hackathon.vercel.app\x1b[0m\n  Use exactly these, on your hackathon page too.\n')"
