# Central Bank Decoder

**Live:** [central-bank-decoder.vercel.app](https://central-bank-decoder.vercel.app)

An AI-powered tool that translates dense central bank communications — FOMC statements, ECB press releases, Bank of England MPC summaries — into a policy stance, a plain-language summary, the key signals, and a glossary of the jargon used in the text.

Paste in any statement and the tool returns:
- **Policy stance** on a hawk–dove scale, with a score from -100 (maximally dovish) to +100 (maximally hawkish)
- **A plain-language summary** of what the central bank actually decided
- **Key signals** — the specific phrases that matter and why
- **A jargon glossary** defining the technical terms that appear in the text
- **Likely market implications**

---

## Why this exists

Central bank communication is one of the most market-moving forms of writing in the world, and one of the least accessible. A single shift from "the Committee anticipates ongoing increases" to "the Committee will assess the appropriate stance" can move trillions in bond markets — yet the language is deliberately hedged, technical, and easy to misread.

The core skill of a central-bank watcher is locating a statement on the **hawk–dove spectrum**: how much is the bank prioritising price stability (hawkish — willing to tighten and tolerate weaker growth) versus growth and employment (dovish — willing to ease and tolerate higher inflation). This tool makes that read explicit and explains the reasoning behind it.

## How the stance is assessed

Hawkishness is not driven by any single word. The model weighs several dimensions of a statement, roughly in this order of importance:

- **Forward guidance** — what the bank signals about future moves. This matters most, because markets trade the expected path, not today's decision.
- **Inflation assessment** — whether inflation is described as elevated and persistent (hawkish) or easing and on-track (dovish).
- **The current action** — the hike, hold, or cut itself.
- **Growth and labour** — strong/robust language supports a hawkish read; cooling/softening supports a dovish one.
- **Balance sheet** — quantitative tightening (runoff) is hawkish; QE or pausing runoff is dovish.
- **Risk balance and tone** — where the bank says the risks are skewed.

A key limitation, stated plainly: the tool scores a statement's **absolute** tone. In practice, markets react to tone **relative to expectations and to the previous statement** — a statement can be objectively hawkish yet trade as dovish if it is *less* hawkish than expected. A statement-comparison feature (diffing against the prior release) is the natural next step.

## How it works

- **Frontend:** React + Vite. A single-page interface with the hawk–dove gauge as the signature element.
- **Backend:** A Vercel serverless function (`/api/decode`) that holds the API credentials and calls the Anthropic API. The key is never exposed to the browser — it lives only in Vercel's encrypted environment variables.
- **Model:** Claude (Sonnet), prompted to return a strict JSON structure that the frontend renders into the gauge, summary, signals, glossary, and implications.

## Running locally