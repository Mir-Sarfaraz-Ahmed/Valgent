# Valgent

Valgent is an AI-powered Build & Validation Agent.

## Setup
1. Copy `.env.example` to `.env` and configure `GEMINI_API_KEY` (and optional `TINYFISH_API_KEY`).
2. Run `npm install`
3. Run `npm run build`
4. Run `npm run start`

## Sandbox Security Model
Valgent V0.2 uses a hardened Docker execution layer to execute untrusted repository code.

### Security Controls:
1. **No Host Access**: Does not mount host Docker socket or host home directories.
2. **Read-Only FS**: Uses `--read-only` root filesystem.
3. **Tmpfs Mounts**: Uses isolated `tmpfs` mounts for `/tmp` and `/home/node`.
4. **Limits**: Enforces CPU, Memory, and PID limits (`--cpus`, `--memory`, `--pids-limit`).
5. **No Privileges**: Drops all capabilities (`--cap-drop=ALL`) and sets `--security-opt no-new-privileges`.
6. **Network Policy**: Configurable network access (defaults to restricted `none`).
7. **User Isolation**: Runs as non-root `node` user (`1000:1000`).
8. **Command Abstraction**: Only pre-approved package manager operations (`npm run test`, `npm run build`, etc.) are permitted. No arbitrary host commands are executed.
9. **Environment Isolation**: No host environment variables (especially `GEMINI_API_KEY` and `TINYFISH_API_KEY`) are passed into the container.
10. **Cleanup**: Ephemeral `--rm` containers are strictly force-removed upon execution completion or timeout.

## Tests
Run `npm run test`
