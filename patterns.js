// Algorithm patterns and the misconceptions juniors tie to them. Order is the default study order.
// Every algo lesson topic belongs to exactly one pattern. Lessons point at misconception ids via `miss` / `misses`.

const PATTERNS = [
  {
    id: "complexity", name: "Big O and core structures",
    topics: ["Complexity", "Amortized analysis", "Arrays vs lists", "Linked lists", "Problem solving"],
    guide: "big-o",
    misconceptions: [
      { id: "complexity.wrong-pattern", label: "Picked a different technique than this problem needs",
        fix: "Start from what the problem asks and what the limits allow, then pick the structure. A Set, a sort or a recursion each fit one shape of problem, and using one by habit usually costs memory or time you did not need to spend." },
      { id: "complexity.nested-loop-cost", label: "Underestimated how fast nested loops grow",
        fix: "A loop inside a loop over the same input does n times n work, so 100,000 items is 10 billion steps. At roughly 10^8 simple operations per second that is minutes, not milliseconds. Multiply the loop sizes before trusting a solution." },
      { id: "complexity.worst-vs-amortized", label: "Mixed up worst case, average and amortized cost",
        fix: "Amortized cost averages over a whole sequence of operations, so a rare expensive step does not make every call expensive. A growing array copies only at sizes 1, 2, 4, 8 and so on, which sums to under 2n copies across n pushes. That is O(1) amortized even though one push can cost O(n)." },
      { id: "complexity.list-vs-array", label: "Thought linked lists beat arrays at access or scanning",
        fix: "A linked list wins only when you already hold the node and want to splice in O(1). Reaching the i-th element costs O(n), and scanning is slower than on an array because nodes are scattered in memory. Arrays win indexing, scanning and cache behavior." },
      { id: "complexity.ignored-limits", label: "Ignored the input size or memory limit in the statement",
        fix: "Constraints leak the intended complexity: n up to 20 allows 2^n, up to 5,000 allows n squared, up to 10^6 needs n log n or better. A memory limit rules out a Set of visited nodes, which is why Floyd's slow and fast pointers exist. Read the limits before choosing the approach." }
    ]
  },
  {
    id: "hashing", name: "Arrays and hashing",
    topics: ["Hashing", "Probabilistic"],
    guide: "hashing",
    misconceptions: [
      { id: "hashing.wrong-pattern", label: "Compared every pair instead of remembering what you saw",
        fix: "Whenever you ask whether you have seen something before, or need a partner for the current item, a Set or Map answers in O(1) on average. A double loop does the same job in O(n squared) and times out on 100,000 items. Trade O(n) memory for the single pass." },
      { id: "hashing.worst-case-lookup", label: "Believed hash lookups are always O(1) or always slow",
        fix: "Average lookup is O(1) because a good hash spreads keys across buckets. It degrades toward O(n) only with heavy collisions, expensive keys to hash or a resize at that moment. Size alone does not make a lookup slow, so a map with millions of entries is still fast." },
      { id: "hashing.store-before-check", label: "Stored the value before looking for its partner",
        fix: "In Two Sum, check whether target minus x is already in the map first, then store x. Storing first lets an element pair with itself, so [3, 3] with target 6 or a lone 3 with target 6 gives a wrong answer. The map must only contain items strictly before the current index." },
      { id: "hashing.counts-vs-presence", label: "Used a Set where counts or indexes were needed",
        fix: "A Set only says whether something exists. Questions like first unique character need how many times each item appears, so build a Map of counts in one pass and then scan again in the original order. Presence alone cannot tell once from twice." },
      { id: "hashing.bloom-guarantee", label: "Mixed up what a Bloom filter can get wrong",
        fix: "A Bloom filter only sets bits and never clears them, so a real member always finds its bits on and is never missed. A non-member can find all its bits already set by other keys, which gives a false positive. It answers definitely not present or probably present." }
    ]
  },
  {
    id: "two-pointers", name: "Two pointers",
    topics: ["Two pointers", "Strings", "Greedy scan"],
    guide: "two-pointers",
    misconceptions: [
      { id: "two-pointers.wrong-pattern", label: "Used a different technique than two pointers or one scan",
        fix: "When the input is sorted or symmetric, or one pass with a small summary of the past is enough, pointers beat extra structures. Hashing, sorting or brute force over all pairs work but cost more memory or time. Ask what each pointer move lets you discard for good." },
      { id: "two-pointers.skip-junk", label: "Compared characters without skipping non-alphanumerics",
        fix: "Advance each pointer past anything that is not a letter or digit before comparing, and lowercase both sides. An underscore is not alphanumeric, a lone space is a palindrome and a digit like 0 differs from the letter O. Loop on each pointer until it lands on a real character." },
      { id: "two-pointers.move-wrong-pointer", label: "Moved the wrong pointer after the comparison",
        fix: "Every move must discard candidates that can never be part of an answer. On a sorted array a sum that is too small means the left value is too small for any remaining partner, so move left up. For trapping water, move the pointer on the lower side, because that side's own maximum is the binding limit." },
      { id: "two-pointers.stale-extreme", label: "Used a global min or max instead of the running one",
        fix: "A greedy scan keeps the best value seen so far, updated as you move. For one buy and one sell, track the lowest price before today and compare selling today, because the global minimum may come after the sell day. Start the best profit at 0 so a falling market returns 0." },
      { id: "two-pointers.even-centers", label: "Only expanded from odd length centers",
        fix: "A palindrome has either a character or a gap between two characters at its center, so there are 2n minus 1 centers. Expand from i,i and from i,i+1 for every i, otherwise strings like cbbd are answered wrong. Each expansion stops at the first mismatch." }
    ]
  },
  {
    id: "sliding-window", name: "Sliding window",
    topics: ["Sliding window"],
    guide: "two-pointers",
    misconceptions: [
      { id: "sliding-window.wrong-pattern", label: "Used a different technique than a sliding window",
        fix: "Longest or shortest contiguous piece with a monotonic rule is a window problem. Sorting, subsets or nested loops over every start and end give the same answer at O(n squared) or worse. If a window that breaks the rule always keeps breaking when it grows, slide it." },
      { id: "sliding-window.no-shrink", label: "Window never shrinks when the constraint breaks",
        fix: "Grow the right edge one step, then move the left edge forward while the window is invalid. Without the shrink step the window keeps stale characters and the length only ever grows. Both edges only move forward, so each index enters and leaves once." },
      { id: "sliding-window.stale-left", label: "Moved the left edge back using an old index",
        fix: "When a character repeats, the left edge moves to one past its last position only if that position is inside the current window. In abba, the second a was last seen at index 0 but the window already starts at 2. Take the max of the current left edge and the old index plus one, or check it is at least left." },
      { id: "sliding-window.recompute", label: "Recomputed the window from scratch at every step",
        fix: "Update the summary of the window incrementally: add the entering item, remove the leaving item. Rebuilding a set, count or sum for each position costs O(window size) per step and turns a linear scan into O(n times k). Keep the counts as the edges move." },
      { id: "sliding-window.multiplicity", label: "Ignored repeated characters that must be covered",
        fix: "When the target has repeats, such as aa, the window needs two copies, so track how many of each character you still need, not just which ones. A missing counter that drops only when a needed copy arrives makes the check O(1). Counts can go negative, which just means extras." }
    ]
  },
  {
    id: "prefix-sums", name: "Prefix sums",
    topics: ["Prefix sums"],
    guide: "two-pointers",
    misconceptions: [
      { id: "prefix-sums.wrong-pattern", label: "Used a different technique than prefix sums",
        fix: "Repeated range sums over fixed data, or counting subarrays with a given sum, call for precomputed cumulative sums. Sorting the array or caching every subarray sum destroys the order or needs n squared memory. Build prefix once, then answer each query from two entries." },
      { id: "prefix-sums.missing-zero-seed", label: "Forgot to count subarrays that start at index 0",
        fix: "Seed the map of seen prefix sums with 0 mapped to 1, which stands for the empty prefix before the first element. Without it, a subarray beginning at index 0 never finds its matching earlier prefix and is missed. Check [3] with target 3, which must give 1." },
      { id: "prefix-sums.negatives-break-window", label: "Used a sliding window when values can be negative",
        fix: "A sliding window needs the sum to grow when you extend and shrink when you drop items, which negative numbers break. For exact sums with negatives, count earlier prefixes equal to prefix minus k using a hash map. That handles any sign in one pass." },
      { id: "prefix-sums.recompute-per-query", label: "Looped over the range again for every query",
        fix: "With a million queries on an unchanging array, summing each range costs up to 10^12 steps. One O(n) prefix pass makes every query prefix[r+1] minus prefix[l], which is O(1). Precompute once and reuse." },
      { id: "prefix-sums.rebuild-on-update", label: "Rebuilt prefix sums after every point update",
        fix: "A prefix array makes queries O(1) but one update changes up to n entries, so interleaved updates cost O(n) each. When data changes between queries use a Fenwick tree or segment tree, where both update and query touch about log n nodes." }
    ]
  },
  {
    id: "stacks", name: "Stacks and monotonic structures",
    topics: ["Stacks", "Monotonic stack", "Monotonic deque"],
    guide: "stacks",
    misconceptions: [
      { id: "stacks.wrong-pattern", label: "Used a different technique than a stack or deque",
        fix: "Nesting, undo and next greater element all need the most recent unfinished item, which a stack gives in O(1). Brute force looks at every pair or every window and costs O(n squared) or O(n times k). Keep only the candidates that can still matter." },
      { id: "stacks.mismatch-pairing", label: "Counted brackets without matching type and order",
        fix: "Each closer must match the most recent unclosed opener, not just any opener. Push openers, and on a closer pop and compare it to the matching type. Strings like ([)] have equal counts but wrong order and must fail." },
      { id: "stacks.unflushed", label: "Left items on the stack without handling them at the end",
        fix: "After the scan, anything still on the stack was never resolved. For brackets that means unmatched openers and the answer is false, so check the stack is empty. For a histogram, append a height 0 sentinel so every remaining bar gets measured." },
      { id: "stacks.fifo-lifo", label: "Used first in, first out where last in, first out was needed",
        fix: "Undo reverts the most recent change, so the newest item must come out first: that is a stack. A queue would hand back the oldest edit. Check which end the problem takes from before choosing the structure." },
      { id: "stacks.expired-front", label: "Kept indices that already left the window",
        fix: "A monotonic deque stores indices so you can tell when the front is no longer inside the window. When the front index is at most i minus k, drop it before reading the maximum. Use a head index instead of Array.shift, which can be O(n)." }
    ]
  },
  {
    id: "binary-search", name: "Binary search",
    topics: ["Binary search"],
    guide: "binary-search",
    misconceptions: [
      { id: "binary-search.wrong-pattern", label: "Scanned or sorted instead of halving the range",
        fix: "When the data has an order, or the answer can be tested as feasible or not, each check can discard half the range. Linear scans, sorting or dynamic programming over everything are far slower on huge inputs. Look for a rule that tells you which half to keep." },
      { id: "binary-search.off-by-one", label: "Off by one on the bounds or the empty case",
        fix: "Pick one convention and keep it, for example a half open range [lo, hi) where hi starts at length. Return lo as the first index where the condition holds, so an empty array and a target past the end both return length. Trace a one and a two element array by hand." },
      { id: "binary-search.wrong-half", label: "Kept the wrong half after comparing with mid",
        fix: "In a rotated array one side of mid is always sorted. Check whether the target lies inside that sorted side, keep it if so, otherwise keep the other side. For two sorted arrays, binary search the cut position and compare the left maxes with the right mins." },
      { id: "binary-search.answer-space", label: "Missed that the answer itself can be searched",
        fix: "If a candidate answer X can be checked in O(n) and feasibility is monotonic, so X working means X plus 1 works too, binary search over X. Capacity between the max item and the total gives O(n log sum). Trying every value from 1 upward is far slower." },
      { id: "binary-search.log-miscount", label: "Misjudged how few steps halving needs",
        fix: "Each comparison halves the range, so n items need about log base 2 of n steps. A billion items is about 30 comparisons, not thousands or a million. That is why indexes over huge tables take only a handful of reads." }
    ]
  },
  {
    id: "trees", name: "Trees",
    topics: ["Trees"],
    guide: "trees",
    misconceptions: [
      { id: "trees.wrong-pattern", label: "Used a different technique than tree recursion or BFS",
        fix: "Most tree questions are answered by recursion on the left and right subtrees, or by BFS when you need levels. Flattening the tree to an array or comparing every pair of nodes loses the structure and costs more. Decide what each subtree should return to its parent." },
      { id: "trees.null-base", label: "Missing or wrong base case for a null node",
        fix: "Every recursive tree function must say what an empty subtree returns. Height of null is 0 or minus 1 depending on convention, count is 0 and a sum is 0. Without the base case you read a field of null and crash, or return the wrong value for leaves." },
      { id: "trees.dfs-order", label: "Mixed up preorder, inorder and postorder",
        fix: "The orders differ only in when the node is handled relative to its children: before for preorder, between for inorder, after for postorder. Inorder on a BST gives sorted values. Pick the order by what you need first: the parent's answer, sorted output, or the children's results." },
      { id: "trees.local-bst", label: "Checked the BST rule only against the parent",
        fix: "A BST needs every node in the left subtree smaller than the node and every node in the right subtree larger, not just its direct children. Pass an allowed range down the recursion, or check that an inorder walk is strictly increasing. A node can pass the parent check and still break an ancestor's bound." },
      { id: "trees.height-vs-depth", label: "Confused height with depth, or edges with nodes",
        fix: "Depth counts steps from the root down to a node and height counts steps from a node down to its deepest leaf. Whether a single node has height 0 or 1 depends on whether you count edges or nodes. Fix the convention first and make the base case match it." }
    ]
  },
  {
    id: "intervals", name: "Intervals and greedy",
    topics: ["Intervals"],
    guide: "intervals",
    misconceptions: [
      { id: "intervals.wrong-pattern", label: "Used a different technique than sort then sweep",
        fix: "Most interval problems become one pass once the intervals are sorted by start. Comparing every pair is O(n squared) and easy to get wrong with several overlaps in a row. Sort first, then keep a running end." },
      { id: "intervals.unsorted", label: "Did not sort by start before merging",
        fix: "A single pass only works when intervals arrive ordered by start, so that each one can only touch the last merged interval. With unsorted input an early interval may overlap a later one you already passed. Sort by start before sweeping." },
      { id: "intervals.touching", label: "Wrong overlap test when endpoints touch",
        fix: "Decide whether [1,4] and [4,5] overlap before writing the test. If touching counts, merge when next start is at most the current end. If it does not, use strictly less than. Test the touching case explicitly." },
      { id: "intervals.wrong-neighbor", label: "Merged into the wrong neighbor or kept the old end",
        fix: "When the new interval overlaps the last merged one, the merged end is the max of both ends, not the new end. [1,10] followed by [2,3] must stay [1,10]. Compare only against the last merged interval, never an earlier one." }
    ]
  },
  {
    id: "heaps", name: "Heaps and sorting",
    topics: ["Heaps", "Sorting", "Selection"],
    guide: "sorting-heaps",
    misconceptions: [
      { id: "heaps.wrong-pattern", label: "Used a different technique than a heap or selection",
        fix: "When you only need the smallest, largest or top k, a heap or quickselect avoids ordering everything. A balanced BST or comparing all pairs is heavier than the problem needs. Match the structure to the single question being asked." },
      { id: "heaps.default-sort", label: "Sorted numbers without a numeric comparator",
        fix: "JavaScript sort with no comparator orders values as strings, so 10 comes before 9 and -10 before -2. Always pass (a, b) => a - b for numbers. Single digit tests hide the bug, which is why it survives until larger values appear." },
      { id: "heaps.sort-everything", label: "Sorted or re-sorted everything when only part was needed",
        fix: "For the top k of a stream, a min heap of size k costs O(n log k) time and O(k) memory and works on data that does not fit in RAM. Sorting everything is O(n log n) and needs it all in memory. A running median uses two heaps instead of re-sorting after every insert." },
      { id: "heaps.forgot-sort", label: "Processed items before putting them in order",
        fix: "Sweeps like merging intervals only work on input sorted by the key you sweep on. Sort first with the right comparator, then walk once, so each item can only interact with its neighbor. An unsorted input hides overlaps behind later items." },
      { id: "heaps.quicksort-worst-case", label: "Misjudged which input makes quicksort quadratic",
        fix: "With the first element as pivot, sorted input always picks the minimum, so each partition peels off one element and the total is O(n squared). Random data and small arrays are fine. Random pivots or median of three avoid it." }
    ]
  },
  {
    id: "graphs", name: "Graphs: BFS, DFS and shortest paths",
    topics: ["Graphs", "BFS", "Topological sort", "Union-Find", "Shortest paths"],
    guide: "graphs",
    misconceptions: [
      { id: "graphs.wrong-pattern", label: "Used a different traversal or structure than this needs",
        fix: "Fewest hops needs BFS, connected groups need a flood fill or Union-Find and dependencies need a topological order. A deep recursive DFS can overflow the stack on 200,000 nodes, so use an explicit stack or Union-Find. Name the question first, then pick the tool." },
      { id: "graphs.no-visited", label: "Forgot to mark nodes as visited",
        fix: "Without a visited set a traversal re-enters the same node through different routes, double counts components or loops forever on a cycle. Mark a node when you push it, not when you pop it, so it enters the queue once. For Union-Find, merge only when two roots differ." },
      { id: "graphs.cycle-detection", label: "Mistook a revisit for a cycle, or missed a real one",
        fix: "In a directed graph a visited node is a cycle only if it is still on the current path, a gray node. A finished node reached from another branch is harmless. With Kahn's algorithm a cycle shows up as nodes that never reach in-degree zero." },
      { id: "graphs.weight-mismatch", label: "Picked a shortest path algorithm that ignores the weights",
        fix: "Equal edges use BFS, weights of 0 or 1 use a deque, non-negative weights use Dijkstra and negative weights need Bellman-Ford. Dijkstra locks a node's distance on first pop, which a negative edge can later improve. BFS ignores weights entirely." },
      { id: "graphs.cost-miscount", label: "Misjudged the running time of a graph algorithm",
        fix: "BFS and DFS are O(V plus E). Dijkstra with a binary heap is O((V plus E) log V), Bellman-Ford is O(V times E) and Floyd-Warshall is O(V cubed). Union-Find with path compression and union by rank is nearly constant, an inverse Ackermann bound." }
    ]
  },
  {
    id: "dp", name: "Dynamic programming",
    topics: ["Dynamic programming"],
    guide: "dynamic-programming",
    misconceptions: [
      { id: "dp.wrong-pattern", label: "Used greedy or brute force where DP was needed",
        fix: "Greedy only works when a local best choice never hurts the final answer, which holds for special cases like US coins and fails for coins [1, 3, 4] with amount 6. Brute force recursion repeats the same subproblems exponentially. If a counterexample breaks greedy, define a state and reuse smaller answers." },
      { id: "dp.base-case", label: "Wrong or missing base case",
        fix: "Fix the answers for the smallest inputs before the transition: dp[0] = 0 for coin change, an empty array gives 0, an empty string costs the length of the other. A wrong base case quietly shifts every later cell. Test the empty and single element inputs." },
      { id: "dp.bad-init", label: "Marked impossible states with 0 instead of Infinity",
        fix: "For a minimum, start unreached states at Infinity so that min never picks them and an impossible amount stays impossible. Starting at 0 makes unreachable states look free and returns answers that do not exist. Convert Infinity to -1 at the end if the problem asks for it." },
      { id: "dp.state-definition", label: "Fuzzy state definition or transition from the wrong cells",
        fix: "Say in one sentence what dp[i] or dp[i][j] means, then derive the transition from it. For edit distance matching characters carry dp[i-1][j-1], otherwise take 1 plus the min of the three neighbors. For house robber, best at i is the max of skipping it or taking it plus best at i-2." },
      { id: "dp.too-slow", label: "Exponential or quadratic where a faster DP exists",
        fix: "Plain recursion without a cache is exponential, and an O(n squared) loop times out at 200,000 items. Memoize or fill bottom up so each state is computed once, and shrink the state when only the previous values matter. Longest increasing subsequence drops to n log n with a tails array and binary search." }
    ]
  },
  {
    id: "design", name: "Designing data structures",
    topics: ["Design a structure", "Tries"],
    guide: "design-structures",
    misconceptions: [
      { id: "design.wrong-pattern", label: "Used a structure that does not fit the operations",
        fix: "List each operation with its required cost, then pick a structure per operation and keep them in sync. A hash set cannot answer prefix queries and a heap does not give lookup by key. A trie reaches a prefix in O(length) and a hash map plus ordered list gives O(1) LRU." },
      { id: "design.stale-recency", label: "Did not refresh recency on a get or a repeat put",
        fix: "In an LRU cache, reading a key makes it the most recent, and putting an existing key updates its value and recency too. Delete and re-insert (or move the node to the front) on every touch. If you skip it, the wrong key gets evicted later." },
      { id: "design.eviction-order", label: "Evicted the wrong key, or at the wrong moment",
        fix: "Insert the new key first, then if the size exceeds capacity remove the least recently used one, which is the oldest entry. Evicting before checking whether the key already exists drops an item for no reason. Track capacity after each put." },
      { id: "design.too-slow", label: "Scanned a list on every operation",
        fix: "Finding a key in an array and moving it costs O(n) per operation, so 200,000 operations on a large cache take far too long. Use a hash map for lookup and a doubly linked list, or a Map with insertion order, for recency. Both operations then cost O(1)." },
      { id: "design.prefix-vs-word", label: "Treated a prefix as a stored word",
        fix: "A trie path spells a prefix, but only nodes flagged as ending a word are real words. Mark the end on insert and check the flag on exact search, while prefix search only needs the path to exist. Without the flag, car makes ca look like a word." }
    ]
  }
];

if (typeof module !== "undefined") module.exports = PATTERNS;
else window.PATTERNS = PATTERNS;
