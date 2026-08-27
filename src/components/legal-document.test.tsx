import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LegalDocument } from "./legal-document";

describe("LegalDocument", () => {
  it("renders the effective date and every legal section", () => {
    render(
      <LegalDocument
        title="Privacy Notice"
        updated="Effective: 1 August 2026"
        intro="How SafeDeal handles personal data."
        back="Back to SafeDeal"
        sections={[
          { title: "Data we collect", body: "Account and deal data." },
          { title: "Your rights", body: "Access and correction." },
        ]}
      />
    );

    expect(screen.getByRole("heading", { level: 1, name: "Privacy Notice" })).toBeVisible();
    expect(screen.getByText("Effective: 1 August 2026")).toBeVisible();
    expect(screen.getByRole("heading", { level: 2, name: "Data we collect" })).toBeVisible();
    expect(screen.getByRole("heading", { level: 2, name: "Your rights" })).toBeVisible();
    expect(screen.getByRole("link", { name: /Back to SafeDeal/ })).toHaveAttribute("href", "/");
  });
});
