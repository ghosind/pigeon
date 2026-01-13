# pigeon

`pigeon` is a cross-platform HTTP request management desktop application for Windows, macOS and Linux. It is built with Electron, Vite, React and TypeScript, and provides a lightweight interface for creating, editing, sending, and inspecting HTTP requests and responses.

## Key Features

- Request creation and management: supports common HTTP methods (GET, POST, PUT, DELETE, etc.).
- Customizable request headers and parameters: supports JSON body, and raw text.
- Send requests and view responses: inspect status, headers, and response body.
- Cross-platform packaging: uses `electron-builder` to produce native installers (dmg/pkg, exe, AppImage, etc.).

## Installation

### Prerequisites

- Node.js 18 or later
- npm (bundled with Node.js)
- macOS: Xcode Command Line Tools (`xcode-select --install`) are recommended for local packaging and native dependency builds.
- Windows: if building locally for Windows, ensure required build toolchains are installed (for example, Visual Studio Build Tools).

### Clone and install dependencies

```bash
git clone https://github.com/ghosind/pigeon.git
cd pigeon
npm ci
```

Note: the repository includes a `postinstall` hook that runs `electron-builder install-app-deps` to prepare native dependencies after install.

### Run in development mode

```bash
npm run dev
```

In development mode, the renderer uses Vite for hot reload while the main process runs with Electron for preview.

### Build (package) locally

```bash
# General build (includes type checking)
npm run build

# Platform packaging examples:
npm run build:mac   # macOS
npm run build:win   # Windows
npm run build:linux # Linux
```

Build artifacts and installers are produced according to the `electron-builder` configuration and are typically placed under `dist` or `build` directories.

## Usage Guide

1. After launching the app you will typically see: a request editor, and a response viewer.
2. Create a new request: choose method (GET/POST/...), enter the URL, configure headers and parameters, and select a body type (JSON, Form, Raw).
3. Send the request: click the `Send` button and inspect the response panel.
	- The response view shows status, timings, response headers, and response body.

Typical layout (conceptual):

- Top: request address bar and send button
- Left: request editor (Headers / Body)
- Right/bottom: response viewer (Status / Headers / Body)

## Contributing

Contributions are welcome. Suggested workflow:

1. Fork the repo and create a feature branch: `git checkout -b feat/your-feature`.
2. Follow the code style: the project uses ESLint and Prettier. Run `npm run lint` and `npm run format` before committing if configured.
3. Commit messages: use clear messages; branch naming examples: `feat/`, `fix/`, `chore/`.
4. Open a Pull Request with a description of your changes and any test steps.
5. CI runs type checks and build on push and PR — ensure CI passes before requesting review.

Maintainers will review PRs and may request changes, tests, or documentation updates as needed.

## License

This project is licensed under the Apache License 2.0. See the `LICENSE` file in the repository root for full terms.

Briefly: Apache 2.0 permits use, reproduction, modification, and distribution under the license terms and includes a patent grant. Refer to `LICENSE` for details.
