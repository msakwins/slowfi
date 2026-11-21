import { describe, it, expect } from "vitest";
import {
  windowsCommand,
  macCommand,
  linuxCommand,
  appScript,
  appSystem,
  psText,
} from "./commands.js";

describe("script de l'application desktop", () => {
  it("retire le presse-papiers et l'appel à PowerShell sous Windows", () => {
    const cmd = windowsCommand(["Get-Date", "hostname"]);
    expect(appScript("windows", cmd)).toBe(
      "& { Get-Date; hostname } | Out-String -Width 300",
    );
  });

  it("retire pbcopy sous macOS", () => {
    expect(appScript("mac", macCommand(["sw_vers", "uptime"]))).toBe(
      "{ sw_vers ; uptime ; } 2>&1",
    );
  });

  it("annonce le début et la fin dans le terminal", () => {
    const win = windowsCommand(["Get-Date"], "fr");
    expect(win).toMatch(
      /^powershell -NoProfile -Command "Write-Host 'Chargement\.\.\.'/,
    );
    expect(win).toContain(
      "Set-Clipboard; Get-Variable slowfi -ValueOnly; Write-Host ('R' + [char]0xE9 + 'sultat copi' + [char]0xE9 + ', vous pouvez maintenant le coller dans la page (Ctrl + V)')",
    );
    // Pas de « $ » : PowerShell le développerait avant le sous-shell.
    expect(win).not.toContain("$");
    const mac = macCommand(["uptime"], "fr");
    expect(mac).toMatch(/^echo 'Chargement\.\.\.' ; \{ uptime ; \}/);
    expect(mac).toMatch(
      /\| tee \/dev\/tty \| pbcopy && echo 'Résultat copié, vous pouvez maintenant le coller dans la page \(Cmd \+ V\)'$/,
    );
  });

  it("parle anglais quand la page est en anglais", () => {
    const win = windowsCommand(["Get-Date"], "en");
    expect(win).toContain("Write-Host 'Loading...'");
    expect(win).toContain(
      "Write-Host 'Result copied, you can now paste it into the page (Ctrl + V)'",
    );
    expect(macCommand(["uptime"], "en")).toMatch(/^echo 'Loading\.\.\.'/);
  });

  it("écrit les accents en [char] pour PowerShell", () => {
    expect(psText("abc")).toBe("'abc'");
    expect(psText("é")).toBe("[char]0xE9");
    expect(psText("l'été")).toBe("('l''' + [char]0xE9 + 't' + [char]0xE9)");
  });

  it("garde la commande Linux telle quelle", () => {
    const cmd = linuxCommand(["export LC_ALL=C", "uptime"]);
    expect(appScript("linux", cmd)).toBe(cmd);
  });

  it("déduit le système de process.platform", () => {
    expect(appSystem("win32")).toBe("windows");
    expect(appSystem("darwin")).toBe("mac");
    expect(appSystem("linux")).toBe("linux");
  });
});
