# Stackbox

pnpm workspace for the Stackbox CMS packages.

| Package | Path | Role |
| --- | --- | --- |
| [`@stackbox/cms`](packages/cms) | `packages/cms` | CMS engine |
| [`@stackbox/edit-mode-plugin`](packages/edit-mode-plugin) | `packages/edit-mode-plugin` | In-iframe edit mode |

## Development

```bash
pnpm install
pnpm build
pnpm typecheck
pnpm test
```

Run one package with `--filter`:

```bash
pnpm --filter @stackbox/cms test
pnpm --filter @stackbox/edit-mode-plugin test
```

Publish every public package. `workspace:` ranges are rewritten to semver in the published manifest. Bump each package version before publishing.

```bash
pnpm -r publish
```

## License

BSD-3-Clause
