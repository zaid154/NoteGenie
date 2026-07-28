// FLOW: Sample academic dataset for the resource handbook PDF and seed source.
// Includes 6 Indian Universities (IGNOU, DU, JNU, AMU, BHU, JMI) and 5 realistic IGNOU degree programs.

export const HANDBOOK_META = {
  title: "Academic Resource Handbook",
  subtitle: "Programs · Universities · Courses · Assignments · Books & Learning Resources",
  org: "NoteGenie",
  edition: "Sample Edition v2",
};

export const UNIVERSITIES = [
  { name: "IGNOU", slug: "ignou", shortName: "IGNOU", description: "Indira Gandhi National Open University — India's largest distance learning university." },
  { name: "Delhi University (DU)", slug: "du", shortName: "DU", description: "University of Delhi — Premier central university with SOL and regular courses." },
  { name: "Jawaharlal Nehru University (JNU)", slug: "jnu", shortName: "JNU", description: "Jawaharlal Nehru University — Leading research & postgraduate university." },
  { name: "Aligarh Muslim University (AMU)", slug: "amu", shortName: "AMU", description: "Aligarh Muslim University — Central university with distance & regular learning." },
  { name: "Banaras Hindu University (BHU)", slug: "bhu", shortName: "BHU", description: "Banaras Hindu University — Historic central university in Varanasi." },
  { name: "Jamia Millia Islamia (JMI)", slug: "jmi", shortName: "JMI", description: "Jamia Millia Islamia — Central university with online & distance programs." },
];

export const ACADEMIC_PROGRAMS = [
  {
    code: "MBA",
    name: "Master of Business Administration (MBA)",
    universities: ["IGNOU", "Delhi University (DU)", "Jamia Millia Islamia (JMI)"],
    courses: [
      { code: "MMPC-001", name: "Management Functions and Organisational Processes", credits: 4, type: "Solved Assignment" },
      { code: "MMPC-002", name: "Human Resource Management", credits: 4, type: "Solved Assignment" },
      { code: "MMPC-003", name: "Business Environment", credits: 4, type: "Solved Assignment" },
      { code: "MMPC-004", name: "Accounting for Managers", credits: 4, type: "Solved Assignment" },
      { code: "MMPC-005", name: "Quantitative Analysis for Managerial Applications", credits: 4, type: "Solved Assignment" },
      { code: "MMPC-006", name: "Marketing Management", credits: 4, type: "Solved Assignment" },
      { code: "MMPC-007", name: "Business Communication", credits: 4, type: "Solved Assignment" },
    ],
  },
  {
    code: "BCA",
    name: "Bachelor of Computer Applications (BCA)",
    universities: ["IGNOU", "Delhi University (DU)", "Jamia Millia Islamia (JMI)"],
    courses: [
      { code: "BCS-011", name: "Computer Basics and PC Software", credits: 4, type: "Solved Assignment" },
      { code: "BCS-012", name: "Mathematics", credits: 4, type: "Solved Assignment" },
      { code: "MCS-011", name: "Problem Solving and Programming", credits: 4, type: "Solved Assignment" },
      { code: "BCS-031", name: "Programming in C++", credits: 4, type: "Solved Assignment" },
      { code: "BCS-040", name: "Statistical Techniques", credits: 4, type: "Solved Assignment" },
      { code: "MCS-012", name: "Computer Organisation and Assembly Language Programming", credits: 4, type: "Solved Assignment" },
      { code: "BCSL-013", name: "Computer Basics and PC Software Lab", credits: 2, type: "Lab Manual" },
    ],
  },
  {
    code: "MAH",
    name: "Master of Arts in History (MAH)",
    universities: ["IGNOU", "Delhi University (DU)", "Jawaharlal Nehru University (JNU)", "BHU"],
    courses: [
      { code: "MHI-01", name: "Ancient and Medieval Societies", credits: 8, type: "Solved Assignment" },
      { code: "MHI-02", name: "Modern World", credits: 8, type: "Solved Assignment" },
      { code: "MHI-03", name: "Historiography", credits: 8, type: "Solved Assignment" },
      { code: "MHI-04", name: "Political Structures in India", credits: 8, type: "Solved Assignment" },
      { code: "MHI-05", name: "History of Indian Economy", credits: 8, type: "Solved Assignment" },
      { code: "MHI-06", name: "Evolution of Social Structures in India", credits: 8, type: "Solved Assignment" },
    ],
  },
  {
    code: "BCOMG",
    name: "Bachelor of Commerce (B.Com)",
    universities: ["IGNOU", "Delhi University (DU)", "AMU", "BHU", "JMI"],
    courses: [
      { code: "BCOC-131", name: "Financial Accounting", credits: 6, type: "Solved Assignment" },
      { code: "BCOC-132", name: "Business Organisation and Management", credits: 6, type: "Solved Assignment" },
      { code: "BCOC-133", name: "Business Law", credits: 6, type: "Solved Assignment" },
      { code: "BCOC-134", name: "Business Mathematics and Statistics", credits: 6, type: "Solved Assignment" },
      { code: "BCOC-135", name: "Company Law", credits: 6, type: "Solved Assignment" },
      { code: "BCOC-136", name: "Income Tax Law and Practice", credits: 6, type: "Solved Assignment" },
    ],
  },
  {
    code: "MEG",
    name: "Master of Arts in English (MEG)",
    universities: ["IGNOU", "Delhi University (DU)", "JNU", "AMU"],
    courses: [
      { code: "MEG-01", name: "British Poetry", credits: 8, type: "Solved Assignment" },
      { code: "MEG-02", name: "British Drama", credits: 8, type: "Solved Assignment" },
      { code: "MEG-03", name: "British Novel", credits: 8, type: "Solved Assignment" },
      { code: "MEG-04", name: "Aspects of Language", credits: 8, type: "Solved Assignment" },
      { code: "MEG-05", name: "Literary Criticism & Theory", credits: 8, type: "Solved Assignment" },
    ],
  },
];
