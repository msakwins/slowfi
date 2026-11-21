import { describe, it, expect } from "vitest";
import {
  aiVendor,
  aiEligible,
  cleanName,
  buildPrompt,
  parseAnswer,
  readInteraction,
  handleAiRequest,
} from "./aiDriver.js";

const intel = aiVendor("PCI\\VEN_8086&DEV_A370");
const PAGE =
  "https://www.intel.com/content/www/us/en/download/19351/intel-wireless-wi-fi-drivers-for-windows-10-and-windows-11.html";

describe("lecture IA des pages de pilotes", () => {
  it("ne couvre que AMD, Intel et Realtek, avec une page connue", () => {
    expect(intel.name).toBe("Intel");
    expect(aiVendor("PCI\\VEN_1002&DEV_73BF").name).toBe("AMD");
    expect(aiVendor("PCI\\VEN_10DE&DEV_2182")).toBeNull();
    expect(
      aiEligible({
        key: "PCI\\VEN_8086&DEV_A370",
        cls: "NET",
        name: "Intel(R) Wireless-AC 9560",
      }),
    ).toBe(true);
    // Intel, mais sans page de pilotes connue pour un contrôleur de stockage.
    expect(
      aiEligible({ key: "PCI\\VEN_8086&DEV_A352", cls: "HDC", name: "SATA" }),
    ).toBe(false);
  });

  it("nettoie le nom envoyé", () => {
    expect(cleanName("  Intel(R) Wireless-AC 9560  ")).toBe(
      "Intel(R) Wireless-AC 9560",
    );
    expect(cleanName("x")).toBeNull();
    expect(cleanName("a".repeat(200))).toBeNull();
    expect(cleanName("Intel <script>")).toBe("Intel script");
  });

  it("donne la page à lire et l'appareil dans la consigne", () => {
    const p = buildPrompt({
      name: "Intel(R) Wireless-AC 9560",
      key: "PCI\\VEN_8086&DEV_A370",
      vendor: intel,
      page: PAGE,
    });
    expect(p).toContain(PAGE);
    expect(p).toContain("Intel(R) Wireless-AC 9560");
  });

  it("garde une réponse tirée d'une page du fabricant réellement lue", () => {
    const text =
      '```json\n{"driverVersion": "24.80.0.2", "packageName": "Intel Wi-Fi Drivers", "packageVersion": "24.80.0", "releaseDate": null, "url": "https://example.org"}\n```';
    expect(parseAnswer(text, [PAGE], intel)).toEqual({
      source: "ai",
      driverVersion: "24.80.0.2",
      packageName: "Intel Wi-Fi Drivers",
      packageVersion: "24.80.0",
      date: null,
      url: PAGE,
    });
  });

  it("écarte une réponse sans page lue, vide ou sans version", () => {
    const ok = '{"driverVersion": "24.80.0.2"}';
    expect(parseAnswer(ok, [], intel)).toBeNull();
    expect(parseAnswer(ok, ["https://example.org"], intel)).toBeNull();
    expect(parseAnswer('{"driverVersion": null}', [PAGE], intel)).toBeNull();
    expect(parseAnswer("pas de JSON", [PAGE], intel)).toBeNull();
    expect(
      parseAnswer('{"driverVersion": "latest"}', [PAGE], intel),
    ).toBeNull();
  });

  it("lit les pages ouvertes et le texte de l'API", () => {
    const body = {
      steps: [
        { type: "url_context_call", arguments: { urls: [PAGE] } },
        {
          type: "url_context_result",
          result: [
            { url: PAGE, status: "success" },
            { url: "https://www.intel.com/old", status: "error" },
          ],
        },
        { type: "thought" },
        { type: "model_output", content: [{ type: "text", text: "{}" }] },
      ],
    };
    expect(readInteraction(body)).toEqual({ text: "{}", read: [PAGE] });
  });

  it("refuse les demandes mal formées, et sans clé", async () => {
    const bad = await handleAiRequest(
      { id: "PCI\\VEN_10DE&DEV_2182", name: "GeForce", cls: "DISPLAY" },
      { GEMINI_API_KEY: "x" },
    );
    expect(bad.status).toBe(400);
    const noKey = await handleAiRequest(
      {
        id: "PCI\\VEN_8086&DEV_A370",
        name: "Intel(R) Wireless-AC 9560",
        cls: "NET",
      },
      {},
    );
    expect(noKey.status).toBe(503);
  });
});
