# Drillbit content audit

Date: 2026-10-23

Scope: all 107 lessons in `data.js` (63 mcq, 6 multi, 6 number, 32 code) and all 18 guides in `guides.js`. Guide widgets in `viz.js` were spot checked (lru, estimator, ring, dp), not read in full.

Method: manual read of every item, then `npm test` (schema, reference solutions and starter checks, all passing). For the test-gap rows, a naive or wrong solution was run against the real tests to confirm it passes. Arithmetic in the number lessons and in explain texts was recomputed by hand.

Counts: WRONG 0, AMBIGUOUS 3, WEAK 7, MINOR 14.

No marked answer was found to be wrong, no number answer or range was off, and every reference solution matches its prompt.

| id | type | severity | problem | suggested fix |
|----|------|----------|---------|---------------|
| a502 | code | AMBIGUOUS | The prompt never says `end` must be in `words` (the solution returns 0 if it is missing, and test 2 depends on that). | Add "`end` must also be in `words`" to the prompt. |
| s509 | multi | AMBIGUOUS | Option 0 (regional Redis, each request does a Lua script) enforces the limit per region, not globally across the 3 regions, and the prompt does not say which is wanted; unsure how intended. | State whether the limit is per region or global, or reword option 0 to say the limit is split per region. |
| s210 | multi | AMBIGUOUS | Option 1 (write through, "same code path") does not say the order, so it overlaps with option 2 (cache first, then database), which the explain calls risky; unsure. | Reword option 1 to "write the database, then update the cache". |
| a301 | code | WEAK | `nums.slice().sort().reverse()[k-1]` (default string sort) passes all tests because every value is a single digit, and a sort based answer passes with no large test even though the prompt asks for average O(n); the prompt also does not say duplicates count (test 2 relies on it). | Add a test with values like 10 and 9 and a 100k element test, and say duplicates count in the prompt. |
| a311 | code | WEAK | `nums.indexOf(target)` passes every test, but the prompt requires O(log n). | Add a test with a 1M element rotated array and many queries. |
| a201 | code | WEAK | A linear scan passes every test, but the prompt requires O(log n). | Add a large sorted array test with many queries or a big array with a late target. |
| a307 | code | WEAK | An array based LRU with O(n) get and put passes all 3 tests, but the prompt requires O(1) for both. | Add a test with about 100k ops and a large capacity. |
| a309 | code | WEAK | `lists.flat().sort((x, y) => x - y)` passes all tests, but the prompt asks for O(N log k). A default `sort()` fails only because of the negative numbers in one test. | Add a test with many lists and a large N, or accept that sorting is fine and relax the prompt. |
| a507 | code | WEAK | A merge then take the middle solution passes (about 70 ms on the 1M element test), and the explain admits it. | Make the big test large enough to time out linear merging, or drop the O(log) requirement from the prompt. |
| a102 | code | WEAK | The prompt says "do it in one pass", but a nested loop passes because there is no large test. | Add a 100k element test like a108 has. |
| s102 | number | MINOR | The explain says "call it 10^5" and then "about 12 per second", but 1M / 10^5 is 10; 12 only comes from 86,400. | Say "1M / 86,400 is about 12 (or about 10 with the 10^5 shortcut)". |
| estimation | guide | MINOR | It says to treat a day as 10^5 seconds so "1M a day is about 12 per second", and the method then says divide by 10^5, which gives 10. | Same fix as s102. |
| estimation | guide | MINOR | "US coast to coast about 40 ms round trip" is close to the fiber speed limit, real paths are usually 60 to 70 ms, and "US to Europe 80 ms" differs from s106 (California to Netherlands about 150 ms); unsure which numbers you want. | Use one consistent table and label them as ballpark. |
| a306 | mcq | MINOR | The explain says "with doubling", but CPython lists and V8 arrays grow by smaller factors (the answer text correctly says "geometrically"). | Say "with geometric growth (doubling is the textbook case)". |
| a408 | mcq | MINOR | The explain lists Timsort among sorts that "defend against" a bad pivot, but Timsort is a merge sort and has no pivot. | Drop Timsort from that list. |
| a101, a506, hashing | mcq, multi, guide | MINOR | They say languages randomize hash seeds because of worst case O(n); true for Python, Ruby and Rust, but not all languages (Java uses tree bins instead). | Say "many languages". |
| big-o | guide | MINOR | "`Array.shift()` is O(n) in JavaScript" is engine dependent (V8 optimizes it for small arrays); a405 repeats it. unsure how much this matters. | Say "can be O(n)". |
| sorting-heaps | guide | MINOR | "JavaScript's `sort` is TimSort" is true for V8 only; the spec just requires stability. | Say "V8 uses TimSort, and sort is required to be stable". |
| graphs | guide | MINOR | The Kahn snippet treats `[a, b]` as an edge a to b and never builds `adj`, while lesson a303 uses `[a, b]` to mean b before a. | Note the edge direction in the snippet and build `adj`. |
| scaling | guide | MINOR | "GET, PUT and DELETE are safe to retry" mixes up HTTP "safe" and "idempotent", and the token bucket snippet needs `rate` per time unit of `now` without saying so. | Say "idempotent", and note the unit of `now` and `rate`. |
| a310 | code | MINOR | The explain calls the solution "nearly O(1)", but it uses path halving with no union by rank (guides and a402 mention both). | Say "amortized O(log n), nearly O(1) with union by rank too". |
| s406, data | mcq, guide | MINOR | "If W + R > N every read overlaps the latest write" is true for strict quorums, but sloppy quorums and clock based last write wins can still return stale data; unsure. | Add "with strict quorums" to the text. |
| reliability | guide | MINOR | The SLO is request based ("99.9% of requests"), but the error budget is expressed as 43 minutes a month, which only holds for a time based SLO. | Say "0.1% of requests, or about 43 minutes a month for a time based SLO". |
| data | guide | MINOR | "Relational ... The right default" is an opinion stated as fact, next to "pick by access patterns, not by hype". | Say "a good default". |

Checked, no issues: algo 56 lessons (27 non code, 29 code) and sd 51 lessons (48 non code, 3 code), other than the rows above, and 18 of 18 guides other than the rows above. Viz widgets lru, estimator, ring and dp match their guide text; bsearch, window, monostack, heap, bfs and complexity were not read.
