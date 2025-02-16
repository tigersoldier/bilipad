Bilibili Gamepad Controller

This is a Chrome extension that allows you to use a gamepad to control Bilibili.

## Development

To build the development version, run:

```bash
npm install
npm run start
```

To build the production version, run:

```bash
npm run build
```

The extension will be built in the `dist` directory.

## Pre-commit Hooks

To install the pre-commit hooks, run:

```bash
npx husky init
```

The pre-commit hooks will run eslint and prettier on the staged files.

You can also run the hooks manually with:

```bash
npm run pre-commit
```
