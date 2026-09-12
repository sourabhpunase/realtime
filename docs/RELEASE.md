# Release (local tarballs)

Packages are not published automatically.

```bash
npm run build
npm test
npm run pack:sdks
```

Tarballs land in `dist-packages/`. A fresh app can install them together so `@realtime/core` resolves `@realtime/protocol` from the sibling tarball, not from a workspace alias:

```bash
npm install ./dist-packages/realtime-protocol-0.1.0.tgz \
            ./dist-packages/realtime-core-0.1.0.tgz \
            ./dist-packages/realtime-node-0.1.0.tgz
```

Do not publish to the public registry without explicit authorization and credentials.
