import { useRef, useEffect } from "react";
import type { GetAlertsResponseItem } from "@workspace/api-client-react";

function playBeep(frequency: number, duration = 0.25) {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = "sine";
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);

    gain.gain.setValueAtTime(0.35, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);

    // Second tone — slightly higher
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(frequency * 1.25, ctx.currentTime + 0.1);
    gain2.gain.setValueAtTime(0.25, ctx.currentTime + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration + 0.15);
    osc2.start(ctx.currentTime + 0.1);
    osc2.stop(ctx.currentTime + duration + 0.15);
  } catch {
    // AudioContext not available
  }
}

export function useSoundAlert(alerts: GetAlertsResponseItem[] | undefined) {
  const prevSymbolsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!alerts) return;

    const currentSymbols = new Set(alerts.map((a) => a.symbol));
    const prevSymbols = prevSymbolsRef.current;

    for (const alert of alerts) {
      if (!prevSymbols.has(alert.symbol)) {
        // New alert — play tone based on direction
        const freq = alert.signal === "long" ? 440 : 880;
        playBeep(freq);
        break; // play once even if multiple new alerts
      }
    }

    prevSymbolsRef.current = currentSymbols;
  }, [alerts]);
}
