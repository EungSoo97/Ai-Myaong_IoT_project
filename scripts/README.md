# Run Scripts

- `start-backend.bat`
- `start-frontend.bat`
- `start-raspberrypi.bat`
- `setup-python-venv.bat`
- `start-backend.sh`
- `start-frontend.sh`
- `start-raspberrypi.sh`
- `setup-dev-env.sh`

Run from the repo root in `cmd` or by double-clicking:

```cmd
scripts\start-backend.bat
scripts\start-frontend.bat
scripts\start-raspberrypi.bat
setup-python-venv.bat -Target all
setup-python-venv.bat -Target backend -SkipInstall
setup-python-venv.bat -Target frontend
```

Run from the repo root on macOS or Linux:

```bash
bash ./setup-dev-env.sh -Target all
bash ./setup-dev-env.sh -Target frontend
bash ./scripts/start-backend.sh
bash ./scripts/start-frontend.sh
bash ./scripts/start-raspberrypi.sh
```
