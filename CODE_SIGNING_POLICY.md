# Code signing policy

Free code signing provided by [SignPath.io](https://about.signpath.io/),
certificate by [SignPath Foundation](https://signpath.org/).

## What is signed

The Slowfi desktop installers for Windows (`Slowfi-win-x64.exe`), built from
this repository by the `Desktop` GitHub Actions workflow
(`.github/workflows/desktop.yml`) when a `v*` tag is pushed. Nothing built
outside that workflow is signed.

## Team roles

- Committers and reviewers: [msakwins](https://github.com/msakwins)
- Approvers: [msakwins](https://github.com/msakwins)

Every signing request is approved by hand. All team members use multi-factor
authentication on GitHub and SignPath.

## Privacy

Slowfi collects no personal data and sends nothing about the user's computer
to its authors. The desktop app:

- runs read-only system commands on the computer itself to analyze the
  connection, the hardware and the connected devices;
- sends hardware identifiers of components (for example
  `PCI\VEN_10DE&DEV_2182`, the same for every card of that model) to
  slowfi.app, which looks up the latest driver in the Microsoft Update
  Catalog and on manufacturer sites, and stores nothing;
- runs a speed test against Cloudflare (speed.cloudflare.com);
- checks GitHub Releases for app updates.

The full privacy notice is on [slowfi.app/confidentialite](https://www.slowfi.app/confidentialite).
