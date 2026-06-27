// FLOW: Sample academic dataset for the resource handbook PDF (scripts/generateHandbook.js) and as a
// seed source. Realistic first-version sample content — easy to expand with more programs later.
// Books are tagged Free (OpenStax / NPTEL / MIT OCW …) or Paid (Pearson / McGraw-Hill / Wiley / O'Reilly / Packt).

export const HANDBOOK_META = {
  title: "Academic Resource Handbook",
  subtitle: "Programs · Universities · Courses · Assignments · Books & Learning Resources",
  org: "NoteGenie",
  edition: "Sample Edition v1",
};

export const ACADEMIC_PROGRAMS = [
  {
    code: "BCA",
    name: "Bachelor of Computer Applications (BCA)",
    universities: ["IGNOU", "Delhi University (SOL)", "Amity University", "LPU", "Sikkim Manipal University", "Annamalai University"],
    semesters: [
      {
        name: "Semester 1",
        courses: [
          {
            code: "BCA-101", name: "Programming in C", credits: 4,
            description: "Fundamentals of C: data types, control flow, functions, pointers, arrays, structures and file handling.",
            assignments: [
              { q: "Write a C program to check whether a number is prime.", difficulty: "Easy" },
              { q: "Implement a singly linked list with insert, delete and traverse operations.", difficulty: "Medium" },
              { q: "Build a mini library management system using structures and file I/O.", difficulty: "Hard" },
            ],
            books: [
              { title: "The C Programming Language", author: "Kernighan & Ritchie", publisher: "Pearson", type: "Paid" },
              { title: "C Programming (NPTEL)", author: "IIT Kharagpur", publisher: "NPTEL", type: "Free", source: "nptel.ac.in" },
              { title: "Beej's Guide to C", author: "Brian Hall", publisher: "Open", type: "Free", source: "beej.us" },
            ],
            resources: ["Lecture notes (Units 1-5)", "Previous-year question paper (2024)", "C Lab manual", "Practice question bank (60 Qs)"],
          },
          {
            code: "BCA-102", name: "Digital Logic & Computer Fundamentals", credits: 4,
            description: "Number systems, Boolean algebra, logic gates, combinational & sequential circuits, memory basics.",
            assignments: [
              { q: "Simplify a 4-variable Boolean expression using a K-map.", difficulty: "Easy" },
              { q: "Design a 4-bit binary adder and explain carry propagation.", difficulty: "Medium" },
              { q: "Design a 4-bit synchronous up/down counter with state diagram.", difficulty: "Hard" },
            ],
            books: [
              { title: "Digital Design", author: "M. Morris Mano", publisher: "Pearson", type: "Paid" },
              { title: "Digital Logic Design (NPTEL)", author: "IIT", publisher: "NPTEL", type: "Free", source: "nptel.ac.in" },
            ],
            resources: ["Unit-wise notes", "Truth-table worksheet", "Previous-year paper (2023)"],
          },
        ],
      },
      {
        name: "Semester 2",
        courses: [
          {
            code: "BCA-201", name: "Data Structures", credits: 4,
            description: "Arrays, stacks, queues, linked lists, trees, graphs, sorting & searching with complexity analysis.",
            assignments: [
              { q: "Implement stack-based infix to postfix conversion.", difficulty: "Easy" },
              { q: "Implement a binary search tree with insert/delete/search.", difficulty: "Medium" },
              { q: "Implement Dijkstra's shortest path on a weighted graph.", difficulty: "Hard" },
            ],
            books: [
              { title: "Data Structures Using C", author: "Reema Thareja", publisher: "Oxford", type: "Paid" },
              { title: "Open Data Structures", author: "Pat Morin", publisher: "Open", type: "Free", source: "opendatastructures.org" },
            ],
            resources: ["DSA notes", "Complexity cheat-sheet", "Lab manual", "100 practice problems"],
          },
        ],
      },
    ],
  },
  {
    code: "BTECH-CSE",
    name: "B.Tech in Computer Science & Engineering",
    universities: ["IIT Delhi", "NIT Trichy", "VIT", "BITS Pilani", "Anna University", "Amity University", "SRM"],
    semesters: [
      {
        name: "Semester 3",
        courses: [
          {
            code: "CS301", name: "Database Management Systems", credits: 4,
            description: "Relational model, SQL, ER design, normalization, transactions, indexing and NoSQL overview.",
            assignments: [
              { q: "Write SQL queries for a given schema (joins, group by, sub-queries).", difficulty: "Easy" },
              { q: "Normalize a relation up to BCNF and justify each step.", difficulty: "Medium" },
              { q: "Design and implement a transaction with proper isolation handling.", difficulty: "Hard" },
            ],
            books: [
              { title: "Database System Concepts", author: "Silberschatz, Korth, Sudarshan", publisher: "McGraw-Hill", type: "Paid" },
              { title: "Fundamentals of Database Systems", author: "Elmasri & Navathe", publisher: "Pearson", type: "Paid" },
              { title: "DBMS (NPTEL)", author: "IIT Madras", publisher: "NPTEL", type: "Free", source: "nptel.ac.in" },
            ],
            resources: ["ER + normalization notes", "SQL practice set", "Previous-year papers (2022-24)", "Lab manual (MySQL)"],
          },
          {
            code: "CS302", name: "Operating Systems", credits: 4,
            description: "Processes, threads, scheduling, synchronization, deadlocks, memory management, file systems.",
            assignments: [
              { q: "Simulate FCFS and Round Robin CPU scheduling.", difficulty: "Easy" },
              { q: "Implement the producer-consumer problem using semaphores.", difficulty: "Medium" },
              { q: "Implement a page-replacement simulator (FIFO, LRU, Optimal).", difficulty: "Hard" },
            ],
            books: [
              { title: "Operating System Concepts", author: "Silberschatz, Galvin, Gagne", publisher: "Wiley", type: "Paid" },
              { title: "OSTEP — Operating Systems: Three Easy Pieces", author: "Arpaci-Dusseau", publisher: "Open", type: "Free", source: "ostep.org" },
            ],
            resources: ["OS notes", "Scheduling worksheet", "Previous-year paper (2024)"],
          },
        ],
      },
    ],
  },
  {
    code: "MCA",
    name: "Master of Computer Applications (MCA)",
    universities: ["IGNOU", "NIT Warangal", "Pune University", "Jamia Millia Islamia", "VIT", "Christ University"],
    semesters: [
      {
        name: "Semester 1",
        courses: [
          {
            code: "MCA-101", name: "Advanced Data Structures & Algorithms", credits: 4,
            description: "Balanced trees, hashing, graph algorithms, greedy & dynamic programming, NP-completeness intro.",
            assignments: [
              { q: "Implement an AVL tree with rotations.", difficulty: "Medium" },
              { q: "Solve the 0/1 knapsack using dynamic programming.", difficulty: "Medium" },
              { q: "Implement and analyze Kruskal's & Prim's MST.", difficulty: "Hard" },
            ],
            books: [
              { title: "Introduction to Algorithms (CLRS)", author: "Cormen et al.", publisher: "MIT Press", type: "Paid" },
              { title: "Algorithms", author: "Jeff Erickson", publisher: "Open", type: "Free", source: "jeffe.cs.illinois.edu" },
              { title: "Algorithms (MIT OCW 6.006)", author: "MIT", publisher: "MIT OCW", type: "Free", source: "ocw.mit.edu" },
            ],
            resources: ["Algorithm notes", "DP problem set", "Project ideas (10)", "Previous-year paper"],
          },
        ],
      },
    ],
  },
  {
    code: "MBA",
    name: "Master of Business Administration (MBA)",
    universities: ["IIM Ahmedabad", "IIM Bangalore", "XLRI", "FMS Delhi", "SP Jain", "Symbiosis (SIBM)", "NMIMS"],
    semesters: [
      {
        name: "Semester 1",
        courses: [
          {
            code: "MBA-101", name: "Marketing Management", credits: 3,
            description: "Marketing concepts, STP, the 4 Ps, consumer behaviour, branding and digital marketing fundamentals.",
            assignments: [
              { q: "Prepare an STP analysis for a consumer brand of your choice.", difficulty: "Easy" },
              { q: "Build a marketing mix (4 Ps) plan for a new product launch.", difficulty: "Medium" },
              { q: "Design a 90-day digital marketing campaign with KPIs and budget.", difficulty: "Hard" },
            ],
            books: [
              { title: "Marketing Management", author: "Kotler & Keller", publisher: "Pearson", type: "Paid" },
              { title: "Principles of Marketing (OpenStax)", author: "OpenStax", publisher: "OpenStax", type: "Free", source: "openstax.org" },
            ],
            resources: ["Case studies (5)", "Lecture notes", "Sample marketing plan template"],
          },
          {
            code: "MBA-102", name: "Financial Accounting", credits: 3,
            description: "Accounting principles, journal & ledger, trial balance, final accounts, ratio analysis.",
            assignments: [
              { q: "Prepare journal entries and a trial balance from given transactions.", difficulty: "Easy" },
              { q: "Prepare final accounts (P&L + balance sheet) with adjustments.", difficulty: "Medium" },
              { q: "Perform ratio analysis and interpret a company's financial health.", difficulty: "Hard" },
            ],
            books: [
              { title: "Financial Accounting", author: "Narayanaswamy", publisher: "PHI", type: "Paid" },
              { title: "Principles of Accounting (OpenStax)", author: "OpenStax", publisher: "OpenStax", type: "Free", source: "openstax.org" },
            ],
            resources: ["Worked examples", "Practice problem set", "Previous-year paper"],
          },
        ],
      },
    ],
  },
  {
    code: "BBA",
    name: "Bachelor of Business Administration (BBA)",
    universities: ["Christ University", "Symbiosis", "Amity University", "NMIMS", "Delhi University", "LPU"],
    semesters: [
      {
        name: "Semester 1",
        courses: [
          {
            code: "BBA-101", name: "Principles of Management", credits: 3,
            description: "Functions of management — planning, organizing, staffing, leading and controlling; management thought.",
            assignments: [
              { q: "Explain the 14 principles of management with examples.", difficulty: "Easy" },
              { q: "Compare classical, behavioural and modern management theories.", difficulty: "Medium" },
              { q: "Analyze a real organization's structure and recommend improvements.", difficulty: "Hard" },
            ],
            books: [
              { title: "Principles of Management", author: "Koontz & Weihrich", publisher: "McGraw-Hill", type: "Paid" },
              { title: "Principles of Management (OpenStax)", author: "OpenStax", publisher: "OpenStax", type: "Free", source: "openstax.org" },
            ],
            resources: ["Lecture notes", "Case studies", "Previous-year paper (2024)"],
          },
        ],
      },
    ],
  },
];
