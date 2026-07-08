import React, { useState } from "react";
import {
  FileText,
  AlertCircle,
  BookOpen,
  TrendingUp,
  Loader2,
  Building2,
  Activity,
} from "lucide-react";

// ── Design tokens ─────────────────────────────────────────────
const C = {
  paper: "#ECEEF1",
  panel: "#FBFCFD",
  ink: "#16191F",
  inkSoft: "#5A626E",
  line: "#D6DAE0",
  dove: "#1F7A8C",
  hawk: "#C0451F",
  neutralAccent: "#6B7280",
};
const serif = "Georgia, 'Times New Roman', serif";
const mono = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

// ── Synthetic sample statements (original compositions, not real ones) ──
const SAMPLES = {
  "FOMC — tightening bias":
    "The Committee judges that inflation remains elevated relative to its longer-run objective of 2 percent, and that the labor market continues to demonstrate considerable strength. In support of its goals, the Committee decided to raise the target range for the federal funds rate by 25 basis points. The Committee anticipates that ongoing increases in the target range will be appropriate to attain a stance of monetary policy that is sufficiently restrictive to return inflation to target over time. The Committee will continue reducing its holdings of Treasury securities and agency mortgage-backed securities. In determining the extent of future increases, the Committee will take into account the cumulative tightening of monetary policy and the lags with which policy affects activity.",
  "ECB — easing pivot":
    "The Governing Council today decided to lower the three key ECB interest rates by 25 basis points. Recent data confirm that the disinflation process is well on track, with underlying price pressures continuing to ease and wage growth moderating. While domestic inflation remains high, the Governing Council judges that the restrictiveness of monetary policy can be gradually reduced. The Council is not pre-committing to a particular rate path and will continue to follow a data-dependent and meeting-by-meeting approach. Interest rate decisions will be based on the evolving assessment of the inflation outlook, the dynamics of underlying inflation, and the strength of monetary policy transmission.",
  "Bank of England — on hold":
    "The Monetary Policy Committee voted to maintain the Bank Rate at its current level. The Committee continues to judge that monetary policy will need to remain restrictive for an extended period until the risks of inflation becoming embedded above the 2 percent target have dissipated more durably. Services price inflation and pay growth remain higher than would be consistent with sustainably returning inflation to target. The Committee will pay close attention to the persistence of inflationary pressures and to indicators of supply, demand, and the labour market. Should those pressures prove more persistent, further tightening would be warranted.",
};

export default function App() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const analyze = async () => {
    if (!text.trim()) {
      setError("Paste a central bank statement, or load a sample, before decoding.");
      return;
    }
    setLoading(true);
    setError("");
    setResult(null);

   const prompt = `You are a monetary-policy analyst. Analyze the central bank communication below and return ONLY valid JSON — no markdown, no backticks, no preamble — matching exactly this shape:
{"institution": string, "summary": string, "dimensions": {"forwardGuidance": {"score": integer -2..2, "note": string}, "inflation": {"score": integer -2..2, "note": string}, "currentAction": {"score": integer -2..2, "note": string}, "growthLabour": {"score": integer -2..2, "note": string}, "balanceSheet": {"score": integer -2..2, "note": string}, "riskBalance": {"score": integer -2..2, "note": string}}, "keySignals": [{"signal": string, "interpretation": string}], "jargon": [{"term": string, "definition": string}], "marketImplications": string}

Scoring guide for each dimension, -2 (very dovish) to +2 (very hawkish), 0 if not addressed:
- forwardGuidance: signals about future moves (tightening bias = +, easing bias = -)
- inflation: elevated/persistent = +, easing/on-track = -
- currentAction: hike = +, cut = -, hold = 0
- growthLabour: strong/robust = +, cooling/softening = -
- balanceSheet: QT/runoff = +, QE/pausing runoff = -
- riskBalance: risks skewed to tightening = +, to easing = -
Each "note" <= 12 words, citing the specific language.

Rules: identify the institution if recognizable (else "Unspecified central bank"). summary <= 2 plain-English sentences. keySignals: 3-4 items, each interpretation <= 1 sentence. jargon: 3-5 technical terms ACTUALLY present in the text, definitions <= 1 sentence in plain English. marketImplications <= 2 sentences. Be concise.

STATEMENT:
${text.trim()}`;

    try {
      const response = await fetch("/api/decode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = await response.json();
      const raw = (data.content || [])
        .filter((b) => b.type === "text")
        .map((b) => b.text)
        .join("\n");
     const start = raw.indexOf("{");
      const end = raw.lastIndexOf("}");
      if (start === -1 || end === -1) throw new Error("no json");
      const parsed = JSON.parse(raw.slice(start, end + 1));

      // ── Auditable scoring: computed in code, not chosen by the model ──
      const WEIGHTS = {
        forwardGuidance: 0.35,
        inflation: 0.20,
        currentAction: 0.15,
        growthLabour: 0.12,
        balanceSheet: 0.08,
        riskBalance: 0.10,
      };
      const d = parsed.dimensions || {};
      let weighted = 0;
      for (const key in WEIGHTS) {
        const s = Math.max(-2, Math.min(2, Number(d[key]?.score) || 0));
        weighted += s * WEIGHTS[key];
      }
      const computedScore = Math.round(weighted * 50); // -2..2 weighted → -100..100
      const stance =
        computedScore > 15 ? "Hawkish" : computedScore < -15 ? "Dovish" : "Neutral";
      parsed.stanceScore = computedScore;
      parsed.stance = stance;

      setResult(parsed);
    } catch (e) {
      setError(
        "The decode didn't complete. Check your connection and try again — long statements may need to be trimmed to the most relevant paragraphs."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: C.paper, minHeight: "100vh", color: C.ink, fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: 880, margin: "0 auto", padding: "40px 24px 64px" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 4 }}>
          <Activity size={20} style={{ color: C.hawk, position: "relative", top: 3 }} />
          <h1 style={{ fontFamily: serif, fontSize: 34, fontWeight: 700, letterSpacing: "-0.5px", margin: 0 }}>
            Central Bank Decoder
          </h1>
        </div>
        <p style={{ fontFamily: mono, fontSize: 12, color: C.inkSoft, textTransform: "uppercase", letterSpacing: "1.5px", margin: "0 0 28px" }}>
          Policy stance · plain language · jargon glossary
        </p>

        <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 4, padding: 20 }}>
          <label style={{ fontFamily: mono, fontSize: 11, color: C.inkSoft, textTransform: "uppercase", letterSpacing: "1px" }}>
            Statement text
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste an FOMC statement, ECB press release, BoE MPC summary…"
            rows={8}
            style={{
              width: "100%", marginTop: 8, padding: 12, border: `1px solid ${C.line}`,
              borderRadius: 4, fontSize: 14, lineHeight: 1.55, fontFamily: "system-ui, sans-serif",
              resize: "vertical", outline: "none", boxSizing: "border-box", background: "#fff", color: C.ink,
            }}
          />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
            <span style={{ fontFamily: mono, fontSize: 11, color: C.inkSoft, alignSelf: "center", marginRight: 2 }}>Try:</span>
            {Object.keys(SAMPLES).map((k) => (
              <button key={k} onClick={() => { setText(SAMPLES[k]); setError(""); }}
                style={{ fontFamily: mono, fontSize: 11, padding: "5px 10px", borderRadius: 999, border: `1px solid ${C.line}`, background: "#fff", color: C.inkSoft, cursor: "pointer" }}>
                {k}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 16 }}>
            <button onClick={analyze} disabled={loading}
              style={{ display: "inline-flex", alignItems: "center", gap: 8, background: C.ink, color: "#fff", border: "none", borderRadius: 4, padding: "10px 18px", fontSize: 14, fontWeight: 600, cursor: loading ? "default" : "pointer", opacity: loading ? 0.6 : 1 }}>
              {loading ? <Loader2 size={16} className="spin" /> : <FileText size={16} />}
              {loading ? "Decoding…" : "Decode statement"}
            </button>
            {text && (
              <button onClick={() => { setText(""); setResult(null); setError(""); }}
                style={{ background: "none", border: "none", color: C.inkSoft, fontSize: 13, cursor: "pointer", fontFamily: mono }}>
                clear
              </button>
            )}
          </div>
        </div>

        {error && (
          <div style={{ display: "flex", gap: 10, marginTop: 16, padding: 14, border: `1px solid ${C.hawk}`, borderRadius: 4, background: "#fbf0ec", color: C.hawk, fontSize: 14 }}>
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>{error}</span>
          </div>
        )}

        {result && (
          <div style={{ marginTop: 24 }}>
           <StancePanel result={result} />
            {result.dimensions && (
              <Section icon={<Activity size={15} />} title="Score breakdown">
                <ScoreBreakdown dimensions={result.dimensions} />
              </Section>
            )}
            <Section icon={<FileText size={15} />} title="Plain-language summary">
              <p style={{ fontSize: 15, lineHeight: 1.65, margin: 0 }}>{result.summary}</p>
            </Section>
            {Array.isArray(result.keySignals) && result.keySignals.length > 0 && (
              <Section icon={<Activity size={15} />} title="Key signals">
                <div style={{ display: "grid", gap: 10 }}>
                  {result.keySignals.map((s, i) => (
                    <div key={i} style={{ borderLeft: `3px solid ${C.ink}`, paddingLeft: 12 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{s.signal}</div>
                      <div style={{ fontSize: 14, color: C.inkSoft, lineHeight: 1.5 }}>{s.interpretation}</div>
                    </div>
                  ))}
                </div>
              </Section>
            )}
            {Array.isArray(result.jargon) && result.jargon.length > 0 && (
              <Section icon={<BookOpen size={15} />} title="Jargon decoded">
                <dl style={{ margin: 0 }}>
                  {result.jargon.map((j, i) => (
                    <div key={i} style={{ padding: "8px 0", borderBottom: i < result.jargon.length - 1 ? `1px solid ${C.line}` : "none" }}>
                      <dt style={{ fontFamily: mono, fontSize: 13, fontWeight: 700, color: C.ink }}>{j.term}</dt>
                      <dd style={{ margin: "2px 0 0", fontSize: 14, color: C.inkSoft, lineHeight: 1.5 }}>{j.definition}</dd>
                    </div>
                  ))}
                </dl>
              </Section>
            )}
            {result.marketImplications && (
              <Section icon={<TrendingUp size={15} />} title="Market implications">
                <p style={{ fontSize: 15, lineHeight: 1.65, margin: 0 }}>{result.marketImplications}</p>
              </Section>
            )}
          </div>
        )}
      </div>
      <style>{`.spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

function StancePanel({ result }) {
  const score = Math.max(-100, Math.min(100, Number(result.stanceScore) || 0));
  const pct = (score + 100) / 2;
  const stanceColor = result.stance === "Hawkish" ? C.hawk : result.stance === "Dovish" ? C.dove : C.neutralAccent;
  return (
    <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 4, padding: 20, marginBottom: 4 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
        <Building2 size={15} style={{ color: C.inkSoft }} />
        <span style={{ fontFamily: mono, fontSize: 12, color: C.inkSoft, textTransform: "uppercase", letterSpacing: "1px" }}>
          {result.institution || "Unspecified central bank"}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 16 }}>
        <span style={{ fontFamily: serif, fontSize: 30, fontWeight: 700, color: stanceColor }}>{result.stance}</span>
        <span style={{ fontFamily: mono, fontSize: 14, color: C.inkSoft }}>score {score > 0 ? `+${score}` : score}</span>
      </div>
      <div style={{ position: "relative", height: 10, borderRadius: 999, background: `linear-gradient(90deg, ${C.dove} 0%, #d8dde2 50%, ${C.hawk} 100%)` }}>
        <div style={{ position: "absolute", top: "50%", left: `${pct}%`, transform: "translate(-50%, -50%)", width: 4, height: 22, background: C.ink, borderRadius: 2, boxShadow: "0 0 0 3px #fff" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontFamily: mono, fontSize: 11, color: C.inkSoft, textTransform: "uppercase", letterSpacing: "1px" }}>
        <span style={{ color: C.dove }}>◄ Dovish · easing</span>
        <span>Neutral</span>
        <span style={{ color: C.hawk }}>Hawkish · tightening ►</span>
      </div>
    </div>
  );
}

const DIM_LABELS = {
  forwardGuidance: "Forward guidance",
  inflation: "Inflation assessment",
  currentAction: "Current action",
  growthLabour: "Growth & labour",
  balanceSheet: "Balance sheet",
  riskBalance: "Risk balance",
};
const DIM_WEIGHTS = {
  forwardGuidance: "35%", inflation: "20%", currentAction: "15%",
  growthLabour: "12%", balanceSheet: "8%", riskBalance: "10%",
};

function ScoreBreakdown({ dimensions }) {
  return (
    <div style={{ display: "grid", gap: 10 }}>
      {Object.keys(DIM_LABELS).map((key) => {
        const dim = dimensions[key] || {};
        const s = Math.max(-2, Math.min(2, Number(dim.score) || 0));
        const barColor = s > 0 ? C.hawk : s < 0 ? C.dove : C.neutralAccent;
        const width = (Math.abs(s) / 2) * 50;
        return (
          <div key={key}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>
                {DIM_LABELS[key]}
                <span style={{ fontFamily: mono, fontSize: 11, color: C.inkSoft, marginLeft: 6 }}>weight {DIM_WEIGHTS[key]}</span>
              </span>
              <span style={{ fontFamily: mono, fontSize: 12, color: barColor }}>{s > 0 ? `+${s}` : s}</span>
            </div>
            <div style={{ position: "relative", height: 6, background: C.line, borderRadius: 999 }}>
              <div style={{ position: "absolute", left: "50%", top: 0, height: "100%", width: 1, background: C.inkSoft }} />
              <div style={{
                position: "absolute", top: 0, height: "100%", borderRadius: 999, background: barColor,
                width: `${width}%`,
                left: s >= 0 ? "50%" : `${50 - width}%`,
              }} />
            </div>
            {dim.note && <div style={{ fontSize: 12, color: C.inkSoft, marginTop: 4, lineHeight: 1.4 }}>{dim.note}</div>}
          </div>
        );
      })}
    </div>
  );
}

function Section({ icon, title, children }) {
  return (
    <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 4, padding: 20, marginTop: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, color: C.ink }}>
        {icon}
        <h2 style={{ fontFamily: mono, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", margin: 0 }}>{title}</h2>
      </div>
      {children}
    </div>
  );
}