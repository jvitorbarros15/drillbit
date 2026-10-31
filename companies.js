// Interview profiles built only from what each company publishes about its own process.
// Every fact points at a source in the same profile. focus lists patterns the company names itself,
// it is never a guess about which questions get asked. Re-check sources when updating `checked`.
const COMPANIES = [
  {
    id: "google", name: "Google", checked: "2026-10-30",
    summary: "Google describes its hiring process on its careers site but doesn't publish a list of coding topics we could verify.",
    facts: [
      { text: "Google's careers site has a hiring process overview and interview tips. Ask your recruiter for the prep materials for your role.", source: 0 },
      { text: "With no published topic list, your plan stays balanced across the core patterns and starts from your weak spots.", source: 0 }
    ],
    focus: [],
    sources: [
      { label: "Google Careers: how we hire", url: "https://www.google.com/about/careers/applications/how-we-hire/" }
    ]
  },
  {
    id: "amazon", name: "Amazon", checked: "2026-10-30",
    summary: "An online assessment first, then a loop where every interviewer also asks about Leadership Principles.",
    facts: [
      { text: "Online assessment for SDE roles: a coding assessment (about 70 minutes on average for full time roles), a work styles assessment and a work simulation. Internship assessments take about 90 minutes.", source: 0 },
      { text: "Topics Amazon lists: data structures, algorithms, coding, object-oriented design, databases, distributed computing and operating systems.", source: 1 },
      { text: "Amazon recommends practicing coding outside an IDE.", source: 1 },
      { text: "The SDE II loop is four 55 minute interviews. Write syntactically correct code, no pseudocode, and check edge cases and bad input.", source: 2 },
      { text: "Each interviewer usually asks two or three behavioral questions tied to the Leadership Principles. Amazon suggests the STAR method and including metrics.", source: 2 }
    ],
    focus: [],
    focusNote: "Amazon names broad areas, not specific patterns, so your plan stays balanced. Practice without hints, since there is no IDE help.",
    sources: [
      { label: "Amazon: online assessment prep for SDE roles", url: "https://amazon.jobs/content/en/how-we-hire/university/sde-oa" },
      { label: "Amazon: software development interview topics", url: "https://www.amazon.jobs/content/en/how-we-hire/interview-prep/software-development-topics" },
      { label: "Amazon: SDE II interview prep", url: "https://amazon.jobs/content/en/how-we-hire/sde-ii-interview-prep" }
    ]
  },
  {
    id: "meta", name: "Meta", checked: "2026-10-30",
    summary: "Short coding rounds on fundamentals, with binary trees and recursion named directly.",
    facts: [
      { text: "Initial screen: two coding problems in about 35 minutes of coding, on algorithms, data structures, recursion and binary trees.", source: 0 },
      { text: "Full loop coding rounds are 45 minutes: 5 for introductions, 35 coding, 5 for questions. Be ready to discuss big O.", source: 0 },
      { text: "Meta suggests practicing in a plain text editor without autocomplete. The loop also has a 45 minute design round and a 45 minute behavioral round.", source: 0 },
      { text: "Meta's hiring page says select roles now include an authorized AI assistant inside CoderPad during technical interviews. Ask your recruiter whether yours does.", source: 1 }
    ],
    focus: ["trees"],
    focusNote: "Meta names binary trees and recursion, so Trees moves up in your plan after your weak spots. The format details come from a guide last updated in 2022.",
    sources: [
      { label: "Meta: preparing for your software engineering interview (updated 2022)", url: "https://www.metacareers.com/blog/preparing-for-your-software-engineering-interview-at-meta/" },
      { label: "Meta: hiring process", url: "https://www.metacareers.com/hiring-process/" }
    ]
  },
  {
    id: "microsoft", name: "Microsoft", checked: "2026-10-30",
    summary: "45 minute rounds that expect named data structures, an O(n log n) sort and tested code.",
    facts: [
      { text: "Technical rounds are short, about 45 minutes, so time management matters.", source: 0 },
      { text: "Data structures Microsoft names: arrays and strings, queues and lists, linked lists, trees and tries, hash maps and hash sets, and graphs.", source: 0 },
      { text: "Know at least one O(n log n) sort in detail, ideally two such as quicksort and merge sort, and explain your solution's big O.", source: 0 },
      { text: "Test your own solution before you finish and point out the corner cases.", source: 0 },
      { text: "Depending on the role, system design can cover resiliency, high availability, auto-scaling, replication, CAP and partitioning.", source: 0 }
    ],
    focus: ["hashing", "complexity", "trees", "design", "graphs", "heaps"],
    focusNote: "These patterns cover the data structures and sorting Microsoft names, so they move up in your plan after your weak spots.",
    sources: [
      { label: "Microsoft Careers: technical interviewing", url: "https://careers.microsoft.com/v2/global/en/hiring-tips/technical-interviewing" }
    ]
  },
  {
    id: "apple", name: "Apple", checked: "2026-10-30",
    summary: "Apple doesn't publish an interview guide for software engineers.",
    facts: [
      { text: "We couldn't find an official description of Apple's software engineering interviews. Job postings ask for algorithm and data structure skills, so the core patterns apply.", source: 0 },
      { text: "Ask your recruiter what each round covers. Your plan stays balanced and starts from your weak spots.", source: 0 }
    ],
    focus: [],
    sources: [
      { label: "Apple Careers", url: "https://www.apple.com/careers/us/" }
    ]
  }
];

if (typeof module !== "undefined") module.exports = COMPANIES;
else window.COMPANIES = COMPANIES;
