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

## Publishing

Always publish with **pnpm**, never `npm publish`.

Packages in this workspace use `workspace:` protocol ranges (for example `@stackbox/edit-mode-plugin` peers on `@stackbox/cms`). **pnpm rewrites those to semver in the published manifest; npm does not.** Publishing with `npm publish` can ship invalid peers like `"@stackbox/cms": "workspace:^"`, which break installs for consumers.

### Steps

1. Bump each package version you intend to release (`packages/*/package.json`).
2. Build and test from the repo root:

   ```bash
   pnpm install
   pnpm build
   pnpm typecheck
   pnpm test
   ```

3. Publish every public package with pnpm (root is `private` and is skipped):

   ```bash
   pnpm -r publish --access public
   ```

   Or one package:

   ```bash
   pnpm --filter @stackbox/cms publish --access public
   pnpm --filter @stackbox/edit-mode-plugin publish --access public
   ```

4. If the registry asks for 2FA, open the printed browser URL, approve, then re-run with `--otp <token>` if the CLI did not complete automatically.
5. After publish, npm may take several minutes to finish malware-scan staging before the version is installable. A `409 Cannot publish over previously staged version` means that version is already staged — wait; do not bump just to retry.
6. Confirm the published manifest rewrote `workspace:` ranges:

   ```bash
   npm view @stackbox/edit-mode-plugin@<version> peerDependencies
   ```

   You should see a semver range (for example `"@stackbox/cms": "^0.1.2"`), never `workspace:`.

### Do not

- Run `npm publish` (or `npm publish -w …`) from a package directory.
- Skip the post-publish `npm view … peerDependencies` check when a package has `workspace:` deps or peers.

## License

BSD-3-Clause
