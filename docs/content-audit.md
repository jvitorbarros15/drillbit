# Drillbit content audit

Date: 2026-10-23

Scope: all 107 lessons in `data.js` (63 mcq, 6 multi, 6 number, 32 code) and all 18 guides in `guides.js`. Guide widgets in `viz.js` were checked against the guide text.

Method: manual read of every item, then `npm test` (schema, reference solutions and starter checks, all passing). For the test-gap rows, a naive or wrong solution was run against the real tests to confirm it passes. Arithmetic in the number lessons and in explain texts was recomputed by hand.

Counts: WRONG 0, AMBIGUOUS 3, WEAK 7, MINOR 14.

No marked answer was found to be wrong, no number answer or range was off, and every reference solution matches its prompt.

| id | type | severity | problem | suggested fix | status |
|----|------|----------|---------|---------------|--------|
| a502 | code | AMBIGUOUS | The prompt never says `end` must be in `words` (the solution returns 0 if it is missing, and test 2 depends on that). | Add "`end` must also be in `words`" to the prompt. | fixed: prompt now says `end` must be in `words` |
| s509 | multi | AMBIGUOUS | Option 0 (regional Redis, each request does a Lua script) enforces the limit per region, not globally across the 3 regions, and the prompt does not say which is wanted; unsure how intended. | State whether the limit is per region or global, or reword option 0 to say the limit is split per region. | fixed: prompt says the limit is global, answers now [1, 3] and explain rewritten (a regional Redis only counts its own region) |
| s210 | multi | AMBIGUOUS | Option 1 (write through, "same code path") does not say the order, so it overlaps with option 2 (cache first, then database), which the explain calls risky; unsure. | Reword option 1 to "write the database, then update the cache". | fixed: option 1 now reads "write the database, then update the cache", answers unchanged |
| a301 | code | WEAK | `nums.slice().sort().reverse()[k-1]` (default string sort) passes all tests because every value is a single digit, and a sort based answer passes with no large test even though the prompt asks for average O(n); the prompt also does not say duplicates count (test 2 relies on it). | Add a test with values like 10 and 9 and a 100k element test, and say duplicates count in the prompt. | fixed: prompt says duplicates count, added multi digit, negative and 100k shuffled tests, string sort now fails |
| a311 | code | WEAK | `nums.indexOf(target)` passes every test, but the prompt requires O(log n). | Add a test with a 1M element rotated array and many queries. | fixed: four tests on a virtual 500M rotated array with a 500 read budget, linear scan now fails |
| a201 | code | WEAK | A linear scan passes every test, but the prompt requires O(log n). | Add a large sorted array test with many queries or a big array with a late target. | fixed: three tests on a virtual 500M array with a 100 read budget, linear scan now fails |
| a307 | code | WEAK | An array based LRU with O(n) get and put passes all 3 tests, but the prompt requires O(1) for both. | Add a test with about 100k ops and a large capacity. | fixed: test with capacity 100k and 200k ops, array based version takes about 30 s |
| a309 | code | WEAK | `lists.flat().sort((x, y) => x - y)` passes all tests, but the prompt asks for O(N log k). A default `sort()` fails only because of the negative numbers in one test. | Add a test with many lists and a large N, or accept that sorting is fine and relax the prompt. | fixed by relaxing the prompt (heap gives O(N log k), sorting accepted) since timing cannot tell them apart, plus a multi digit test |
| a507 | code | WEAK | A merge then take the middle solution passes (about 70 ms on the 1M element test), and the explain admits it. | Make the big test large enough to time out linear merging, or drop the O(log) requirement from the prompt. | fixed: two tests on virtual 500M arrays with a 1000 read budget, explain updated |
| a102 | code | WEAK | The prompt says "do it in one pass", but a nested loop passes because there is no large test. | Add a 100k element test like a108 has. | fixed: 200k test with the pair at the end, nested loop takes about 17 s |
| s102 | number | MINOR | The explain says "call it 10^5" and then "about 12 per second", but 1M / 10^5 is 10; 12 only comes from 86,400. | Say "1M / 86,400 is about 12 (or about 10 with the 10^5 shortcut)". | fixed: explain gives about 10 with the 10^5 shortcut and about 12 exactly |
| estimation | guide | MINOR | It says to treat a day as 10^5 seconds so "1M a day is about 12 per second", and the method then says divide by 10^5, which gives 10. | Same fix as s102. | fixed: same wording as s102 |
| estimation | guide | MINOR | "US coast to coast about 40 ms round trip" is close to the fiber speed limit, real paths are usually 60 to 70 ms, and "US to Europe 80 ms" differs from s106 (California to Netherlands about 150 ms); unsure which numbers you want. | Use one consistent table and label them as ballpark. | fixed: guide now says 60 to 70 ms coast to coast, 80 ms East Coast to Europe, 150 ms California to the Netherlands; s106 matches |
| a306 | mcq | MINOR | The explain says "with doubling", but CPython lists and V8 arrays grow by smaller factors (the answer text correctly says "geometrically"). | Say "with geometric growth (doubling is the textbook case)". | fixed: explain says geometric growth, doubling as the textbook case |
| a408 | mcq | MINOR | The explain lists Timsort among sorts that "defend against" a bad pivot, but Timsort is a merge sort and has no pivot. | Drop Timsort from that list. | fixed: Timsort removed from the list |
| a101, a506, hashing | mcq, multi, guide | MINOR | They say languages randomize hash seeds because of worst case O(n); true for Python, Ruby and Rust, but not all languages (Java uses tree bins instead). | Say "many languages". | fixed: now says "many languages" |
| big-o | guide | MINOR | "`Array.shift()` is O(n) in JavaScript" is engine dependent (V8 optimizes it for small arrays); a405 repeats it. unsure how much this matters. | Say "can be O(n)". | fixed: now says shift "can be" O(n); a405 explain too |
| sorting-heaps | guide | MINOR | "JavaScript's `sort` is TimSort" is true for V8 only; the spec just requires stability. | Say "V8 uses TimSort, and sort is required to be stable". | fixed: states stable by spec and TimSort in V8 |
| graphs | guide | MINOR | The Kahn snippet treats `[a, b]` as an edge a to b and never builds `adj`, while lesson a303 uses `[a, b]` to mean b before a. | Note the edge direction in the snippet and build `adj`. | fixed: snippet builds `adj`, uses `prereqs` with b before a like a303, and runs |
| scaling | guide | MINOR | "GET, PUT and DELETE are safe to retry" mixes up HTTP "safe" and "idempotent", and the token bucket snippet needs `rate` per time unit of `now` without saying so. | Say "idempotent", and note the unit of `now` and `rate`. | fixed: says idempotent, and the snippet notes seconds and tokens per second |
| a310 | code | MINOR | The explain calls the solution "nearly O(1)", but it uses path halving with no union by rank (guides and a402 mention both). | Say "amortized O(log n), nearly O(1) with union by rank too". | fixed: explain says halving gives amortized O(log n), union by rank gets inverse Ackermann |
| s406, data | mcq, guide | MINOR | "If W + R > N every read overlaps the latest write" is true for strict quorums, but sloppy quorums and clock based last write wins can still return stale data; unsure. | Add "with strict quorums" to the text. | fixed: both say strict quorum, the guide mentions sloppy quorums and clock based resolution |
| reliability | guide | MINOR | The SLO is request based ("99.9% of requests"), but the error budget is expressed as 43 minutes a month, which only holds for a time based SLO. | Say "0.1% of requests, or about 43 minutes a month for a time based SLO". | fixed: budget stated as 0.1% of requests, about 43 minutes only for a time based SLO |
| data | guide | MINOR | "Relational ... The right default" is an opinion stated as fact, next to "pick by access patterns, not by hype". | Say "a good default". | fixed: now "a common default" |

Checked, no issues: algo 56 lessons (27 non code, 29 code) and sd 51 lessons (48 non code, 3 code), other than the rows above, and 18 of 18 guides other than the rows above. All ten viz widgets match their guide text (the six not read in the first pass were read on 2026-10-23 and need no guide change).

a412 (checked while fixing): an O(n³) solution took 4.2 s on the 3,000 character test, which is borderline, so a 5,000 character test was added (the same solution takes about 20 s) and the prompt now mentions both tests.

Fixed on 2026-10-23. `npm run lint` and `npm test` pass.
