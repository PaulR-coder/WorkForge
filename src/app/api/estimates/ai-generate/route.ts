import { getSession } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { checkLimit, recordTokens } from '@/lib/tokenUsage'
import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import { apiError } from '@/lib/apiError'

const GenerateSchema = z.object({
  client:      z.string().max(200).optional(),
  jobType:     z.string().max(100).optional(),
  description: z.string().min(1).max(2000),
  trade:       z.string().max(100).optional(),
  trades:      z.array(z.string().max(100)).max(7).optional(),
  sqft:        z.number().positive().optional(),
  jobMode:     z.enum(['new_construction', 'remodel', 'repair']).optional(),
  finishLevel: z.string().max(50).optional(),
  blueprints:  z.array(z.object({
    name:      z.string().max(200),
    data:      z.string(),
    mediaType: z.string().max(50),
  })).max(5).optional(),
})

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return apiError('Unauthorized', 401)
  if (!can(session.role, 'createEstimate')) return apiError('Forbidden', 403)

  if (!process.env.ANTHROPIC_API_KEY) {
    return apiError('AI not configured', 503, 'AI_UNAVAILABLE')
  }

  if (session.tenantId) {
    const { allowed, used } = await checkLimit(session.tenantId)
    if (!allowed) {
      return apiError(`Monthly AI token limit reached (${used.toLocaleString()} used). Resets next month.`, 429, 'AI_LIMIT_REACHED')
    }
  }

  const raw = await req.json().catch(() => null)
  if (!raw) return apiError('Invalid JSON', 400)
  const gr = GenerateSchema.safeParse(raw)
  if (!gr.success) return apiError(gr.error.issues[0].message, 400)
  const { client, jobType, description, trade, trades: tradesArr, sqft, jobMode, finishLevel, blueprints: blueprintsArr } = gr.data

  // Resolve trade list — multi-select (trades[]) takes priority over legacy single trade field
  const tradeList = tradesArr && tradesArr.length > 0 ? tradesArr : trade ? [trade] : []
  const hasBlueprints = !!blueprintsArr && blueprintsArr.length > 0

  const anthropic = new Anthropic()

  const isConstruction = tradeList.length > 0

  const TRADE_KNOWLEDGE: Record<string, string> = {

'Painting': `
PAINTING — LABOR RATES (charge the GC these amounts, labor only):
- New construction interior (prime + 2 coats walls, flat white ceilings, semi-gloss trim): $2.50–$3.50/sqft
- Remodel/renovation interior (prime bare patches, 2 coats walls, semi-gloss trim): $1.75–$2.75/sqft
- Ceilings only (flat white, 2 coats): $0.75–$1.25/sqft
- Trim/baseboards only (semi-gloss, brush): $1.50–$2.50 per linear foot
- Doors (per door, both sides, semi-gloss): $45–$90/door
- Level 5 skim coat prep (additional over standard): $0.50–$1.00/sqft extra
- Exterior painting (prime + 2 coats, residential): $1.75–$3.00/sqft

PAINTING — PHASES AND WHAT THEY INCLUDE:
New construction sequence: (1) Prime all bare drywall with PVA primer, (2) First coat walls, (3) Final coat walls, (4) Ceilings flat white 2 coats, (5) Trim/doors semi-gloss 2 coats brush only
Remodel sequence: (1) Spackle all holes + sand, (2) Prime repaired spots, (3) 2 coats walls, (4) Trim touch-up or full repaint

PAINTING — MATERIALS (bill at cost + 15% markup):
- Sherwin-Williams ProMar 200 interior latex: $45–$55/gallon (covers 400 sqft/coat)
- Kilz PVA primer (new drywall): $28–$35/gallon (covers 300–400 sqft)
- Kilz 2 or Zinsser BIN (stain blocking, remodel): $35–$45/gallon
- Benjamin Moore Regal or SW Emerald (premium upgrade): $70–$85/gallon
- Roller covers (3/8" for smooth, 1/2" for texture): $3–$5 each, 1 per 500 sqft
- 2" angled brushes: $8–$12 each
- 3M Blue Tape / Frog Tape: $8–$12/roll, 1 roll per 200 sqft trim
- Drop cloths (reusable canvas): included in overhead, do not bill separately

PAINTING — COMMON LINE ITEMS FOR GC BIDS:
1. "Interior wall painting — prime + 2 finish coats" — labor per sqft × total wall sqft
2. "Ceiling painting — flat white 2 coats" — labor per sqft × ceiling sqft
3. "Trim and baseboard painting — semi-gloss" — labor per linear foot × LF
4. "Interior doors — semi-gloss both sides" — per door × quantity
5. "Paint materials — primer, finish coat, ProMar 200" — gallons × unit price + 15% markup
6. "Surface prep — spackle, sand, tape" — lump sum or per sqft

PAINTING — DO NOT INCLUDE (excluded from scope unless noted):
- Wallpaper removal (separate line item, $1–$2/sqft)
- Drywall repairs beyond minor spackle (drywall sub's scope)
- Pressure washing exterior before paint (add-on, $0.15–$0.25/sqft)
- Moving furniture (homeowner/GC responsibility)
`,

'Drywall': `
DRYWALL — LABOR RATES (charge the GC, labor only):
- Hang only (no finishing): $0.60–$0.90/sqft
- Hang + tape + Level 4 finish (standard, paint-ready): $1.75–$2.50/sqft new construction, $2.00–$2.75/sqft remodel
- Hang + tape + Level 5 finish (skim coat, premium): $2.50–$3.25/sqft
- Tape and finish only (framing/hanging by others): $1.00–$1.50/sqft Level 4, $1.50–$2.00/sqft Level 5
- Repairs / patches (per patch): $75–$200 depending on size
- Fire-rated assembly (Type X, 5/8"): add $0.25–$0.50/sqft to any above

DRYWALL — FINISH LEVELS (know these for every bid):
- Level 0: No taping, no finish — temporary or to be demolished
- Level 1: Tape embedded, no finish — above ceilings, fire blocking only
- Level 2: Tape + one coat compound — tile backer, garage, utility
- Level 3: Tape + 2 coats, sanded — textured walls, light texture only
- Level 4: Tape + 3 coats, sanded smooth — STANDARD for paint-ready residential and commercial
- Level 5: Level 4 + full skim coat over entire surface — premium finish, gloss paint, critical lighting

DRYWALL — BOARD TYPES AND WHERE USED:
- 1/2" standard (most common): all standard interior walls and ceilings
- 5/8" Type X (fire-rated): garages (per code), party walls, fire-rated assemblies — required by code in many locations
- 1/2" moisture-resistant (purple board / green board): bathrooms, laundry rooms — NOT showers
- 5/8" moisture-resistant: wet areas with tile backing
- Never use regular drywall in showers — cement board required (tile sub's responsibility)

DRYWALL — MATERIALS (bill at cost + 15% markup):
- 1/2" standard drywall 4×8 sheet: $10–$14/sheet (covers 32 sqft)
- 5/8" Type X 4×8: $13–$17/sheet
- 1/2" moisture-resistant 4×8: $14–$18/sheet
- Joint compound (5-gallon bucket): $18–$24, covers ~200 sqft
- Paper tape (75-ft roll): $3–$5
- Corner bead (metal, 8-ft stick): $2.50–$4.00 each
- J-bead (for exposed edges): $2–$3.50/stick
- Drywall screws (5-lb box): $12–$15

DRYWALL — COMMON LINE ITEMS FOR GC BIDS:
1. "Drywall — hang and tape Level 4 finish" — sqft × rate
2. "5/8" Type X fire-rated drywall — garage/party wall" — sqft × rate + upcharge
3. "Moisture-resistant board — bathrooms" — sqft × rate
4. "Drywall materials — board, compound, tape, screws" — quantity × price + 15% markup
5. "Metal corner bead — all outside corners" — quantity × unit price
6. "Ceiling drywall — hang and Level 4 finish" — ceiling sqft × rate

DRYWALL — DO NOT INCLUDE:
- Framing (framing sub's scope)
- Insulation (separate sub)
- Rough mechanical (must be inspected before boarding)
- Tile backer in showers (tile sub provides cement board)
`,

'Demolition': `
DEMOLITION — LABOR RATES (charge the GC, labor only):
- Full interior gut (remove everything — drywall, flooring, ceilings, fixtures, cabinets): $5–$8/sqft
- Partial gut (drywall + flooring, structure stays): $3–$5/sqft
- Drywall removal only (selective): $1.00–$1.75/sqft
- Ceiling drywall removal only: $1.25–$2.00/sqft
- Tile removal (floor tile + adhesive scraping): $2–$4/sqft
- Carpet removal only: $0.35–$0.65/sqft
- Hardwood/LVP/laminate removal: $0.50–$1.00/sqft
- Cabinet removal (kitchen or bath): $200–$500 per kitchen set, $75–$150 per bath vanity
- Fixture removal (toilet, vanity, tub): $75–$150 per fixture
- Door and frame removal: $75–$125 per opening
- Flooring removal — all types, broom clean subfloor: $0.75–$1.50/sqft

DEMOLITION — DEBRIS HAULING:
- Dumpster on site (GC provides): no hauling charge — include loading only
- Dumpster not on site, we haul: add $300–$600 for 1-ton load, $500–$900 for 2-ton load
- Always confirm dumpster situation before bidding

DEMOLITION — WHAT IS INCLUDED IN EVERY JOB:
- Written scope confirming exactly what gets removed and what stays
- Job site walked with GC before crew starts
- All areas to be demoed marked or confirmed
- Site left broom clean after demo
- Subfloor swept, no protruding fasteners

DEMOLITION — SAFETY REQUIREMENTS (always in scope, never negotiable):
- Electrical, plumbing, and gas confirmed OFF before crew starts — GC confirms in writing
- Asbestos clearance required for buildings built before 1980
- Lead paint clearance required for buildings built before 1978
- Visual mold inspection before starting — stop and call GC if found
- Demo permit number confirmed with GC

DEMOLITION — COMMON LINE ITEMS FOR GC BIDS:
1. "Selective interior demolition — drywall and flooring" — sqft × rate
2. "Flooring removal — tile/carpet/hardwood" — sqft × rate per flooring type
3. "Fixture removal — toilet, vanity, tub" — quantity × unit price
4. "Cabinet removal — kitchen" — lump sum
5. "Debris loading and disposal" — lump sum based on volume
6. "Subfloor cleanup — scrape adhesive, pull nails, broom clean" — sqft × rate or lump sum

DEMOLITION — DO NOT INCLUDE:
- Load-bearing wall removal (structural engineer required, never do without written GC approval)
- Asbestos or lead abatement (licensed abatement contractor required)
- Mold remediation (separate licensed contractor)
- Anything outside the written scope
`,

'Tile': `
TILE — LABOR RATES (charge the GC, labor only):
- Standard floor tile — ceramic or porcelain (12×12 to 16×16): $5–$8/sqft
- Large format floor tile (18×18 and up): $7–$11/sqft
- Wall tile — standard (bathroom, kitchen): $8–$14/sqft
- Shower complete — floor pan + all walls + niche (labor only): $12–$20/sqft (measure total tile area)
- Natural stone (marble, travertine) — add $3–$5/sqft to any above
- Mosaic / small tile / herringbone pattern — add $2–$4/sqft (extra cuts + labor)
- Backsplash: $18–$35 per linear foot
- Tile removal (demo, includes adhesive scraping): $2–$4/sqft (see Demolition)

TILE — SUBSTRATE REQUIREMENTS (always confirm before pricing):
- Floor over concrete slab: tile directly, slab must be flat within 3/16" over 10 feet
- Floor over wood subfloor: Schluter Ditra ($1.50–$2.50/sqft installed) OR 1/2" cement board ($0.75–$1.25/sqft)
- Shower walls: cement board or foam board (Wedi) — if not installed by drywall sub, add to scope
- Shower floor: slope to drain must be 1/4" per foot — mud bed if not pre-sloped

TILE — WATERPROOFING FOR SHOWERS (always required in wet areas):
- RedGard liquid membrane: $35–$55/gallon, covers ~40 sqft/gallon at 2 coats
- Schluter Kerdi sheet membrane: $2.50–$4/sqft material
- Wedi board system: $4–$6/sqft material
- Waterproofing labor (apply membrane, embed corners, tape seams): $2–$4/sqft for liquid systems
- Flood test (24-hour): included in scope, no extra charge

TILE — MATERIALS (bill at cost + 15% markup — materials usually supplied by GC, but know costs):
- Standard porcelain tile (12×12 to 16×16): $1.50–$4/sqft depending on quality
- Large format (18×18+): $3–$8/sqft
- Natural stone (travertine, marble): $5–$15/sqft
- Glass tile (backsplash): $8–$20/sqft
- Polymer-modified thinset (gray, 50-lb bag): $25–$35, covers ~40 sqft
- White thinset (for light tile/stone): $28–$38/bag
- Large-format non-sag thinset: $35–$50/bag
- Sanded grout (10-lb bag): $18–$28, covers ~50 sqft at 3/16" joint
- Unsanded grout: $16–$24/bag
- Schluter Jolly edge trim (8-ft stick): $18–$28 each
- Schluter Rondec corner trim: $20–$32 each
- Tile leveling system clips + wedges: $0.10–$0.20/tile

TILE — COMMON LINE ITEMS FOR GC BIDS:
1. "Floor tile installation — [size] porcelain" — sqft × labor rate
2. "Shower tile — floor pan + walls complete" — total tile sqft × rate
3. "Waterproofing membrane — RedGard/Kerdi — shower" — sqft × rate
4. "Cement board / Schluter Ditra substrate" — sqft × rate (if in scope)
5. "Schluter edge and transition trim" — linear feet × unit price
6. "Grout and thinset materials" — sqft-based quantity × unit price + 15%
7. "Tile demo and subfloor prep" — sqft × demo rate

TILE — DO NOT INCLUDE:
- Plumbing rough-in, drain installation (plumbing sub)
- Heated floor cable/mat (electrical sub)
- Grouting sealed stone without sealer charge (always seal natural stone first)
`,

'Flooring - LVP': `
FLOORING LVP (LUXURY VINYL PLANK) — LABOR RATES (charge the GC, labor only):
- LVP click-lock floating install (standard rooms): $1.50–$2.50/sqft
- LVP with complex cuts (many angles, small rooms, lots of obstacles): $2.00–$3.00/sqft
- LVP on stairs — stair nose install: $25–$45 per step
- Subfloor prep — grind high spots, fill low spots: $0.50–$1.50/sqft additional
- Transition installation (T-molding, reducer, end cap): $35–$65 per transition, includes hardware

FLOORING LVP — WHAT IS INCLUDED IN A STANDARD INSTALL:
- Acclimation of product (24–48 hours — included in scheduling, not billed)
- Layout planning, chalk lines, expansion gap maintenance
- Underlayment installation if required by product spec
- Moisture barrier over concrete slab (6-mil poly)
- Cutting and fitting all planks including cuts at doors, closets, heat vents
- Transition installation at all doorways and flooring changes
- Sweep clean of installed floor

FLOORING LVP — MATERIALS (bill at cost + 15% markup — usually GC-supplied):
- LVP plank (builder-grade): $1.50–$2.50/sqft
- LVP plank (mid-range, 6mm–8mm): $2.50–$4.00/sqft
- LVP plank (premium, 12mm): $4.00–$7.00/sqft
- 2mm foam underlayment: $0.15–$0.25/sqft (do not add if plank has attached pad)
- 6-mil poly moisture barrier: $0.05–$0.10/sqft
- T-molding transition: $28–$45 each
- Reducer transition: $25–$40 each
- Stair nose: $35–$60 per step

FLOORING LVP — IMPORTANT RULES FOR BIDDING:
- Always confirm if LVP has attached underlayment before pricing separate underlayment
- Always include moisture barrier over concrete slab even if LVP is "waterproof"
- Expansion gap (1/4" minimum) is non-negotiable — failure = callback in Tampa heat
- Run direction: usually parallel to longest wall or per GC direction — confirm before starting
- Flooring not included: baseboards or quarter-round installation (separate line item if GC requests)

FLOORING LVP — COMMON LINE ITEMS FOR GC BIDS:
1. "LVP flooring installation — click-lock floating" — sqft × rate
2. "Subfloor prep — level and clean" — sqft × rate (if needed)
3. "Moisture barrier — 6-mil poly over slab" — sqft × rate
4. "Underlayment" — sqft × rate (only if not attached to plank)
5. "Transition strips — T-molding at doorways" — quantity × unit price
6. "LVP stair nosing installation" — quantity × per-step rate

FLOORING LVP — DO NOT INCLUDE:
- Tile or hardwood in adjacent rooms (separate line items)
- Removing existing flooring (add demolition line if in scope)
- Moving appliances or furniture (GC/homeowner responsibility unless agreed)
`,

'Flooring - Hardwood': `
FLOORING HARDWOOD — LABOR RATES (charge the GC, labor only):
- Engineered hardwood — floating (click-lock): $2.00–$3.50/sqft
- Engineered hardwood — glue-down over slab: $2.50–$4.50/sqft
- Engineered hardwood — nail/staple over plywood: $2.50–$4.00/sqft
- Solid hardwood — nail/staple (plywood subfloor only): $3.00–$5.00/sqft
- Hardwood stairs — nail-down treads: $55–$90 per step
- Subfloor prep: $0.50–$1.50/sqft additional

FLOORING HARDWOOD — ACCLIMATION (always required, build into timeline):
- Engineered hardwood: 48–72 hours in the room at living temperature
- Solid hardwood: 3–7 days minimum (critical in Tampa humidity)
- HVAC must be running during acclimation — no exceptions
- Build acclimation time into the project schedule before billing start

FLOORING HARDWOOD — MATERIALS (bill at cost + 15% markup):
- Engineered hardwood (3/4" wear layer, 5" wide planks): $4–$8/sqft
- Engineered hardwood (premium, 7"+ wide): $7–$12/sqft
- Solid hardwood (prefinished 3/4"): $5–$10/sqft
- Urethane flooring adhesive (glue-down method): $40–$65/gallon, covers ~30 sqft
- 6-mil poly moisture barrier (over slab): $0.05–$0.10/sqft
- Flooring cleats/staples (1,000-count box): $18–$25
- Transitions (T-molding, reducer): $30–$55 each

FLOORING HARDWOOD — FLORIDA-SPECIFIC RULES:
- Solid hardwood over concrete slab is almost always wrong in Florida — use engineered instead
- Slab moisture test required before any hardwood install (plastic sheet test minimum)
- If moisture test fails: stop, document in writing, call GC — do not install
- Tampa humidity causes solid wood to expand significantly in summer — acclimation is not optional

FLOORING HARDWOOD — COMMON LINE ITEMS FOR GC BIDS:
1. "Engineered hardwood installation — floating/glue-down/nail" — sqft × rate
2. "Moisture barrier — 6-mil poly over slab" — sqft × rate
3. "Moisture testing — slab RH and plastic sheet test" — lump sum $75–$150
4. "Subfloor prep — level and sand squeaky areas" — sqft or lump sum
5. "Hardwood transition strips" — quantity × unit price
6. "Hardwood stair installation" — steps × per-step rate
`,

'Flooring - Carpet': `
FLOORING CARPET — LABOR RATES (charge the GC, labor only):
- Carpet installation — standard residential (cut pile, loop): $0.50–$1.00/sqft
- Carpet with complex seaming or pattern matching: $0.80–$1.25/sqft
- Carpet on stairs (per step, includes riser): $18–$35/step
- Carpet removal before re-carpet: $0.25–$0.45/sqft (add to scope if needed)
- Tack strip installation (new): $0.15–$0.25 per linear foot

FLOORING CARPET — WHAT IS INCLUDED:
- Tack strip installation around full perimeter
- Pad cutting and stapling (staples every 6–8 inches)
- Carpet stretching with power stretcher (never knee-kicker only)
- Seaming with heat-bond tape and seam iron
- Trimming and tucking all edges
- Transition installation at doorways
- Vacuum and cleanup

FLOORING CARPET — MATERIALS (bill at cost + 15% markup — usually GC-supplied):
- Carpet — builder grade (residential new construction): $1.00–$2.00/sqft
- Carpet — mid-grade: $2.00–$4.00/sqft
- Carpet — premium: $4.00–$8.00+/sqft
- 6 lb rebond pad (standard residential): $0.35–$0.55/sqft
- 8 lb memory foam pad (upgrade): $0.60–$0.90/sqft
- Tack strips (50-count box): $28–$38
- Seam tape (35-ft roll): $12–$18
- Carpet transition (metal bar): $15–$28 each

FLOORING CARPET — IMPORTANT RULES FOR BIDDING:
- Power stretcher is required — knee kicker alone = callback. Always use power stretcher.
- Seams must be placed in low-traffic areas — never in doorways
- Pile direction: always run toward primary light source
- Always check door clearance before installing — carpet + pad raises floor ~5/8"–3/4"
- Pattern carpet: add 10–15% overage to material qty for pattern matching

FLOORING CARPET — COMMON LINE ITEMS FOR GC BIDS:
1. "Carpet installation — pad and stretch" — sqft × rate
2. "Carpet stair installation" — steps × per-step rate
3. "Tack strip installation — perimeter" — linear feet × rate
4. "Carpet pad — 6 lb rebond" — sqft × rate (if materials in scope)
5. "Carpet material" — sqft + 10% overage × unit price + 15% markup (if materials in scope)
6. "Transition strips at doorways" — quantity × unit price
`,

  }

  const jobModeLabel = jobMode === 'new_construction' ? 'New Construction' : jobMode === 'remodel' ? 'Remodel/Renovation' : jobMode === 'repair' ? 'Repair' : ''

  type Blueprint = { name: string; data: string; mediaType: string }

  function buildMessageContent(
    promptText: string,
    bps?: Blueprint[]
  ): Anthropic.MessageParam['content'] {
    if (!bps || bps.length === 0) return promptText
    const blocks: Array<Anthropic.ImageBlockParam | Anthropic.DocumentBlockParam | Anthropic.TextBlockParam> = []
    for (const bp of bps) {
      if (bp.mediaType === 'application/pdf') {
        blocks.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: bp.data }, title: bp.name })
      } else if (['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(bp.mediaType)) {
        blocks.push({ type: 'image', source: { type: 'base64', media_type: bp.mediaType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp', data: bp.data } })
      }
    }
    blocks.push({ type: 'text', text: promptText })
    return blocks
  }

  function buildConstructionPrompt(t: string, withBlueprints: boolean): string {
    const knowledge = TRADE_KNOWLEDGE[t] ?? ''
    const drawingNote = withBlueprints ? `
ATTACHED DRAWINGS:
Blueprints or schematics are attached. Before estimating:
1. Read all dimensions, room labels, and notes visible in the drawings
2. Use drawing measurements to calculate quantities (override the provided sqft if drawings are more precise)
3. Note special conditions shown (wet areas, ceiling heights, fire-rated walls, etc.)
4. Your line items should reference what you measured from the plans
` : ''
    return `You are an expert construction subcontractor estimating assistant for Forge Group Contracting LLC, a Tampa, FL subcontracting company. You have deep knowledge of Tampa market pricing.
${drawingNote}
Generate a professional, accurate, line-item bid for this trade using the knowledge below.

JOB DETAILS:
- Trade: ${t}
- Job Mode: ${jobModeLabel || jobType || 'General'}
- Square Footage: ${sqft ? `${sqft} sqft` : 'not specified — use best judgment'}
- Finish Level: ${finishLevel || 'standard'}
- Client / GC: ${client || 'General Contractor'}
- Additional Details: ${description || 'None'}

TRADE KNOWLEDGE AND PRICING REFERENCE:
${knowledge}

INSTRUCTIONS:
- ${withBlueprints ? 'Use dimensions from the drawings to calculate quantities; be specific about what you read from the plans' : 'Use sqft and job mode to calculate realistic totals'}
- Separate labor and materials into individual line items
- Use high end of rates for new construction, low-to-mid for remodel, low for repair
- Apply 15% markup on all materials
- Include 3–5 line items — no more, no less
- Be specific (e.g. "Interior wall painting — prime + 2 coats, ProMar 200" not just "painting")
- Use "hours" field for labor lines, "qty" field for material/supply lines
- Totals must be correct: hours × unitPrice = total OR qty × unitPrice = total

Return ONLY a valid JSON array, no markdown, no text outside the array. Each object:
- "description" (string)
- "unitPrice" (number)
- "total" (number)
- "hours" (number, optional) — labor lines only
- "qty" (number, optional) — material/supply lines only`
  }

  function buildGeneralPrompt(withBlueprints: boolean): string {
    const drawingNote = withBlueprints ? `\nBlueprints or drawings are attached — analyze them to determine scope and quantities before estimating.\n` : ''
    return `You are a field service estimating assistant specializing in HVAC, electrical, plumbing, refrigeration, and general industrial maintenance.
${drawingNote}
Generate realistic estimate line items for this service call:
Client: ${client || 'Unknown'}
Job Type: ${jobType || 'General Service'}
Description: ${description}

Return ONLY a valid JSON array with no markdown. Each object:
- "description" (string)
- "unitPrice" (number)
- "total" (number)
- "hours" (number, optional)
- "qty" (number, optional)

Include 3–6 line items. Be realistic with pricing.`
  }

  function parseItems(text: string): object[] {
    const cleaned = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
    const parsed = JSON.parse(cleaned)
    return Array.isArray(parsed) ? parsed : []
  }

  let totalInputTokens = 0
  let totalOutputTokens = 0

  try {
    if (!isConstruction) {
      // General service job — single call
      const msg = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        messages: [{ role: 'user', content: buildMessageContent(buildGeneralPrompt(hasBlueprints), blueprintsArr) }],
      })
      totalInputTokens += msg.usage.input_tokens
      totalOutputTokens += msg.usage.output_tokens
      const text = msg.content[0].type === 'text' ? msg.content[0].text.trim() : '[]'
      const items = parseItems(text)
      const tagged = items.map((item, i) => ({ id: `ai-${Date.now()}-${i}`, ...item }))
      if (session.tenantId) await recordTokens(session.tenantId, totalInputTokens, totalOutputTokens)
      return Response.json({ lineItems: tagged })
    }

    if (tradeList.length === 1) {
      // Single trade — one call
      const msg = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        messages: [{ role: 'user', content: buildMessageContent(buildConstructionPrompt(tradeList[0], hasBlueprints), blueprintsArr) }],
      })
      totalInputTokens += msg.usage.input_tokens
      totalOutputTokens += msg.usage.output_tokens
      const text = msg.content[0].type === 'text' ? msg.content[0].text.trim() : '[]'
      const items = parseItems(text)
      const tagged = items.map((item, i) => ({ id: `ai-${Date.now()}-${i}`, ...item }))
      if (session.tenantId) await recordTokens(session.tenantId, totalInputTokens, totalOutputTokens)
      return Response.json({ lineItems: tagged })
    }

    // Multiple trades — parallel calls, combine with section headers
    const results = await Promise.all(
      tradeList.map(async (t) => {
        const msg = await anthropic.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 1024,
          messages: [{ role: 'user', content: buildMessageContent(buildConstructionPrompt(t, hasBlueprints), blueprintsArr) }],
        })
        totalInputTokens += msg.usage.input_tokens
        totalOutputTokens += msg.usage.output_tokens
        const text = msg.content[0].type === 'text' ? msg.content[0].text.trim() : '[]'
        const items = parseItems(text)
        return { trade: t, items }
      })
    )

    if (session.tenantId) await recordTokens(session.tenantId, totalInputTokens, totalOutputTokens)

    // Build flat list with section header dividers between trades
    const combined: object[] = []
    const ts = Date.now()
    results.forEach(({ trade: t, items }, ri) => {
      // Section header — zero-value divider row
      combined.push({ id: `section-${ts}-${ri}`, description: `── ${t} ──`, unitPrice: 0, total: 0 })
      items.forEach((item, ii) => {
        combined.push({ id: `ai-${ts}-${ri}-${ii}`, ...item })
      })
    })

    return Response.json({ lineItems: combined })

  } catch (err) {
    const msg = err instanceof SyntaxError ? 'Failed to parse AI response' : 'AI generation failed'
    return apiError(msg, 500)
  }
}
