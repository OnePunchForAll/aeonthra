# distinct-evidence-scoring

Prevents structural repetition from inverting concept ranking in synthesis.
Repeated boilerplate items (reflection prompts, clone discussions) must NOT
outrank genuine academic concepts just because they appear more often.

## Core problem

When a course has 8 identical "Reflection Activity" items and 2 textbook chapters,
raw frequency scoring would rank "Reflection Activity" highly. This inverts real
instructor emphasis. Clone-bucket weighting corrects this.

## Structural clone detection

Fingerprint: `${item.title} ${item.plainText}`.toLowerCase().normalize().slice(0, 80)

Group items with identical fingerprints into "clone families".
Items with fingerprint length < 8 chars are excluded (near-empty chrome wrappers).

## Diversity weights

| Family rank | Weight | Rationale |
|------------|--------|-----------|
| First member | 1.0 | Full signal — this item genuinely supports the concept |
| Second member | 0.3 | Weak corroboration — repetition suggests emphasis but not independence |
| Third+ member | 0.05 | Noise — structural duplication, not independent evidence |

**Textbook items bypass discounting** — they are structurally distinct by design.

## Support score formula (after weighting)

```
supportScore =
  concept.score               // extraction quality from mining pass
  + relationCount * 10        // graph connectivity
  + sourceCount * 7           // recurrence across DISTINCT items
  + weightedCanvas * 14       // diversity-weighted canvas evidence
  + weightedTextbook * 14     // diversity-weighted textbook evidence
  + weightedAssignment * 12   // diversity-weighted assignment/discussion/quiz
  + verbHits * 6              // explicit instructor verbs (analyze, compare…)
  + min(keywords, 6) * 2      // keyword abundance (capped)
```

## Thresholds (unchanged by weighting)

- ≥ 90: stable from any strong signal mix
- ≥ 72 with Canvas + textbook both present: cross-source concepts survive
- ≥ 68 with assignment + textbook both present: assessment-aligned concepts survive

## Required outcome

After weighting:
- Repeated reflection activities do NOT dominate top concepts
- Textbook definitions and distinct academic evidence outrank boilerplate
- Clone families beyond the first member contribute <1/20th of their naive weight

## Implementation file
`packages/content-engine/src/synthesis.ts`
Functions: `buildCloneFamilies()`, `buildDiversityWeights()`, `buildConceptSupport()`
