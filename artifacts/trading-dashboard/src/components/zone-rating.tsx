interface ZoneRatingProps {
  rating: number;
  htfConfluence: boolean;
  htfLevel?: string | null;
}

const HTF_LABEL: Record<string, string> = {
  H1:    "HTF: H1",
  H4:    "HTF: H4",
  H1_H4: "HTF: H1+H4",
};

export function ZoneRating({ rating, htfConfluence, htfLevel }: ZoneRatingProps) {
  const stars = Math.max(1, Math.min(5, Math.round(rating)));

  return (
    <span className="inline-flex items-center gap-1.5" data-testid="zone-rating">
      <span className="font-mono text-xs tracking-tight">
        {Array.from({ length: 5 }, (_, i) => (
          <span key={i} className={i < stars ? "text-yellow-400" : "text-muted-foreground/30"}>
            ★
          </span>
        ))}
      </span>
      {htfConfluence && htfLevel && htfLevel !== "none" && (
        <span
          className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30"
          data-testid="badge-htf"
        >
          {HTF_LABEL[htfLevel] ?? `HTF: ${htfLevel}`}
        </span>
      )}
    </span>
  );
}
