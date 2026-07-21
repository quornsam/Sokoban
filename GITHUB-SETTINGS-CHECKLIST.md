# GitHub settings checklist for BOXXY

These settings cannot be changed by uploading the BOXXY release files; they must be checked in the GitHub repository interface.

## Repository → Settings → General

- Keep the repository public while ordinary GitHub Pages is published from a public repository.
- Review **Collaborators and teams** and remove anyone who no longer needs write access.
- Disable **Wikis**, **Discussions** and **Issues** if they are not being used.
- Do not choose MIT, GPL, Apache or another open-source licence from GitHub's licence picker. Keep the custom `LICENSE.md` supplied with BOXXY.

## Repository → Settings → Pages

- Source: **Deploy from a branch**.
- Branch: **main**.
- Folder: **/(root)**.
- Enable **Enforce HTTPS** when the option is available.

## Repository front page → About

Suggested description:

> BOXXY — proprietary source-available Sokoban game. Personal non-commercial use only.

Keep the GitHub Pages website address in the Website field.

## Optional branch protection

A ruleset can protect `main` from force pushes or deletion. Requiring pull requests is optional and may make direct browser uploads less convenient.

## Recommended release record

After uploading v140:

1. Commit with a clear message such as `BOXXY v140 original-pack front-page release`.
2. Create a tag such as `v140`.
3. Create a GitHub Release and attach the exact ZIP.
4. Keep an offline copy of the ZIP and original creative files.
