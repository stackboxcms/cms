# Stackbox workspace

This repository is a pnpm workspace. Packages live under `packages/` and are peers.

| Package | Path | When to work here |
| --- | --- | --- |
| `@stackbox/cms` | `packages/cms` | Engine, bundled plugins, site conventions |
| `@stackbox/edit-mode-plugin` | `packages/edit-mode-plugin` | In-iframe edit mode (`?sbedit=1`) |

Before changing the CMS engine or a bundled plugin, read [`packages/cms/AGENTS.md`](packages/cms/AGENTS.md).

From the repository root:

```bash
pnpm install
pnpm test
pnpm --filter @stackbox/cms test
pnpm --filter @stackbox/edit-mode-plugin test
```

The root `package.json` is private and is not published. `pnpm build`, `pnpm test`, and `pnpm typecheck` run that script in every package.

**Publishing:** use `pnpm -r publish` only — never `npm publish`. pnpm rewrites `workspace:` ranges to semver in the published manifest; npm leaves them as `workspace:^`, which breaks consumers. See [README.md](README.md#publishing).
