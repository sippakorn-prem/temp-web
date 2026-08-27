"use client";

import * as React from "react";

/**
 * omise.js exposes two globals. `OmiseCard` is the hosted drop-in popup — we use it only
 * for **card**, where the buyer must type a card number and pass 3DS. `Omise` is the
 * headless SDK — we use it for **PromptPay**, which needs no input: we create the source
 * silently and render the QR in-app ourselves, so the buyer never sees a second Omise
 * popup. Either way our backend creates the charge from the nonce, so the amount stays
 * server-derived. The library is loaded lazily from Omise's CDN.
 */
type OmiseCardGlobal = {
  configure: (opts: { publicKey: string }) => void;
  open: (opts: {
    amount: number;
    currency: string;
    defaultPaymentMethod?: string;
    otherPaymentMethods?: string[];
    frameLabel?: string;
    onCreateTokenSuccess: (nonce: string) => void;
    onFormClosed?: () => void;
  }) => void;
};

type OmiseSourceResponse = { object: string; id?: string; message?: string };
type OmiseGlobal = {
  setPublicKey: (key: string) => void;
  createSource: (
    type: string,
    options: { amount: number; currency: string },
    handler: (statusCode: number, response: OmiseSourceResponse) => void
  ) => void;
};

declare global {
  interface Window {
    OmiseCard?: OmiseCardGlobal;
    Omise?: OmiseGlobal;
  }
}

const SCRIPT_SRC = "https://cdn.omise.co/omise.js";
const PUBLIC_KEY = process.env.NEXT_PUBLIC_OMISE_PUBLIC_KEY;

let loader: Promise<void> | null = null;

/** Loads omise.js once; resolves when both `window.Omise` and `window.OmiseCard` exist. */
function loadOmise(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("omise: browser only"));
  if (window.Omise && window.OmiseCard) return Promise.resolve();
  if (loader) return loader;
  loader = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
    const script = existing ?? document.createElement("script");
    const onLoad = () =>
      window.Omise && window.OmiseCard
        ? resolve()
        : reject(new Error("omise: globals unavailable after load"));
    script.addEventListener("load", onLoad, { once: true });
    script.addEventListener("error", () => reject(new Error("omise: failed to load omise.js")), {
      once: true,
    });
    if (!existing) {
      script.src = SCRIPT_SRC;
      script.async = true;
      document.head.appendChild(script);
    } else if (window.Omise && window.OmiseCard) {
      onLoad();
    }
  });
  return loader;
}

/** Thrown when the buyer closes the card popup without paying. Not an error to surface. */
export class OmiseCheckoutCancelled extends Error {
  constructor() {
    super("omise: checkout closed");
    this.name = "OmiseCheckoutCancelled";
  }
}

export type PaymentMethod = "card" | "promptpay";

export function useOmiseCheckout() {
  const cardConfigured = React.useRef(false);
  const keyConfigured = React.useRef(false);

  /** Card: open the hosted popup so the buyer can enter a card and pass 3DS → card token. */
  const openCardCheckout = React.useCallback(
    (req: { amountSatang: number; title?: string }): Promise<string> => {
      if (!PUBLIC_KEY) {
        return Promise.reject(new Error("omise: NEXT_PUBLIC_OMISE_PUBLIC_KEY is not set"));
      }
      return loadOmise().then(
        () =>
          new Promise<string>((resolve, reject) => {
            const OmiseCard = window.OmiseCard!;
            if (!cardConfigured.current) {
              OmiseCard.configure({ publicKey: PUBLIC_KEY });
              cardConfigured.current = true;
            }
            let settled = false;
            OmiseCard.open({
              amount: req.amountSatang,
              currency: "THB",
              defaultPaymentMethod: "credit_card",
              frameLabel: req.title ?? "SafeDeal",
              onCreateTokenSuccess: (nonce) => {
                settled = true;
                resolve(nonce);
              },
              onFormClosed: () => {
                if (!settled) reject(new OmiseCheckoutCancelled());
              },
            });
          })
      );
    },
    []
  );

  /** PromptPay: create the source headlessly (no popup) → PromptPay source id. */
  const createPromptPaySource = React.useCallback((amountSatang: number): Promise<string> => {
    if (!PUBLIC_KEY) {
      return Promise.reject(new Error("omise: NEXT_PUBLIC_OMISE_PUBLIC_KEY is not set"));
    }
    return loadOmise().then(
      () =>
        new Promise<string>((resolve, reject) => {
          const Omise = window.Omise!;
          if (!keyConfigured.current) {
            Omise.setPublicKey(PUBLIC_KEY);
            keyConfigured.current = true;
          }
          Omise.createSource(
            "promptpay",
            { amount: amountSatang, currency: "THB" },
            (_statusCode, response) => {
              if (response.object === "error" || !response.id) {
                reject(new Error(response.message ?? "omise: could not create PromptPay source"));
                return;
              }
              resolve(response.id);
            }
          );
        })
    );
  }, []);

  return { openCardCheckout, createPromptPaySource, available: Boolean(PUBLIC_KEY) };
}
