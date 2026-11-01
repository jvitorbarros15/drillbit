// Study guides. Each one covers a set of lesson topics and links to practice for them.
// Body format: blank line between blocks, "## " heading, "- " bullets, ~~~ fenced code,
// \`inline code\`, **bold**, and "::viz name" to drop in an interactive widget from viz.js.

const GUIDES = [
  // ============================ ALGORITHMS ============================
  {
    id: "big-o", track: "algo", title: "Big O and core structures",
    topics: ["Complexity", "Amortized analysis", "Arrays vs lists", "Linked lists", "Problem solving"],
    summary: "How to read a complexity, why constraints tell you the algorithm, and what arrays and linked lists really cost.",
    body: `## What Big O measures

Big O describes how work grows as the input grows, ignoring constants. O(n) means doubling the input roughly doubles the work. O(n²) means doubling it quadruples the work. It's the shape of the curve, not the speed of your laptop.

A useful mental number: a modern machine does very roughly **10^8 simple operations per second** in a fast language, and a bit less in JavaScript. Use that to sanity check whether an approach can finish.

::viz complexity

## Read the constraints first

The input size usually tells you what the intended solution is:

- n up to 20: exponential is fine, O(2^n) backtracking or bitmasks
- n up to 500: O(n³) works
- n up to 5,000: O(n²) works
- n up to 10^5 or 10^6: you need O(n log n) or O(n)
- n up to 10^9 or more: O(log n) or O(1), so math or binary search

## Arrays vs linked lists

- Array: O(1) index access, O(1) amortized push at the end, O(n) insert at the front because everything shifts
- Linked list: O(1) insert or delete when you already hold the node, O(n) to reach the i-th element
- Arrays are contiguous in memory, which CPU caches love. In practice arrays win almost everything, so pick a linked list only for a specific O(1) splice you need, like inside an LRU cache

## Amortized cost

A dynamic array doubles its capacity when full. One push occasionally costs O(n) for the copy, but the copies add up to n + n/2 + n/4 + ... which is under 2n total. Spread across n pushes that's O(1) each. "Amortized O(1)" means cheap on average over a sequence, even if one call is slow.

## Two pointer tricks on lists

Floyd's cycle detection: move a slow pointer one step and a fast pointer two steps. If there's a cycle they meet, using O(1) memory.

~~~
function hasCycle(head) {
  let slow = head, fast = head;
  while (fast && fast.next) {
    slow = slow.next;
    fast = fast.next.next;
    if (slow === fast) return true;
  }
  return false;
}
~~~

## Pitfalls

- \`Array.shift()\` and \`unshift()\` can be O(n) in JavaScript, since engines only optimize some cases. Use a head index for queues
- String concatenation in a loop can be O(n²) in some languages. Build an array and join
- Hidden loops count: \`includes\`, \`indexOf\`, \`slice\` and spread are all O(n)`
  },
  {
    id: "hashing", track: "algo", title: "Hashing",
    topics: ["Hashing", "Probabilistic"],
    summary: "Hash maps and sets, the most common speedup in interviews, plus Bloom filters for when memory is tight.",
    body: `## The idea

A hash function turns a key into a bucket index. Lookups, inserts and deletes are O(1) on average because you jump straight to the bucket instead of scanning. The worst case is O(n) if everything collides, which is why many languages randomize hash seeds.

## When to reach for it

- "Have I seen this before?" turns into a Set
- "How many times does each thing appear?" turns into a Map of counts
- "Find a partner that completes this" (Two Sum) turns into a Map of value to index
- Grouping: key every item by a canonical form, like sorted letters for anagrams

## Template: count and look up

~~~
const count = new Map();
for (const x of items) count.set(x, (count.get(x) || 0) + 1);

const seen = new Map(); // value -> index
for (let i = 0; i < nums.length; i++) {
  const need = target - nums[i];
  if (seen.has(need)) return [seen.get(need), i];
  seen.set(nums[i], i);
}
~~~

## Trading memory for time

Most hashing solutions turn an O(n²) double loop into an O(n) single pass by paying O(n) memory. If memory is the constraint, sorting plus two pointers often gets O(n log n) with O(1) extra space.

## Bloom filters

A Bloom filter answers "definitely not present" or "maybe present" using a bit array and k hash functions. It never gives false negatives, only false positives, and uses a few bits per item. Databases use them to skip disk reads for keys that don't exist, and browsers used them for malicious URL checks.

## Pitfalls

- Objects as keys: a JavaScript Map compares objects by reference, so \`[1,2]\` and \`[1,2]\` are different keys. Convert to a string key
- Plain objects \`{}\` coerce keys to strings and have prototype keys like \`constructor\`. Prefer Map
- Rolling hashes (Rabin-Karp) can collide. Verify matches directly`
  },
  {
    id: "two-pointers", track: "algo", title: "Two pointers, windows and prefix sums",
    topics: ["Two pointers", "Sliding window", "Strings", "Greedy scan", "Prefix sums"],
    summary: "Linear time patterns for arrays and strings: squeeze from both ends, slide a window, or precompute running sums.",
    body: `## Two pointers from both ends

On a sorted array, put one pointer at each end. If the sum is too small, move left up. Too big, move right down. Each step throws away one candidate for good, so the whole scan is O(n).

~~~
let i = 0, j = nums.length - 1;
while (i < j) {
  const sum = nums[i] + nums[j];
  if (sum === target) return [i, j];
  if (sum < target) i++; else j--;
}
~~~

## Sliding window

A window \`[l, r]\` grows on the right and shrinks on the left. Use it when the question asks about a contiguous subarray or substring and the condition is monotonic, meaning that if a window breaks the rule, any bigger window containing it breaks it too.

~~~
let l = 0, best = 0;
for (let r = 0; r < s.length; r++) {
  add(s[r]);
  while (windowIsInvalid()) remove(s[l++]);
  best = Math.max(best, r - l + 1);
}
~~~

Step through the longest substring without repeating characters. Type your own string to see the window move:

::viz window

Every index enters and leaves the window once, so the total is O(n) even with the inner while loop.

## Prefix sums

\`prefix[i]\` is the sum of the first i elements. Then the sum of \`nums[l..r]\` is \`prefix[r+1] - prefix[l]\`, which is O(1) per query after O(n) setup.

Combine with a hash map to count subarrays with sum k, even with negative numbers where a sliding window fails:

~~~
const seen = new Map([[0, 1]]);
let sum = 0, count = 0;
for (const x of nums) {
  sum += x;
  count += seen.get(sum - k) || 0;
  seen.set(sum, (seen.get(sum) || 0) + 1);
}
~~~

If values also change between queries, prefix sums break down. Use a Fenwick tree or segment tree for O(log n) updates and queries.

## Greedy scans

Some problems only need one pass while remembering the best thing so far. Max profit from one buy and one sell: track the lowest price seen, and at each day check selling today. Greedy works when a local choice can never hurt the final answer. When you can't prove that, it's usually DP.

## Pitfalls

- Sliding windows need the "monotonic" property. Negative numbers usually break it
- Off by one: decide whether \`r\` is inclusive and stick with it
- For "exactly k", a common trick is atMost(k) minus atMost(k - 1)`
  },
  {
    id: "binary-search", track: "algo", title: "Binary search",
    topics: ["Binary search"],
    summary: "Halve the search space every step. Works on sorted arrays, rotated arrays, and on the answer itself.",
    body: `## The idea

If you can look at the middle and know which half to throw away, you can find something in O(log n) steps. A billion items takes about 30 comparisons.

::viz bsearch

## The template that doesn't break

Most bugs come from mixing up inclusive and exclusive bounds. This lower bound version finds the first index where the condition is true, using a half open range \`[lo, hi)\`:

~~~
function lowerBound(nums, target) {
  let lo = 0, hi = nums.length;      // answer is in [lo, hi]
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (nums[mid] < target) lo = mid + 1;
    else hi = mid;
  }
  return lo;                          // first index with nums[i] >= target
}
~~~

It never loops forever because \`mid < hi\` always, and the range shrinks every step.

## Binary search on the answer

If the question is "find the smallest X that works" and "works" is monotonic (if X works, X + 1 works too), binary search over X and check feasibility each time.

- Minimum ship capacity to deliver in D days
- Minimum eating speed to finish in H hours
- Split an array into k parts to minimize the largest sum

Cost: O(log range × cost of one check).

## Rotated and partial order

A rotated sorted array still has one sorted half at every step. Check if the target lies in that half, then keep or discard it. Median of two sorted arrays binary searches a partition point instead of a value.

## Pitfalls

- \`(lo + hi) >> 1\` is safe in JS for array sizes. In Java or C++ use \`lo + (hi - lo) / 2\` to avoid overflow
- Trace a two element array by hand before trusting your bounds
- Decide up front: do you want the first true, the last false, or an exact match?`
  },
  {
    id: "stacks", track: "algo", title: "Stacks and monotonic structures",
    topics: ["Stacks", "Monotonic stack", "Monotonic deque"],
    summary: "Last in, first out, and the monotonic stack trick that solves 'next greater' and histogram problems in O(n).",
    body: `## Stacks

A stack gives you the most recent unfinished thing. That matches nesting: brackets, function calls, undo history, parsing expressions, and DFS without recursion.

~~~
const pairs = { ')': '(', ']': '[', '}': '{' };
const stack = [];
for (const c of s) {
  if (c in pairs) { if (stack.pop() !== pairs[c]) return false; }
  else stack.push(c);
}
return stack.length === 0;
~~~

## Monotonic stack

Keep the stack sorted, say decreasing. When a new value arrives, pop everything smaller than it, because the new value is their "next greater element". Each item is pushed and popped once, so O(n) total.

::viz monostack

Use it for:

- Next greater or next smaller element
- Daily temperatures (days until warmer)
- Largest rectangle in a histogram, where popping a bar tells you how far it extends
- Trapping rain water (also solvable with two pointers)

## Monotonic deque

Same idea, but you can also drop from the front once items fall out of a window. That gives the max of every sliding window in O(n). Store indices, not values, so you can tell when the front has expired.

## Pitfalls

- Store indices in the stack when you need distances or widths
- Decide strict vs non strict comparison (\`<\` or \`<=\`) based on how duplicates should behave
- Push a sentinel (like a 0 height bar at the end) to flush the stack and avoid a cleanup loop`
  },
  {
    id: "sorting-heaps", track: "algo", title: "Sorting, selection and heaps",
    topics: ["Sorting", "Selection", "Heaps"],
    summary: "When to sort, how to find the top k without sorting everything, and how a heap works under the hood.",
    body: `## Sorting

Comparison sorts can't beat O(n log n). Merge sort is stable and always O(n log n) but needs O(n) extra memory. Quicksort is usually fastest in practice, but a bad pivot on adversarial input makes it O(n²), which is why real libraries use randomized pivots or introsort. JavaScript's \`sort\` is required to be stable, and V8 implements it with TimSort, which is great on partly sorted data.

Remember: \`[10, 9, 1].sort()\` in JS sorts as strings. Always pass \`(a, b) => a - b\`.

Sorting first is often the unlock: merge intervals, meeting rooms, two pointers, grouping equal items.

## Heaps

A binary heap is a complete binary tree stored in an array. Parent of \`i\` is \`(i - 1) >> 1\`, children are \`2i + 1\` and \`2i + 2\`. In a min heap every parent is smaller than its children, so the minimum is always at index 0.

- push: add at the end, swap upward while smaller than the parent, O(log n)
- pop: move the last item to the root, swap downward with the smaller child, O(log n)
- peek: O(1)

Push some values and pop the minimum to watch the sift steps:

::viz heap

## Top k

To find the k largest of n items, keep a min heap of size k. If a new item beats the smallest in the heap, swap it in. That's O(n log k) time and O(k) memory, so it works on a stream of 50 million items where sorting everything wouldn't fit.

## Quickselect

For the k-th largest in an array you can modify, quickselect partitions like quicksort but only recurses into one side. Average O(n), worst O(n²) without random pivots.

## Two heaps for a running median

Keep a max heap of the lower half and a min heap of the upper half, balanced in size. The median is at the top of one or both. Each insert is O(log n).

## Pitfalls

- JavaScript has no built in heap. Write a small one or use a sorted structure for tiny inputs
- For top k largest you want a min heap, not a max heap, so you can evict the smallest
- Ties: if order among equals matters, include a tiebreaker in your comparator`
  },
  {
    id: "graphs", track: "algo", title: "Graphs: BFS, DFS, topo sort, Union-Find",
    topics: ["Graphs", "BFS", "Topological sort", "Union-Find"],
    summary: "How to represent a graph, which traversal to pick, how to order dependencies, and how to track connected groups.",
    body: `## Representation

Use an adjacency list: a Map or array from each node to its neighbors. It takes O(V + E) memory. Grids are graphs too, where neighbors are the 4 cells around you.

## BFS

BFS uses a queue and visits nodes in order of distance. In an unweighted graph, the first time you reach a node is via a shortest path.

~~~
const dist = new Map([[start, 0]]);
const queue = [start];
for (let head = 0; head < queue.length; head++) {
  const u = queue[head];
  for (const v of graph[u]) {
    if (!dist.has(v)) { dist.set(v, dist.get(u) + 1); queue.push(v); }
  }
}
~~~

Click cells to draw walls, then run BFS and watch the frontier expand in rings:

::viz bfs

## DFS

DFS goes deep first, with recursion or an explicit stack. Good for counting islands, finding connected components, detecting cycles, and exploring every path (backtracking). Recursion depth can crash on big inputs, so switch to an explicit stack past roughly 10,000 levels in JS.

## Cycle detection in directed graphs

Use three colors: unvisited, on the current path, finished. Reaching a node that's still on the current path means a cycle. Reaching a finished node is fine.

## Topological sort

Orders tasks so every dependency comes first. Kahn's algorithm: count incoming edges, start from nodes with zero, and remove them one by one. If you can't process every node, there's a cycle.

~~~
const indeg = new Array(n).fill(0);
const adj = Array.from({ length: n }, () => []);
for (const [a, b] of prereqs) { adj[b].push(a); indeg[a]++; }   // b must come before a
const queue = [];
indeg.forEach((d, i) => d === 0 && queue.push(i));
let done = 0;
for (let h = 0; h < queue.length; h++) {
  done++;
  for (const v of adj[queue[h]]) if (--indeg[v] === 0) queue.push(v);
}
return done === n;  // false means a cycle
~~~

## Union-Find

Tracks which group each item belongs to. \`find\` walks to the root, \`union\` links two roots. With path compression and union by rank, operations are nearly O(1) (inverse Ackermann, under 5 for any real input). Great for "are these connected?" with edges arriving over time, and for Kruskal's minimum spanning tree.

## Pitfalls

- Mark nodes visited when you push them, not when you pop, or BFS can enqueue a node many times
- Grids: check bounds before indexing
- Undirected graphs: add both directions to the adjacency list`
  },
  {
    id: "shortest-paths", track: "algo", title: "Shortest paths",
    topics: ["Shortest paths"],
    summary: "BFS, 0-1 BFS, Dijkstra, Bellman-Ford: which one depends on the edge weights.",
    body: `## Pick by edge weights

- All edges weigh the same: BFS, O(V + E)
- Weights are only 0 or 1: 0-1 BFS with a deque, push 0 edges to the front and 1 edges to the back, O(V + E)
- Non negative weights: Dijkstra with a heap, O((V + E) log V)
- Negative weights: Bellman-Ford, O(V · E), which also detects negative cycles
- All pairs on a small graph: Floyd-Warshall, O(V³)

## Dijkstra

Always expand the closest unfinished node. Once a node is popped with its smallest distance, that distance is final, because every other route is at least as long and edges can't be negative.

~~~
dist[src] = 0;
heap.push([0, src]);
while (heap.size) {
  const [d, u] = heap.pop();
  if (d > dist[u]) continue;           // stale entry, skip
  for (const [v, w] of adj[u]) {
    if (d + w < dist[v]) { dist[v] = d + w; heap.push([dist[v], v]); }
  }
}
~~~

The "skip stale entries" line is the lazy version. It's simpler than decrease key and has the same big O.

## Why negative edges break Dijkstra

Dijkstra locks in a node's distance when it's popped. A negative edge found later could make that distance shorter, but the node is already final. Bellman-Ford relaxes every edge V - 1 times instead, so it doesn't lock anything early.

## Pitfalls

- Grid with weights per cell: the cell is the node, the weight is the cost to enter it
- If you need the path, store a \`prev\` pointer when you relax an edge
- A* is Dijkstra plus a heuristic that never overestimates, used in maps and games`
  },
  {
    id: "dynamic-programming", track: "algo", title: "Dynamic programming",
    topics: ["Dynamic programming"],
    summary: "Break a problem into overlapping subproblems, solve each once, and build up the answer.",
    body: `## When it's DP

Two signals: **optimal substructure** (the best answer is built from best answers to smaller versions) and **overlapping subproblems** (the same smaller version comes up again and again). Words like "minimum number of", "how many ways", and "longest" are hints, especially when greedy fails on a counterexample.

## The recipe

- Define the state: what does \`dp[i]\` (or \`dp[i][j]\`) mean, in one sentence?
- Write the transition: how does \`dp[i]\` come from smaller states?
- Set base cases
- Pick the order: top down (recursion plus memo) or bottom up (loop over states in order)
- Optimize space if each row only needs the previous one

## Example: coin change

\`dp[a]\` is the fewest coins that make amount a. For each coin c, \`dp[a] = min(dp[a], dp[a - c] + 1)\`. Base case \`dp[0] = 0\`.

Step through the table filling up. Each cell looks back by every coin value:

::viz dp

Greedy picks the biggest coin first, which fails for coins [1, 3, 4] and amount 6: greedy says 4 + 1 + 1 (3 coins), DP finds 3 + 3 (2 coins).

## Common shapes

- 1D over a sequence: house robber, climbing stairs, decode ways
- Longest increasing subsequence: O(n²) DP, or O(n log n) with patience sorting and binary search
- 2D over two strings: edit distance, longest common subsequence, \`dp[i][j]\` for prefixes of each
- Knapsack: \`dp[capacity]\`, iterate items outside, capacity inside (backwards for 0/1 knapsack)
- Intervals: \`dp[l][r]\` over subranges, like burst balloons or matrix chain

## Top down vs bottom up

Top down is easier to write: plain recursion with a cache. Bottom up avoids recursion depth limits and is usually faster. Start top down if the order is unclear, then convert.

## Pitfalls

- Initialize "impossible" states to Infinity (for min) or -Infinity (for max), not 0
- 0/1 knapsack with a 1D array must loop capacity backwards, or items get reused
- Write the state definition down. Most DP bugs are a fuzzy definition`
  },
  {
    id: "design-structures", track: "algo", title: "Designing data structures: LRU and tries",
    topics: ["Design a structure", "Tries"],
    summary: "Combine simple structures to get O(1) or O(length) operations: a hash map plus a list for LRU, a tree of characters for prefixes.",
    body: `## LRU cache

Requirement: \`get\` and \`put\` in O(1), and evict the least recently used item when full.

- A hash map gives O(1) lookup by key
- A doubly linked list keeps recency order and lets you move or remove a node in O(1)
- Together: the map points to list nodes. On access, move the node to the front. On overflow, drop the tail

In JavaScript a \`Map\` remembers insertion order, so delete and re-insert moves a key to the end, and \`map.keys().next().value\` is the oldest. That's a legit O(1) LRU in a few lines.

~~~
class LRUCache {
  constructor(cap) { this.cap = cap; this.m = new Map(); }
  get(k) {
    if (!this.m.has(k)) return -1;
    const v = this.m.get(k); this.m.delete(k); this.m.set(k, v);
    return v;
  }
  put(k, v) {
    this.m.delete(k); this.m.set(k, v);
    if (this.m.size > this.cap) this.m.delete(this.m.keys().next().value);
  }
}
~~~

The cache guide has a live LRU simulator if you want to watch evictions happen.

## Tries

A trie is a tree where each edge is a character. Every path from the root spells a prefix. Lookups and inserts cost O(length of the word), independent of how many words are stored.

~~~
const root = {};
function insert(word) {
  let node = root;
  for (const c of word) node = node[c] ??= {};
  node.end = true;
}
function startsWith(prefix) {
  let node = root;
  for (const c of prefix) { node = node[c]; if (!node) return false; }
  return true;
}
~~~

Uses: autocomplete (store top suggestions at each node), spell checking, IP routing (longest prefix match on bits), and word search on a grid.

## How to approach "design a structure" questions

- List each operation and its required complexity
- Pick a structure per operation, then figure out how to keep them in sync
- Common combos: map + list (LRU), map + heap (top k with updates), map + array (O(1) random pick and delete by swapping with the last element)`
  },

  {
    id: "trees", track: "algo", title: "Trees: recursion, BFS and BSTs",
    topics: ["Trees"],
    summary: "Solve tree problems by deciding what each subtree returns, or walk level by level with BFS. Includes traversal orders and the BST rule.",
    body: `## The idea

A binary tree node holds a value and up to two children. In these lessons a node is an object \`{ val, left, right }\` and a missing child is \`null\`. Most tree problems have the same shape: decide what a subtree should tell its parent, ask the left and right child, then combine the two answers.

## Recursive DFS that returns a value

~~~
function maxDepth(node) {
  if (node === null) return 0;        // base case: an empty tree
  const l = maxDepth(node.left);
  const r = maxDepth(node.right);
  return 1 + Math.max(l, r);          // combine the children's answers
}
~~~

Write the null base case first. Every leaf calls the function on two null children, so a missing or wrong base case either crashes on \`null.left\` or shifts every answer by one. Call each child once and keep the result in a variable.

## BFS by level

When the question is about rows, distance from the root, or the nearest leaf, walk the tree level by level. Hold the current level as a list and build the next one from its children:

~~~
function levels(root) {
  if (root === null) return [];
  const out = [];
  let level = [root];
  while (level.length) {
    out.push(level.map(n => n.val));
    const next = [];
    for (const n of level) {
      if (n.left) next.push(n.left);
      if (n.right) next.push(n.right);
    }
    level = next;
  }
  return out;
}
~~~

BFS reaches nodes in order of their distance from the root, so the first leaf it meets is a shallowest one and it can stop there. A DFS has to check the whole tree before it knows.

## Traversal orders

- **Preorder**: node, left, right. Good for copying a tree or writing it out
- **Inorder**: left, node, right. On a binary search tree this visits values in ascending order
- **Postorder**: left, right, node. Children first, so use it when a node needs its children's answers, like height or deleting a tree
- **Level order**: BFS, row by row from the top

## Binary search trees

In a BST every value in a node's left subtree is smaller than the node and every value in its right subtree is larger. Comparing a node only with its parent is not enough: a 3 can sit under the right child of a 5 and still be smaller than its parent. Pass a range down instead:

~~~
function isValid(node, lo = -Infinity, hi = Infinity) {
  if (node === null) return true;
  if (node.val <= lo || node.val >= hi) return false;
  return isValid(node.left, lo, node.val) && isValid(node.right, node.val, hi);
}
~~~

This treats duplicates as invalid. Check the statement, since some versions allow equal values on one side. An inorder walk that must be strictly increasing is an equivalent test.

## Height and depth

The depth of a node is the number of edges from the root down to it. The height of a node is the number of edges from it down to its deepest leaf. Problems often count nodes instead of edges, which adds 1, so settle the convention and make the base case match it.

## Pitfalls

- Missing or wrong null base case
- Checking the BST rule against the parent only
- Mixing up preorder, inorder and postorder
- Deep recursion: a chain of 100,000 nodes can overflow the call stack. Balanced trees are only about log n deep, but a skewed one needs an iterative version with your own stack or a queue
- Calling the recursive function twice on the same child, which repeats work at every level

## Complexity

Visiting every node once is O(n) time. A recursive DFS uses O(h) stack where h is the height: about log n if balanced and n for a chain. BFS keeps one level in memory, which is O(1) on a chain and about n/2 on a complete tree. Searching a BST takes O(h), which is O(log n) only when the tree is balanced.`
  },
  {
    id: "intervals", track: "algo", title: "Intervals: merge, insert and meeting rooms",
    topics: ["Intervals"],
    summary: "Sort by start, sweep once with a running end, and pick the overlap rule before you write the comparison.",
    body: `## The idea

An interval is a pair \`[start, end]\`. Most interval problems get simple once the intervals are sorted by start, because an interval can then only overlap the one you are currently building.

## Sort by start

~~~
intervals.sort((a, b) => a[0] - b[0]);
~~~

Always pass the numeric comparator, since the default sort compares values as strings. Sorting costs O(n log n) and usually dominates the running time. Copy the array first if you should not change the caller's data.

## The overlap test

If \`a\` starts no later than \`b\`, they overlap when \`b.start <= a.end\`. That counts touching intervals like [1,4] and [4,5] as overlapping. If the problem says touching does not count, use a strict \`<\`. For any two intervals in any order the test is \`a.start <= b.end && b.start <= a.end\`.

State the convention before writing code. It changes by one character and the edge cases are exactly the touching ones.

## Merge

~~~
function merge(intervals) {
  const sorted = intervals.slice().sort((a, b) => a[0] - b[0]);
  const out = [];
  for (const [s, e] of sorted) {
    const last = out[out.length - 1];
    if (last && s <= last[1]) last[1] = Math.max(last[1], e);
    else out.push([s, e]);
  }
  return out;
}
~~~

Compare only with the last merged interval. The merged end is a max: [1,10] followed by [2,3] must stay [1,10].

## Insert into a sorted list

If the list is already sorted and non-overlapping, no sort is needed. Copy the intervals that end before the new one starts, absorb every interval that overlaps it by widening its bounds with min and max, then copy the rest. One pass, O(n).

## Meeting rooms

The minimum number of rooms is the largest number of meetings running at the same time. Two standard ways:

- Sort the starts and the ends separately and sweep. Each start either reuses the room that frees up first or opens a new one
- Sort by start and keep a min heap of end times. If the smallest end is at most the new start, pop it and reuse that room. Push the new end. The heap size at the end is the answer

~~~
const starts = intervals.map(x => x[0]).sort((a, b) => a - b);
const ends = intervals.map(x => x[1]).sort((a, b) => a - b);
let rooms = 0, j = 0;
for (let i = 0; i < starts.length; i++) {
  if (starts[i] >= ends[j]) j++;
  else rooms++;
}
~~~

Here a meeting holds its room until its end but not including it, so a meeting ending at 10 and one starting at 10 share a room. That is the opposite of the merge example, which is why you read the convention first. Both versions are O(n log n).

## Greedy scheduling

To fit the most non-overlapping jobs, sort by end time and take each job that starts at or after the last chosen end. The job that finishes earliest leaves the most room. Sorting by start or by shortest length fails on small counterexamples. If every job has a weight and you want the largest total, greedy no longer works and you need dynamic programming.

## Pitfalls

- Forgetting to sort, or sorting without the numeric comparator
- Wrong overlap test when endpoints touch
- Replacing the merged end with the new end instead of the max
- Comparing every pair, which is O(n^2) and times out on 100,000 intervals
- Mutating the input when the caller still needs it

## Complexity

Merge: O(n log n) for the sort plus O(n) for the sweep. Insert into a sorted list: O(n). Meeting rooms: O(n log n).`
  },

  // ============================ SYSTEM DESIGN ============================
  {
    id: "estimation", track: "sd", title: "Back of the envelope estimation",
    topics: ["Estimation", "Latency"],
    summary: "The numbers to memorize and the arithmetic to turn users into QPS, storage and bandwidth.",
    body: `## Why bother

Estimates decide the architecture. 100 QPS fits on one box. 100,000 QPS needs caching and sharding. Being off by 10x is fine, being off by 1,000x leads to the wrong design.

## Numbers worth memorizing

- A day has 86,400 seconds, call it **10^5**. So 1M requests a day is about 10 per second (about 12 with the exact 86,400)
- L1 cache: about 1 ns. Main memory: about 100 ns
- SSD random read: about 100 µs. Spinning disk seek: about 10 ms
- Same datacenter round trip: about 0.5 ms
- US coast to coast: about 60 to 70 ms round trip (the fiber limit is about 40 ms). East Coast to Europe: about 80 ms. California to the Netherlands: about 150 ms. Light in fiber is the limit
- 1 KB of text, 100 KB to 2 MB per photo, a few MB per minute of compressed video
- A single well tuned server handles thousands to tens of thousands of simple requests per second

## The method

- Users times actions per user per day gives requests per day
- Divide by 10^5 for average QPS
- Multiply by 2 to 10 for peak QPS (3x is a common default)
- Writes per day times size gives storage per day, times 365 for a year, times 3 for replication
- QPS times response size gives bandwidth

Play with the numbers. Every output updates as you type:

::viz estimator

## Latency adds up

Sequential calls add their latencies. Five services called one after another at 20 ms each is 100 ms before you've done any work. Parallel calls cost the slowest one, which is why tail latency (p99) matters more than the average.

## Pitfalls

- Mixing bits and bytes: network speeds are bits per second, storage is bytes
- Forgetting peak: systems fall over at peak, not at average
- False precision: round aggressively, say "about 10 TB", and move on`
  },
  {
    id: "scaling", track: "sd", title: "Scaling the web tier",
    topics: ["Scaling", "Load balancing", "Statelessness", "APIs", "Rate limiting"],
    summary: "Stateless servers behind a load balancer, clean APIs, and rate limits that protect everything behind them.",
    body: `## Vertical vs horizontal

Vertical scaling is a bigger machine. It's simple but has a ceiling and a single point of failure. Horizontal scaling is more machines. It's nearly unlimited, but the servers must be interchangeable.

## Make servers stateless

A server is stateless when any instance can handle any request. Move session data to a shared store (Redis) or a signed token, keep uploads in object storage, and never depend on the local disk. Then autoscaling, rolling deploys and failover just work.

## Load balancers

- L4 (TCP): routes by IP and port, very fast, can't read HTTP
- L7 (HTTP): routes by path, header or cookie, terminates TLS, can retry
- Algorithms: round robin, least connections, or consistent hashing when you want the same key to hit the same server
- Health checks remove dead servers from rotation

## API design basics

- Use cursor pagination (\`?after=id\`) instead of \`OFFSET\` for big tables. \`OFFSET 100000\` makes the database scan and discard 100,000 rows
- Idempotency: GET, PUT and DELETE are idempotent, so retrying them is safe. POST is not, so accept an \`Idempotency-Key\` for things like payments
- Version your API and never break existing clients
- Return the right status: 429 for rate limited, 503 for overloaded, with a \`Retry-After\` header

## Rate limiting

Protects you from abuse and from your own buggy clients.

- **Token bucket**: tokens refill at a steady rate up to a cap, each request spends one. Allows short bursts. The usual choice
- **Fixed window**: count per minute. Simple, but allows double bursts at the boundary
- **Sliding log**: store timestamps, exact, more memory
- **Sliding window counter**: weighted blend of the current and previous window, close to exact and cheap

~~~
function allow(bucket, now, rate, cap) {   // now in seconds, rate in tokens per second
  bucket.tokens = Math.min(cap, bucket.tokens + (now - bucket.last) * rate);
  bucket.last = now;
  if (bucket.tokens < 1) return false;
  bucket.tokens -= 1;
  return true;
}
~~~

In a fleet, keep counters in Redis with an atomic Lua script, or keep local buckets and sync periodically if slight overshoot is acceptable.`
  },
  {
    id: "caching", track: "sd", title: "Caching and CDNs",
    topics: ["Caching", "CDN", "Hot keys"],
    summary: "Where caches go, how they stay fresh, how they evict, and what happens when everyone wants the same key.",
    body: `## Where caches live

- Browser and CDN: static files and cacheable API responses, closest to the user
- Application cache: Redis or Memcached in front of the database
- Database buffer pool: hot pages in memory
- CPU caches: why arrays beat linked lists

## Patterns

- **Cache aside** (most common): read the cache, on a miss read the database and fill the cache. On write, update the database and delete the cache key
- **Write through**: write to the cache and database together, so the cache is always warm
- **Write back**: write to the cache, flush to the database later. Fast, but you can lose data if the cache dies

## Eviction and LRU

Memory is finite, so something has to go. LRU (least recently used) evicts whatever hasn't been touched longest. LFU evicts the least frequently used. Redis uses an approximate LRU by sampling a few keys.

Access keys and watch hits, misses and evictions. Try a pattern that loops over 5 keys with capacity 4 and see what happens to the hit rate:

::viz lru

That looping pattern is the worst case for LRU: every access is a miss. Real workloads are usually skewed, a few keys get most of the traffic, which is why caches work so well.

## Freshness

- TTLs cap how stale data can get. Add random jitter so keys don't expire together
- Delete on write rather than update on write, to avoid racing writers putting an old value back
- Some data can be stale for minutes (like counts), some never (like balances). Decide per field

## Thundering herd

A hot key expires and 10,000 requests miss at once, all hammering the database. Fixes: let one request rebuild while others wait or get the stale value (request coalescing), refresh before expiry, or lock per key.

## Hot keys

One key (a celebrity, a viral post) can overload the single cache node that owns it. Fixes: replicate the key with suffixes like \`post:42#1..#10\` and read a random copy, keep a small in process cache on each app server, or use a CDN for public content.

## CDNs

A CDN caches content at edge locations around the world, so users fetch from 20 ms away instead of 200 ms. Cache static assets with long TTLs and fingerprinted file names. For dynamic content, short TTLs or cache keys that vary by what actually changes.`
  },
  {
    id: "data", track: "sd", title: "Databases, replication and sharding",
    topics: ["Databases", "Replication", "Sharding", "Consistent hashing"],
    summary: "Picking a database, indexing, copying data for reads and safety, and splitting it when one machine isn't enough.",
    body: `## SQL or NoSQL

- Relational (Postgres, MySQL): transactions, joins, flexible queries, strong consistency. A common default
- Key value and wide column (DynamoDB, Cassandra): huge scale and write throughput, but you design tables around your access patterns
- Document (MongoDB): flexible nested records
- Pick by access patterns and consistency needs, not by hype

## Indexes

An index (usually a B-tree) turns a full table scan into a few page reads. The price: every write updates every index, and indexes use storage. Index the columns in your WHERE and ORDER BY, and use composite indexes in the order you filter.

## Isolation levels in one breath

Read committed avoids dirty reads. Snapshot isolation gives each transaction a consistent view, but allows write skew (two transactions read the same data and write different rows). Serializable prevents all anomalies at some throughput cost.

## Replication

- **Leader follower**: writes go to the leader, reads can go to followers. Async replication means followers lag, so a user may not see their own write. Fix by reading your own writes from the leader for a short time
- **Sync vs async**: sync replicas never lose acknowledged writes but add latency, async is fast but can lose the last few seconds on failover
- **Quorums**: with N replicas, write to W and read from R. With a strict quorum, if W + R > N, every read overlaps the latest acknowledged write (sloppy quorums and clock based conflict resolution can still return stale data)

## Sharding

Split data across machines by a shard key.

- Hash of user ID spreads load evenly but makes range queries hard
- Range sharding keeps ranges together but can create hot shards
- Choose a key that matches your most common query, so most requests hit one shard
- Cross shard queries and transactions are expensive, so design to avoid them

## Consistent hashing

With \`hash(key) % N\`, adding one server remaps almost every key. Consistent hashing puts servers and keys on a ring. A key belongs to the next server clockwise. Adding or removing a server only moves the keys in one arc, about 1/N of them.

Add and remove servers and watch how few keys move. Then turn on virtual nodes and see the load even out:

::viz ring

## Pitfalls

- Sharding early adds a lot of complexity. A single Postgres with read replicas goes very far
- Auto increment IDs don't work across shards. Use UUIDs or a Snowflake style ID (timestamp + machine + sequence)
- Plan resharding: it always takes longer than expected`
  },
  {
    id: "distributed", track: "sd", title: "Distributed systems fundamentals",
    topics: ["CAP", "Consensus", "Distributed locks", "Time"],
    summary: "Partitions, consensus, why clocks lie, and why distributed locks need fencing tokens.",
    body: `## CAP, honestly

During a network partition you choose: stay **consistent** (refuse some requests) or stay **available** (answer, possibly with stale data). Without a partition, you still trade latency for consistency (that's PACELC). Banking balances pick consistency. Social feeds pick availability.

## Consensus

Consensus lets a group of nodes agree on a value even if some fail. Raft and Paxos need a **majority** (quorum). A cluster of 2f + 1 nodes survives f failures, so 3 nodes survive 1 and 5 survive 2. Six nodes still only survive 2, so even sizes add cost without adding tolerance.

Raft in short: nodes elect a leader, the leader appends entries to its log and replicates them, an entry is committed once a majority has it. etcd, Consul and ZooKeeper (which uses a similar protocol) are what you use in practice for config, leader election and locks.

## Clocks lie

- Wall clocks on different machines drift and can jump backwards when NTP corrects them
- Never order events across machines by timestamp alone. "Last write wins" with skewed clocks silently drops writes
- Use logical clocks (Lamport, vector clocks) or a single sequencer when order matters
- Google Spanner uses TrueTime, clocks with a known error bound, and waits out the uncertainty

## Distributed locks

A lock with a lease (expires after T seconds) prevents deadlocks if the holder dies. But the holder can pause (GC, slow disk) past the lease, another node takes the lock, and now two think they own it.

The fix is a **fencing token**: every time the lock is granted, the token increases. The storage service rejects writes with a token older than one it has seen. Now a zombie holder can't do damage.

## Exactly once is a lie (mostly)

Networks can lose an ack, so senders retry, so messages can arrive twice. "Exactly once" in practice means at least once delivery plus idempotent processing: dedupe by message ID, or make the operation safe to repeat.`
  },
  {
    id: "async", track: "sd", title: "Queues, streams and real-time",
    topics: ["Queues", "Messaging", "Real-time", "Feeds", "Microservices"],
    summary: "Decouple work with queues, order it with partitions, push it live over WebSockets, and build feeds at scale.",
    body: `## Why queues

A queue lets a fast producer hand work to slower consumers. You get smoother load (absorb spikes), retries, and isolation (if the email service is down, signups still work). The trade is eventual completion instead of instant.

- **Work queues** (SQS, RabbitMQ): each message goes to one consumer, deleted once acknowledged
- **Logs / streams** (Kafka, Kinesis): messages are kept for days, many consumer groups read independently, replay is possible

## Ordering and parallelism

Kafka orders messages within a partition only. Key messages by the entity that needs ordering (user ID, order ID) so they land in the same partition. More partitions means more parallel consumers.

## Delivery semantics

- At most once: may lose messages
- At least once: may duplicate, the usual choice. Make consumers idempotent
- Dead letter queues collect messages that keep failing so they don't block everything

## The dual write problem

Writing to the database and then publishing to Kafka can half fail. The **outbox pattern** fixes it: write the event to an outbox table in the same transaction as the data, and a separate process publishes from the outbox.

## Real-time delivery

- Short polling: simple, wasteful
- Long polling: server holds the request until there's news
- Server-Sent Events: one way server to client, over plain HTTP
- WebSockets: two way, persistent. Servers become stateful, so use a pub/sub layer (Redis, NATS) to route messages to whichever server holds the user's connection

## Feeds: fan-out on write vs read

- **Fan-out on write**: when someone posts, push the post ID into each follower's precomputed feed. Reads are instant, but a celebrity with 50M followers creates 50M writes
- **Fan-out on read**: build the feed at read time by pulling from everyone you follow. Cheap writes, expensive reads
- **Hybrid** (what big networks do): fan-out on write for normal users, merge in celebrity posts at read time

## Microservices and sagas

Splitting into services gives independent deploys and scaling, but every call is now a network call that can fail. A transaction across services becomes a **saga**: a sequence of local steps, each with a compensating action (refund the payment if shipping fails). Start with a modular monolith unless team size forces the split.`
  },
  {
    id: "reliability", track: "sd", title: "Reliability and operations",
    topics: ["Reliability", "Observability", "Disaster recovery"],
    summary: "Timeouts, retries, circuit breakers, measuring what matters, and surviving a lost region.",
    body: `## Failure is normal

At scale something is always broken. Design so a single failure degrades one feature instead of the whole product.

- **Timeouts** on every network call. No timeout means one slow dependency hangs all your threads
- **Retries** with exponential backoff and jitter, only for idempotent operations, with a cap
- **Circuit breakers**: after repeated failures, stop calling the dependency for a while and fail fast or serve a fallback
- **Bulkheads**: separate thread pools or connection pools per dependency, so one can't starve the others
- **Load shedding**: when overloaded, reject some requests early (return 503) rather than slowing down for everyone

## Idempotency

When a client times out, it doesn't know if the work happened. An idempotency key stored with the result lets the server return the original answer on retry instead of doing it twice.

## Observability

- **Metrics**: counters and histograms over time. Use percentiles: p50 is typical, p99 is what your unhappiest users feel. Averages hide outliers
- **Logs**: structured (JSON) with request IDs
- **Traces**: follow one request across services to see where the time went
- Alert on symptoms users feel (error rate, latency, SLO burn) rather than every CPU spike

## SLOs

An SLO like "99.9% of requests succeed in under 300 ms" gives an error budget: 0.1% of requests, which for a time based SLO is about 43 minutes a month. Spend it on shipping fast, slow down when it's burned.

## Disaster recovery

- **RPO**: how much data you can afford to lose
- **RTO**: how long you can be down
- Nightly backups: RPO up to 24 hours
- Async cross region replication: RPO of seconds
- Sync cross region: RPO zero, but every write pays the cross region latency
- Test restores. A backup you've never restored is a hope, not a backup`
  },
  {
    id: "classic-designs", track: "sd", title: "Classic design interviews",
    topics: ["Classic designs"],
    summary: "A repeatable framework for any design question, and the key ideas behind the most asked systems.",
    body: `## A framework that works

- **Requirements** (5 min): functional (what it does) and non functional (scale, latency, consistency). Ask about read vs write ratio
- **Estimates** (5 min): QPS, storage, bandwidth. They justify every later choice
- **API and data model** (5 min): the main endpoints and tables
- **High level design** (10 min): clients, load balancer, services, storage, cache, queues
- **Deep dives** (15 min): the hardest part of this specific problem, plus failure modes and bottlenecks
- Say trade offs out loud. There's rarely one right answer

## URL shortener

- Write light, read heavy, think 100:1
- Generate short codes from a counter encoded in base 62, or random codes with a collision check. 7 base 62 characters give about 3.5 trillion codes
- Key value store from code to URL, heavy caching, 301 vs 302 redirect (302 if you want click analytics)

## Rate limiter

Token bucket per key, counters in Redis with atomic Lua, return 429 with Retry-After. Decide if you fail open or closed when Redis is down.

## Chat

WebSockets to gateway servers, pub/sub to route between them, messages persisted in a store partitioned by conversation ID, sequence numbers per conversation for ordering, push notifications for offline users.

## News feed

Hybrid fan-out (write for normal users, read for celebrities), feed cache of post IDs per user, rank at read time.

## Leaderboard

Redis sorted sets (\`ZADD\`, \`ZREVRANK\`) for O(log n) updates and rank lookups. At huge scale, shard by score range and show approximate percentiles for the long tail.

## Typeahead

A trie (or prefix table) with the top suggestions precomputed at each node, rebuilt offline from search logs, served from memory, with a small debounce on the client.`
  }
];

if (typeof module !== "undefined") module.exports = GUIDES;
else window.GUIDES = GUIDES;
