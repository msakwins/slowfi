import { describe, it, expect } from "vitest";
import { pickDownloads, mainDownload, visitorOs } from "./download.js";

const asset = (name) => ({
  name,
  browser_download_url: `https://example.test/${name}`,
});

describe("téléchargements de l'application", () => {
  it("lie les fichiers présents dans la release, par format", () => {
    const files = pickDownloads({
      assets: [
        asset("Slowfi-win-x64.exe"),
        asset("Slowfi-win-x64.exe.blockmap"),
        asset("Slowfi-mac-universal.dmg"),
        asset("Slowfi-linux-x86_64.AppImage"),
        asset("Slowfi-linux-amd64.deb"),
        asset("latest.yml"),
      ],
    });
    expect(files).toEqual({
      windows: "https://example.test/Slowfi-win-x64.exe",
      mac: "https://example.test/Slowfi-mac-universal.dmg",
      appImage: "https://example.test/Slowfi-linux-x86_64.AppImage",
      deb: "https://example.test/Slowfi-linux-amd64.deb",
    });
  });

  it("ne lie rien sans release", () => {
    expect(pickDownloads(null)).toEqual({});
    expect(mainDownload({}, "mac")).toBeUndefined();
  });

  it("propose l'AppImage en premier sous Linux", () => {
    expect(mainDownload({ appImage: "a", deb: "d" }, "linux")).toBe("a");
    expect(mainDownload({ deb: "d" }, "linux")).toBe("d");
  });

  it("reconnaît le système du visiteur", () => {
    expect(visitorOs("Mozilla/5.0 (Windows NT 10.0; Win64; x64)")).toBe(
      "windows",
    );
    expect(visitorOs("Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0)")).toBe(
      "mac",
    );
    expect(visitorOs("Mozilla/5.0 (X11; Linux x86_64)")).toBe("linux");
  });
});
