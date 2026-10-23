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
    id: "a207", track: "algo", level: 2, topic: "Sorting", type: "code",
    title: "Merge intervals",
    prompt: "Given `intervals` like `[[1,3],[2,6]]`, merge everything that overlaps and return the result sorted by start. Touching intervals such as [1,4] and [4,5] also merge.",
    fn: "merge",
    starter: `function merge(intervals) {

}`,
    hint: "Sort by start. After that, each interval either extends the last merged one or starts a new one.",
    tests: [
      { args: [[[1, 3], [2, 6], [8, 10], [15, 18]]], expected: [[1, 6], [8, 10], [15, 18]] },
      { args: [[[1, 4], [4, 5]]], expected: [[1, 5]] },
      { args: [[[5, 6], [1, 2]]], expected: [[1, 2], [5, 6]], miss: "heaps.forgot-sort" },
      { args: [[[1, 10], [2, 3], [4, 5]]], expected: [[1, 10]] },
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
    id: "a503", track: "algo", level: 5, topic: "Strings", type: "mcq",
    title: "Rolling hash",
    prompt: "You search for a 1 KB pattern inside a 1 GB log. Rabin-Karp avoids rehashing each 1 KB window from scratch by:",
    options: ["Caching every window", "Updating the hash in O(1) as the window slides: remove the outgoing char, add the incoming one", "Sorting the log", "Building a trie of the log"],
    answer: 1,
    misses: ["two-pointers.wrong-pattern", null, "two-pointers.wrong-pattern", "two-pointers.wrong-pattern"],
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
  }
];

if (typeof module !== "undefined") module.exports = LESSONS;
else window.LESSONS = LESSONS;
