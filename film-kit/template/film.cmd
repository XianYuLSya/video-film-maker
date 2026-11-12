@echo off
rem film-kit entry: run film.py with the film-kit venv python.
rem Keep this file ASCII-only: cmd.exe reads .cmd in the OEM codepage,
rem Chinese characters here would break parsing (classic mojibake bug).
rem Usage: .\film.cmd <subcommand>     e.g.  .\film.cmd all zh
setlocal
chcp 65001 >nul
set "PYTHONIOENCODING=utf-8"
set "PYTHONUTF8=1"
set "PY=%FILM_PYTHON%"
if not defined PY set "PY=%~dp0..\.venv\Scripts\python.exe"
if not exist "%PY%" (
  echo [film-kit] python not found: %PY%
  echo [film-kit] set env FILM_PYTHON, or rebuild film-kit\.venv per requirements.txt
  exit /b 1
)
"%PY%" "%~dp0film.py" %*
exit /b %ERRORLEVEL%
