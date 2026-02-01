# sv

Everything you need to build a Svelte project, powered by [`sv`](https://github.com/sveltejs/cli).

## Creating a project

If you're seeing this, you've probably already done this step. Congrats!

```sh
# create a new project
npx sv create my-app
```

To recreate this project with the same configuration:

```sh
# recreate this project
npx sv create --template minimal --types ts --install npm ./
```

## 🤖 For AI Agents & Developers

If you are an AI assistant or a developer working on this codebase, please refer to the following guides:

- **[Architecture Guide](AI_ARCHITECTURE.md)**: Detailed overview of data structures, state management, and project conventions.
- **[Scripts Catalog](scripts/SCRIPTS_CATALOG.md)**: Complete list of maintenance and generation tools available in the `scripts/` directory.

## 🛠️ Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Run type checks
npm run check
```

## Building

To create a production version of your app:

```sh
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.
