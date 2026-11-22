import { describe, it, expect } from "vitest";
import {
  newCode,
  normalizeCode,
  vaultId,
  seal,
  open,
  mergeHistories,
} from "./vault.js";

describe("coffre chiffré", () => {
  it("crée des codes lisibles et uniques", () => {
    const code = newCode();
    expect(code).toMatch(
      /^slow-[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}$/,
    );
    expect(newCode()).not.toBe(code);
  });

  it("accepte un code tapé à la main, avec ou sans tirets", () => {
    expect(normalizeCode("slow-7kq4-m2xp-9rta-zz01")).toBe(
      "slow-7KQ4-M2XP-9RTA-ZZ01",
    );
    expect(normalizeCode("7KQ4M2XP9RTAZZ0I")).toBe("slow-7KQ4-M2XP-9RTA-ZZ01");
    expect(normalizeCode("trop court")).toBeNull();
  });

  it("chiffre et déchiffre avec le même code, échoue avec un autre", async () => {
    const code = newCode();
    const sealed = await seal(code, [{ t: 1, level: "ok" }]);
    expect(sealed).not.toContain("level");
    expect(await open(code, sealed)).toEqual([{ t: 1, level: "ok" }]);
    await expect(open(newCode(), sealed)).rejects.toBeTruthy();
  });

  it("dérive un identifiant stable, différent du code", async () => {
    const code = "slow-7KQ4-M2XP-9RTA-ZZ01";
    const id = await vaultId(code);
    expect(id).toMatch(/^[0-9a-f]{40}$/);
    expect(await vaultId(code)).toBe(id);
    expect(id).not.toContain("7kq4");
  });

  it("fusionne deux historiques sans doublon", () => {
    expect(
      mergeHistories([{ t: 3 }, { t: 1 }], [{ t: 2 }, { t: 1 }]).map(
        (s) => s.t,
      ),
    ).toEqual([3, 2, 1]);
  });
});
