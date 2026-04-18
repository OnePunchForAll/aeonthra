# Engine Failure Corpus Plan

## Real bad-output cases to encode as fixtures

- JS-disabled fallback text becoming a concept or task
- LMS navigation chrome and course shell text surviving capture cleaning
- accessibility fallback and hidden-reader text leaking into visible semantics
- truncated fragments such as malformed assignment or heading remnants
- `Week N` wrappers promoted into concepts, tasks, or readiness
- assignment header metadata becoming content
  - due dates
  - points possible
  - submission types
  - allowed attempts
- suspicious structured dates rendered as real due dates
- mixed captures where one real academic concept is present beside large amounts of junk
- discussion/reply scaffolds becoming assignment or concept substrate
- orientation/admin bundles creating fake-semantic readiness or Atlas substrate

## Adversarial synthetic cases

- nested Canvas wrappers with multiple matching content roots
- duplicated wrappers causing repeated extraction
- article/header content where naive stripping would delete true academic headings
- repeated near-duplicate concept wrappers crowding distinct concepts
- multi-item clone families with one real academic outlier
- thin bundles with one definitional sentence and lots of administrative text
- contradictory bundles where two sources disagree about a relation or title
- duplicate evidence lanes that try to populate multiple roles
- malformed entity-encoded HTML and encoding artifacts
- plain-text-only bundles with heading trails that should seed hierarchy
- suspicious date bundles with past, future, unlock, and lock timestamps mixed together

## Structured good cases

- clean textbook chapter with explicit definitions and explanatory passages
- clean assignment metadata with trustworthy structured title and due date
- clean course modules with meaningful headings and body text
- clean discussion with academic substance instead of social scaffolding
- blended Canvas + textbook bundle with shared grounded concepts
- list-heavy academic content that should preserve structure
- table or definition-list content with meaningful evidence boundaries

## Expected recording per corpus item

Every fixture must record:

- fixture id
- source mix and rationale
- expected accepted concepts
- expected suppressed garbage
- expected relations
- expected assignment titles and due-date posture
- expected role visibility or blanking
- expected provenance sufficiency
- expected rejection reasons
- notes on why the case matters

## Coverage gaps to close during implementation

- live-style HTML wrapper diversity from real Canvas captures
- more adversarial date cases across time zones and stale timestamps
- more mixed-format textbook imports
- more repeated-source bundles with one valid academic lane
- more assignment prompts that are short but trustworthy

Coverage is not complete until the benchmark can prove v2 wins on bad, mixed, adversarial, and good structured cases.

## Implemented corpus snapshot (2026-04-17)

Current checked-in benchmark fixtures:

- `hard-noise-js-disabled`
- `fragmentary-title`
- `mixed-noise-and-real-concept`
- `single-page-mixed-live-junk`
- `orientation-salvage`
- `admin-heavy-orientation-clones`
- `clean-textbook-ethics`
- `trusted-assignment`
- `suspicious-date`
- `thin-discussion-salvage`
- `academic-wrapper-dedupe`
- `html-article-header`

Why these matter:

- they encode the exact failure families that were still poisoning the old engine
- they cover both single-item and multi-item mixed bundles
- they include old-engine documented failure fixtures from `packages/content-engine/src/index.test.ts` and `packages/content-engine/src/golden-fixtures.test.ts`
- they exercise both omission-first failure modes and grounded salvage cases
