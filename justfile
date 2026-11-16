# List the available recipes.
default:
    @just --list

# Install dependencies (clean, lockfile-exact).
install:
    npm ci

# Build to dist/.
build:
    npm run build

# Run the test suite.
test:
    npm test

# Type-check without emitting.
typecheck:
    npx tsc --noEmit

# Type-check, build and test.
check: typecheck build test

# Show what would be published (files + tarball size), without publishing.
pack-dry:
    npm publish --dry-run

# Run the package's contents as a real tarball in a scratch dir.
pack:
    npm pack

# Publish the current version. Refuses to run on a dirty tree.
publish: check
    #!/usr/bin/env bash
    set -euo pipefail
    if [ -n "$(git status --porcelain)" ]; then
        echo "working tree is dirty; commit or stash first" >&2
        exit 1
    fi
    npm publish

# Show the version that would be released and what's changed since the last tag.
release-status:
    @echo "package.json : $(node -p "require('./package.json').version")"
    @echo "last git tag : $(git describe --tags --abbrev=0 2>/dev/null || echo '(none)')"
    @echo
    @echo "commits since last tag:"
    @git log "$(git describe --tags --abbrev=0 2>/dev/null || echo HEAD)"..HEAD --oneline 2>/dev/null || git log --oneline -5

# Bump version, commit, tag. Usage: just bump patch|minor|major.
bump level:
    npm version {{level}} -m "Release %s"

# Bump, push commit + tag, publish. Usage: just release patch|minor|major.
release level:
    just bump {{level}}
    git push --follow-tags
    just publish

# Push the current branch and tags.
push:
    git push --follow-tags

# Remove build output and installed dependencies.
clean:
    rm -rf dist node_modules

# Reinstall from scratch and run the full check.
fresh: clean install check
