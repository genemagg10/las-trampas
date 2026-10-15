"use client";

import { useState, useTransition } from "react";
import { revealGateCode } from "@/lib/actions/member";

export function GateCodeButton({ bookingId }: { bookingId: string }) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<{ allowed: boolean; code?: string; reason: string } | null>(null);

  return (
    <div>
      <button
        type="button"
        className="btn sun"
        disabled={pending}
        onClick={() => {
          start(async () => {
            const next = await revealGateCode(bookingId);
            setResult(next);
          });
        }}
      >
        {pending ? "Checking…" : "Show today’s gate code"}
      </button>
      {result ? (
        <p className={result.allowed ? "alert" : "alert error"} style={{ marginTop: "0.6rem" }}>
          {result.allowed && result.code ? (
            <>
              Gate code <strong style={{ fontVariantNumeric: "tabular-nums", letterSpacing: "0.08em" }}>{result.code}</strong>. {result.reason}
            </>
          ) : (
            result.reason
          )}
        </p>
      ) : null}
    </div>
  );
}
