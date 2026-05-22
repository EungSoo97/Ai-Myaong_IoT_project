# Run Scripts

- `start-backend.bat`
- `start-frontend.bat`
- `start-raspberrypi.bat`
- `setup-python-venv.bat`
- `setup-toolchain.bat`
- `start-backend.sh`
- `start-frontend.sh`
- `start-raspberrypi.sh`
- `setup-dev-env.sh`
- `setup-toolchain.sh`

Recommended order on Windows:

```cmd
setup-toolchain.bat
setup-python-venv.bat -Target all
scripts\start-backend.bat
scripts\start-frontend.bat
scripts\start-raspberrypi.bat
```

Recommended order on macOS or Linux:

```bash
bash ./setup-toolchain.sh
bash ./setup-dev-env.sh -Target all
bash ./scripts/start-backend.sh
bash ./scripts/start-frontend.sh
bash ./scripts/start-raspberrypi.sh
```

Other Windows examples:

```cmd
scripts\start-backend.bat
scripts\start-frontend.bat
scripts\start-raspberrypi.bat
setup-python-venv.bat -Target all
setup-python-venv.bat -Target backend -SkipInstall
setup-python-venv.bat -Target frontend
setup-toolchain.bat
```

Other macOS or Linux examples:

```bash
bash ./setup-dev-env.sh -Target all
bash ./setup-dev-env.sh -Target frontend
bash ./setup-toolchain.sh
bash ./scripts/start-backend.sh
bash ./scripts/start-frontend.sh
bash ./scripts/start-raspberrypi.sh
```
