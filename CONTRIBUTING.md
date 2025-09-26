# Contributing

Thank you for helping improve Share House Portal! Please review the guidelines below before opening a pull request.

## Development workflow

1. Install dependencies with [`pnpm`](https://pnpm.io/).
2. Run `pnpm lint` and `pnpm test` to ensure your changes meet the project's quality standards.
3. Include automated tests whenever possible.

## Commit message conventions

All commits must follow the [Conventional Commits](https://www.conventionalcommits.org/) specification. Our CI will run [`commitlint`](https://commitlint.js.org/) on pushes and pull requests, and submissions that do not comply will fail.

Use the format:

```
<type>[optional scope]: <description>
```

Commonly used types include `feat`, `fix`, `docs`, `chore`, and `refactor`. See the Conventional Commits documentation for the complete list of rules and examples.
