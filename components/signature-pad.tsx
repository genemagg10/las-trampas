"use client";

import { useRef } from "react";

export function SignaturePad() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);

  function context() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return null;
    const ratio = window.devicePixelRatio || 1;
    if (canvas.width !== canvas.offsetWidth * ratio) {
      canvas.width = canvas.offsetWidth * ratio;
      canvas.height = canvas.offsetHeight * ratio;
      ctx.scale(ratio, ratio);
    }
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#0B2545";
    return { canvas, ctx };
  }

  function point(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function start(event: React.PointerEvent<HTMLCanvasElement>) {
    const ctx = context();
    if (!ctx) return;
    drawing.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    const { x, y } = point(event);
    ctx.ctx.beginPath();
    ctx.ctx.moveTo(x, y);
  }

  function move(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const ctx = context();
    if (!ctx) return;
    const { x, y } = point(event);
    ctx.ctx.lineTo(x, y);
    ctx.ctx.stroke();
  }

  function end() {
    drawing.current = false;
    const canvas = canvasRef.current;
    const input = document.getElementById("signature_png") as HTMLInputElement | null;
    if (canvas && input) input.value = canvas.toDataURL("image/png");
  }

  function clear() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const input = document.getElementById("signature_png") as HTMLInputElement | null;
    if (input) input.value = "";
  }

  return (
    <div>
      <p className="eyebrow">Signature</p>
      <canvas
        ref={canvasRef}
        aria-label="Draw your signature"
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
        style={{ width: "100%", height: 160, touchAction: "none", borderRadius: 12, background: "white", boxShadow: "inset 0 0 0 1.5px #d5d0c6" }}
      />
      <input id="signature_png" name="signature_png" type="hidden" />
      <button type="button" className="btn secondary" onClick={clear} style={{ marginTop: "0.6rem" }}>
        Clear signature
      </button>
    </div>
  );
}
