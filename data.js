// Lesson bank. Add your own items at the bottom; the app picks them up automatically.
// Types: mcq (options + answer index), multi (options + answers[]), number (answer, min, max, unit),
// code (fn, starter, tests, solution). Use `backticks` inside text for inline code.

const LESSONS = [
  // ============================ ALGORITHMS, L1 WARM-UP ============================
  {
    id: "a101", track: "algo", level: 1, topic: "Hashing", type: "mcq",
    title: "Hash map lookup",
    prompt: "You keep 10 million user sessions in a hash map keyed by session ID. What's the average cost of looking one up?",
    options: ["O(1)", "O(log n)", "O(n)", "O(n log n)"],
    answer: 0,
    misses: [null, "hashing.worst-case-lookup", "hashing.worst-case-lookup", "hashing.worst-case-lookup"],
    explain: "A good hash function spreads keys across buckets, so a lookup checks a tiny, constant number of entries no matter how big the map gets. The worst case is O(n) when everything collides, which is why many languages randomize their hash seeds. This is the reason caches, dedupe sets and Redis feel instant."
  },
  {
    id: "a102", track: "algo", level: 1, topic: "Hashing", type: "code",
    title: "Two Sum",
    prompt: "Given an array `nums` and a `target`, return the indices `[i, j]` (with i < j) of the two numbers that add up to target. Exactly one answer exists. Try to do it in one pass: one test has 200,000 numbers, so checking every pair will time out.",
    fn: "twoSum",
    starter: `function twoSum(nums, target) {

}`,
    hint: "For each number x, the partner you need is `target - x`. Have you already seen it?",
    tests: [
      { args: [[2, 7, 11, 15], 9], expected: [0, 1] },
      { args: [[3, 2, 4], 6], expected: [1, 2] },
      { args: [[3, 3], 6], expected: [0, 1], miss: "hashing.store-before-check" },
      { args: [[-1, -2, -3, -4, -5], -8], expected: [2, 4] },
      { label: "200k numbers, pair at the end", argsCode: "[Array.from({ length: 199998 }, (_, i) => i).concat([1e9, 1e9 + 1]), 2e9 + 1]", expected: [199998, 199999], miss: "hashing.wrong-pattern" }
    ],
    solution: `function twoSum(nums, target) {
  const seen = new Map(); // value -> index
  for (let i = 0; i < nums.length; i++) {
    const need = target - nums[i];
    if (seen.has(need)) return [seen.get(need), i];
    seen.set(nums[i], i);
  }
  return [];
}`,
    explain: "Trade memory for time. A Map from value to index turns the O(n²) double loop into a single O(n) pass. The 'remember what you've already seen' move shows up everywhere, from dedupe jobs to hash joins inside databases."
  },
  {
    id: "a103", track: "algo", level: 1, topic: "Binary search", type: "mcq",
    title: "A billion in thirty",
    prompt: "A sorted array has 1 billion entries. Roughly how many comparisons does binary search need in the worst case?",
    options: ["About 30", "About 1,000", "About 31,600", "About 500 million"],
    answer: 0,
    misses: [null, "binary-search.log-miscount", "binary-search.log-miscount", "binary-search.log-miscount"],
    explain: "Each step halves the range, so you need log2(10^9), which is about 30. Database B-tree indexes use the same halving idea with a much wider fan-out, which is why finding a row in a billion-row table takes a handful of page reads."
  },
  {
    id: "a104", track: "algo", level: 1, topic: "Stacks", type: "code",
    title: "Balanced brackets",
    prompt: "Return true if a string made of `()[]{}` is balanced, meaning every opener is closed by the matching closer in the right order.",
    fn: "isValid",
    starter: `function isValid(s) {

}`,
    hint: "The most recent unclosed opener has to be the first one closed. Which data structure hands you 'most recent'?",
    tests: [
      { args: ["()[]{}"], expected: true },
      { args: ["(]"], expected: false, miss: "stacks.mismatch-pairing" },
      { args: ["([)]"], expected: false, miss: "stacks.mismatch-pairing" },
      { args: ["{[]}"], expected: true },
      { args: [""], expected: true },
      { args: ["(("], expected: false, miss: "stacks.unflushed" },
      { args: ["]"], expected: false }
    ],
    solution: `function isValid(s) {
  const pairs = { ')': '(', ']': '[', '}': '{' };
  const stack = [];
  for (const c of s) {
    if (c in pairs) {
      if (stack.pop() !== pairs[c]) return false;
    } else {
      stack.push(c);
    }
  }
  return stack.length === 0;
}`,
    explain: "A stack mirrors nesting: push openers, pop on closers, check that the pop matches. Parsers, undo history and the call stack itself all run on this idea."
  },
  {
    id: "a105", track: "algo", level: 1, topic: "Arrays vs lists", type: "mcq",
    title: "Where linked lists win",
    prompt: "Which operation is genuinely faster on a linked list than on a dynamic array?",
    options: ["Accessing the 500th element", "Inserting at the front", "Iterating over every element", "Binary search"],
    answer: 1,
    misses: ["complexity.list-vs-array", null, "complexity.list-vs-array", "complexity.list-vs-array"],
    explain: "Inserting at the head is O(1) for a linked list and O(n) for an array, since every element shifts over. Arrays win nearly everything else, partly because contiguous memory is friendly to CPU caches. Default to arrays and have a reason when you don't."
  },
  {
    id: "a106", track: "algo", level: 1, topic: "Greedy scan", type: "code",
    title: "Best time to sell",
    prompt: "`prices[i]` is a stock's price on day i. Buy once, then sell once on a later day. Return the maximum profit, or 0 if no profit is possible.",
    fn: "maxProfit",
    starter: `function maxProfit(prices) {

}`,
    hint: "Walk left to right and keep track of the cheapest price so far.",
    tests: [
      { args: [[7, 1, 5, 3, 6, 4]], expected: 5 },
      { args: [[7, 6, 4, 3, 1]], expected: 0 },
      { args: [[2, 4, 1]], expected: 2, miss: "two-pointers.stale-extreme" },
      { args: [[1]], expected: 0 }
    ],
    solution: `function maxProfit(prices) {
  let min = Infinity, best = 0;
  for (const p of prices) {
    min = Math.min(min, p);
    best = Math.max(best, p - min);
  }
  return best;
}`,
    explain: "One pass with a running minimum. The pattern 'best answer ending here, using a small summary of the past' is the seed of dynamic programming."
  },
  {
    id: "a107", track: "algo", level: 1, topic: "Complexity", type: "mcq",
    title: "The nested loop trap",
    prompt: "An endpoint loops over every user and, for each one, loops over every other user to compare them. With 100,000 users, about how many comparisons is that?",
    options: ["About 100 thousand", "About 1.7 million", "About 10 billion", "About 100 million"],
    answer: 2,
    misses: ["complexity.nested-loop-cost", "complexity.nested-loop-cost", null, "complexity.nested-loop-cost"],
    explain: "100k times 100k is 10^10. At roughly 100 million simple operations per second, that's around 100 seconds per request. O(n²) is fine for 1,000 items and a disaster at 100k. Spotting nested loops over big collections is one of the most useful code review instincts you can build."
  },

  // ============================ ALGORITHMS, L2 SOLID ============================
  {
    id: "a201", track: "algo", level: 2, topic: "Binary search", type: "code",
    title: "Lower bound",
    prompt: "Return the first index i where `nums[i] >= target` in a sorted array. If every element is smaller, return `nums.length`. Needs to be O(log n): one test is an array of 500 million numbers that only lets you read about 100 of them.",
    fn: "lowerBound",
    starter: `function lowerBound(nums, target) {

}`,
    hint: "Use a half-open range [lo, hi). If nums[mid] < target, the answer is strictly to the right of mid.",
    tests: [
      { args: [[1, 3, 3, 5, 8], 3], expected: 1, miss: "binary-search.off-by-one" },
      { args: [[1, 3, 3, 5, 8], 4], expected: 3 },
      { args: [[1, 3, 3, 5, 8], 9], expected: 5, miss: "binary-search.off-by-one" },
      { args: [[1, 3, 3, 5, 8], 0], expected: 0 },
      { args: [[], 5], expected: 0, miss: "binary-search.off-by-one" },
      { label: "500M evens, target in the middle", argsCode: "[(() => { let reads = 0; return new Proxy([], { get(t, p) { if (p === 'length') return 500000000; if (typeof p === 'string' && /^[0-9]+$/.test(p)) { if (++reads > 100) throw new Error('Read more than 100 elements. This needs O(log n) reads.'); const i = Number(p); return 2 * i; } return t[p]; } }); })(), 600000001]", expected: 300000001, miss: "binary-search.wrong-pattern" },
      { label: "500M evens, exact hit", argsCode: "[(() => { let reads = 0; return new Proxy([], { get(t, p) { if (p === 'length') return 500000000; if (typeof p === 'string' && /^[0-9]+$/.test(p)) { if (++reads > 100) throw new Error('Read more than 100 elements. This needs O(log n) reads.'); const i = Number(p); return 2 * i; } return t[p]; } }); })(), 600000000]", expected: 300000000, miss: "binary-search.wrong-pattern" },
      { label: "500M evens, target past the end", argsCode: "[(() => { let reads = 0; return new Proxy([], { get(t, p) { if (p === 'length') return 500000000; if (typeof p === 'string' && /^[0-9]+$/.test(p)) { if (++reads > 100) throw new Error('Read more than 100 elements. This needs O(log n) reads.'); const i = Number(p); return 2 * i; } return t[p]; } }); })(), 1e10]", expected: 500000000, miss: "binary-search.wrong-pattern" }
    ],
    solution: `function lowerBound(nums, target) {
  let lo = 0, hi = nums.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (nums[mid] < target) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}`,
    explain: "This is lower_bound, the one binary search variant worth memorizing. The half-open range removes most off-by-one bugs. It powers 'first event after timestamp X', range queries and cursor pagination."
  },
  {
    id: "a202", track: "algo", level: 2, topic: "Sliding window", type: "mcq",
    title: "Window cost",
    prompt: "A sliding window solution for 'longest substring without repeating characters' runs in:",
    options: ["O(n²)", "O(n)", "O(n log n)", "O(2^n)"],
    answer: 1,
    misses: ["sliding-window.recompute", null, "sliding-window.wrong-pattern", "sliding-window.wrong-pattern"],
    explain: "Both pointers only move forward, so each character enters and leaves the window at most once. Rule of thumb: 'longest or shortest contiguous something' usually means sliding window."
  },
  {
    id: "a203", track: "algo", level: 2, topic: "Sliding window", type: "code",
    title: "Longest unique substring",
    prompt: "Return the length of the longest substring of `s` that has no repeating characters.",
    fn: "lengthOfLongestSubstring",
    starter: `function lengthOfLongestSubstring(s) {

}`,
    hint: "Keep a window [start, i]. When s[i] was last seen inside the window, jump start to one past that spot.",
    tests: [
      { args: ["abcabcbb"], expected: 3 },
      { args: ["bbbbb"], expected: 1, miss: "sliding-window.no-shrink" },
      { args: ["pwwkew"], expected: 3, miss: "sliding-window.no-shrink" },
      { args: [""], expected: 0 },
      { args: ["abba"], expected: 2, miss: "sliding-window.stale-left" },
      { args: ["dvdf"], expected: 3 }
    ],
    solution: `function lengthOfLongestSubstring(s) {
  const last = new Map();
  let start = 0, best = 0;
  for (let i = 0; i < s.length; i++) {
    if (last.has(s[i]) && last.get(s[i]) >= start) start = last.get(s[i]) + 1;
    last.set(s[i], i);
    best = Math.max(best, i - start + 1);
  }
  return best;
}`,
    explain: "Store each character's last index and move the left edge past repeats. The 'abba' case catches people who forget to check the old index is still inside the window. Same shape as rolling rate limit windows and streaming dedupe."
  },
  {
    id: "a204", track: "algo", level: 2, topic: "Graphs", type: "mcq",
    title: "Fewest hops",
    prompt: "You want the fewest hops between two users in a social graph where every edge counts the same. Which traversal?",
    options: ["DFS", "BFS", "Dijkstra with a heap", "Topological sort"],
    answer: 1,
    misses: ["graphs.wrong-pattern", null, "graphs.weight-mismatch", "graphs.wrong-pattern"],
    explain: "BFS explores in rings of distance 1, 2, 3, so the first time it reaches the target is along a shortest path. Dijkstra also works but is overkill when edges are equal. DFS can dive deep and find a long path first."
  },
  {
    id: "a205", track: "algo", level: 2, topic: "Graphs", type: "code",
    title: "Count the islands",
    prompt: "`grid` is an array of strings made of '1' (land) and '0' (water). Count the islands. Land connects up, down, left and right.",
    fn: "numIslands",
    starter: `function numIslands(grid) {

}`,
    hint: "Scan every cell. When you hit land you haven't visited, count it and flood fill the whole island so it never gets counted again.",
    tests: [
      { args: [["11110", "11010", "11000", "00000"]], expected: 1 },
      { args: [["11000", "11000", "00100", "00011"]], expected: 3, miss: "graphs.no-visited" },
      { args: [[]], expected: 0 },
      { args: [["101", "010", "101"]], expected: 5 }
    ],
    solution: `function numIslands(grid) {
  const g = grid.map(row => row.split(''));
  const R = g.length, C = R ? g[0].length : 0;
  let count = 0;
  const sink = (r, c) => {
    const stack = [[r, c]];
    while (stack.length) {
      const [i, j] = stack.pop();
      if (i < 0 || j < 0 || i >= R || j >= C || g[i][j] !== '1') continue;
      g[i][j] = '0';
      stack.push([i + 1, j], [i - 1, j], [i, j + 1], [i, j - 1]);
    }
  };
  for (let r = 0; r < R; r++)
    for (let c = 0; c < C; c++)
      if (g[r][c] === '1') { count++; sink(r, c); }
  return count;
}`,
    explain: "Flood fill, O(rows × cols). An explicit stack instead of recursion avoids stack overflows on huge grids, which is a real production concern. Same idea as finding connected components in networks or dependency graphs."
  },
  {
    id: "a206", track: "algo", level: 2, topic: "Heaps", type: "mcq",
    title: "Top 10 of 50 million",
    prompt: "You need the 10 most viewed videos out of 50 million, streaming through the data once. Best approach?",
    options: ["Sort all 50M and take the first 10", "Keep a min-heap of size 10 as you stream", "Build a balanced BST of every video", "Compare every pair of videos"],
    answer: 1,
    misses: ["heaps.sort-everything", null, "heaps.wrong-pattern", "heaps.wrong-pattern"],
    explain: "A size-k min-heap holds the best 10 so far. Each new item only competes with the smallest of those 10. That's O(n log k) time and O(k) memory, and it works on data that doesn't fit in RAM. Plenty of 'trending' jobs are built exactly like this."
  },
  {
    id: "a207", track: "algo", level: 2, topic: "Intervals", type: "code",
    title: "Merge intervals",
    prompt: "Given `intervals` like `[[1,3],[2,6]]`, merge everything that overlaps and return the result sorted by start. Touching intervals such as [1,4] and [4,5] also merge.",
    fn: "merge",
    starter: `function merge(intervals) {

}`,
    hint: "Sort by start. After that, each interval either extends the last merged one or starts a new one.",
    tests: [
      { args: [[[1, 3], [2, 6], [8, 10], [15, 18]]], expected: [[1, 6], [8, 10], [15, 18]] },
      { args: [[[1, 4], [4, 5]]], expected: [[1, 5]], miss: "intervals.touching" },
      { args: [[[5, 6], [1, 2]]], expected: [[1, 2], [5, 6]], miss: "intervals.unsorted" },
      { args: [[[1, 10], [2, 3], [4, 5]]], expected: [[1, 10]], miss: "intervals.wrong-neighbor" },
      { args: [[]], expected: [] }
    ],
    solution: `function merge(intervals) {
  const sorted = intervals.slice().sort((a, b) => a[0] - b[0]);
  const out = [];
  for (const [s, e] of sorted) {
    const last = out[out.length - 1];
    if (last && s <= last[1]) last[1] = Math.max(last[1], e);
    else out.push([s, e]);
  }
  return out;
}`,
    explain: "Sort, then sweep. Calendar free/busy, merging IP ranges and compacting time series all use this exact move. Note the [1,10],[2,3] case: you need max, not just the new end."
  },
  {
    id: "a208", track: "algo", level: 2, topic: "Linked lists", type: "mcq",
    title: "Cycle with no memory",
    prompt: "How do you detect a cycle in a linked list using O(1) extra memory?",
    options: ["Store visited nodes in a Set", "Slow and fast pointers (Floyd's algorithm)", "Sort the nodes first", "Recursion with memoization"],
    answer: 1,
    misses: ["complexity.ignored-limits", null, "complexity.wrong-pattern", "complexity.wrong-pattern"],
    explain: "Move one pointer by 1 and another by 2. With a cycle, the fast one eventually laps the slow one. Without one, fast hits the end. The Set works too, but costs O(n) memory."
  },

  // ============================ ALGORITHMS, L3 HARD ============================
  {
    id: "a301", track: "algo", level: 3, topic: "Selection", type: "code",
    title: "Kth largest",
    prompt: "Return the k-th largest element in `nums` (k = 1 means the max, and duplicates count: in `[7, 7, 7]` the 2nd largest is 7). Sorting works, but try for average O(n).",
    fn: "findKthLargest",
    starter: `function findKthLargest(nums, k) {

}`,
    hint: "Quickselect: partition around a random pivot, then continue only into the side that holds the answer.",
    tests: [
      { args: [[3, 2, 1, 5, 6, 4], 2], expected: 5 },
      { args: [[3, 2, 3, 1, 2, 4, 5, 5, 6], 4], expected: 4 },
      { args: [[1], 1], expected: 1 },
      { args: [[7, 7, 7], 2], expected: 7 },
      { args: [[10, 9, 1, 100, 2], 2], expected: 10, miss: "heaps.default-sort" },
      { args: [[-1, -10, 5, -2, -3], 4], expected: -3, miss: "heaps.default-sort" },
      { label: "100k shuffled numbers, k = 1000", argsCode: "[(() => { let s = 12345; const a = Array.from({ length: 100000 }, (_, i) => i); for (let i = a.length - 1; i > 0; i--) { s = (Math.imul(s, 1103515245) + 12345) >>> 0; const j = s % (i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; })(), 1000]", expected: 99000, miss: "heaps.default-sort" }
    ],
    solution: `function findKthLargest(nums, k) {
  const a = nums.slice();
  const target = a.length - k; // index in ascending order
  let lo = 0, hi = a.length - 1;
  while (true) {
    const pivot = a[lo + Math.floor(Math.random() * (hi - lo + 1))];
    let lt = lo, i = lo, gt = hi; // 3-way partition
    while (i <= gt) {
      if (a[i] < pivot) { [a[i], a[lt]] = [a[lt], a[i]]; i++; lt++; }
      else if (a[i] > pivot) { [a[i], a[gt]] = [a[gt], a[i]]; gt--; }
      else i++;
    }
    if (target < lt) hi = lt - 1;
    else if (target > gt) lo = gt + 1;
    else return a[target];
  }
}`,
    explain: "Quickselect averages O(n) because each round throws away part of the array. A size-k min-heap gives O(n log k) and handles streams. Sorting is O(n log n) and honestly fine in most real code, but you should know the trade-off. The 3-way partition handles lots of duplicates."
  },
  {
    id: "a302", track: "algo", level: 3, topic: "Shortest paths", type: "mcq",
    title: "Negative edges",
    prompt: "Your graph has some negative edge weights but no negative cycles. Which shortest path algorithm gives correct answers?",
    options: ["Dijkstra", "BFS", "Bellman-Ford", "Prim"],
    answer: 2,
    misses: ["graphs.weight-mismatch", "graphs.weight-mismatch", null, "graphs.wrong-pattern"],
    explain: "Dijkstra assumes that once a node is popped its distance is final, and negative edges break that. Bellman-Ford relaxes every edge V-1 times, O(V·E), and can also detect negative cycles. A classic use is spotting arbitrage in currency exchange graphs."
  },
  {
    id: "a303", track: "algo", level: 3, topic: "Topological sort", type: "code",
    title: "Can you graduate?",
    prompt: "There are `n` courses labeled 0 to n-1. Each pair `[a, b]` in `prereqs` means b must be taken before a. Return true if it's possible to finish every course.",
    fn: "canFinish",
    starter: `function canFinish(n, prereqs) {

}`,
    hint: "Count incoming edges. Start with courses that have none and peel them off one by one (Kahn's algorithm). If you can't peel everything, there's a cycle.",
    tests: [
      { args: [2, [[1, 0]]], expected: true },
      { args: [2, [[1, 0], [0, 1]]], expected: false, miss: "graphs.cycle-detection" },
      { args: [4, [[1, 0], [2, 1], [3, 2]]], expected: true },
      { args: [3, [[0, 1], [1, 2], [2, 0]]], expected: false, miss: "graphs.cycle-detection" },
      { args: [1, []], expected: true }
    ],
    solution: `function canFinish(n, prereqs) {
  const indeg = Array(n).fill(0);
  const adj = Array.from({ length: n }, () => []);
  for (const [a, b] of prereqs) { adj[b].push(a); indeg[a]++; }
  const queue = [];
  for (let i = 0; i < n; i++) if (indeg[i] === 0) queue.push(i);
  let done = 0;
  for (let h = 0; h < queue.length; h++) {
    done++;
    for (const next of adj[queue[h]]) {
      indeg[next]--;
      if (indeg[next] === 0) queue.push(next);
    }
  }
  return done === n;
}`,
    explain: "If you can topologically sort the graph, it has no cycle. Kahn's algorithm is O(V+E). Build systems, package managers, Airflow DAGs and migration runners all do this under the hood."
  },
  {
    id: "a304", track: "algo", level: 3, topic: "Dynamic programming", type: "mcq",
    title: "When greedy lies",
    prompt: "Coins [1, 3, 4], amount 6. Greedy 'always take the biggest coin' gives 4+1+1, which is 3 coins. What's optimal, and what technique guarantees it?",
    options: ["3 coins, greedy is optimal here", "2 coins (3+3), dynamic programming", "2 coins (4+2), backtracking", "1 coin, BFS"],
    answer: 1,
    misses: ["dp.wrong-pattern", null, "dp.wrong-pattern", "dp.wrong-pattern"],
    explain: "Greedy only works for special coin systems like US coins. DP computes the best answer for every amount from 0 upward, reusing smaller answers, in O(amount × coins). The lesson is bigger than coins: prove greedy works before you trust it."
  },
  {
    id: "a305", track: "algo", level: 3, topic: "Dynamic programming", type: "code",
    title: "Coin change",
    prompt: "Return the fewest coins from `coins` (unlimited supply of each) that add up to `amount`, or -1 if it can't be done.",
    fn: "coinChange",
    starter: `function coinChange(coins, amount) {

}`,
    hint: "dp[x] = 1 + min(dp[x - c]) over every coin c ≤ x, with dp[0] = 0.",
    tests: [
      { args: [[1, 2, 5], 11], expected: 3 },
      { args: [[2], 3], expected: -1, miss: "dp.bad-init" },
      { args: [[1], 0], expected: 0, miss: "dp.base-case" },
      { args: [[1, 3, 4], 6], expected: 2, miss: "dp.wrong-pattern" },
      { args: [[186, 419, 83, 408], 6249], expected: 20, miss: "dp.wrong-pattern" }
    ],
    solution: `function coinChange(coins, amount) {
  const dp = Array(amount + 1).fill(Infinity);
  dp[0] = 0;
  for (let x = 1; x <= amount; x++)
    for (const c of coins)
      if (c <= x && dp[x - c] + 1 < dp[x]) dp[x] = dp[x - c] + 1;
  return dp[amount] === Infinity ? -1 : dp[amount];
}`,
    explain: "Bottom-up DP over amounts. Each state reuses answers to smaller amounts, so the total work is O(amount × coins). The last test kills greedy and naive recursion without memoization."
  },
  {
    id: "a306", track: "algo", level: 3, topic: "Amortized analysis", type: "mcq",
    title: "Why push is O(1)",
    prompt: "Pushing onto a JavaScript array or Python list sometimes copies the whole thing into a bigger buffer. Why is push still called O(1)?",
    options: ["It isn't, it's O(n)", "Capacity grows geometrically, so total copy work over n pushes is about 2n, which is O(1) amortized", "The OS copies memory for free", "Arrays are linked lists under the hood"],
    answer: 1,
    misses: ["complexity.worst-vs-amortized", null, "complexity.wrong-pattern", "complexity.list-vs-array"],
    explain: "With geometric growth, copies happen at sizes 1, 2, 4, 8 and so on (for doubling), which sums to under 2n. Real runtimes use smaller factors, and the same argument holds. The expensive operations are rare enough to average out. Hash table resizing works the same way, and it's also why a single push can occasionally cause a latency spike."
  },
  {
    id: "a307", track: "algo", level: 3, topic: "Design a structure", type: "code",
    title: "LRU cache",
    prompt: "Simulate an LRU cache with the given `capacity`. `ops` is a list of `['put', key, value]` or `['get', key]`. Return an array with the result of every get (-1 if missing). When the cache is full, a put evicts the least recently used key. Both operations should be O(1): one test has capacity 100,000 and 200,000 operations, so scanning a list on every operation will time out.",
    fn: "lruRun",
    starter: `function lruRun(capacity, ops) {
  const out = [];
  for (const [op, key, value] of ops) {

  }
  return out;
}`,
    hint: "A JS Map remembers insertion order. Deleting a key and setting it again moves it to the end, so the first key is always the least recently used.",
    tests: [
      { args: [2, [["put", 1, 1], ["put", 2, 2], ["get", 1], ["put", 3, 3], ["get", 2], ["put", 4, 4], ["get", 1], ["get", 3], ["get", 4]]], expected: [1, -1, -1, 3, 4], miss: "design.eviction-order" },
      { args: [1, [["put", 1, 1], ["put", 1, 5], ["get", 1], ["put", 2, 2], ["get", 1], ["get", 2]]], expected: [5, -1, 2], miss: "design.stale-recency" },
      { args: [2, [["get", 9]]], expected: [-1] },
      { label: "capacity 100k, 200k ops", argsCode: "[100000, Array.from({ length: 100010 }, (_, k) => ['put', k, 2 * k]).concat(Array.from({ length: 100010 }, (_, i) => ['get', 100009 - i]))]", expectedCode: "Array.from({ length: 100000 }, (_, i) => 2 * (100009 - i)).concat(Array(10).fill(-1))", miss: "design.too-slow" }
    ],
    solution: `function lruRun(capacity, ops) {
  const cache = new Map();
  const out = [];
  for (const [op, key, value] of ops) {
    if (op === 'get') {
      if (!cache.has(key)) { out.push(-1); continue; }
      const v = cache.get(key);
      cache.delete(key);
      cache.set(key, v); // now most recent
      out.push(v);
    } else {
      cache.delete(key);
      cache.set(key, value);
      if (cache.size > capacity) cache.delete(cache.keys().next().value);
    }
  }
  return out;
}`,
    explain: "The textbook version is a hash map plus a doubly linked list. In JS, a Map gives you both since keys iterate in insertion order. LRU is how CPU caches, CDNs, database buffer pools and (approximately) Redis decide what to throw away."
  },
  {
    id: "a308", track: "algo", level: 3, topic: "Heaps", type: "mcq",
    title: "Running median",
    prompt: "You need the median of a stream of numbers, updated after every insert. Best structure?",
    options: ["A sorted array, inserting in place", "Two heaps: a max-heap for the lower half and a min-heap for the upper half", "One hash map", "A queue"],
    answer: 1,
    misses: ["heaps.sort-everything", null, "heaps.wrong-pattern", "heaps.wrong-pattern"],
    explain: "Keep the halves balanced so the median sits at the top of one or both heaps. Insert is O(log n), reading the median is O(1). Latency dashboards need p50 constantly, though at real scale people switch to approximate sketches like t-digest."
  },

  // ============================ ALGORITHMS, L4 SENIOR ============================
  {
    id: "a401", track: "algo", level: 4, topic: "Dynamic programming", type: "code",
    title: "Longest increasing subsequence",
    prompt: "Return the length of the longest strictly increasing subsequence. One test has 200,000 numbers, so O(n²) will time out.",
    fn: "lengthOfLIS",
    starter: `function lengthOfLIS(nums) {

}`,
    hint: "Keep `tails[k]` = the smallest possible tail of an increasing subsequence of length k+1. tails stays sorted, so binary search where each number goes.",
    tests: [
      { args: [[10, 9, 2, 5, 3, 7, 101, 18]], expected: 4 },
      { args: [[0, 1, 0, 3, 2, 3]], expected: 4 },
      { args: [[7, 7, 7, 7]], expected: 1 },
      { args: [[]], expected: 0, miss: "dp.base-case" },
      { label: "200k increasing numbers", argsCode: "[Array.from({ length: 200000 }, (_, i) => i)]", expected: 200000, miss: "dp.too-slow" }
    ],
    solution: `function lengthOfLIS(nums) {
  const tails = [];
  for (const x of nums) {
    let lo = 0, hi = tails.length;
    while (lo < hi) {
      const m = (lo + hi) >> 1;
      if (tails[m] < x) lo = m + 1; else hi = m;
    }
    tails[lo] = x;
  }
  return tails.length;
}`,
    explain: "Patience sorting: replace the first tail that's ≥ x, or append. Each number costs one binary search, so O(n log n). The trick of keeping 'the best possible state per length' shows up in a lot of hard DP problems."
  },
  {
    id: "a402", track: "algo", level: 4, topic: "Union-Find", type: "mcq",
    title: "Practically constant",
    prompt: "Union-Find with path compression and union by rank. What's the cost per operation in practice?",
    options: ["O(log n)", "O(n)", "Nearly O(1), technically the inverse Ackermann function", "Exactly O(1)"],
    answer: 2,
    misses: ["graphs.cost-miscount", "graphs.cost-miscount", null, "graphs.cost-miscount"],
    explain: "α(n) stays below 5 for any input that fits in this universe. Union-Find powers Kruskal's minimum spanning tree, clustering, and identity resolution, like working out which accounts belong to the same person."
  },
  {
    id: "a403", track: "algo", level: 4, topic: "Dynamic programming", type: "code",
    title: "Edit distance",
    prompt: "Return the minimum number of single character inserts, deletes or replacements needed to turn string `a` into string `b`.",
    fn: "minDistance",
    starter: `function minDistance(a, b) {

}`,
    hint: "dp[i][j] = cost to turn the first i chars of a into the first j chars of b. Matching chars carry dp[i-1][j-1]. Otherwise it's 1 + the min of the three neighbors.",
    tests: [
      { args: ["horse", "ros"], expected: 3, miss: "dp.state-definition" },
      { args: ["intention", "execution"], expected: 5, miss: "dp.state-definition" },
      { args: ["", "abc"], expected: 3, miss: "dp.base-case" },
      { args: ["abc", "abc"], expected: 0 },
      { args: ["kitten", "sitting"], expected: 3 }
    ],
    solution: `function minDistance(a, b) {
  const n = b.length;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = a[i - 1] === b[j - 1]
        ? prev[j - 1]
        : 1 + Math.min(prev[j - 1], prev[j], cur[j - 1]);
    }
    prev = cur;
  }
  return prev[n];
}`,
    explain: "Classic 2D DP in O(m·n) time. You only ever look at the previous row, so memory drops to O(n). Spell checkers, fuzzy search, DNA alignment and diff tools are all built on variants of this."
  },
  {
    id: "a404", track: "algo", level: 4, topic: "Tries", type: "mcq",
    title: "Autocomplete",
    prompt: "Autocomplete over 5 million product names: as the user types a prefix, show matches fast. Which structure fits best?",
    options: ["A hash set of names", "A trie (prefix tree)", "A min-heap", "A sorted linked list"],
    answer: 1,
    misses: ["design.wrong-pattern", null, "design.wrong-pattern", "design.wrong-pattern"],
    explain: "A trie reaches the prefix node in O(prefix length), then the matches are the subtree below it. Real systems cache the top-k suggestions at each node so they never walk a huge subtree. A sorted array with binary search is a solid, simpler alternative worth mentioning."
  },
  {
    id: "a405", track: "algo", level: 4, topic: "Monotonic deque", type: "code",
    title: "Sliding window max",
    prompt: "Return the max of every window of size `k` as it slides across `nums`. One test has 200,000 numbers with k = 50,000, so O(n·k) will time out.",
    fn: "maxSlidingWindow",
    starter: `function maxSlidingWindow(nums, k) {

}`,
    hint: "Keep a deque of indices whose values are decreasing. Any number smaller than the newcomer can never be a window max again, so drop it.",
    tests: [
      { args: [[1, 3, -1, -3, 5, 3, 6, 7], 3], expected: [3, 3, 5, 5, 6, 7] },
      { args: [[1], 1], expected: [1] },
      { args: [[9, 8, 7, 6], 2], expected: [9, 8, 7], miss: "stacks.expired-front" },
      { args: [[1, -1], 1], expected: [1, -1] },
      { label: "200k numbers, k = 50k", argsCode: "[Array.from({ length: 200000 }, (_, i) => i), 50000]", expectedCode: "Array.from({ length: 150001 }, (_, i) => i + 49999)", miss: "stacks.wrong-pattern" }
    ],
    solution: `function maxSlidingWindow(nums, k) {
  const dq = []; // indices, values decreasing
  let head = 0;  // avoid O(n) shift()
  const out = [];
  for (let i = 0; i < nums.length; i++) {
    while (dq.length > head && nums[dq[dq.length - 1]] <= nums[i]) dq.pop();
    dq.push(i);
    if (dq[head] <= i - k) head++;
    if (i >= k - 1) out.push(nums[dq[head]]);
  }
  return out;
}`,
    explain: "Monotonic deque: every index is pushed and popped once, so O(n) total. Watch out for `Array.shift()` in JS, it can be O(n) and can quietly blow up your complexity. Same structure as 'max latency over the last minute' in streaming metrics."
  },
  {
    id: "a406", track: "algo", level: 4, topic: "Two pointers", type: "code",
    title: "Trapping rain water",
    prompt: "`height` is an elevation map where every bar has width 1. Return how many units of rain water it traps.",
    fn: "trap",
    starter: `function trap(height) {

}`,
    hint: "Water above a bar = min(tallest bar to its left, tallest to its right) minus its own height. Two pointers can get this without extra arrays.",
    tests: [
      { args: [[0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]], expected: 6, miss: "two-pointers.move-wrong-pointer" },
      { args: [[4, 2, 0, 3, 2, 5]], expected: 9, miss: "two-pointers.move-wrong-pointer" },
      { args: [[]], expected: 0 },
      { args: [[3, 0, 3]], expected: 3, miss: "two-pointers.move-wrong-pointer" },
      { args: [[1, 2, 3, 4]], expected: 0 }
    ],
    solution: `function trap(h) {
  let l = 0, r = h.length - 1, leftMax = 0, rightMax = 0, water = 0;
  while (l < r) {
    if (h[l] < h[r]) {
      leftMax = Math.max(leftMax, h[l]);
      water += leftMax - h[l];
      l++;
    } else {
      rightMax = Math.max(rightMax, h[r]);
      water += rightMax - h[r];
      r--;
    }
  }
  return water;
}`,
    explain: "Move inward from whichever side is lower. That side's max is the binding constraint, since the other side is known to be at least as tall, so you can settle it right away. O(n) time, O(1) space."
  },
  {
    id: "a407", track: "algo", level: 4, topic: "Probabilistic", type: "mcq",
    title: "Bloom filter errors",
    prompt: "A Bloom filter answers 'probably in the set' or 'definitely not in the set'. Which mistake can it make?",
    options: ["False negatives only", "False positives only", "Both", "Neither, it's exact"],
    answer: 1,
    misses: ["hashing.bloom-guarantee", null, "hashing.bloom-guarantee", "hashing.bloom-guarantee"],
    explain: "Bits only get set, never cleared, so a real member always finds its bits on. A non-member can find all its bits set by other keys. Cassandra and Bigtable use Bloom filters to skip disk reads for keys that definitely aren't in a file."
  },
  {
    id: "a408", track: "algo", level: 4, topic: "Sorting", type: "mcq",
    title: "Killing quicksort",
    prompt: "A naive quicksort always picks the first element as its pivot. Which input makes it O(n²)?",
    options: ["Random data", "Already sorted data", "All unique values", "Small arrays"],
    answer: 1,
    misses: ["heaps.quicksort-worst-case", null, "heaps.quicksort-worst-case", "heaps.quicksort-worst-case"],
    explain: "On sorted input the pivot is always the minimum, so each partition only peels off one element. Random pivots or median-of-three fix it. Production quicksorts (introsort, pdqsort) defend against this, because adversarial inputs have caused real denial of service bugs."
  },

  // ============================ ALGORITHMS, L5 BRUTAL ============================
  {
    id: "a501", track: "algo", level: 5, topic: "Monotonic stack", type: "code",
    title: "Largest rectangle in a histogram",
    prompt: "Bars of width 1 have heights `heights`. Return the area of the largest rectangle that fits inside the histogram. One test has 100,000 bars.",
    fn: "largestRectangleArea",
    starter: `function largestRectangleArea(heights) {

}`,
    hint: "Keep a stack of indices with increasing heights. When a shorter bar arrives, pop the taller ones: a popped bar's rectangle spans from (new stack top + 1) to (i - 1).",
    tests: [
      { args: [[2, 1, 5, 6, 2, 3]], expected: 10 },
      { args: [[2, 4]], expected: 4, miss: "stacks.unflushed" },
      { args: [[1, 1, 1, 1]], expected: 4, miss: "stacks.unflushed" },
      { args: [[]], expected: 0 },
      { args: [[6, 2, 5, 4, 5, 1, 6]], expected: 12 },
      { label: "100k alternating bars", argsCode: "[Array.from({ length: 100000 }, (_, i) => (i % 2 ? 1 : 2))]", expected: 100000, miss: "stacks.wrong-pattern" }
    ],
    solution: `function largestRectangleArea(h) {
  const stack = [];
  let best = 0;
  for (let i = 0; i <= h.length; i++) {
    const cur = i === h.length ? 0 : h[i]; // sentinel flushes the stack
    while (stack.length && h[stack[stack.length - 1]] >= cur) {
      const height = h[stack.pop()];
      const left = stack.length ? stack[stack.length - 1] + 1 : 0;
      best = Math.max(best, height * (i - left));
    }
    stack.push(i);
  }
  return best;
}`,
    explain: "Each bar is pushed and popped exactly once, O(n). The sentinel 0 at the end forces every remaining bar to be measured. This is the building block for 'maximal rectangle in a binary matrix', a famously hard follow-up."
  },
  {
    id: "a502", track: "algo", level: 5, topic: "BFS", type: "code",
    title: "Word ladder",
    prompt: "Turn `begin` into `end` by changing one letter at a time. Every intermediate word must be in `words`, and `end` must also be in `words`. Return the number of words in the shortest sequence (counting begin and end), or 0 if impossible.",
    fn: "ladderLength",
    starter: `function ladderLength(begin, end, words) {

}`,
    hint: "Words are nodes and one-letter changes are edges. Shortest path in an unweighted graph means BFS. Generate neighbors by trying 'a' to 'z' at each position.",
    tests: [
      { args: ["hit", "cog", ["hot", "dot", "dog", "lot", "log", "cog"]], expected: 5, miss: "graphs.no-visited" },
      { args: ["hit", "cog", ["hot", "dot", "dog", "lot", "log"]], expected: 0 },
      { args: ["a", "c", ["a", "b", "c"]], expected: 2 },
      { args: ["red", "tax", ["ted", "tex", "red", "tax", "tad", "den", "rex", "pee"]], expected: 4 }
    ],
    solution: `function ladderLength(begin, end, words) {
  const dict = new Set(words);
  if (!dict.has(end)) return 0;
  const seen = new Set([begin]);
  let frontier = [begin], steps = 1;
  while (frontier.length) {
    const next = [];
    for (const w of frontier) {
      if (w === end) return steps;
      for (let i = 0; i < w.length; i++) {
        for (let c = 97; c <= 122; c++) {
          const cand = w.slice(0, i) + String.fromCharCode(c) + w.slice(i + 1);
          if (dict.has(cand) && !seen.has(cand)) { seen.add(cand); next.push(cand); }
        }
      }
    }
    frontier = next;
    steps++;
  }
  return 0;
}`,
    explain: "BFS over an implicit graph. Generating neighbors by mutation (26 × word length per word) beats comparing every pair of words. Bidirectional BFS, searching from both ends and meeting in the middle, cuts the search dramatically on big dictionaries."
  },
  {
    id: "a503", track: "algo", level: 5, topic: "Hashing", type: "mcq",
    title: "Rolling hash",
    prompt: "You search for a 1 KB pattern inside a 1 GB log. Rabin-Karp avoids rehashing each 1 KB window from scratch by:",
    options: ["Caching every window", "Updating the hash in O(1) as the window slides: remove the outgoing char, add the incoming one", "Sorting the log", "Building a trie of the log"],
    answer: 1,
    misses: ["hashing.wrong-pattern", null, "hashing.wrong-pattern", "hashing.wrong-pattern"],
    explain: "A polynomial rolling hash updates with a subtract, a multiply and an add. Candidate matches get verified to rule out collisions. rsync, content-defined chunking in backup tools, and dedupe in storage systems all use rolling hashes."
  },
  {
    id: "a504", track: "algo", level: 5, topic: "Problem solving", type: "mcq",
    title: "Read the constraints",
    prompt: "A problem says n ≤ 20. What is that hinting?",
    options: ["You need O(n)", "Exponential like O(2^n · n) is fine, so think bitmask DP or backtracking", "You must use a heap", "You need O(log n)"],
    answer: 1,
    misses: ["complexity.ignored-limits", null, "complexity.wrong-pattern", "complexity.ignored-limits"],
    explain: "Constraints leak the intended complexity. Rough guide: n ≤ 20 means 2^n, n ≤ 500 means n³, n ≤ 5,000 means n², n up to 10^6 means n log n or n. Reading constraints first keeps you from optimizing the wrong thing."
  },
  {
    id: "a505", track: "algo", level: 5, topic: "Shortest paths", type: "mcq",
    title: "Zero or one",
    prompt: "Shortest path where every edge weight is either 0 or 1. Fastest approach?",
    options: ["Dijkstra with a binary heap", "0-1 BFS with a deque: 0-weight edges go to the front, 1-weight edges to the back", "Floyd-Warshall", "Plain DFS"],
    answer: 1,
    misses: ["graphs.weight-mismatch", null, "graphs.wrong-pattern", "graphs.wrong-pattern"],
    explain: "The deque stays sorted by distance on its own, so you get O(V+E) instead of O(E log V). It shows up in grid problems where some moves are free, like walking along a road versus breaking a wall."
  },
  {
    id: "a506", track: "algo", level: 5, topic: "Hashing", type: "multi",
    title: "Slow hash maps",
    prompt: "Which of these are real reasons a hash map lookup could get slow in production? Select all that apply.",
    options: ["Many keys landing in the same bucket (a bad hash or a deliberate attack)", "The map happens to be resizing at that moment", "Keys are huge strings that are expensive to hash", "The map has more than 1,000 entries"],
    answers: [0, 1, 2],
    miss: "hashing.worst-case-lookup",
    explain: "Collisions, resize pauses and hashing cost are all real. Size alone doesn't make lookups slow. Hash flooding attacks against web frameworks around 2011 pushed many languages to randomize hash seeds per process."
  },

  // ============================ SYSTEM DESIGN, L1 WARM-UP ============================
  {
    id: "s101", track: "sd", level: 1, topic: "Scaling", type: "mcq",
    title: "More boxes",
    prompt: "Your single API server sits at 90% CPU. You add 3 more identical servers behind a load balancer. That's:",
    options: ["Vertical scaling", "Horizontal scaling", "Sharding", "Caching"],
    answer: 1,
    explain: "Horizontal means more machines, vertical means a bigger machine. Horizontal scaling only works if your servers are stateless, which is why sessions live in Redis or a signed cookie instead of server memory."
  },
  {
    id: "s102", track: "sd", level: 1, topic: "Estimation", type: "number",
    title: "Requests per second",
    prompt: "Your app gets 1 million requests per day, spread evenly. About how many requests per second is that?",
    unit: "req/s", answer: 11.6, min: 9, max: 13,
    explain: "A day has 86,400 seconds. Rounded to 10^5, 1M per day is about 10 per second, and with the exact 86,400 it is about 12. Handy anchors: 1M/day ≈ 12/s, 100M/day ≈ 1,200/s. Real traffic peaks at 2 to 5 times the average, so design for the peak."
  },
  {
    id: "s103", track: "sd", level: 1, topic: "Load balancing", type: "mcq",
    title: "Long lived connections",
    prompt: "Your WebSocket chat servers hold connections that can stay open for hours. Which load balancing strategy spreads load best?",
    options: ["Round robin", "Least connections", "Random", "Always the first server"],
    answer: 1,
    explain: "Round robin assumes requests are short and similar. With long connections, unlucky servers pile up clients. Least connections sends each new client to whoever has the fewest open ones."
  },
  {
    id: "s104", track: "sd", level: 1, topic: "Caching", type: "mcq",
    title: "Cache-aside",
    prompt: "In the cache-aside pattern, what happens on a cache miss?",
    options: ["The request fails", "The app reads from the database, then writes the result into the cache", "The cache fetches from the database on its own", "The database pushes everything into the cache at startup"],
    answer: 1,
    explain: "Cache-aside (lazy loading) is the most common pattern: check the cache, fall back to the DB, fill the cache with a TTL. It's simple, but the first request is slow and data can be stale until the TTL expires or you invalidate on write."
  },
  {
    id: "s105", track: "sd", level: 1, topic: "Databases", type: "mcq",
    title: "Pick a database",
    prompt: "You're building a payments ledger: strict transactions, joins between accounts and transfers, strong consistency. Default choice?",
    options: ["PostgreSQL", "MongoDB", "Cassandra", "Redis"],
    answer: 0,
    explain: "Relational databases give you ACID transactions and constraints that protect money. Reach for NoSQL when you have a specific need, like massive write throughput or a truly flexible schema. 'Start with Postgres' is boring advice that's usually right."
  },
  {
    id: "s106", track: "sd", level: 1, topic: "Latency", type: "mcq",
    title: "Physics wins",
    prompt: "Which of these takes the longest?",
    options: ["Reading 1 MB sequentially from memory", "A round trip inside one datacenter", "Reading 1 MB sequentially from an SSD", "A round trip from California to the Netherlands"],
    answer: 3,
    explain: "Ballpark: 1 MB from memory is microseconds, a same-datacenter round trip is about 0.5 ms, 1 MB from SSD is around 1 ms, and a California to Netherlands round trip is roughly 150 ms. Distance dominates, which is why CDNs and multi-region setups exist."
  },

  // ============================ SYSTEM DESIGN, L2 SOLID ============================
  {
    id: "s201", track: "sd", level: 2, topic: "Estimation", type: "number",
    title: "Photo storage",
    prompt: "10 million users each upload 2 photos a day, averaging 500 KB each. How much new storage is that per day, in TB?",
    unit: "TB/day", answer: 10, min: 9, max: 11,
    explain: "10M × 2 × 0.5 MB = 10 million MB = 10 TB a day, about 3.6 PB a year, before replication. With 3x replication, triple it. This math is what tells you photos go in object storage like S3, not in your database."
  },
  {
    id: "s202", track: "sd", level: 2, topic: "CDN", type: "mcq",
    title: "Slow in Asia",
    prompt: "Users in Asia say your images load slowly. Your servers are in Virginia. Best first fix?",
    options: ["Bigger servers in Virginia", "Put a CDN in front of your static assets", "Add a database index", "Switch to NoSQL"],
    answer: 1,
    explain: "A CDN caches content at edge locations near users, cutting a 200 ms round trip to maybe 20 ms, and takes load off your origin. Static assets are the easy win. Dynamic content needs careful cache keys and headers."
  },
  {
    id: "s203", track: "sd", level: 2, topic: "Databases", type: "mcq",
    title: "The price of an index",
    prompt: "Adding an index on `orders.user_id` makes lookups by user fast. What does it cost?",
    options: ["Nothing", "Slower writes and more storage, since every insert and update has to maintain the index", "Slower reads", "The table gets locked permanently"],
    answer: 1,
    explain: "Every index is another B-tree to update on each write. Index the columns you actually filter, join or sort on, check with EXPLAIN, and drop indexes nobody uses. On big Postgres tables, use CREATE INDEX CONCURRENTLY so you don't block writes."
  },
  {
    id: "s204", track: "sd", level: 2, topic: "Replication", type: "mcq",
    title: "Where did my edit go?",
    prompt: "A user updates their profile, refreshes, and sees the old version. Reads go to replicas. What's happening, and what's a common fix?",
    options: ["The cache is full, add RAM", "Replication lag. Read that user's data from the primary for a short window after they write", "Disk failure, restore from backup", "DNS problem, lower the TTL"],
    answer: 1,
    explain: "Async replicas lag behind by milliseconds to seconds. Read-your-writes consistency is usually handled by pinning a user's reads to the primary briefly after a write, or by tracking the write position and only reading from replicas that have caught up."
  },
  {
    id: "s205", track: "sd", level: 2, topic: "Queues", type: "mcq",
    title: "Go async",
    prompt: "Users upload videos that take minutes to transcode. Why put a message queue between upload and transcoding?",
    options: ["Queues make transcoding faster", "The upload returns right away, workers process at their own pace, and traffic spikes get buffered instead of knocking things over", "Queues replace the database", "To encrypt the videos"],
    answer: 1,
    explain: "Queues decouple producers from consumers. You scale workers separately, retry failures, and absorb bursts. SQS, RabbitMQ and Kafka are the usual suspects. Rule of thumb: anything slow or flaky goes async."
  },
  {
    id: "s206", track: "sd", level: 2, topic: "Statelessness", type: "multi",
    title: "Ready to autoscale",
    prompt: "You want to add and remove web servers freely. Which practices help? Select all that apply.",
    options: ["Keep sessions in Redis or a signed token, not in server memory", "Save uploads to S3, not local disk", "Keep a request counter in a global variable on each server", "Boot servers from an image with zero manual setup"],
    answers: [0, 1, 3],
    explain: "If any server can die or appear at any moment, nothing important can live only on one server. A per-server global counter is wrong the moment you have two servers."
  },
  {
    id: "s207", track: "sd", level: 2, topic: "APIs", type: "mcq",
    title: "Page 5,000",
    prompt: "Your feed API uses `OFFSET 100000 LIMIT 20`, and deep pages are painfully slow. Better approach?",
    options: ["Raise the database timeout", "Cursor (keyset) pagination: `WHERE id < last_seen_id ORDER BY id DESC LIMIT 20`", "Cache every page forever", "Return all rows at once"],
    answer: 1,
    explain: "OFFSET makes the database walk past and discard 100k rows. Keyset pagination uses the index to jump straight to the spot, so every page costs the same. It also avoids duplicates when new items arrive while someone is scrolling."
  },

  // ============================ SYSTEM DESIGN, L3 HARD ============================
  {
    id: "s301", track: "sd", level: 3, topic: "CAP", type: "mcq",
    title: "Partition hits",
    prompt: "A network partition splits your database cluster in two. For bank account balances, what do you give up?",
    options: ["Consistency: let both sides keep accepting writes", "Availability: reject writes on the minority side until the partition heals", "Partition tolerance", "Nothing, you keep all three"],
    answer: 1,
    explain: "During a partition you pick consistency or availability. For money, a wrong balance is worse than a temporary error, so you go CP. For a like counter or shopping cart, AP with later reconciliation is fine. PACELC adds that even without partitions you trade latency against consistency."
  },
  {
    id: "s302", track: "sd", level: 3, topic: "Consistent hashing", type: "mcq",
    title: "Adding one server",
    prompt: "You pick a cache server with `hash(key) % N`. You add one server, so N goes from 10 to 11. Roughly what fraction of keys move?",
    options: ["About 1/11", "About 10/11, nearly everything", "None", "Exactly half"],
    answer: 1,
    explain: "Modulo changes the answer for most keys when N changes, so your hit rate falls off a cliff and the database gets slammed. Consistent hashing puts servers and keys on a ring, so adding a node only moves about 1/N of keys. Virtual nodes smooth out the distribution. Dynamo-style stores and many cache clients work this way."
  },
  {
    id: "s303", track: "sd", level: 3, topic: "Reliability", type: "mcq",
    title: "Charged twice",
    prompt: "A mobile client sends 'charge $50', the request times out, and the client retries. How do you avoid charging twice?",
    options: ["Tell users not to tap twice", "The client sends a unique idempotency key, and the server stores the result per key and returns it on retries", "Switch to UDP", "Add a 5 second delay"],
    answer: 1,
    explain: "Networks fail after the server did the work but before the client heard back. An idempotency key makes retries safe, and Stripe's API works exactly like this. Anything that gets retried, which is eventually everything, should be idempotent."
  },
  {
    id: "s304", track: "sd", level: 3, topic: "Rate limiting", type: "code",
    title: "Build a token bucket",
    prompt: "Implement a token bucket rate limiter. The bucket holds up to `capacity` tokens and starts full. It refills continuously at `ratePerSec` tokens per second (fractions allowed). `times` is a sorted list of request timestamps in ms. Return an array of booleans: true if a request is allowed, which spends 1 token.",
    fn: "rateLimit",
    starter: `function rateLimit(capacity, ratePerSec, times) {

}`,
    hint: "On each request, add (elapsed ms / 1000) × rate tokens, cap at capacity, then spend one if you have at least 1.",
    tests: [
      { args: [3, 1, [0, 0, 0, 0, 500, 1000, 1000, 3000]], expected: [true, true, true, false, false, true, false, true] },
      { args: [1, 2, [0, 100, 500, 600, 1000]], expected: [true, false, true, false, true] },
      { args: [5, 1, []], expected: [] },
      { args: [2, 10, [0, 0, 0, 50, 100, 10000, 10000, 10000]], expected: [true, true, false, false, true, true, true, false] }
    ],
    solution: `function rateLimit(capacity, ratePerSec, times) {
  let tokens = capacity;
  let last = times.length ? times[0] : 0;
  const out = [];
  for (const t of times) {
    tokens = Math.min(capacity, tokens + ((t - last) / 1000) * ratePerSec);
    last = t;
    if (tokens >= 1) { tokens -= 1; out.push(true); }
    else out.push(false);
  }
  return out;
}`,
    explain: "A token bucket allows bursts up to capacity while enforcing an average rate, and it only needs two numbers per user (tokens and last timestamp), so it fits neatly in Redis. Sliding window logs are more exact but store every timestamp. API gateways and cloud providers use token buckets all over."
  },
  {
    id: "s305", track: "sd", level: 3, topic: "Estimation", type: "number",
    title: "Peak read QPS",
    prompt: "100M daily active users each make 20 read requests a day. Peak traffic is 3x the average. Estimate peak read QPS.",
    unit: "req/s", answer: 69444, min: 55000, max: 85000,
    explain: "100M × 20 = 2 billion a day. Divide by about 86,400 and you get ~23,000/s on average, times 3 is ~70,000/s at peak. That's beyond a single database, so most reads need to hit a cache, with read replicas or sharding behind it."
  },
  {
    id: "s306", track: "sd", level: 3, topic: "Caching", type: "mcq",
    title: "Thundering herd",
    prompt: "A hot cache key (the homepage data) expires, and 10,000 requests miss at once and all hit the database. Best fix?",
    options: ["Lower the TTL", "Request coalescing so one request rebuilds while the rest wait, plus jittered or early refresh", "Add more cache servers", "Turn off the cache"],
    answer: 1,
    explain: "That's a cache stampede. Use a lock or singleflight so one request rebuilds the value, refresh before expiry, and add random jitter to TTLs so keys don't all expire together. Facebook's memcache paper describes 'leases' for this exact problem."
  },
  {
    id: "s307", track: "sd", level: 3, topic: "Real-time", type: "mcq",
    title: "Live scores for 2M",
    prompt: "A live sports score page has 2 million concurrent viewers and updates every few seconds. Best way to deliver updates?",
    options: ["Every client polls the API every 100 ms", "Server push via WebSockets or SSE, through a pub/sub fan-out layer", "Email", "Ask users to refresh"],
    answer: 1,
    explain: "Polling every 100 ms is 20 million requests per second, mostly returning nothing new. Push only sends when something changes. SSE is simpler for one-way updates, WebSockets for two-way. At this scale you put a pub/sub layer behind many connection servers."
  },

  // ============================ SYSTEM DESIGN, L4 SENIOR ============================
  {
    id: "s401", track: "sd", level: 4, topic: "Feeds", type: "mcq",
    title: "The celebrity problem",
    prompt: "Twitter-style timelines: for normal users you push each new tweet into followers' precomputed timelines (fan-out on write). What about an account with 100M followers?",
    options: ["Fan out to all 100M on every tweet", "Hybrid: skip fan-out for huge accounts and merge their tweets in at read time", "Stop supporting celebrities", "Store every timeline in one giant SQL table"],
    answer: 1,
    explain: "Fan-out on write makes reads cheap, but one tweet from a 100M-follower account becomes 100M writes. Fan-out on read is cheap to write and slow to read. Twitter's actual answer was the hybrid: push for most users, pull for the few giant accounts."
  },
  {
    id: "s402", track: "sd", level: 4, topic: "Sharding", type: "mcq",
    title: "Shard the messages",
    prompt: "You're sharding a chat app's messages table. The main query is 'last 50 messages in conversation X'. Best shard key?",
    options: ["message_id (random)", "conversation_id", "created_at date", "The sender's country"],
    answer: 1,
    explain: "Shard by what you query by. conversation_id keeps a conversation on one shard, so the read hits one node. Sharding by date creates one red-hot shard for 'today'. Random IDs scatter a single conversation across every shard. Discord partitions messages by channel for the same reason."
  },
  {
    id: "s403", track: "sd", level: 4, topic: "Messaging", type: "mcq",
    title: "Exactly once?",
    prompt: "Your team insists the Kafka consumer must process every payment event 'exactly once'. What do solid systems actually do?",
    options: ["Trust the network", "At-least-once delivery plus idempotent consumers that dedupe by event ID", "At-most-once and accept the occasional lost payment", "Run two Kafka clusters"],
    answer: 1,
    explain: "Across a network you don't get exactly-once delivery for free. You accept at-least-once and make processing idempotent, often by storing processed event IDs in the same transaction as the side effect. Kafka's exactly-once semantics are real but only cover Kafka to Kafka, not your external database."
  },
  {
    id: "s404", track: "sd", level: 4, topic: "Microservices", type: "mcq",
    title: "The dual write",
    prompt: "An order service has to save the order in Postgres and publish an OrderCreated event. If it does one and then the other, a crash in between loses the event. Fix?",
    options: ["Publish first, then save", "Transactional outbox: write the event to an outbox table in the same DB transaction, and a relay publishes it", "Retry forever in memory", "Use a bigger server"],
    answer: 1,
    explain: "Two systems with no shared transaction is the dual write problem. The outbox makes the event part of the database transaction, and a relay or CDC tool like Debezium (reading the write-ahead log) publishes it later, at least once. Consumers dedupe."
  },
  {
    id: "s405", track: "sd", level: 4, topic: "Classic designs", type: "multi",
    title: "URL shortener",
    prompt: "You're designing a URL shortener for 100M new links a month. Which choices are solid? Select all that apply.",
    options: ["Generate unique numeric IDs (pre-allocated ranges per server, or Snowflake-style) and base62 encode them", "Use 7-character base62 codes, about 3.5 trillion combinations", "Cache hot short links in Redis, since reads massively outnumber writes", "Use the first 3 characters of the URL's MD5 hash"],
    answers: [0, 1, 2],
    explain: "62^7 is about 3.5 trillion. Pre-allocated ID ranges avoid a single counter bottleneck. Reads dominate, often 100 to 1, so cache aggressively, and pick 301 vs 302 on purpose (302 if you want click analytics). Three hex characters of MD5 gives only 4,096 codes, so collisions are guaranteed."
  },
  {
    id: "s406", track: "sd", level: 4, topic: "Replication", type: "mcq",
    title: "Quorums",
    prompt: "A Dynamo-style store keeps N = 3 replicas. Writes wait for W = 2 acks, reads query R = 2 replicas. What does that guarantee?",
    options: ["Nothing useful", "Every read overlaps at least one replica that has the latest acknowledged write, because R + W > N", "Writes can never fail", "Only eventual consistency"],
    answer: 1,
    explain: "With strict quorums the overlap means a read always touches the newest acknowledged write, and version numbers pick the winner. W = 1, R = 1 is fast but can return stale data. Tuning R and W lets you trade latency for consistency per query, which Cassandra exposes as consistency levels."
  },
  {
    id: "s407", track: "sd", level: 4, topic: "Observability", type: "mcq",
    title: "Averages lie",
    prompt: "Your latency SLO is p99 under 300 ms. The dashboard shows an average of 80 ms. Is the SLO met?",
    options: ["Yes, the average is way under", "Can't tell. Averages hide the tail, you need the actual p99", "Yes, p99 is always about 2x the average", "No, the average would need to be under 30 ms"],
    answer: 1,
    explain: "A handful of very slow requests barely moves the average, but a page that makes 50 calls hits the tail constantly. Track percentiles with histograms. Also, you can't average percentiles across servers, you have to merge the histograms."
  },

  // ============================ SYSTEM DESIGN, L5 BRUTAL ============================
  {
    id: "s501", track: "sd", level: 5, topic: "Hot keys", type: "mcq",
    title: "Viral post",
    prompt: "A post goes viral: 500k likes per second on a single counter row. The shard holding it melts. Best fix?",
    options: ["A bigger machine for that shard", "Split the counter into N sub-counters, pick one at random on write, sum them on read and cache the total", "Lock the row harder", "Drop the likes"],
    answer: 1,
    explain: "Sharding the keyspace can't spread a single key. Splitting it into sub-keys spreads the writes, and reads sum them and cache briefly. Another option is buffering increments in memory or a stream and flushing in batches. Approximate is fine for likes, so take the win."
  },
  {
    id: "s502", track: "sd", level: 5, topic: "Distributed locks", type: "mcq",
    title: "The paused lock holder",
    prompt: "Worker A holds a lease-based lock, hits a 30 second GC pause, and its lease expires. Worker B grabs the lock. Then A wakes up and writes to storage. How do you stop A's stale write?",
    options: ["Use longer leases", "Fencing tokens: the lock service hands out increasing numbers, and storage rejects writes carrying an older token", "Sync clocks with NTP", "Retry A's write"],
    answer: 1,
    explain: "Any lease can expire while its holder is paused, so the lock alone can't be trusted. The storage layer has to check a monotonically increasing token. Martin Kleppmann's critique of Redlock is the classic read on this."
  },
  {
    id: "s503", track: "sd", level: 5, topic: "Time", type: "mcq",
    title: "Last write wins?",
    prompt: "Two regions both accept writes and resolve conflicts with last-write-wins based on server wall clocks. What goes wrong?",
    options: ["Nothing", "Clock skew means a 'later' write can carry an earlier timestamp and silently lose data", "Writes get slower", "The regions can't communicate"],
    answer: 1,
    explain: "Wall clocks drift and jump. LWW quietly throws one side away. Options: logical clocks (Lamport or vector clocks) to detect concurrent writes, CRDTs to merge automatically, or bounded-uncertainty time like Spanner's TrueTime, which waits out the error bound before committing."
  },
  {
    id: "s504", track: "sd", level: 5, topic: "Estimation", type: "number",
    title: "Streaming egress",
    prompt: "1 million concurrent viewers stream 1080p video at 5 Mbps each. Total egress in Tbps?",
    unit: "Tbps", answer: 5, min: 4.5, max: 5.5,
    explain: "1,000,000 × 5 Mbps = 5,000,000 Mbps = 5 Tbps. No single datacenter wants that, which is why streaming lives on CDNs and caches placed inside ISPs, like Netflix Open Connect."
  },
  {
    id: "s505", track: "sd", level: 5, topic: "Consensus", type: "mcq",
    title: "Six node Raft",
    prompt: "A Raft cluster has 6 nodes. How many node failures can it survive and still make progress?",
    options: ["3", "2", "5", "1"],
    answer: 1,
    explain: "Raft needs a majority, which is 4 of 6, so it survives 2 failures. That's the same as a 5-node cluster, with one more node to coordinate. That's why clusters use odd sizes: 3, 5, 7."
  },
  {
    id: "s506", track: "sd", level: 5, topic: "Microservices", type: "mcq",
    title: "Checkout half failed",
    prompt: "Checkout spans Orders, Payments and Inventory services, each with its own database. The payment succeeds, but the inventory reservation fails. What's the microservice-friendly way to stay consistent?",
    options: ["Two-phase commit across all three services", "A saga: a sequence of local transactions with compensating actions, like refunding the payment", "One shared database for all three", "Ignore it"],
    answer: 1,
    explain: "2PC blocks if the coordinator dies and couples services tightly. Sagas accept temporary inconsistency and undo with compensations, driven either by an orchestrator or by events. Make the compensations idempotent too, since they'll get retried."
  },
  {
    id: "s507", track: "sd", level: 5, topic: "Classic designs", type: "multi",
    title: "Global leaderboard",
    prompt: "Global leaderboard: 100M players, scores update constantly, and you need the top 100 plus each player's own rank in real time. Which are reasonable? Select all that apply.",
    options: ["Redis sorted sets (ZADD, ZREVRANK) for O(log n) updates and rank lookups", "SQL `ORDER BY score` over all players on every request", "Shard by score range, so global rank = rank inside the shard + count of players in higher shards", "For players far from the top, show an approximate percentile instead of an exact rank"],
    answers: [0, 2, 3],
    explain: "Sorted sets are a skip list plus a hash, built for exactly this. Sorting 100M rows per request is not. Score-range sharding keeps rank math cheap, and showing approximate ranks for the long tail is a product call that saves a lot of infrastructure."
  },
  {
    id: "s508", track: "sd", level: 5, topic: "Disaster recovery", type: "mcq",
    title: "Lose a region",
    prompt: "Your app has to survive a full region outage while losing under 1 minute of data. What database setup gets you there?",
    options: ["Nightly backups to another region", "Async replication to a standby region (RPO of seconds) plus automated failover", "One region with more replicas", "Two independent databases and hope"],
    answer: 1,
    explain: "RPO (how much data you can lose) and RTO (how long recovery takes) drive the design. Nightly backups mean up to 24 hours of loss. Async cross-region replication gets you seconds without slowing writes. Zero data loss needs synchronous replication across regions, which adds tens of milliseconds to every write."
  },
  // ============================ MORE ALGORITHMS ============================
  {
    id: "a108", track: "algo", level: 1, topic: "Hashing", type: "code",
    title: "Contains duplicate",
    prompt: "Return true if any value appears at least twice in `nums`. One test has 100,000 distinct numbers, so comparing every pair will time out.",
    fn: "hasDuplicate",
    starter: `function hasDuplicate(nums) {

}`,
    hint: "A Set answers 'have I seen this before?' in O(1).",
    tests: [
      { args: [[1, 2, 3, 1]], expected: true },
      { args: [[1, 2, 3, 4]], expected: false },
      { args: [[]], expected: false },
      { args: [[7, 7]], expected: true },
      { label: "100k distinct numbers", argsCode: "[Array.from({ length: 100000 }, (_, i) => i)]", expected: false, miss: "hashing.wrong-pattern" }
    ],
    solution: `function hasDuplicate(nums) {
  const seen = new Set();
  for (const x of nums) {
    if (seen.has(x)) return true;
    seen.add(x);
  }
  return false;
}`,
    explain: "One pass with a Set is O(n) time and O(n) space. Sorting first and checking neighbors is O(n log n) with O(1) extra space, a fair trade when memory is tight. The pairwise check is O(n²), which is 5 billion comparisons at n = 100k."
  },
  {
    id: "a109", track: "algo", level: 1, topic: "Two pointers", type: "code",
    title: "Valid palindrome",
    prompt: "Return true if `s` reads the same forwards and backwards after lowercasing it and ignoring everything that isn't a letter or a digit.",
    fn: "isPalindrome",
    starter: `function isPalindrome(s) {

}`,
    hint: "Put one pointer at each end. Skip junk characters, compare, move both inward.",
    tests: [
      { args: ["A man, a plan, a canal: Panama"], expected: true, miss: "two-pointers.skip-junk" },
      { args: ["race a car"], expected: false },
      { args: [" "], expected: true, miss: "two-pointers.skip-junk" },
      { args: ["0P"], expected: false, miss: "two-pointers.skip-junk" },
      { args: ["ab_a"], expected: true, miss: "two-pointers.skip-junk" }
    ],
    solution: `function isPalindrome(s) {
  const ok = c => /[a-z0-9]/i.test(c);
  let i = 0, j = s.length - 1;
  while (i < j) {
    if (!ok(s[i])) { i++; continue; }
    if (!ok(s[j])) { j--; continue; }
    if (s[i].toLowerCase() !== s[j].toLowerCase()) return false;
    i++; j--;
  }
  return true;
}`,
    explain: "Two pointers walking inward check the string in O(n) time with O(1) extra space. Building a cleaned copy and reversing it also works, but costs O(n) memory. Note that `_` is not alphanumeric, a classic edge case."
  },
  {
    id: "a110", track: "algo", level: 1, topic: "Stacks", type: "mcq",
    title: "The undo button",
    prompt: "A text editor needs Undo: every edit is recorded, and Undo reverts the most recent one. Which structure fits?",
    options: ["Stack", "Queue", "Hash map", "Binary search tree"],
    answer: 0,
    misses: [null, "stacks.fifo-lifo", "stacks.wrong-pattern", "stacks.wrong-pattern"],
    explain: "Undo is last in, first out, which is exactly a stack. Redo is a second stack: popping from Undo pushes onto Redo, and any new edit clears Redo. A queue would undo your oldest edit first."
  },
  {
    id: "a209", track: "algo", level: 2, topic: "Two pointers", type: "code",
    title: "Pair sum, sorted",
    prompt: "`nums` is sorted ascending. Return indices `[i, j]` (i < j) of the two numbers that sum to `target`. Exactly one answer exists. Use O(1) extra memory.",
    fn: "pairSumSorted",
    starter: `function pairSumSorted(nums, target) {

}`,
    hint: "Start at both ends. If the sum is too small, which pointer should move?",
    tests: [
      { args: [[2, 7, 11, 15], 9], expected: [0, 1] },
      { args: [[1, 3, 4, 6, 8, 11], 10], expected: [2, 3], miss: "two-pointers.move-wrong-pointer" },
      { args: [[-3, -1, 0, 2, 5], 4], expected: [1, 4], miss: "two-pointers.move-wrong-pointer" },
      { args: [[1, 2], 3], expected: [0, 1] }
    ],
    solution: `function pairSumSorted(nums, target) {
  let i = 0, j = nums.length - 1;
  while (i < j) {
    const sum = nums[i] + nums[j];
    if (sum === target) return [i, j];
    if (sum < target) i++;
    else j--;
  }
  return [];
}`,
    explain: "Sorted input is a gift. If the sum is too small, the left number can't be part of any answer with a smaller right number, so it's safe to drop it. Each step discards one candidate, giving O(n) time and O(1) space, better on memory than the hash map version of Two Sum."
  },
  {
    id: "a210", track: "algo", level: 2, topic: "Binary search", type: "mcq",
    title: "Search the answer",
    prompt: "Packages with weights `w` must ship in order within D days. Find the smallest truck capacity that works. Checking one capacity takes O(n). What's the best overall approach?",
    options: ["Try every capacity from 1 upward, O(n · sum)", "Binary search the capacity between max(w) and sum(w), O(n log sum)", "Sort the weights and take the D-th largest", "Dynamic programming over days and packages, O(n² · D)"],
    answer: 1,
    misses: ["binary-search.answer-space", null, "binary-search.wrong-pattern", "binary-search.wrong-pattern"],
    explain: "Feasibility is monotonic: if capacity C works, C + 1 works too. Any time the answer space is monotonic, you can binary search on the answer itself. The same trick solves 'minimum speed to finish on time' and 'split an array to minimize the largest sum'."
  },
  {
    id: "a211", track: "algo", level: 2, topic: "Hashing", type: "code",
    title: "First unique character",
    prompt: "Return the index of the first character in `s` that appears exactly once, or -1 if there isn't one.",
    fn: "firstUniqChar",
    starter: `function firstUniqChar(s) {

}`,
    hint: "Two passes: count everything first, then find the first count of 1.",
    tests: [
      { args: ["leetcode"], expected: 0 },
      { args: ["loveleetcode"], expected: 2, miss: "hashing.counts-vs-presence" },
      { args: ["aabb"], expected: -1, miss: "hashing.counts-vs-presence" },
      { args: ["z"], expected: 0 },
      { args: ["abcabd"], expected: 2 }
    ],
    solution: `function firstUniqChar(s) {
  const count = new Map();
  for (const c of s) count.set(c, (count.get(c) || 0) + 1);
  for (let i = 0; i < s.length; i++) if (count.get(s[i]) === 1) return i;
  return -1;
}`,
    explain: "Counting with a hash map is the bread and butter of string problems. Two linear passes is still O(n). Calling `indexOf` and `lastIndexOf` for each character looks shorter but is O(n²)."
  },
  {
    id: "a212", track: "algo", level: 2, topic: "BFS", type: "mcq",
    title: "BFS or DFS?",
    prompt: "In an unweighted graph you need the fewest edges from A to B. Why does BFS work here and plain DFS doesn't?",
    options: ["BFS uses less memory than DFS", "BFS visits nodes in order of distance, so the first time it reaches B is the shortest path", "DFS can't handle cycles", "BFS is O(V) while DFS is O(V + E)"],
    answer: 1,
    misses: ["graphs.wrong-pattern", null, "graphs.cycle-detection", "graphs.cost-miscount"],
    explain: "BFS explores in rings: everything 1 hop away, then 2, then 3. The first time it pops B, no shorter route can exist. DFS dives down one branch and may find a long path first. Both are O(V + E). Once edges have weights, you need Dijkstra."
  },
  {
    id: "a213", track: "algo", level: 2, topic: "Dynamic programming", type: "code",
    title: "House robber",
    prompt: "Each house has some cash `nums[i]`. You can't rob two adjacent houses. Return the most you can take. One test has 100,000 houses.",
    fn: "rob",
    starter: `function rob(nums) {

}`,
    hint: "At house i you either skip it (keep best up to i-1) or rob it (nums[i] + best up to i-2). You only need the last two answers.",
    tests: [
      { args: [[1, 2, 3, 1]], expected: 4 },
      { args: [[2, 7, 9, 3, 1]], expected: 12 },
      { args: [[]], expected: 0, miss: "dp.base-case" },
      { args: [[5]], expected: 5, miss: "dp.base-case" },
      { args: [[2, 1, 1, 2]], expected: 4, miss: "dp.state-definition" },
      { label: "100k houses with $1 each", argsCode: "[new Array(100000).fill(1)]", expected: 50000, miss: "dp.too-slow" }
    ],
    solution: `function rob(nums) {
  let prev = 0, cur = 0; // best up to i-2, best up to i-1
  for (const x of nums) [prev, cur] = [cur, Math.max(cur, prev + x)];
  return cur;
}`,
    explain: "The recurrence is best(i) = max(best(i-1), best(i-2) + nums[i]). Naive recursion is exponential, memoizing makes it O(n), and noticing you only need two previous values gets space down to O(1). That progression is the whole DP playbook in miniature."
  },
  {
    id: "a309", track: "algo", level: 3, topic: "Heaps", type: "code",
    title: "Merge k sorted lists",
    prompt: "`lists` holds k arrays, each sorted ascending. Return one sorted array with every element. A heap gives O(N log k), where N is the total number of elements. Sorting everything is also accepted.",
    fn: "mergeKSorted",
    starter: `function mergeKSorted(lists) {

}`,
    hint: "Keep a min-heap holding the current front of each list. Pop the smallest, then push the next element from that same list.",
    tests: [
      { args: [[[1, 4, 5], [1, 3, 4], [2, 6]]], expected: [1, 1, 2, 3, 4, 4, 5, 6] },
      { args: [[]], expected: [] },
      { args: [[[], [1]]], expected: [1] },
      { args: [[[5], [1], [3]]], expected: [1, 3, 5] },
      { args: [[[-2, 0, 9], [], [-5, 10]]], expected: [-5, -2, 0, 9, 10], miss: "heaps.default-sort" },
      { args: [[[10, 20], [9, 30], [100]]], expected: [9, 10, 20, 30, 100], miss: "heaps.default-sort" }
    ],
    solution: `function mergeKSorted(lists) {
  const heap = []; // [value, listIndex, itemIndex]
  const less = (a, b) => heap[a][0] < heap[b][0];
  const swap = (a, b) => { [heap[a], heap[b]] = [heap[b], heap[a]]; };
  const push = x => {
    heap.push(x);
    let i = heap.length - 1;
    while (i > 0) { const p = (i - 1) >> 1; if (!less(i, p)) break; swap(i, p); i = p; }
  };
  const pop = () => {
    const top = heap[0], last = heap.pop();
    if (heap.length) {
      heap[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < heap.length && less(l, m)) m = l;
        if (r < heap.length && less(r, m)) m = r;
        if (m === i) break;
        swap(i, m); i = m;
      }
    }
    return top;
  };
  lists.forEach((l, i) => { if (l.length) push([l[0], i, 0]); });
  const out = [];
  while (heap.length) {
    const [v, li, ii] = pop();
    out.push(v);
    if (ii + 1 < lists[li].length) push([lists[li][ii + 1], li, ii + 1]);
  }
  return out;
}`,
    explain: "The heap never holds more than k items, so each of the N pops and pushes costs O(log k). Concatenating and sorting is O(N log N), fine here but worse when k is small and N is huge. This is how databases merge sorted runs in external sort and how LSM trees compact SSTables."
  },
  {
    id: "a310", track: "algo", level: 3, topic: "Union-Find", type: "code",
    title: "Connected components",
    prompt: "There are `n` nodes labeled 0 to n-1 and a list of undirected `edges`. Return how many connected components there are. One test is a 200,000 node chain, so deep recursion will crash.",
    fn: "countComponents",
    starter: `function countComponents(n, edges) {

}`,
    hint: "Start with n components. Every edge that joins two different roots merges them, so subtract one.",
    tests: [
      { args: [5, [[0, 1], [1, 2], [3, 4]]], expected: 2 },
      { args: [5, [[0, 1], [1, 2], [2, 3], [3, 4]]], expected: 1 },
      { args: [4, []], expected: 4 },
      { args: [3, [[0, 1], [1, 0]]], expected: 2, miss: "graphs.no-visited" },
      { label: "200k node chain", argsCode: "[200000, Array.from({ length: 199999 }, (_, i) => [i, i + 1])]", expected: 1, miss: "graphs.wrong-pattern" }
    ],
    solution: `function countComponents(n, edges) {
  const parent = Array.from({ length: n }, (_, i) => i);
  const find = x => {
    while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; }
    return x;
  };
  let count = n;
  for (const [a, b] of edges) {
    const ra = find(a), rb = find(b);
    if (ra !== rb) { parent[ra] = rb; count--; }
  }
  return count;
}`,
    explain: "Union-Find tracks which set each node belongs to. Path compression (here the halving version, done in a loop) keeps trees shallow, so operations are close to O(1) in practice. Halving alone gives amortized O(log n), and adding union by rank gets you to inverse Ackermann. An iterative BFS also works. A recursive DFS 200,000 levels deep blows the call stack."
  },
  {
    id: "a311", track: "algo", level: 3, topic: "Binary search", type: "code",
    title: "Search a rotated array",
    prompt: "A sorted array of distinct numbers was rotated at some pivot, like `[4,5,6,7,0,1,2]`. Return the index of `target`, or -1. Do it in O(log n): one test is an array of 500 million numbers that only lets you read a few hundred of them.",
    fn: "searchRotated",
    starter: `function searchRotated(nums, target) {

}`,
    hint: "Split at mid. At least one half is still properly sorted. Check whether the target sits inside that sorted half.",
    tests: [
      { args: [[4, 5, 6, 7, 0, 1, 2], 0], expected: 4 },
      { args: [[4, 5, 6, 7, 0, 1, 2], 3], expected: -1 },
      { args: [[1], 0], expected: -1 },
      { args: [[1], 1], expected: 0 },
      { args: [[5, 1, 3], 5], expected: 0, miss: "binary-search.wrong-half" },
      { args: [[3, 1], 1], expected: 1, miss: "binary-search.off-by-one" },
      { args: [[6, 7, 1, 2, 3, 4, 5], 7], expected: 1, miss: "binary-search.wrong-half" },
      { label: "500M rotated, target in the left part", argsCode: "[(() => { let reads = 0; return new Proxy([], { get(t, p) { if (p === 'length') return 500000000; if (typeof p === 'string' && /^[0-9]+$/.test(p)) { if (++reads > 500) throw new Error('Read more than 500 elements. This needs O(log n) reads.'); const i = Number(p); return ((i + 123456789) % 500000000) * 2; } return t[p]; } }); })(), 14]", expected: 376543218, miss: "binary-search.wrong-pattern" },
      { label: "500M rotated, target in the right part", argsCode: "[(() => { let reads = 0; return new Proxy([], { get(t, p) { if (p === 'length') return 500000000; if (typeof p === 'string' && /^[0-9]+$/.test(p)) { if (++reads > 500) throw new Error('Read more than 500 elements. This needs O(log n) reads.'); const i = Number(p); return ((i + 123456789) % 500000000) * 2; } return t[p]; } }); })(), 999999998]", expected: 376543210, miss: "binary-search.wrong-pattern" },
      { label: "500M rotated, first element", argsCode: "[(() => { let reads = 0; return new Proxy([], { get(t, p) { if (p === 'length') return 500000000; if (typeof p === 'string' && /^[0-9]+$/.test(p)) { if (++reads > 500) throw new Error('Read more than 500 elements. This needs O(log n) reads.'); const i = Number(p); return ((i + 123456789) % 500000000) * 2; } return t[p]; } }); })(), 246913578]", expected: 0 },
      { label: "500M rotated, missing", argsCode: "[(() => { let reads = 0; return new Proxy([], { get(t, p) { if (p === 'length') return 500000000; if (typeof p === 'string' && /^[0-9]+$/.test(p)) { if (++reads > 500) throw new Error('Read more than 500 elements. This needs O(log n) reads.'); const i = Number(p); return ((i + 123456789) % 500000000) * 2; } return t[p]; } }); })(), 1001]", expected: -1, miss: "binary-search.wrong-pattern" }
    ],
    solution: `function searchRotated(nums, target) {
  let lo = 0, hi = nums.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (nums[mid] === target) return mid;
    if (nums[lo] <= nums[mid]) {
      // left half sorted
      if (nums[lo] <= target && target < nums[mid]) hi = mid - 1;
      else lo = mid + 1;
    } else {
      // right half sorted
      if (nums[mid] < target && target <= nums[hi]) lo = mid + 1;
      else hi = mid - 1;
    }
  }
  return -1;
}`,
    explain: "Binary search doesn't need the whole range sorted. It needs a rule that throws away half the range each step. Here one side of mid is always sorted, and a simple range check tells you whether the target lives there. Off by one bugs hide in the `<=` vs `<` comparisons, so trace a two element case."
  },
  {
    id: "a312", track: "algo", level: 3, topic: "Prefix sums", type: "code",
    title: "Subarrays that sum to k",
    prompt: "Count the contiguous subarrays of `nums` whose sum is exactly `k`. Numbers can be negative. One test has 100,000 numbers, so checking every subarray will time out.",
    fn: "subarraySum",
    starter: `function subarraySum(nums, k) {

}`,
    hint: "sum(i..j) = prefix[j] - prefix[i-1]. While scanning, how many earlier prefixes equal `prefix - k`?",
    tests: [
      { args: [[1, 1, 1], 2], expected: 2, miss: "prefix-sums.missing-zero-seed" },
      { args: [[1, 2, 3], 3], expected: 2 },
      { args: [[1, -1, 0], 0], expected: 3, miss: "prefix-sums.negatives-break-window" },
      { args: [[3], 3], expected: 1, miss: "prefix-sums.missing-zero-seed" },
      { label: "100k ones, k = 100", argsCode: "[new Array(100000).fill(1), 100]", expected: 99901, miss: "prefix-sums.recompute-per-query" }
    ],
    solution: `function subarraySum(nums, k) {
  const seen = new Map([[0, 1]]); // prefix sum -> how many times
  let sum = 0, count = 0;
  for (const x of nums) {
    sum += x;
    count += seen.get(sum - k) || 0;
    seen.set(sum, (seen.get(sum) || 0) + 1);
  }
  return count;
}`,
    explain: "Prefix sums turn 'sum of a range' into 'difference of two numbers', and a hash map counts how many earlier prefixes make that difference equal k. One pass, O(n). Sliding windows fail here because negative numbers break the 'grow or shrink' logic. Seeding the map with `{0: 1}` counts subarrays that start at index 0."
  },
  {
    id: "a313", track: "algo", level: 3, topic: "Prefix sums", type: "mcq",
    title: "A million range queries",
    prompt: "An array of 1M numbers never changes. You'll get 1M queries asking for the sum of `nums[l..r]`. What's the right prep?",
    options: ["Nothing, loop over each range when asked", "Sort the array first", "Build a prefix sum array once, then answer each query as `prefix[r+1] - prefix[l]`", "Put every subarray sum in a hash map"],
    answer: 2,
    misses: ["prefix-sums.recompute-per-query", "prefix-sums.wrong-pattern", null, "prefix-sums.wrong-pattern"],
    explain: "O(n) preprocessing, then O(1) per query. Looping per query could be 10^12 operations. Every possible subarray is n²/2, about 500 billion entries. Analytics systems use the same idea with cumulative counters, and 2D prefix sums power summed area tables in image processing."
  },
  {
    id: "a409", track: "algo", level: 4, topic: "Sliding window", type: "code",
    title: "Minimum window substring",
    prompt: "Return the shortest substring of `s` that contains every character of `t` (with multiplicity). Return \"\" if none exists. The answer is unique. One test is 100,000 characters long.",
    fn: "minWindow",
    starter: `function minWindow(s, t) {

}`,
    hint: "Grow the right edge until the window covers t, then shrink the left edge as far as you can while it still covers t. Track a 'missing' counter so the coverage check is O(1).",
    tests: [
      { args: ["ADOBECODEBANC", "ABC"], expected: "BANC", miss: "sliding-window.no-shrink" },
      { args: ["a", "a"], expected: "a" },
      { args: ["a", "aa"], expected: "", miss: "sliding-window.multiplicity" },
      { args: ["ab", "b"], expected: "b" },
      { args: ["aaflslflsldkalskaaa", "aaa"], expected: "aaa", miss: "sliding-window.multiplicity" },
      { label: "100k a's then a b", argsCode: "['a'.repeat(100000) + 'b', 'ab']", expected: "ab", miss: "sliding-window.recompute" }
    ],
    solution: `function minWindow(s, t) {
  const need = new Map();
  for (const c of t) need.set(c, (need.get(c) || 0) + 1);
  let missing = t.length, l = 0, bestL = 0, bestLen = Infinity;
  for (let r = 0; r < s.length; r++) {
    const c = s[r];
    if (need.has(c)) {
      if (need.get(c) > 0) missing--;
      need.set(c, need.get(c) - 1);
    }
    while (missing === 0) {
      if (r - l + 1 < bestLen) { bestLen = r - l + 1; bestL = l; }
      const d = s[l++];
      if (need.has(d)) {
        need.set(d, need.get(d) + 1);
        if (need.get(d) > 0) missing++;
      }
    }
  }
  return bestLen === Infinity ? "" : s.slice(bestL, bestL + bestLen);
}`,
    explain: "Each index enters and leaves the window once, so it's O(|s| + |t|). The `missing` counter is the key trick: it avoids re-comparing whole frequency maps on every step. Counts can go negative in `need`, which just means the window has extras of that character."
  },
  {
    id: "a410", track: "algo", level: 4, topic: "Graphs", type: "mcq",
    title: "Cycle in a directed graph",
    prompt: "You run DFS on a directed graph and mark nodes visited. Why isn't 'I reached an already visited node' enough to say there's a cycle?",
    options: ["It is enough, that's the standard check", "The node may have been fully finished from another branch. A cycle only exists if you reach a node still on the current DFS path", "DFS can't detect cycles in directed graphs, you need BFS", "You must also compare edge weights"],
    answer: 1,
    misses: ["graphs.cycle-detection", null, "graphs.wrong-pattern", "graphs.wrong-pattern"],
    explain: "Use three colors: white (unvisited), gray (on the current path), black (done). Hitting a gray node means you found a back edge, which is a cycle. Hitting a black node is a cross edge and is harmless, like A to C and B to C. Undirected graphs only need to ignore the parent edge."
  },
  {
    id: "a411", track: "algo", level: 4, topic: "Shortest paths", type: "mcq",
    title: "Dijkstra's bill",
    prompt: "What's the running time of Dijkstra with a binary heap on a graph with V nodes and E edges?",
    options: ["O(V + E)", "O((V + E) log V)", "O(V · E)", "O(V³)"],
    answer: 1,
    misses: ["graphs.cost-miscount", null, "graphs.cost-miscount", "graphs.cost-miscount"],
    explain: "Every edge can trigger a heap push (log V), and every node is popped once. With the lazy version you push duplicates and skip stale entries when popped, still O(E log V). Bellman-Ford is O(V·E), and Floyd-Warshall is O(V³) for all pairs."
  },
  {
    id: "a412", track: "algo", level: 4, topic: "Strings", type: "code",
    title: "Longest palindromic substring",
    prompt: "Return the length of the longest palindromic substring of `s`. Two tests have 3,000 and 5,000 characters, so checking every substring in O(n³) will time out.",
    fn: "longestPalLen",
    starter: `function longestPalLen(s) {

}`,
    hint: "Every palindrome has a center. There are 2n - 1 centers (on characters and between them). Expand outward from each.",
    tests: [
      { args: ["babad"], expected: 3 },
      { args: ["cbbd"], expected: 2, miss: "two-pointers.even-centers" },
      { args: ["a"], expected: 1 },
      { args: [""], expected: 0 },
      { args: ["forgeeksskeegfor"], expected: 10 },
      { label: "'ab' repeated 1,500 times", argsCode: "['ab'.repeat(1500)]", expected: 2999, miss: "two-pointers.wrong-pattern" },
      { label: "'ab' repeated 2,500 times", argsCode: "['ab'.repeat(2500)]", expected: 4999, miss: "two-pointers.wrong-pattern" }
    ],
    solution: `function longestPalLen(s) {
  let best = 0;
  const expand = (l, r) => {
    while (l >= 0 && r < s.length && s[l] === s[r]) { l--; r++; }
    return r - l - 1;
  };
  for (let i = 0; i < s.length; i++) {
    best = Math.max(best, expand(i, i), expand(i, i + 1));
  }
  return best;
}`,
    explain: "Expand around center is O(n²) time and O(1) space, simple and fast enough for most inputs. Manacher's algorithm does it in O(n) by reusing mirror information, but it's rarely expected. Handle even length centers too, or 'cbbd' fails."
  },
  {
    id: "a507", track: "algo", level: 5, topic: "Binary search", type: "code",
    title: "Median of two sorted arrays",
    prompt: "Return the median of two sorted arrays `a` and `b` combined. Target O(log(min(m, n))). The big tests have hundreds of millions of numbers and only let you read about a thousand of them.",
    fn: "findMedianSortedArrays",
    starter: `function findMedianSortedArrays(a, b) {

}`,
    hint: "Binary search a cut in the shorter array. The cut in the longer one is forced so the left halves hold half the elements. The cut is right when both left maxes are <= both right mins.",
    tests: [
      { args: [[1, 3], [2]], expected: 2 },
      { args: [[1, 2], [3, 4]], expected: 2.5 },
      { args: [[], [1]], expected: 1, miss: "binary-search.off-by-one" },
      { args: [[0, 0], [0, 0]], expected: 0 },
      { args: [[2], []], expected: 2, miss: "binary-search.off-by-one" },
      { args: [[1, 5, 9], [2, 3, 4, 10]], expected: 4, miss: "binary-search.wrong-half" },
      { label: "500M evens + 500M odds", argsCode: "(() => { let reads = 0; const mk = (len, f) => new Proxy([], { get(t, p) { if (p === 'length') return len; if (typeof p === 'string' && /^[0-9]+$/.test(p)) { if (++reads > 1000) throw new Error('Read more than 1000 elements. This needs O(log n) reads.'); return f(Number(p)); } return t[p]; } }); return [mk(500000000, i => 2 * i), mk(500000000, i => 2 * i + 1)]; })()", expected: 499999999.5, miss: "binary-search.wrong-pattern" },
      { label: "500M small + 200M large", argsCode: "(() => { let reads = 0; const mk = (len, f) => new Proxy([], { get(t, p) { if (p === 'length') return len; if (typeof p === 'string' && /^[0-9]+$/.test(p)) { if (++reads > 1000) throw new Error('Read more than 1000 elements. This needs O(log n) reads.'); return f(Number(p)); } return t[p]; } }); return [mk(500000000, i => 2 * i), mk(200000000, i => 2e9 + i)]; })()", expected: 699999999, miss: "binary-search.wrong-pattern" },
      { label: "500k evens + 500k odds", argsCode: "[Array.from({ length: 500000 }, (_, i) => 2 * i), Array.from({ length: 500000 }, (_, i) => 2 * i + 1)]", expected: 499999.5 }
    ],
    solution: `function findMedianSortedArrays(a, b) {
  if (a.length > b.length) [a, b] = [b, a];
  const m = a.length, n = b.length, half = (m + n + 1) >> 1;
  let lo = 0, hi = m;
  while (lo <= hi) {
    const i = (lo + hi) >> 1, j = half - i;
    const aL = i > 0 ? a[i - 1] : -Infinity, aR = i < m ? a[i] : Infinity;
    const bL = j > 0 ? b[j - 1] : -Infinity, bR = j < n ? b[j] : Infinity;
    if (aL <= bR && bL <= aR) {
      const left = Math.max(aL, bL);
      return (m + n) % 2 ? left : (left + Math.min(aR, bR)) / 2;
    }
    if (aL > bR) hi = i - 1;
    else lo = i + 1;
  }
}`,
    explain: "You're not searching for a value, you're searching for a partition. Picking i elements from a forces half - i from b, and the comparisons tell you which way to move. Infinity sentinels remove a pile of edge cases. Merging until the middle is O(m + n), which is fine for small inputs but reads far too many elements for the huge tests, and interviewers asking this one want the log version."
  },
  {
    id: "a508", track: "algo", level: 5, topic: "Prefix sums", type: "mcq",
    title: "Ranges that change",
    prompt: "A 1M number array now gets interleaved point updates (`nums[i] = x`) and range sum queries, 1M of each. Which structure fits?",
    options: ["Prefix sums, rebuilt after every update", "A Fenwick tree (binary indexed tree) or segment tree, O(log n) for both", "A hash map from index to value", "A sorted array with binary search"],
    answer: 1,
    misses: ["prefix-sums.rebuild-on-update", null, "prefix-sums.recompute-per-query", "prefix-sums.wrong-pattern"],
    explain: "Prefix sums make queries O(1) but updates O(n), so 1M updates is 10^12 work. Fenwick and segment trees store partial sums over power of two ranges, so both operations touch O(log n) nodes, about 20. Segment trees also handle range min, max and lazy range updates."
  },

  // ============================ MORE SYSTEM DESIGN ============================
  {
    id: "s107", track: "sd", level: 1, topic: "Caching", type: "mcq",
    title: "Why a TTL?",
    prompt: "You cache user profiles in Redis with a TTL of 10 minutes. What does the TTL buy you?",
    options: ["Faster reads than a cache without a TTL", "A cap on how stale a cached value can get, plus automatic cleanup of keys nobody reads", "Guaranteed consistency with the database", "Protection against the cache server crashing"],
    answer: 1,
    explain: "A TTL is a staleness budget. Even if you forget to invalidate on some write path, the bad value dies within 10 minutes. It also lets cold keys expire instead of hogging memory. Add a little random jitter to TTLs so a million keys don't all expire in the same second."
  },
  {
    id: "s108", track: "sd", level: 1, topic: "APIs", type: "mcq",
    title: "Safe to retry",
    prompt: "A mobile client times out and retries. Which HTTP method is NOT idempotent by default, so a retry could create a duplicate?",
    options: ["GET", "PUT", "DELETE", "POST"],
    answer: 3,
    explain: "Idempotent means doing it twice has the same effect as once. GET reads, PUT replaces with the same value, DELETE of a deleted thing is still deleted. POST usually creates something new each time, which is why payment APIs ask for an `Idempotency-Key` header on POST."
  },
  {
    id: "s208", track: "sd", level: 2, topic: "Load balancing", type: "mcq",
    title: "Route by path",
    prompt: "You want `/api/*` to go to API servers and `/static/*` to a different pool. What kind of load balancer can do that?",
    options: ["Layer 4 (TCP) load balancer", "Layer 7 (HTTP) load balancer", "DNS round robin", "Any of them, routing is always path based"],
    answer: 1,
    explain: "An L4 balancer only sees IPs and ports, so it can't read the URL. An L7 balancer terminates HTTP, so it can route on path, headers or cookies, and can do TLS termination and retries. The cost is more CPU per request. L4 is cheaper and handles raw TCP like databases."
  },
  {
    id: "s209", track: "sd", level: 2, topic: "Databases", type: "mcq",
    title: "The N+1 query",
    prompt: "A page lists 50 posts and shows each author's name. Your ORM runs 1 query for posts, then 1 query per post for its author. What's the fix?",
    options: ["Add a cache in front of the database", "Fetch all authors in one query (`WHERE id IN (...)`) or JOIN, a.k.a. eager loading", "Add more database replicas", "Paginate down to 10 posts"],
    answer: 1,
    explain: "51 round trips at 1 ms each is 51 ms of pure latency, and it grows with the page. One JOIN or one `IN` query does it in 2 round trips. In Rails it's `includes(:author)`, in Django `select_related`. Watch query counts in your logs, N+1 is the most common ORM performance bug."
  },
  {
    id: "s210", track: "sd", level: 2, topic: "Caching", type: "multi",
    title: "Writes and the cache",
    prompt: "A user updates their profile. Which approaches keep readers from seeing the old cached value for long?",
    options: ["Delete the cache key right after the database write commits", "Write through: write the database, then update the cache", "Update the cache first, then the database", "Short TTLs as a safety net"],
    answers: [0, 1, 3],
    explain: "Delete on write (then lazily reload) is the common default. Write through keeps the cache warm. A TTL catches anything you missed. Updating the cache before the database is risky: if the database write fails, the cache now holds a value that never existed."
  },
  {
    id: "s211", track: "sd", level: 2, topic: "Estimation", type: "number",
    title: "A year of posts",
    prompt: "A social app gets 100 million new text posts a day, about 300 bytes each with metadata. How much storage is a year of posts, in TB?",
    answer: 11, min: 8, max: 15, unit: "TB",
    explain: "100M × 300 B = 30 GB a day. Times 365 is about 11 TB a year, before replication. With 3 replicas it's around 33 TB. Text is cheap, media is what blows up storage budgets."
  },
  {
    id: "s308", track: "sd", level: 3, topic: "Rate limiting", type: "mcq",
    title: "Window edges",
    prompt: "A fixed window limiter allows 100 requests per minute, resetting at :00. What's the flaw?",
    options: ["It needs too much memory per user", "A client can send 100 at 0:59 and 100 more at 1:00, so 200 requests in 2 seconds", "It can't be implemented in Redis", "It blocks every request after the first 100 forever"],
    answer: 1,
    explain: "Fixed windows allow double bursts at the boundary. A sliding log fixes it exactly but stores every timestamp. A sliding window counter blends the current and previous window counts, close enough at tiny memory cost. Token buckets allow controlled bursts and are the usual choice at API gateways."
  },
  {
    id: "s309", track: "sd", level: 3, topic: "Messaging", type: "mcq",
    title: "Ordered per user",
    prompt: "Events for each user must be processed in order, but you need 50 consumers in parallel on Kafka. How?",
    options: ["Use a single partition", "Use the user ID as the message key, so all of a user's events land in the same partition", "Assign random keys and sort on the consumer", "Kafka guarantees global ordering across partitions"],
    answer: 1,
    explain: "Kafka only orders within a partition. Keying by user ID hashes each user to one partition, which one consumer reads in order, while different users spread across partitions in parallel. Watch for hot keys: one huge user can overload a single partition."
  },
  {
    id: "s310", track: "sd", level: 3, topic: "Estimation", type: "number",
    title: "How many shards?",
    prompt: "You have 20 TB of data. Each database node has 2 TB of disk, and you want to keep nodes at most 50% full for growth and compaction. How many shards, not counting replicas?",
    answer: 20, min: 18, max: 24, unit: "shards",
    explain: "50% of 2 TB is 1 TB usable per node, so 20 TB needs 20 shards. Add replicas (often 3x) and you're at 60 nodes. Leave headroom, rebalancing a full cluster is painful."
  },
  {
    id: "s311", track: "sd", level: 3, topic: "Consistent hashing", type: "code",
    title: "Find the owner",
    prompt: "`ring` is a list of `[position, node]` sorted by position. A key with hash `h` belongs to the first node at position >= h, wrapping to the first node. Return the owner for every hash in `hashes`. The big test has 100k nodes and 100k keys.",
    fn: "ringLookup",
    starter: `function ringLookup(ring, hashes) {

}`,
    hint: "The ring is sorted, so binary search for the first position >= h. If you run off the end, wrap to index 0.",
    tests: [
      { args: [[[10, "A"], [50, "B"], [90, "C"]], [5, 10, 11, 90, 95]], expected: ["A", "A", "B", "C", "A"] },
      { args: [[[0, "X"]], [0, 7, 1000]], expected: ["X", "X", "X"] },
      { args: [[[10, "A"], [20, "B"]], []], expected: [] },
      { label: "100k nodes, 100k keys", argsCode: "[Array.from({ length: 100000 }, (_, i) => [i * 10, 'n' + i]), Array.from({ length: 100000 }, (_, i) => i * 10 + 5)]", expectedCode: "Array.from({ length: 100000 }, (_, i) => i < 99999 ? 'n' + (i + 1) : 'n0')" }
    ],
    solution: `function ringLookup(ring, hashes) {
  return hashes.map(h => {
    let lo = 0, hi = ring.length; // first index with position >= h
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (ring[mid][0] < h) lo = mid + 1;
      else hi = mid;
    }
    return ring[lo === ring.length ? 0 : lo][1];
  });
}`,
    explain: "This is the lookup at the heart of Dynamo, Cassandra and many cache clients. Lower bound binary search makes each lookup O(log nodes). The wraparound is what makes it a ring: keys past the last node belong to the first one."
  },
  {
    id: "s408", track: "sd", level: 4, topic: "Consistent hashing", type: "mcq",
    title: "Virtual nodes",
    prompt: "With consistent hashing, why does each physical server usually get 100+ points on the ring instead of 1?",
    options: ["It makes lookups faster", "With few points, arcs are uneven so load is lopsided. Many points per server even out load and spread a dead server's keys across all survivors", "It's required for replication to work", "It lets the ring store more keys"],
    answer: 1,
    explain: "With one point each, a server can randomly own a huge arc, and when it dies its whole arc lands on one neighbor. Virtual nodes slice ownership into many small arcs. You can also give bigger machines more vnodes to weight them."
  },
  {
    id: "s409", track: "sd", level: 4, topic: "Reliability", type: "mcq",
    title: "The retried charge",
    prompt: "`POST /charge` times out on the client. The server may or may not have charged the card. How do you make retries safe?",
    options: ["Never retry payments", "Client sends a unique idempotency key. The server stores key to result and returns the stored result on a repeat", "Retry only after 24 hours", "Check the user's bank balance before retrying"],
    answer: 1,
    explain: "A timeout doesn't tell you whether the work happened. The idempotency key turns 'maybe twice' into 'exactly once effect': the first request records its result under the key in the same transaction as the charge, and repeats just read it back. Stripe's API works this way."
  },
  {
    id: "s410", track: "sd", level: 4, topic: "Real-time", type: "mcq",
    title: "Chat across servers",
    prompt: "Alice's WebSocket is on server 3 and Bob's is on server 17. Bob sends Alice a message. How does it reach her?",
    options: ["Server 17 opens a WebSocket to Alice directly", "Servers share a pub/sub layer (Redis, Kafka, NATS). Server 17 publishes to Alice's channel, server 3 is subscribed and pushes it down her socket", "Use sticky sessions so everyone lands on the same server", "Alice polls the database every second"],
    answer: 1,
    explain: "WebSocket servers are stateful, each holds its own connections. A pub/sub backplane, or a lookup of which server holds a user, routes messages between them. Store the message durably first, so offline users get it on reconnect."
  },
  {
    id: "s411", track: "sd", level: 4, topic: "Rate limiting", type: "code",
    title: "Sliding log limiter",
    prompt: "Given sorted request timestamps `times` (ms), return an array of booleans. A request at time t is allowed if fewer than `limit` allowed requests happened in the window `(t - windowMs, t]`. Rejected requests don't count.",
    fn: "slidingLimiter",
    starter: `function slidingLimiter(times, limit, windowMs) {

}`,
    hint: "Keep a queue of allowed timestamps. Before each request, drop the ones that fell out of the window.",
    tests: [
      { args: [[0, 100, 200, 300], 3, 1000], expected: [true, true, true, false] },
      { args: [[0, 500, 1000, 1500], 2, 1000], expected: [true, true, true, true] },
      { args: [[0, 0, 0, 999, 1000], 2, 1000], expected: [true, true, false, false, true] },
      { args: [[], 5, 1000], expected: [] },
      { label: "200k requests, 1 per ms, limit 100/s", argsCode: "[Array.from({ length: 200000 }, (_, i) => i), 100, 1000]", expectedCode: "Array.from({ length: 200000 }, (_, i) => i % 1000 < 100)" }
    ],
    solution: `function slidingLimiter(times, limit, windowMs) {
  const log = [];
  let head = 0; // avoid O(n) shift()
  return times.map(t => {
    while (head < log.length && log[head] <= t - windowMs) head++;
    if (log.length - head < limit) { log.push(t); return true; }
    return false;
  });
}`,
    explain: "The sliding log is exact: no boundary bursts. The cost is memory, one timestamp per allowed request per user. In Redis it's a sorted set: ZREMRANGEBYSCORE to drop old entries, ZCARD to count, ZADD to record, all inside a Lua script so it's atomic."
  },
  {
    id: "s509", track: "sd", level: 5, topic: "Rate limiting", type: "multi",
    title: "Rate limit at 1M QPS",
    prompt: "You need per-API-key rate limits on a gateway fleet of 200 servers handling 1M QPS across 3 regions. Each key's limit is global: it applies to the total across all 3 regions. Which designs are reasonable?",
    options: ["Every request does an atomic Lua script in a Redis cluster in its own region", "Each server keeps local token buckets and syncs counts to a central store every second, accepting slight overshoot", "A single SQL row per API key, locked with SELECT FOR UPDATE on every request", "Shard keys to gateway servers by API key so one server owns each key's bucket"],
    answers: [1, 3],
    explain: "Local buckets with periodic sync trade a little accuracy for zero network hops, and the central store sees the global total. Sharding by key keeps each bucket on one box, so the count is exact, at the price of a cross region hop for some requests. A Redis cluster in each region only counts its own region's traffic, so a key could use up to 3 times its limit unless you split the limit per region. A locked SQL row per request serializes every call for a hot key and melts the database."
  },
  {
    id: "s510", track: "sd", level: 5, topic: "Databases", type: "mcq",
    title: "Write skew",
    prompt: "Rule: at least one doctor must be on call. Two doctors both run `SELECT count(*) WHERE on_call` (sees 2), then each sets themselves off call, under snapshot isolation. Both commit. What happened, and what fixes it?",
    options: ["A dirty read, fixed by READ COMMITTED", "Write skew: each transaction read a snapshot and wrote different rows, so no conflict was detected. Fix with SERIALIZABLE or by locking the rows you read (SELECT ... FOR UPDATE)", "A lost update, fixed by adding an index", "Replication lag, fixed by reading from the primary"],
    answer: 1,
    explain: "Snapshot isolation only catches two transactions writing the same row. Here they wrote different rows, but each decision depended on data the other changed. SERIALIZABLE (Postgres SSI) detects the dependency and aborts one. Explicit locks or a constraint you can enforce in one row also work."
  },
  // ============================ TREES AND INTERVALS ============================
  {
    id: "a111", track: "algo", level: 1, topic: "Trees", type: "code",
    title: "Maximum depth of a binary tree",
    prompt: "A binary tree is given as nested objects `{ val, left, right }`, with `null` for a missing child. `root` is `null` for an empty tree. Return the number of nodes on the longest path from the root down to a leaf. An empty tree has depth 0.",
    fn: "maxDepth",
    starter: `function maxDepth(root) {

}`,
    hint: "What does an empty subtree return? Then a node is 1 plus the larger answer of its two children.",
    tests: [
      { args: [null], expected: 0, miss: "trees.null-base" },
      { args: [{ val: 1, left: null, right: null }], expected: 1, miss: "trees.height-vs-depth" },
      { args: [{ val: 3, left: { val: 9, left: null, right: null }, right: { val: 20, left: { val: 15, left: null, right: null }, right: { val: 7, left: null, right: null } } }], expected: 3 },
      { args: [{ val: 1, left: { val: 2, left: { val: 3, left: null, right: null }, right: null }, right: null }], expected: 3 },
      { label: "Balanced tree with 65,535 nodes", argsCode: "[(function b(lo, hi) { if (lo > hi) return null; const m = (lo + hi) >> 1; return { val: m, left: b(lo, m - 1), right: b(m + 1, hi) }; })(1, 65535)]", expected: 16 },
      { label: "Left leaning chain of 2,000 nodes", argsCode: "[(function () { let n = null; for (let i = 0; i < 2000; i++) n = { val: i, left: n, right: null }; return n; })()]", expected: 2000 }
    ],
    solution: `function maxDepth(root) {
  if (root === null) return 0;
  const l = maxDepth(root.left);
  const r = maxDepth(root.right);
  return 1 + Math.max(l, r);
}`,
    explain: "An empty tree has depth 0, so null is the base case. Any other node is 1 plus the deeper of its two subtrees, so every node asks its children and combines the answers. That visits each node once, O(n) time, with a call stack as deep as the tree. Call each child once and keep the result: calling it a second time just to return it makes the work double at every level of a deep tree."
  },
  {
    id: "a112", track: "algo", level: 1, topic: "Trees", type: "mcq",
    title: "The null base case",
    prompt: "A recursive function counts the nodes of a binary tree with `count(node) = 1 + count(node.left) + count(node.right)`. What must `count(null)` return?",
    options: ["1", "0", "-1", "Nothing, because leaves never reach this call"],
    answer: 1,
    misses: ["trees.null-base", null, "trees.height-vs-depth", "trees.null-base"],
    explain: "An empty subtree holds zero nodes, so it adds nothing to the sum. Leaves do reach the null case: every leaf calls the function on both of its missing children. Without a base case the call reads a field of `null` and crashes. What the base case returns depends on the question: 0 for a count or a sum, 0 or -1 for a height depending on whether you count nodes or edges."
  },
  {
    id: "a113", track: "algo", level: 1, topic: "Trees", type: "mcq",
    title: "Height versus depth",
    prompt: "In a binary tree, node `X` is 3 edges below the root, and the longest path from `X` down to a leaf is 2 edges. Which statement is correct?",
    options: ["X has depth 3 and height 2", "X has depth 2 and height 3", "X has depth 3 and height 3", "X has depth 5 and height 0"],
    answer: 0,
    misses: [null, "trees.height-vs-depth", "trees.height-vs-depth", "trees.height-vs-depth"],
    explain: "Depth counts down from the root to the node. Height counts down from the node to its deepest leaf. The height of the whole tree is the height of the root, which equals the largest depth of any node. Some problems count nodes instead of edges, which adds 1 to each number, so check which convention the statement uses before writing the base case."
  },
  {
    id: "a114", track: "algo", level: 1, topic: "Intervals", type: "mcq",
    title: "Touching endpoints",
    prompt: "A problem says intervals that share an endpoint count as overlapping. What does merging `[[1,2],[2,3]]` return?",
    options: ["[[1,3]]", "[[1,2],[2,3]]", "[[1,2]]", "[[2,3]]"],
    answer: 0,
    misses: [null, "intervals.touching", "intervals.wrong-neighbor", "intervals.wrong-neighbor"],
    explain: "With touching counted as overlap, the test is `next.start <= current.end`. Here 2 <= 2, so they merge into `[1, max(2, 3)]`, which is `[1,3]`. If the problem said touching does not count, the test becomes a strict `<` and the two intervals stay apart. Read the convention first. The code differs by one character."
  },
  {
    id: "a214", track: "algo", level: 2, topic: "Trees", type: "code",
    title: "Validate a binary search tree",
    prompt: "A binary tree is given as nested objects `{ val, left, right }`, with `null` for a missing child. Return `true` if it is a valid binary search tree: every value in a node's left subtree is strictly smaller than the node, and every value in its right subtree is strictly larger. An empty tree is valid, and duplicates are not allowed.",
    fn: "isValidBST",
    starter: `function isValidBST(root) {

}`,
    hint: "A node must fit between bounds set by all of its ancestors, not just its parent. What range can you pass down to each child?",
    tests: [
      { args: [null], expected: true, miss: "trees.null-base" },
      { args: [{ val: 2, left: { val: 1, left: null, right: null }, right: { val: 3, left: null, right: null } }], expected: true },
      { args: [{ val: 5, left: { val: 1, left: null, right: null }, right: { val: 4, left: { val: 3, left: null, right: null }, right: { val: 6, left: null, right: null } } }], expected: false },
      { args: [{ val: 5, left: { val: 4, left: null, right: null }, right: { val: 6, left: { val: 3, left: null, right: null }, right: { val: 7, left: null, right: null } } }], expected: false, miss: "trees.local-bst" },
      { args: [{ val: 10, left: { val: 5, left: { val: 3, left: null, right: null }, right: { val: 12, left: null, right: null } }, right: { val: 15, left: null, right: null } }], expected: false, miss: "trees.local-bst" },
      { args: [{ val: 2, left: { val: 2, left: null, right: null }, right: null }], expected: false },
      { label: "Valid chain of 2,000 ascending nodes", argsCode: "[(function () { let n = null; for (let i = 2000; i >= 1; i--) n = { val: i, left: null, right: n }; return n; })()]", expected: true },
      { label: "32,767 nodes, one deep leaf breaks the root's rule", argsCode: "[(function () { const b = (lo, hi) => lo > hi ? null : (m => ({ val: m, left: b(lo, m - 1), right: b(m + 1, hi) }))((lo + hi) >> 1); const t = b(1, 32767); let n = t.left; while (n.right) n = n.right; n.val = t.val + 1; return t; })()]", expected: false, miss: "trees.local-bst" }
    ],
    solution: `function isValidBST(root) {
  const ok = (node, lo, hi) => {
    if (node === null) return true;
    if (node.val <= lo || node.val >= hi) return false;
    return ok(node.left, lo, node.val) && ok(node.right, node.val, hi);
  };
  return ok(root, -Infinity, Infinity);
}`,
    explain: "Each call carries an open range that the node must stay inside. Going left tightens the upper bound to the node's value, going right tightens the lower bound. A check that only compares a node with its parent accepts a 3 hiding in the right subtree of a 5, because 3 is smaller than its own parent 6. An inorder walk that must be strictly increasing is an equivalent test. Both run in O(n) time with O(h) stack."
  },
  {
    id: "a215", track: "algo", level: 2, topic: "Intervals", type: "code",
    title: "Insert interval",
    prompt: "`intervals` is a list of `[start, end]` pairs sorted by start with no overlaps, and `newInterval` is one more `[start, end]`. Insert it and merge whatever overlaps, so the result is still sorted and non-overlapping. Intervals that only touch, like [1,5] and [5,8], count as overlapping and merge. Do not sort; the input is already ordered.",
    fn: "insertInterval",
    starter: `function insertInterval(intervals, newInterval) {

}`,
    hint: "Three groups: intervals that end before the new one starts, intervals that overlap it, and the rest. Only the middle group changes the new interval's bounds.",
    tests: [
      { args: [[[1, 3], [6, 9]], [2, 5]], expected: [[1, 5], [6, 9]] },
      { args: [[[1, 2], [3, 5], [6, 7], [8, 10], [12, 16]], [4, 8]], expected: [[1, 2], [3, 10], [12, 16]] },
      { args: [[], [5, 7]], expected: [[5, 7]] },
      { args: [[[1, 5]], [2, 3]], expected: [[1, 5]], miss: "intervals.wrong-neighbor" },
      { args: [[[1, 2], [5, 6]], [3, 4]], expected: [[1, 2], [3, 4], [5, 6]] },
      { args: [[[3, 4]], [1, 2]], expected: [[1, 2], [3, 4]] },
      { args: [[[1, 5]], [5, 8]], expected: [[1, 8]], miss: "intervals.touching" },
      { args: [[[1, 5], [6, 8]], [5, 6]], expected: [[1, 8]], miss: "intervals.touching" },
      { args: [[[2, 3], [4, 5]], [1, 10]], expected: [[1, 10]] },
      { label: "100,000 intervals, new one swallows 60,000 of them", argsCode: "[Array.from({ length: 100000 }, (_, i) => [3 * i, 3 * i + 1]), [60000, 240000]]", expectedCode: "[...Array.from({ length: 20000 }, (_, i) => [3 * i, 3 * i + 1]), [60000, 240001], ...Array.from({ length: 19999 }, (_, i) => [3 * (80001 + i), 3 * (80001 + i) + 1])]", miss: "intervals.wrong-pattern" }
    ],
    solution: `function insertInterval(intervals, newInterval) {
  const out = [];
  let i = 0;
  let [s, e] = newInterval;
  while (i < intervals.length && intervals[i][1] < s) out.push(intervals[i++]);
  while (i < intervals.length && intervals[i][0] <= e) {
    s = Math.min(s, intervals[i][0]);
    e = Math.max(e, intervals[i][1]);
    i++;
  }
  out.push([s, e]);
  while (i < intervals.length) out.push(intervals[i++]);
  return out;
}`,
    explain: "Because the input is sorted, one pass is enough: copy everything that ends before the new interval starts, absorb everything that starts at or before the new end by widening the bounds with min and max, then copy the rest. The merged end is a max, so inserting [2,3] into [1,5] keeps 5. Strict `<` on the first loop and `<=` on the second are what make touching intervals merge. O(n) time, no sort needed."
  },
  {
    id: "a216", track: "algo", level: 2, topic: "Trees", type: "mcq",
    title: "Sorted order from a BST",
    prompt: "Which traversal of a binary search tree visits its values in ascending order?",
    options: ["Preorder: node, left, right", "Inorder: left, node, right", "Postorder: left, right, node", "Level order (BFS)"],
    answer: 1,
    misses: ["trees.dfs-order", null, "trees.dfs-order", "trees.dfs-order"],
    explain: "In a BST everything in the left subtree is smaller than the node and everything in the right subtree is larger. Inorder finishes the whole left subtree, then visits the node, then the right subtree, so values come out ascending. Preorder and postorder put the node before or after both subtrees, and level order jumps across branches. A tree is a valid BST only if its inorder sequence is strictly increasing."
  },
  {
    id: "a217", track: "algo", level: 2, topic: "Trees", type: "mcq",
    title: "Nearest leaf",
    prompt: "You need the depth of the shallowest leaf in a huge binary tree, and a leaf may sit close to the root. Which approach lets you stop early?",
    options: ["Preorder DFS going left first, stopping at the first leaf it reaches", "BFS level by level, stopping at the first leaf it meets", "Inorder traversal, stopping at the first leaf it reaches", "Postorder DFS, since children are handled first"],
    answer: 1,
    misses: ["trees.wrong-pattern", null, "trees.dfs-order", "trees.dfs-order"],
    explain: "BFS visits nodes in order of distance from the root, so the first leaf it meets is a shallowest one and it can stop there. A DFS can dive down a long left branch and hit a deep leaf first, so the first leaf it finds proves nothing and it must look at the rest of the tree. The same reasoning makes BFS the tool for fewest hops in any unweighted structure."
  },
  {
    id: "a218", track: "algo", level: 2, topic: "Intervals", type: "mcq",
    title: "Why sort by start",
    prompt: "Why does merge intervals start by sorting the intervals by their start value?",
    options: ["Sorting is only a speed-up: the same single pass gives the right answer on unsorted input", "Sorted intervals never overlap, so you can skip the overlap test", "Once sorted, an interval can only overlap the last merged block, so one pass with a running end is enough", "Sorting removes duplicate intervals"],
    answer: 2,
    misses: ["intervals.unsorted", "intervals.wrong-pattern", null, "intervals.wrong-pattern"],
    explain: "Sorted by start, if the next interval does not reach the block you are building, no later interval can either, since later starts are even larger. So each interval is compared with the last merged block only, and the block's end is updated with a max. Without the sort, an early interval can overlap one you already passed. The sort costs O(n log n), then the sweep is O(n)."
  },
  {
    id: "a219", track: "algo", level: 2, topic: "Intervals", type: "mcq",
    title: "Cost of merging",
    prompt: "What is the time complexity of merging n unsorted intervals by sorting by start and then sweeping once?",
    options: ["O(n)", "O(n log n)", "O(n^2)", "O(n log n) for the sort plus O(n^2) for the sweep"],
    answer: 1,
    misses: ["intervals.unsorted", null, "intervals.wrong-pattern", "intervals.wrong-neighbor"],
    explain: "The sort is O(n log n). The sweep is O(n) because each interval is compared with the last merged block only, never with every earlier one. The sort dominates, so the total is O(n log n). If the input is already sorted by start, the whole job is O(n). The output list takes O(n) extra space."
  },
  {
    id: "a314", track: "algo", level: 3, topic: "Trees", type: "code",
    title: "Binary tree level order",
    prompt: "A binary tree is given as nested objects `{ val, left, right }`, with `null` for a missing child. Return its values as an array of arrays, one per level from top to bottom, each ordered left to right. An empty tree returns `[]`.",
    fn: "levelOrder",
    starter: `function levelOrder(root) {

}`,
    hint: "Process one whole level at a time: keep the nodes of the current level in a list, collect their values, and build the next level from their children.",
    tests: [
      { args: [null], expected: [], miss: "trees.null-base" },
      { args: [{ val: 1, left: null, right: null }], expected: [[1]] },
      { args: [{ val: 3, left: { val: 9, left: null, right: null }, right: { val: 20, left: { val: 15, left: null, right: null }, right: { val: 7, left: null, right: null } } }], expected: [[3], [9, 20], [15, 7]] },
      { args: [{ val: 1, left: { val: 2, left: { val: 4, left: null, right: null }, right: null }, right: { val: 3, left: null, right: { val: 5, left: null, right: null } } }], expected: [[1], [2, 3], [4, 5]], miss: "trees.wrong-pattern" },
      { args: [{ val: 1, left: null, right: { val: 2, left: null, right: { val: 3, left: null, right: null } } }], expected: [[1], [2], [3]] },
      { label: "Complete tree with 32,767 nodes", argsCode: "[(function b(i) { return i > 32767 ? null : { val: i, left: b(2 * i), right: b(2 * i + 1) }; })(1)]", expectedCode: "Array.from({ length: 15 }, (_, k) => Array.from({ length: 2 ** k }, (_, j) => 2 ** k + j))", miss: "trees.wrong-pattern" },
      { label: "Right leaning chain of 2,000 nodes", argsCode: "[(function () { let n = null; for (let i = 2000; i >= 1; i--) n = { val: i, left: null, right: n }; return n; })()]", expectedCode: "Array.from({ length: 2000 }, (_, i) => [i + 1])" }
    ],
    solution: `function levelOrder(root) {
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
}`,
    explain: "BFS visits nodes closest to the root first. Holding each level as its own list keeps the level boundaries without counting anything: collect the values, then build the next list from the children. With a single queue you get the same result by reading the queue's length before the inner loop. Every node is handled once, O(n) time, and the extra space is the widest level, which can be about half the nodes in a complete tree. It uses no recursion, so a 2,000 deep chain is not a problem."
  },
  {
    id: "a315", track: "algo", level: 3, topic: "Intervals", type: "code",
    title: "Minimum meeting rooms",
    prompt: "Each meeting is `[start, end]`. A meeting holds its room from `start` up to but not including `end`, so one meeting ending at 10 and another starting at 10 can share a room (touching endpoints do not conflict here). Return the minimum number of rooms needed so no two meetings in the same room overlap. No meetings means 0 rooms.",
    fn: "minRooms",
    starter: `function minRooms(intervals) {

}`,
    hint: "The answer is the most meetings running at the same moment. Sort the starts and the ends separately, or keep a min heap of end times.",
    tests: [
      { args: [[]], expected: 0 },
      { args: [[[0, 30], [5, 10], [15, 20]]], expected: 2 },
      { args: [[[7, 10], [2, 4]]], expected: 1 },
      { args: [[[1, 5], [5, 10]]], expected: 1, miss: "intervals.touching" },
      { args: [[[1, 5], [1, 5], [1, 5]]], expected: 3 },
      { args: [[[15, 20], [0, 30], [5, 10]]], expected: 2, miss: "intervals.unsorted" },
      { args: [[[0, 10], [1, 2], [3, 4], [5, 6]]], expected: 2 },
      { label: "100,000 meetings", argsCode: "(function () { let x = 12345; const r = () => (x = (x * 48271) % 2147483647); return [Array.from({ length: 100000 }, () => { const s = r() % 1000000; return [s, s + 1 + (r() % 100)]; })]; })()", expectedCode: "(function () { let x = 12345; const r = () => (x = (x * 48271) % 2147483647); const d = new Array(1000200).fill(0); for (let i = 0; i < 100000; i++) { const s = r() % 1000000; d[s]++; d[s + 1 + (r() % 100)]--; } let c = 0, best = 0; for (const v of d) { c += v; if (c > best) best = c; } return best; })()", miss: "intervals.wrong-pattern" }
    ],
    solution: `function minRooms(intervals) {
  const starts = intervals.map(x => x[0]).sort((a, b) => a - b);
  const ends = intervals.map(x => x[1]).sort((a, b) => a - b);
  let rooms = 0, j = 0;
  for (let i = 0; i < starts.length; i++) {
    if (starts[i] >= ends[j]) j++;
    else rooms++;
  }
  return rooms;
}`,
    explain: "The number of rooms equals the largest number of meetings overlapping at one moment. Sort starts and ends separately and sweep: each new start either reuses the room that frees up first (its end is at or before this start) or opens a new room. Because the comparison is `>=`, a meeting that ends at 10 frees its room for one that starts at 10. Note this is the opposite convention from merging touching intervals, so always check what the problem says. O(n log n) for the sorts, O(n) for the sweep. Comparing every pair is O(n^2) and times out on 100,000 meetings."
  },
  {
    id: "a316", track: "algo", level: 3, topic: "Trees", type: "multi",
    title: "Cost of visiting every node",
    prompt: "A binary tree has n nodes and height h. Select all true statements about a recursive DFS that visits every node.",
    options: ["Time is O(n)", "Time is O(h), because it only follows one path", "The recursion stack uses O(h) extra space", "On a chain where every node has one child, the stack grows to depth n", "BFS always needs less extra memory than DFS"],
    answers: [0, 2, 3],
    miss: "trees.wrong-pattern",
    explain: "Visiting every node means doing a constant amount of work n times, so O(n). The stack holds one frame per level of the current path, so O(h): about log n in a balanced tree and n in a chain, where a very long chain can overflow the call stack in JavaScript. DFS does not follow a single path, it explores both children. BFS memory depends on the widest level: O(1) on a chain but about n/2 on a complete tree, so it is not always smaller."
  },
  {
    id: "a317", track: "algo", level: 3, topic: "Intervals", type: "mcq",
    title: "Rooms with a min heap",
    prompt: "To find the minimum number of rooms for a set of meetings, you sort them by start and keep a min heap of room end times. What do you do for each meeting?",
    options: ["Push its end time and never pop; the answer is the number of meetings", "If the smallest end time is at most this start, pop it, then push this meeting's end time; the final heap size is the number of rooms", "Compare its start only with the previous meeting's end", "Pop the largest end time, since the busiest room is the one to reuse"],
    answer: 1,
    misses: ["intervals.wrong-pattern", null, "intervals.wrong-neighbor", "intervals.wrong-pattern"],
    explain: "The smallest end time is the room that frees up first, so it is the only room worth checking. If it is at or before this start, the meeting reuses that room, otherwise it needs a new one. Each step either replaces the top of the heap or grows it by one, so the final size is the room count. Cost is O(n log n). Comparing only with the previous meeting misses rooms that free up earlier than the last one."
  },
  {
    id: "a413", track: "algo", level: 4, topic: "Intervals", type: "mcq",
    title: "Most jobs without overlap",
    prompt: "You have n jobs, each `[start, end]`, and want to run as many as possible with no two overlapping (touching endpoints are fine). Which approach is correct?",
    options: ["Sort by start and take every job that does not overlap the last chosen one", "Sort by end and take every job that starts at or after the last chosen end", "Always take the shortest remaining job", "This needs dynamic programming, because no greedy rule is optimal"],
    answer: 1,
    misses: ["intervals.wrong-pattern", null, "intervals.wrong-pattern", "intervals.wrong-pattern"],
    explain: "The job that finishes first leaves the most room for everything after it, and swapping it into any optimal schedule never makes things worse, so earliest end first is optimal. Start order fails on [0,10],[1,2],[3,4]: it takes [0,10] and gets 1 job instead of 2. Shortest first fails on [0,5],[4,6],[5,10]: the short [4,6] blocks both others, giving 1 instead of 2. Once jobs carry weights, such as profit, the greedy rule stops working and you need DP."
  },
  // ============================ RECOGNITION QUESTIONS (C2) ============================
  {
    id: "a115", track: "algo", level: 1, topic: "Two pointers", type: "mcq",
    title: "Pair sum on sorted input",
    prompt: "A sorted array is given and you must decide whether two of its numbers add up to `target`, in O(n) time and O(1) extra memory. Which approach fits?",
    options: ["Put every number in a Set and look up `target - x` for each", "Check every pair with two nested loops", "Put one pointer at each end and move the one that brings the sum closer to the target", "Binary search for `target - x` starting from every element"],
    answer: 2,
    misses: ["two-pointers.wrong-pattern", "two-pointers.wrong-pattern", null, "two-pointers.wrong-pattern"],
    explain: "On sorted input, a sum that is too small means the left value cannot pair with anything still in range, so move left up; too big means move right down. Each step discards one candidate for good, giving O(n) time with two integers of memory. The Set costs O(n) memory, nested loops cost O(n squared) time and a binary search per element costs O(n log n)."
  },
  {
    id: "a116", track: "algo", level: 1, topic: "Sliding window", type: "mcq",
    title: "Which pattern: at most two distinct",
    prompt: "Find the length of the longest substring of `s` that contains at most 2 distinct characters. Which approach fits best?",
    options: ["Check every start and end pair, rebuilding a set of its characters each time", "Grow a window on the right and move the left edge forward whenever it holds 3 distinct characters", "Sort the characters and count how many are distinct", "Try every subset of characters"],
    answer: 1,
    misses: ["sliding-window.recompute", null, "sliding-window.wrong-pattern", "sliding-window.wrong-pattern"],
    explain: "The question asks for the longest contiguous piece under a rule that only gets harder to meet as the piece grows, which is the sliding window shape. Both edges only move forward, so each index enters and leaves once and the scan is O(n). Rebuilding a set for every pair is cubic, and sorting or subsets throw away the order that makes a substring contiguous."
  },
  {
    id: "a117", track: "algo", level: 1, topic: "Prefix sums", type: "mcq",
    title: "Prefix sum costs",
    prompt: "You build a prefix sum array once for an array of n numbers that never changes. What does the build cost, and what does each range sum query cost afterwards?",
    options: ["O(n log n) to build, O(log n) per query", "O(1) to build, O(n) per query", "O(n) to build, O(1) per query", "O(n) to build, O(n) per query"],
    answer: 2,
    misses: ["prefix-sums.wrong-pattern", "prefix-sums.recompute-per-query", null, "prefix-sums.recompute-per-query"],
    explain: "One pass computes every running total, which is O(n). After that, the sum of `nums[l..r]` is `prefix[r+1] - prefix[l]`, two reads and a subtraction. Doing the O(n) summing again for each query is exactly the cost the prefix array exists to avoid."
  },
  {
    id: "a118", track: "algo", level: 1, topic: "Stacks", type: "mcq",
    title: "First in, first out",
    prompt: "A print spooler must print documents in the order they were submitted. Which structure fits?",
    options: ["A stack", "A queue", "A hash map keyed by document id", "A max heap ordered by page count"],
    answer: 1,
    misses: ["stacks.fifo-lifo", null, "stacks.wrong-pattern", "stacks.wrong-pattern"],
    explain: "The oldest job must come out first, which is first in, first out: a queue. A stack returns the newest item first, which suits undo and nested brackets but would print the last submission first. A hash map has no order and a heap by page count would let big jobs jump the line."
  },
  {
    id: "a119", track: "algo", level: 1, topic: "Binary search", type: "mcq",
    title: "Which pattern: first price at or above",
    prompt: "A list of 10 million prices is sorted ascending. You need the first position whose price is at least X. Which approach fits?",
    options: ["Scan from the start until a price is at least X", "Binary search for the first index whose price is at least X", "Put the prices in a hash set and look up X", "Sort the prices first, then scan"],
    answer: 1,
    misses: ["binary-search.wrong-pattern", null, "binary-search.wrong-pattern", "binary-search.wrong-pattern"],
    explain: "The data is already ordered, so one comparison with the middle price tells you which half can hold the answer. That finds the first qualifying index in about 24 steps for 10 million items. A scan is O(n) per query, a hash set only finds exact values, and X may not be in the list, and sorting an already sorted list is wasted work."
  },
  {
    id: "a120", track: "algo", level: 1, topic: "Sorting", type: "mcq",
    title: "Default sort",
    prompt: "What does `[10, 9, 1].sort()` return in JavaScript?",
    options: ["[1, 9, 10]", "[1, 10, 9]", "[10, 9, 1]", "It throws an error because numbers need a comparator"],
    answer: 1,
    misses: ["heaps.default-sort", null, "heaps.forgot-sort", "heaps.default-sort"],
    explain: "With no comparator, `sort` converts values to strings and compares them, so the strings '1', '10', '9' end up in that order. Pass `(a, b) => a - b` to sort numbers by value. The call does not throw and it does change the array, which is why small single digit tests hide the bug."
  },
  {
    id: "a121", track: "algo", level: 1, topic: "Design a structure", type: "mcq",
    title: "Reading refreshes recency",
    prompt: "In an LRU cache you call `get(k)` for a key that is in the cache. What must happen?",
    options: ["Nothing, a read does not change the cache", "The key becomes the most recently used one", "The key is removed after it is read", "The key becomes the next one to be evicted"],
    answer: 1,
    misses: ["design.stale-recency", null, "design.eviction-order", "design.eviction-order"],
    explain: "A key you just read has been used, so it is now the most recent and the least likely to be evicted. Skipping the refresh means a hot key can be evicted while untouched ones stay. The same applies to a `put` on an existing key."
  },
  {
    id: "a220", track: "algo", level: 2, topic: "Hashing", type: "mcq",
    title: "Which pattern: first repeat in a stream",
    prompt: "Strings arrive one at a time and you must report the first one that has already appeared earlier. Which approach fits best?",
    options: ["Compare each string with every earlier string", "Sort the strings and look for equal neighbors", "Binary search the stream for the repeat", "Keep a Set of strings seen so far and stop at the first one already in it"],
    answer: 3,
    misses: ["hashing.wrong-pattern", "hashing.wrong-pattern", "hashing.wrong-pattern", null],
    explain: "The question is whether you have seen this item before, and a Set answers that in O(1) on average. One pass that checks first and then adds stops at the first repeat, using O(n) memory. Comparing with every earlier string is O(n squared), sorting loses arrival order so you cannot say which repeat came first, and a stream is not sorted for binary search."
  },
  {
    id: "a221", track: "algo", level: 2, topic: "Strings", type: "mcq",
    title: "Palindrome with punctuation",
    prompt: "A solution compares `s[i]` and `s[j]`, with `i` moving up from the left and `j` moving down from the right, and returns `false` at the first mismatch. It returns `false` for 'A man, a plan, a canal: Panama', which should count as a palindrome. What is the bug?",
    options: ["It needs a final check that `i` equals `j`", "It compares raw characters, so spaces, punctuation and letter case make a real palindrome fail", "Both pointers should advance by two characters per step", "It should sort the characters before comparing"],
    answer: 1,
    misses: ["two-pointers.wrong-pattern", null, "two-pointers.move-wrong-pointer", "two-pointers.wrong-pattern"],
    explain: "The pointers must skip anything that is not a letter or digit and compare the lowercase forms. Advance each pointer past junk with an inner loop before comparing. Sorting would destroy the order that defines a palindrome, and skipping characters by two would miss mismatches."
  },
  {
    id: "a222", track: "algo", level: 2, topic: "Greedy scan", type: "mcq",
    title: "Highest minus lowest",
    prompt: "To find the best profit from one buy followed by one sell, a solution returns the highest price in the array minus the lowest price. Why is that wrong?",
    options: ["It is correct: the best trade is always the highest price minus the lowest", "The highest price may come before the lowest, which would mean selling before buying", "It should compare each price only with the previous day's price", "It must sort the prices first"],
    answer: 1,
    misses: ["two-pointers.stale-extreme", null, "two-pointers.stale-extreme", "two-pointers.wrong-pattern"],
    explain: "Buying must happen before selling, so the lowest price only counts for sells that come after it. Keep the lowest price seen so far while scanning, and at each day check the profit of selling today. On [7, 1, 5, 3, 6, 4] the answer is 5, from buying at 1 and selling at 6, and on a falling array the best profit is 0."
  },
  {
    id: "a223", track: "algo", level: 2, topic: "Sliding window", type: "mcq",
    title: "The window that never shrinks",
    prompt: "A solution for 'longest substring without repeating characters' adds each new character at the right edge and records `r - l + 1` as the best length, but `l` never moves. On 'abcabc' it returns 6. What is missing?",
    options: ["A step that moves `l` forward while the window holds a repeat, before recording the length", "Recomputing the distinct count of the whole string at every step", "Resetting `l` to 0 whenever a repeat appears", "Nothing: sliding windows cannot handle repeats, so sort the characters instead"],
    answer: 0,
    misses: [null, "sliding-window.recompute", "sliding-window.stale-left", "sliding-window.wrong-pattern"],
    explain: "When the new character breaks the rule, the left edge has to move forward until the window is valid again. Without that step, stale characters stay in the window and the length only grows. Resetting to 0 or recomputing from scratch discards or repeats work, and sorting destroys the contiguity the question depends on."
  },
  {
    id: "a224", track: "algo", level: 2, topic: "Sliding window", type: "mcq",
    title: "Left edge moving backward",
    prompt: "For 'longest substring without repeating characters', a map `last` stores each character's latest index. On a repeat the code sets `l = last.get(c) + 1`, and on 'abba' it returns 3 instead of 2. Which fix is correct and keeps the scan O(n)?",
    options: ["Clear the map and set `l = r` on every repeat", "Update the map only for characters not seen before", "Set `l = Math.max(l, last.get(c) + 1)`", "After each step, scan the whole window for duplicates"],
    answer: 2,
    misses: ["sliding-window.recompute", "sliding-window.stale-left", null, "sliding-window.recompute"],
    explain: "At the second 'a' in 'abba', its last index is 0 but the window already starts at 2, so `last + 1` would pull the left edge backward and re-admit the repeated 'b'. The max keeps the edge from ever moving back. Clearing the map loses valid characters (it fails on 'dvdf'), not refreshing the map leaves stale indexes and scanning the window every step makes the algorithm slower."
  },
  {
    id: "a225", track: "algo", level: 2, topic: "Prefix sums", type: "mcq",
    title: "Which pattern: subarray sum with negatives",
    prompt: "Count the contiguous subarrays whose sum equals `k`. The array can contain negative numbers. Which approach fits?",
    options: ["Slide a window and shrink it while the sum is above k", "Sort the array and use two pointers", "Keep a running prefix sum and a map counting earlier prefix sums, adding the count for `prefix - k`", "Binary search for `k` in the array"],
    answer: 2,
    misses: ["prefix-sums.negatives-break-window", "prefix-sums.wrong-pattern", null, "prefix-sums.wrong-pattern"],
    explain: "A subarray sums to k exactly when its prefix sum minus an earlier prefix sum equals k, so each position asks how many earlier prefixes equal `prefix - k`. The map answers that in O(1), giving one pass and any signs. A sliding window needs the sum to drop when you shrink it, which negative numbers break, and sorting destroys the order that defines a subarray."
  },
  {
    id: "a226", track: "algo", level: 2, topic: "Monotonic stack", type: "mcq",
    title: "Which pattern: next warmer day",
    prompt: "Given daily temperatures, for each day find how many days you must wait until a warmer one. There are up to 100,000 days. Which approach fits?",
    options: ["For each day, look at every later day until a warmer one appears", "Keep a stack of days still waiting for a warmer day; when a warmer day arrives, pop and resolve every colder day on the stack", "Sort the temperatures and binary search for each one", "Store each temperature in a hash map and look up the next larger value"],
    answer: 1,
    misses: ["stacks.wrong-pattern", null, "stacks.wrong-pattern", "stacks.wrong-pattern"],
    explain: "Each day needs the nearest later day that is warmer, which is the next greater element, and a stack of unresolved days answers it. A day is pushed once and popped once, so the whole scan is O(n). Looking ahead from every day is O(n squared) on a falling sequence, and sorting or hashing temperatures loses their positions."
  },
  {
    id: "a227", track: "algo", level: 2, topic: "Stacks", type: "mcq",
    title: "Leftover openers",
    prompt: "A bracket checker scans the whole string without a mismatch, but the stack still holds two openers at the end. What does that mean?",
    options: ["The string is balanced, leftover openers are fine", "A closer was matched with the wrong type of opener", "The checker should pop the leftovers and then answer true", "The string is not balanced, because those openers never found a closer"],
    answer: 3,
    misses: ["stacks.unflushed", "stacks.mismatch-pairing", "stacks.unflushed", null],
    explain: "An opener still on the stack was never closed, so the string is unbalanced. A wrong type pairing would already have failed at the closer that tried to match it. Always check that the stack is empty after the scan, for example '((' passes every closer check because it has none."
  },
  {
    id: "a228", track: "algo", level: 2, topic: "Binary search", type: "mcq",
    title: "The loop that never ends",
    prompt: "A lower bound search uses `lo = 0, hi = n`, loops `while (lo < hi)`, computes `mid = (lo + hi) >> 1`, and does `if (nums[mid] < target) lo = mid; else hi = mid;`. It sometimes never ends. Why?",
    options: ["The loop should use `lo <= hi`", "`hi` should start at `n + 1`", "`lo = mid` can leave `lo` unchanged when `mid` equals `lo`, so the range stops shrinking; it should be `lo = mid + 1`", "The array must be sorted in descending order"],
    answer: 2,
    misses: ["binary-search.off-by-one", "binary-search.off-by-one", null, "binary-search.wrong-pattern"],
    explain: "With `lo = 0` and `hi = 1`, `mid` is 0, and if `nums[0] < target` then `lo = mid` leaves the range unchanged forever. Since `nums[mid]` is already known to be too small, the next search can start at `mid + 1`, which always shrinks the range. Changing the loop condition or the starting `hi` does not fix the stuck step."
  },
  {
    id: "a229", track: "algo", level: 2, topic: "Selection", type: "mcq",
    title: "Which pattern: k-th largest",
    prompt: "You need only the k-th largest value in an unsorted array of 5 million numbers, and you want to avoid sorting everything. Which approach fits?",
    options: ["Sort the whole array in descending order and read index k - 1", "Binary search the array for the k-th value", "Count each value in a hash map and read the counts in key order", "Keep a min heap of size k, or use quickselect, so the rest of the array is never fully ordered"],
    answer: 3,
    misses: ["heaps.sort-everything", "heaps.wrong-pattern", "heaps.wrong-pattern", null],
    explain: "A min heap that holds the k largest values so far costs O(n log k) time and O(k) memory, and quickselect averages O(n). Both avoid ordering the other values. A full sort does O(n log n) work you do not need, binary search requires sorted input and a hash map does not give you keys in order."
  },
  {
    id: "a230", track: "algo", level: 2, topic: "Dynamic programming", type: "mcq",
    title: "Which pattern: counting stair climbs",
    prompt: "Count the ways to climb n stairs taking 1 or 2 steps at a time, for n up to 50. Which approach fits?",
    options: ["Always take 2 steps when you can", "Plain recursion `ways(n) = ways(n - 1) + ways(n - 2)` with no caching", "Fill `ways[i] = ways[i - 1] + ways[i - 2]` from the bottom, starting with `ways[0] = ways[1] = 1`", "Binary search on the number of ways"],
    answer: 2,
    misses: ["dp.wrong-pattern", "dp.too-slow", null, "dp.wrong-pattern"],
    explain: "The ways to reach step i are the ways to reach i - 1 plus the ways to reach i - 2, so the answer is built from smaller answers that overlap. Computing each state once is O(n). The uncached recursion recomputes the same states over and over and makes far too many calls at n = 50, and a greedy choice does not count ways at all."
  },
  {
    id: "a231", track: "algo", level: 2, topic: "Dynamic programming", type: "mcq",
    title: "Unreachable amounts",
    prompt: "A fewest-coins DP fills `dp` with 0 for every amount, then runs `dp[a] = Math.min(dp[a], dp[a - c] + 1)` over the coins. It reports amounts as makeable that are not. What is the fix?",
    options: ["Set `dp[0] = 1`", "Set `dp[0] = 0` and start every other amount at `Infinity`, so impossible amounts stay impossible", "Make the array length `amount` instead of `amount + 1`", "Loop over the amounts from high to low"],
    answer: 1,
    misses: ["dp.base-case", null, "dp.base-case", "dp.state-definition"],
    explain: "For a minimum, an amount nobody has reached yet must look infinitely expensive so that `min` ignores it. Starting at 0 makes every amount look free. At the end, return -1 when `dp[amount]` is still `Infinity`."
  },
  {
    id: "a232", track: "algo", level: 2, topic: "Design a structure", type: "mcq",
    title: "Structures behind an LRU cache",
    prompt: "An LRU cache needs `get` and `put` in O(1), including marking a key as most recently used and evicting the least recently used. Which combination does that?",
    options: ["An array of entries searched linearly", "A sorted array of entries with binary search", "A hash set of keys only", "A hash map plus a doubly linked list ordered by recency"],
    answer: 3,
    misses: ["design.too-slow", "design.too-slow", "design.wrong-pattern", null],
    explain: "The map finds a node by key in O(1) and the doubly linked list lets you unlink it and move it to the front, or drop the tail, in O(1). Linear search is O(n) and keeping a sorted array means O(n) shifting on each update. A JavaScript `Map` keeps insertion order, so deleting and re-inserting a key can play the list's role."
  },
  {
    id: "a233", track: "algo", level: 2, topic: "Tries", type: "mcq",
    title: "Word versus prefix",
    prompt: "A trie has had only the word 'car' inserted. What do an exact word search for 'ca' and a prefix search for 'ca' return?",
    options: ["true and true", "false and true", "false and false", "true and false"],
    answer: 1,
    misses: ["design.prefix-vs-word", null, "design.prefix-vs-word", "design.prefix-vs-word"],
    explain: "The path c, a exists, so 'ca' is a valid prefix. It is not a stored word because the node for 'a' was never flagged as the end of a word, only the node for 'r' was. Exact search needs both the path and the end flag, while prefix search needs just the path."
  },
  {
    id: "a318", track: "algo", level: 3, topic: "Two pointers", type: "mcq",
    title: "Container with most water",
    prompt: "Lines of heights `h` stand at positions 0 to n - 1, and two lines hold an area of `min(height) * distance`. A two pointer solution starts at both ends and always moves the pointer at the shorter line inward. Why is it safe to drop the shorter line?",
    options: ["The taller line is more likely to be part of the best pair", "Moving the shorter line keeps the width the same", "Pairing the shorter line with any other line in range gives a smaller width and no more height, so it cannot beat the current area", "It guarantees the tallest line is found first"],
    answer: 2,
    misses: ["two-pointers.move-wrong-pointer", "two-pointers.move-wrong-pointer", null, "two-pointers.move-wrong-pointer"],
    explain: "The area is limited by the shorter line, and every other partner it could still have lies closer, so the width only shrinks. That means the shorter line has already given its best result and can be discarded. Moving the taller pointer would keep the same limit while shrinking the width."
  },
  {
    id: "a319", track: "algo", level: 3, topic: "Strings", type: "mcq",
    title: "Centers of a palindrome",
    prompt: "Longest palindromic substring by expanding around centers: how many centers must you try for a string of length n, and what is the worst case time?",
    options: ["n centers, O(n) total", "2n - 1 centers, O(n squared) in the worst case", "2n - 1 centers, O(n log n)", "n centers, O(n squared), which finds all palindromes"],
    answer: 1,
    misses: ["two-pointers.even-centers", null, "two-pointers.wrong-pattern", "two-pointers.even-centers"],
    explain: "A palindrome is centered on a character (n of them) or on the gap between two characters (n - 1 of them), so there are 2n - 1 centers. Expanding one center can take O(n) steps, and a string like 'aaaa' makes most of them long, so the worst case is O(n squared). Trying only n centers misses even length palindromes such as 'bb' in 'cbbd'."
  },
  {
    id: "a320", track: "algo", level: 3, topic: "Sliding window", type: "mcq",
    title: "Covering repeated characters",
    prompt: "A window must contain every character of `t` with multiplicity, for example 'aab' needs two a's. How do you check that the window covers `t` in O(1) per move?",
    options: ["Check that each distinct character of `t` appears at least once in the window", "Track how many of each character is still needed, plus a counter of unmet needs, updating both as characters enter and leave", "Sort the window and `t` and compare them", "Rebuild a count map of the whole window after every move"],
    answer: 1,
    misses: ["sliding-window.multiplicity", null, "sliding-window.recompute", "sliding-window.recompute"],
    explain: "Keep a need count per character and a single number for how many characters are still short. A needed copy entering the window lowers the count, and one leaving raises it, so 'covered' is just 'unmet equals 0'. Checking presence only misses duplicates, and sorting or rebuilding the map on each move costs O(window size) every step."
  },
  {
    id: "a321", track: "algo", level: 3, topic: "Prefix sums", type: "mcq",
    title: "Seeding the prefix map",
    prompt: "Counting subarrays that sum to k uses a map of prefix sum counts: for each new prefix, add `map[prefix - k]`, then record the prefix. What should the map hold before the loop starts?",
    options: ["An empty map", "A map holding `{0: 1}`", "A map holding `{k: 1}`", "A map holding the first element"],
    answer: 1,
    misses: ["prefix-sums.missing-zero-seed", null, "prefix-sums.missing-zero-seed", "prefix-sums.missing-zero-seed"],
    explain: "The empty prefix before the first element has sum 0 and occurs once. Without that seed, a subarray starting at index 0 never finds its partner prefix: for [3] with k = 3 the prefix is 3, and 3 - 3 = 0 must already be in the map."
  },
  {
    id: "a322", track: "algo", level: 3, topic: "Monotonic deque", type: "mcq",
    title: "Why the deque front is checked",
    prompt: "In the sliding window maximum with a monotonic deque of indices, each step also checks whether the front index is at most `i - k`. Why?",
    options: ["It keeps the deque decreasing by removing smaller values", "The front index is the oldest one, and it must be removed once it slides out of the window", "It counts how many windows are complete", "It is unnecessary, since smaller values are already popped from the back"],
    answer: 1,
    misses: ["stacks.wrong-pattern", null, "stacks.wrong-pattern", "stacks.expired-front"],
    explain: "Popping from the back keeps values in decreasing order, but it does not notice that the front value may be too old. Indices increase from front to back, so the front expires first, and once it is at most `i - k` it is outside the window and cannot be the maximum. Use a head index rather than `Array.shift` so each removal stays O(1)."
  },
  {
    id: "a323", track: "algo", level: 3, topic: "Binary search", type: "mcq",
    title: "Cost of searching the answer",
    prompt: "You binary search a capacity between 1 and 10^9, and each feasibility check scans an array of 100,000 numbers. About how many operations does this take overall?",
    options: ["About 10^14, since the range has 10^9 values and a check scans 10^5", "About 3 million: roughly 30 checks of 100,000 steps each", "About 10^9, one step per value in the range", "About 100,000, since one check settles it"],
    answer: 1,
    misses: ["binary-search.answer-space", null, "binary-search.log-miscount", "binary-search.wrong-pattern"],
    explain: "Halving a range of 10^9 values takes about 30 steps, since 2^30 is about 10^9, and each step runs one O(n) check. The total is O(n log range), about 3 million operations here. Trying every value one by one would be around 10^14 operations."
  },
  {
    id: "a324", track: "algo", level: 3, topic: "Dynamic programming", type: "mcq",
    title: "What dp[i] means",
    prompt: "House robber uses `dp[i] = max(dp[i - 1], dp[i - 2] + nums[i])`. What must `dp[i]` mean for this recurrence to be right?",
    options: ["The most you can take if house i is robbed", "The number of ways to choose houses 0 to i", "The most you can take from houses 0 to i, whether or not house i is robbed", "The cash in house i"],
    answer: 2,
    misses: ["dp.state-definition", "dp.state-definition", null, "dp.state-definition"],
    explain: "The first term, `dp[i - 1]`, is the case where house i is skipped, and the second, `dp[i - 2] + nums[i]`, is the case where it is robbed. The max of both only makes sense if `dp[i]` is the best total over the first i + 1 houses. Writing the meaning of a state in one sentence before the transition is what keeps the recurrence honest."
  },
  {
    id: "a325", track: "algo", level: 3, topic: "Tries", type: "mcq",
    title: "Cost of a trie insert",
    prompt: "A trie stores n words of average length m. About how many steps does inserting one more word take?",
    options: ["O(n * m), because it is compared with every stored word", "O(m), one step per character no matter how many words are stored", "O(log n), like a balanced tree", "O(1), since it is a hash lookup"],
    answer: 1,
    misses: ["design.too-slow", null, "design.wrong-pattern", "design.wrong-pattern"],
    explain: "Insertion walks or creates one node per character, so the cost depends on the word's length and not on how many words are stored. That is why a trie reaches a prefix in O(length). Memory is the price: each node can hold a map or array of children."
  },
  {
    id: "a414", track: "algo", level: 4, topic: "Dynamic programming", type: "mcq",
    title: "Faster longest increasing subsequence",
    prompt: "The O(n squared) DP for the longest increasing subsequence is too slow for 200,000 numbers. Which idea gets it to O(n log n)?",
    options: ["Sort the numbers and count the distinct ones", "Memoize the O(n squared) recurrence with a Map", "Greedily extend the subsequence with the next larger number", "Keep an array where entry k is the smallest possible last value of an increasing subsequence of length k + 1, and binary search it for each number"],
    answer: 3,
    misses: ["dp.wrong-pattern", "dp.too-slow", "dp.wrong-pattern", null],
    explain: "That array stays sorted, so each number replaces the first entry that is at least as large (or extends the array) found by binary search, costing O(log n). The final length of the array is the answer. Memoizing the quadratic recurrence still has n states with n transitions each, and sorting or a greedy extension changes the problem."
  },
  // ============================ CODE LESSONS (C3) ============================
  {
    id: "a122", track: "algo", level: 1, topic: "Linked lists", type: "code",
    title: "Middle of a linked list",
    prompt: "A linked list is stored in two arrays: node `i` holds `values[i]` and points to node `next[i]`, where `-1` means the end. The head is node 0, and the nodes are NOT stored in list order. Return the value of the middle node by following the links with a slow and a fast pointer. If the list has two middle nodes, return the second one.",
    fn: "middleValue",
    starter: `function middleValue(values, next) {

}`,
    hint: "Move one pointer one link at a time and another two links at a time. When the fast one runs out, where is the slow one?",
    tests: [
      { args: [[7], [-1]], expected: 7 },
      { args: [[1, 2], [1, -1]], expected: 2 },
      { args: [[10, 20, 30], [2, -1, 1]], expected: 30, miss: "complexity.list-vs-array" },
      { args: [[1, 2, 3, 4], [1, 2, 3, -1]], expected: 3 },
      { args: [[1, 2, 3, 4, 5], [3, 4, -1, 1, 2]], expected: 2, miss: "complexity.list-vs-array" },
      { label: "1,000,003 nodes stored out of order", argsCode: "(function () { const N = 1000003; const values = new Array(N), next = new Array(N); for (let j = 0; j < N; j++) { const node = (j * 17) % N; values[node] = node; next[node] = j + 1 < N ? ((j + 1) * 17) % N : -1; } return [values, next]; })()", expectedCode: "(500001 * 17) % 1000003", miss: "complexity.list-vs-array" }
    ],
    solution: `function middleValue(values, next) {
  let slow = 0, fast = 0;
  while (fast !== -1 && next[fast] !== -1) {
    slow = next[slow];
    fast = next[next[fast]];
  }
  return values[slow];
}`,
    explain: "A linked list has no index, so `values[n / 2]` is the middle of the array, not of the list. The fast pointer moves two links for every one the slow pointer moves, so when fast reaches the end slow is halfway. That is one pass, O(n) time and O(1) memory, without counting the length first."
  },
  {
    id: "a123", track: "algo", level: 1, topic: "Sliding window", type: "code",
    title: "Best window of size k",
    prompt: "Return the largest sum of any `k` consecutive numbers in `nums`. `k` is at least 1 and at most `nums.length`, and numbers can be negative. One test has 400,000 numbers with `k` = 200,000, so adding up every window from scratch will time out.",
    fn: "maxWindowSum",
    starter: `function maxWindowSum(nums, k) {

}`,
    hint: "When the window moves one step, only one number enters and one leaves. Update the sum instead of rebuilding it.",
    tests: [
      { args: [[1, 2, 3], 3], expected: 6 },
      { args: [[2, 1, 5, 1, 3, 2], 3], expected: 9 },
      { args: [[5, -2, 7], 1], expected: 7 },
      { args: [[-1, -2, -3], 2], expected: -3 },
      { label: "400k numbers, k = 200k", argsCode: "[Array.from({ length: 400000 }, (_, i) => (i * 37) % 1000 - 500), 200000]", expectedCode: "(function () { const a = Array.from({ length: 400000 }, (_, i) => (i * 37) % 1000 - 500); const p = [0]; for (const x of a) p.push(p[p.length - 1] + x); let best = -Infinity; for (let i = 0; i + 200000 <= a.length; i++) best = Math.max(best, p[i + 200000] - p[i]); return best; })()", miss: "sliding-window.recompute" }
    ],
    solution: `function maxWindowSum(nums, k) {
  let sum = 0;
  for (let i = 0; i < k; i++) sum += nums[i];
  let best = sum;
  for (let i = k; i < nums.length; i++) {
    sum += nums[i] - nums[i - k];
    best = Math.max(best, sum);
  }
  return best;
}`,
    explain: "A window of fixed size slides one step at a time, so its sum changes by the number entering minus the number leaving. Each slide is O(1) and the whole scan is O(n). Re-adding all k values for every window is O(n times k), about 10^11 steps on the big test. Start `best` from the first window rather than 0, since every number can be negative."
  },
  {
    id: "a234", track: "algo", level: 2, topic: "Linked lists", type: "code",
    title: "Cycle in a linked list",
    prompt: "A linked list is stored as an array `next`: node `i` points to node `next[i]`, and `-1` means the end of the list. The head is node 0, and an empty array is an empty list. Return `true` if following the links from the head ever loops back. Use O(1) extra memory (no Set of visited nodes). One test has 1,000,000 nodes.",
    fn: "hasCycle",
    starter: `function hasCycle(next) {

}`,
    hint: "Slow and fast pointers: if there is a loop, the fast pointer eventually catches up with the slow one. If there is none, fast reaches -1.",
    tests: [
      { args: [[]], expected: false },
      { args: [[-1]], expected: false },
      { args: [[0]], expected: true, miss: "complexity.wrong-pattern" },
      { args: [[1, 2, -1]], expected: false },
      { args: [[1, 2, 3, 1]], expected: true },
      { args: [[1, 2, 0]], expected: true },
      { label: "1,000,000 nodes in a straight line", argsCode: "[Array.from({ length: 1000000 }, (_, i) => i < 999999 ? i + 1 : -1)]", expected: false, miss: "complexity.nested-loop-cost" },
      { label: "1,000,000 nodes, the tail points back to the middle", argsCode: "[Array.from({ length: 1000000 }, (_, i) => i < 999999 ? i + 1 : 500000)]", expected: true, miss: "complexity.ignored-limits" }
    ],
    solution: `function hasCycle(next) {
  if (next.length === 0) return false;
  let slow = 0, fast = 0;
  while (fast !== -1 && next[fast] !== -1) {
    slow = next[slow];
    fast = next[next[fast]];
    if (slow === fast) return true;
  }
  return false;
}`,
    explain: "Without a loop the fast pointer falls off the end. With one, both pointers end up circling it, and since fast gains one link on slow per step, they must meet. That is O(n) time and O(1) memory, compared with a Set that needs memory for every node. Checking each new node against all earlier ones with a list is O(n squared) and takes far too long on a million nodes."
  },
  {
    id: "a235", track: "algo", level: 2, topic: "Prefix sums", type: "code",
    title: "Range sum queries",
    prompt: "`nums` never changes. `queries` is a list of `[l, r]` pairs (inclusive, `l <= r`). Return an array with the sum of `nums[l..r]` for every query. One test has 200,000 numbers and 200,000 queries over long ranges, so summing each range with a loop will time out.",
    fn: "rangeSums",
    starter: `function rangeSums(nums, queries) {

}`,
    hint: "Precompute running totals once. A range sum is then a subtraction of two of them. Make room for the empty prefix so that l = 0 works too.",
    tests: [
      { args: [[1, 2, 3, 4], [[0, 3], [1, 2], [2, 2]]], expected: [10, 5, 3] },
      { args: [[5, -2, 7], [[0, 0]]], expected: [5], miss: "prefix-sums.missing-zero-seed" },
      { args: [[-3, 4, -1], [[0, 2], [1, 1], [2, 2]]], expected: [0, 4, -1] },
      { args: [[9], []], expected: [] },
      { label: "200k numbers, 200k long queries", argsCode: "[Array.from({ length: 200000 }, (_, i) => (i * 31) % 101 - 50), Array.from({ length: 200000 }, (_, i) => [(i * 7) % 1000, 199999 - (i * 13) % 1000])]", expectedCode: "(function () { const a = Array.from({ length: 200000 }, (_, i) => (i * 31) % 101 - 50); const p = new Array(a.length + 1).fill(0); for (let i = 0; i < a.length; i++) p[i + 1] = p[i] + a[i]; return Array.from({ length: 200000 }, (_, i) => p[199999 - (i * 13) % 1000 + 1] - p[(i * 7) % 1000]); })()", miss: "prefix-sums.recompute-per-query" }
    ],
    solution: `function rangeSums(nums, queries) {
  const prefix = new Array(nums.length + 1).fill(0);
  for (let i = 0; i < nums.length; i++) prefix[i + 1] = prefix[i] + nums[i];
  return queries.map(([l, r]) => prefix[r + 1] - prefix[l]);
}`,
    explain: "`prefix[i]` is the sum of the first i numbers, so the array has n + 1 entries and starts with 0. The sum of `nums[l..r]` is `prefix[r + 1] - prefix[l]`, and the leading 0 is what makes a query starting at index 0 work. Building it is O(n) once, then each query is O(1). Looping over each range is O(n) per query, about 4 times 10^10 steps on the big test."
  },
  {
    id: "a236", track: "algo", level: 2, topic: "Prefix sums", type: "code",
    title: "Pivot index",
    prompt: "Return the leftmost index where the sum of the numbers strictly to its left equals the sum of the numbers strictly to its right (an empty side sums to 0). Return -1 if there is none. Numbers can be negative. One test has 200,000 numbers, so recomputing both sums at every index will time out.",
    fn: "pivotIndex",
    starter: `function pivotIndex(nums) {

}`,
    hint: "Keep the total and a running left sum. The right sum at index i is total minus left minus nums[i].",
    tests: [
      { args: [[1, 7, 3, 6, 5, 6]], expected: 3 },
      { args: [[1, 2, 3]], expected: -1 },
      { args: [[2, 1, -1]], expected: 0, miss: "prefix-sums.missing-zero-seed" },
      { args: [[1]], expected: 0, miss: "prefix-sums.missing-zero-seed" },
      { args: [[-1, -1, 0, 1, 1, 0]], expected: 5 },
      { args: [[]], expected: -1 },
      { label: "200k numbers, pivot near the end", argsCode: "[Array.from({ length: 200000 }, (_, i) => i === 199999 ? 199998 : 1)]", expected: 199998, miss: "prefix-sums.recompute-per-query" }
    ],
    solution: `function pivotIndex(nums) {
  let total = 0;
  for (const x of nums) total += x;
  let left = 0;
  for (let i = 0; i < nums.length; i++) {
    if (left === total - left - nums[i]) return i;
    left += nums[i];
  }
  return -1;
}`,
    explain: "With the total known, the sum to the right of index i is `total - left - nums[i]`, so one running left sum is enough. The empty prefix counts as 0, which is why index 0 can be a pivot. That is O(n) with two passes, versus O(n squared) for summing both sides at every index."
  },
  {
    id: "a238", track: "algo", level: 2, topic: "Design a structure", type: "code",
    title: "Min stack",
    prompt: "Simulate a stack that can also report its minimum. `ops` is a list of `['push', x]`, `['pop']`, `['top']` and `['getMin']`. Return an array with the result of every `top` and `getMin`, in order. `pop` and `top` are only called on a non-empty stack. Each operation should be O(1): one test has 100,000 pushes and 200,000 `getMin` calls, so scanning the stack each time will time out.",
    fn: "minStackRun",
    starter: `function minStackRun(ops) {
  const out = [];
  for (const [op, x] of ops) {

  }
  return out;
}`,
    hint: "Store with every pushed value the smallest value in the stack at that moment. Popping then restores the previous minimum automatically.",
    tests: [
      { args: [[['push', 3], ['push', 5], ['getMin'], ['push', 2], ['push', 1], ['getMin'], ['pop'], ['getMin'], ['pop'], ['top']]], expected: [3, 1, 2, 5], miss: "design.wrong-pattern" },
      { args: [[['push', 1], ['push', 1], ['pop'], ['getMin']]], expected: [1], miss: "design.wrong-pattern" },
      { args: [[['push', -2], ['push', 0], ['push', -3], ['getMin'], ['pop'], ['top'], ['getMin']]], expected: [-3, 0, -2] },
      { args: [[]], expected: [] },
      { label: "100k pushes, 200k getMin calls", argsCode: "[Array.from({ length: 100000 }, (_, i) => ['push', (i * 7919) % 100003 - 50000]).concat(Array.from({ length: 100000 }, () => ['getMin']), Array.from({ length: 50000 }, () => [['pop'], ['getMin']]).flat())]", expectedCode: "(function () { const v = Array.from({ length: 100000 }, (_, i) => (i * 7919) % 100003 - 50000); const sm = []; v.forEach((x, i) => sm.push(i ? Math.min(sm[i - 1], x) : x)); const out = new Array(100000).fill(sm[99999]); for (let j = 0; j < 50000; j++) out.push(sm[99999 - 1 - j]); return out; })()", miss: "design.too-slow" }
    ],
    solution: `function minStackRun(ops) {
  const stack = [];
  const out = [];
  for (const [op, x] of ops) {
    if (op === 'push') stack.push([x, stack.length ? Math.min(x, stack[stack.length - 1][1]) : x]);
    else if (op === 'pop') stack.pop();
    else if (op === 'top') out.push(stack[stack.length - 1][0]);
    else out.push(stack[stack.length - 1][1]);
  }
  return out;
}`,
    explain: "Each stack entry stores its value together with the minimum of everything at or below it. The current minimum is then just the top entry's second number, and popping an entry brings back the previous minimum for free. Every operation is O(1) at the cost of O(n) extra memory. Tracking one `min` variable breaks after you pop the minimum, and rescanning the stack is O(n) per call."
  },
  {
    id: "a326", track: "algo", level: 3, topic: "Heaps", type: "code",
    title: "Last stone weight",
    prompt: "Each round, take the two heaviest stones. If they weigh the same, both are destroyed; otherwise the lighter is destroyed and the heavier is replaced by a stone weighing the difference. Repeat until at most one stone is left. Return its weight, or 0 if none is left. One test has 100,000 stones, so sorting the whole list every round will time out.",
    fn: "lastStoneWeight",
    starter: `function lastStoneWeight(stones) {

}`,
    hint: "You only ever need the largest remaining stone, again and again, with new stones added in between. Which structure gives you the max cheaply?",
    tests: [
      { args: [[2, 7, 4, 1, 8, 1]], expected: 1 },
      { args: [[1]], expected: 1 },
      { args: [[2, 2]], expected: 0 },
      { args: [[]], expected: 0 },
      { args: [[2, 10, 9]], expected: 1, miss: "heaps.default-sort" },
      { label: "100k stones", argsCode: "[Array.from({ length: 100000 }, (_, i) => (i * 7919) % 1000 + 1)]", expectedCode: "(function () { const c = new Array(1001).fill(0); for (let i = 0; i < 100000; i++) c[(i * 7919) % 1000 + 1]++; let hi = 1000; for (;;) { while (hi > 0 && c[hi] === 0) hi--; if (hi === 0) return 0; c[hi]--; const a = hi; let h2 = hi; while (h2 > 0 && c[h2] === 0) h2--; if (h2 === 0) return a; c[h2]--; if (a !== h2) c[a - h2]++; } })()", miss: "heaps.sort-everything" }
    ],
    solution: `function lastStoneWeight(stones) {
  const h = [];
  const push = x => {
    h.push(x);
    let i = h.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (h[p] >= h[i]) break;
      [h[p], h[i]] = [h[i], h[p]];
      i = p;
    }
  };
  const pop = () => {
    const top = h[0];
    const last = h.pop();
    if (h.length) {
      h[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < h.length && h[l] > h[m]) m = l;
        if (r < h.length && h[r] > h[m]) m = r;
        if (m === i) break;
        [h[m], h[i]] = [h[i], h[m]];
        i = m;
      }
    }
    return top;
  };
  for (const s of stones) push(s);
  while (h.length > 1) {
    const a = pop(), b = pop();
    if (a !== b) push(a - b);
  }
  return h.length ? h[0] : 0;
}`,
    explain: "Each round removes the two largest and may insert one new value, which is exactly what a max heap does in O(log n). The whole process is O(n log n). Re-sorting the list every round is O(n log n) per round, which is hopeless for 100,000 stones, and sorting numbers without a comparator compares them as text, so 10 would count as smaller than 2."
  },
  {
    id: "a327", track: "algo", level: 3, topic: "Amortized analysis", type: "code",
    title: "Cost of growing an array",
    prompt: "A dynamic array starts empty with capacity 1. Pushing onto a full array allocates a bigger one and copies every current element into it. `growth` is either `'double'` (the capacity doubles) or a positive integer `s` (the capacity grows by `s`). Return the total number of element copies caused by `n` pushes. Compare the totals for the two policies as `n` grows.",
    fn: "totalCopies",
    starter: `function totalCopies(n, growth) {

}`,
    hint: "Simulate the pushes with a size and a capacity. When size equals capacity, add size to your copy count and grow the capacity. You do not need to copy any real data.",
    tests: [
      { args: [0, 'double'], expected: 0 },
      { args: [1, 'double'], expected: 0 },
      { args: [2, 'double'], expected: 1 },
      { args: [5, 'double'], expected: 7 },
      { args: [8, 'double'], expected: 7 },
      { args: [9, 'double'], expected: 15 },
      { args: [5, 1], expected: 10, miss: "complexity.worst-vs-amortized" },
      { args: [10, 3], expected: 12, miss: "complexity.worst-vs-amortized" },
      { label: "1,000,000 pushes with doubling", args: [1000000, 'double'], expected: 1048575, miss: "complexity.worst-vs-amortized" },
      { label: "1,000,000 pushes growing by 1", args: [1000000, 1], expectedCode: "999999 + 1 * 999999 * 999998 / 2", miss: "complexity.nested-loop-cost" }
    ],
    solution: `function totalCopies(n, growth) {
  let cap = 1, size = 0, copies = 0;
  for (let i = 0; i < n; i++) {
    if (size === cap) {
      copies += size;
      cap = growth === 'double' ? cap * 2 : cap + growth;
    }
    size++;
  }
  return copies;
}`,
    explain: "With doubling, copies happen at sizes 1, 2, 4, 8 and so on, which add up to less than 2n over n pushes, so each push costs O(1) amortized even though one push occasionally costs O(n). Growing by a fixed step copies about n squared divided by 2s elements in total, which is O(n squared) and why real arrays grow by a factor. Amortized means averaged over the whole sequence, not the cost of every single call."
  },
  {
    id: "a328", track: "algo", level: 3, topic: "Tries", type: "code",
    title: "Implement a trie",
    prompt: "Simulate a trie of lowercase words. `ops` is a list of `['insert', word]`, `['search', word]` (true only if exactly this word was inserted) and `['startsWith', prefix]` (true if any inserted word begins with it). Return the results of every `search` and `startsWith`, in order. One test has 100,000 words and 100,000 queries, so scanning a list of all words for each query will time out.",
    fn: "trieRun",
    starter: `function trieRun(ops) {
  const out = [];
  for (const [op, w] of ops) {

  }
  return out;
}`,
    hint: "One node per character with a map of children. A node needs a flag that says a word ends here, because a prefix is not necessarily a word.",
    tests: [
      { args: [[['insert', 'apple'], ['search', 'apple'], ['search', 'app'], ['startsWith', 'app'], ['insert', 'app'], ['search', 'app']]], expected: [true, false, true, true], miss: "design.prefix-vs-word" },
      { args: [[['search', 'a'], ['startsWith', 'a']]], expected: [false, false] },
      { args: [[['insert', 'car'], ['startsWith', 'card'], ['search', 'cards'], ['search', 'ca']]], expected: [false, false, false], miss: "design.prefix-vs-word" },
      { args: [[['insert', 'a'], ['insert', 'ab'], ['search', 'a'], ['startsWith', 'b']]], expected: [true, false] },
      { label: "100k words, 100k queries that mostly miss", argsCode: "(function () { const w = i => ((i * 7919) % 1000003).toString(36); const ops = Array.from({ length: 100000 }, (_, i) => ['insert', w(i)]); for (let i = 0; i < 100000; i++) ops.push(i % 5 === 0 ? ['search', w(i)] : i % 2 ? ['search', w(i) + 'q'] : ['startsWith', w(i) + 'zz']); return [ops]; })()", expectedCode: "(function () { const w = i => ((i * 7919) % 1000003).toString(36); const words = new Set(), pre = new Set(); for (let i = 0; i < 100000; i++) { const s = w(i); words.add(s); for (let k = 1; k <= s.length; k++) pre.add(s.slice(0, k)); } const out = []; for (let i = 0; i < 100000; i++) out.push(i % 5 === 0 ? words.has(w(i)) : i % 2 ? words.has(w(i) + 'q') : pre.has(w(i) + 'zz')); return out; })()", miss: "design.too-slow" }
    ],
    solution: `function trieRun(ops) {
  const root = {};
  const out = [];
  const walk = s => {
    let node = root;
    for (const ch of s) {
      node = node.kids && node.kids.get(ch);
      if (!node) return null;
    }
    return node;
  };
  for (const [op, w] of ops) {
    if (op === 'insert') {
      let node = root;
      for (const ch of w) {
        if (!node.kids) node.kids = new Map();
        if (!node.kids.has(ch)) node.kids.set(ch, {});
        node = node.kids.get(ch);
      }
      node.end = true;
    } else if (op === 'search') {
      const node = walk(w);
      out.push(!!(node && node.end));
    } else {
      out.push(walk(w) !== null);
    }
  }
  return out;
}`,
    explain: "Each character is one step down the tree, so insert, search and prefix search all cost O(length of the word), no matter how many words are stored. The end flag is what separates a word from a prefix: after inserting 'apple', the path for 'app' exists but only 'apple' is flagged. Scanning a list of all words for each query is O(words times length) per query."
  }
];

if (typeof module !== "undefined") module.exports = LESSONS;
else window.LESSONS = LESSONS;
