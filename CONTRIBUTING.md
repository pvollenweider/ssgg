# Contributing to GalleryPack

Thank you for your interest in contributing to GalleryPack. This document explains how to report issues, suggest features, and submit code changes.

---

## Reporting bugs

Open a [GitHub Issue](https://github.com/pvollenweider/gallerypack/issues) with:

- A clear, descriptive title
- Steps to reproduce the problem
- Expected behavior vs. actual behavior
- Environment details (OS, Docker version, Node.js version, browser)
- Relevant log output or screenshots

---

## Suggesting features

Open a [GitHub Issue](https://github.com/pvollenweider/gallerypack/issues) labeled `enhancement` with:

- A description of the problem you want to solve
- Your proposed solution or approach
- Any alternatives you considered

---

## Development setup

See [docs/local-dev.md](docs/local-dev.md) for the full local development guide.

Quick start:

```bash
git clone git@github.com:pvollenweider/gallerypack.git
cd gallerypack
cp .env.example .env
make dev
```

---

## Code conventions

- **ES modules** -- all source uses `import`/`export` (no CommonJS `require`)
- **No TypeScript** -- the codebase is plain JavaScript
- **JSDoc** -- use JSDoc comments for public APIs and exported functions
- **Formatting** -- consistent indentation (2 spaces), single quotes for strings
- **No unused dependencies** -- keep `package.json` lean

---

## Pull request process

1. **Fork** the repository and create a feature branch from `main`
2. **Make your changes** with clear, focused commits
3. **Test** your changes -- run `npm test` and verify manually with `make dev`
4. **Open a PR** against `main` with a clear description of what and why
5. Respond to review feedback promptly

Keep PRs small and focused. One feature or fix per PR is preferred.

---

## License implications

GalleryPack is dual-licensed. The license that applies to your contribution depends on where the code lives:

- **Contributions to `packages/engine/` or `packages/shared/`** are licensed under AGPL-3.0. By submitting a PR to these packages, you agree to license your contribution under AGPL-3.0.

- **Contributions to `apps/api/`, `apps/web/`, or `workers/builder/`** (proprietary platform components) require a Contributor License Agreement (CLA). The CLA grants the project maintainer the right to distribute your contribution under both the AGPL-3.0 and the proprietary license, preserving the dual-licensing model.

If your PR touches proprietary components, a CLA will be provided for you to sign before the PR can be merged.

For full licensing details, see [docs/licensing.md](docs/licensing.md).

---

## Code of conduct

- Be respectful and constructive in all interactions
- Focus on the technical merits of contributions
- Welcome newcomers and help them get started
- Assume good intent
- Disagreements are fine; personal attacks are not

We want GalleryPack's community to be professional and welcoming. Maintainers reserve the right to remove comments or block users who violate these principles.
