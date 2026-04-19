const supabaseAdminScoreSheet = window.supabaseClient;

/* =====================================
   INIT
===================================== */
document.addEventListener("DOMContentLoaded", () => {
  loadClassesForScoreSheet();
  loadTermsForScoreSheet();

  document
    .getElementById("score-sheet-class")
    ?.addEventListener("change", loadSubjectsForSelectedClass);

  document
    .getElementById("load-score-sheet-btn")
    ?.addEventListener("click", loadScoreSheetData);

  document
    .getElementById("print-score-sheet-btn")
    ?.addEventListener("click", printScoreSheet);
});

/* =====================================
   HELPERS
===================================== */
function formatPosition(pos) {
  if (!pos) return "-";

  if (pos % 100 >= 11 && pos % 100 <= 13) return `${pos}TH`;
  if (pos % 10 === 1) return `${pos}ST`;
  if (pos % 10 === 2) return `${pos}ND`;
  if (pos % 10 === 3) return `${pos}RD`;
  return `${pos}TH`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* =====================================
   GET CURRENT ACADEMIC YEAR
===================================== */
async function getAcademicYear() {
  const { data, error } = await supabaseAdminScoreSheet
    .from("academic_years")
    .select("year_name")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error) {
    console.error("Academic Year Error:", error.message);
    return "N/A";
  }

  return data?.year_name || "N/A";
}

/* =====================================
   LOAD CLASSES
===================================== */
async function loadClassesForScoreSheet() {
  const select = document.getElementById("score-sheet-class");
  if (!select) return;

  const { data, error } = await supabaseAdminScoreSheet
    .from("classes")
    .select("id, class_name")
    .order("class_name", { ascending: true });

  if (error) {
    console.error(error.message);
    return;
  }

  select.innerHTML = `<option value="">Select Class</option>`;

  (data || []).forEach((cls) => {
    const option = document.createElement("option");
    option.value = cls.id;
    option.textContent = cls.class_name;
    select.appendChild(option);
  });

  const subjectSelect = document.getElementById("score-sheet-subject");
  if (subjectSelect) {
    subjectSelect.innerHTML = `<option value="">Select Subject</option>`;
  }
}

/* =====================================
   LOAD SUBJECTS FOR SELECTED CLASS
===================================== */
async function loadSubjectsForSelectedClass() {
  const classId = document.getElementById("score-sheet-class")?.value;
  const subjectSelect = document.getElementById("score-sheet-subject");

  if (!subjectSelect) return;

  subjectSelect.innerHTML = `<option value="">Loading subjects...</option>`;

  if (!classId) {
    subjectSelect.innerHTML = `<option value="">Select Subject</option>`;
    return;
  }

  const { data, error } = await supabaseAdminScoreSheet
    .from("teacher_subject_assignments")
    .select("subject")
    .eq("class_id", classId)
    .order("subject", { ascending: true });

  if (error) {
    console.error(error.message);
    subjectSelect.innerHTML = `<option value="">Error loading subjects</option>`;
    return;
  }

  const uniqueSubjects = [...new Set((data || []).map((s) => s.subject).filter(Boolean))];

  subjectSelect.innerHTML = `<option value="">Select Subject</option>`;

  uniqueSubjects.forEach((subject) => {
    const option = document.createElement("option");
    option.value = subject;
    option.textContent = subject;
    subjectSelect.appendChild(option);
  });
}

/* =====================================
   LOAD TERMS
===================================== */
async function loadTermsForScoreSheet() {
  const select = document.getElementById("score-sheet-term");
  if (!select) return;

  const { data, error } = await supabaseAdminScoreSheet
    .from("terms")
    .select("id, name")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error.message);
    return;
  }

  select.innerHTML = `<option value="">Select Term</option>`;

  (data || []).forEach((term) => {
    const option = document.createElement("option");
    option.value = term.id;
    option.textContent = term.name;
    select.appendChild(option);
  });
}

/* =====================================
   LOAD SCORE SHEET DATA
===================================== */
async function loadScoreSheetData() {
  const classId = document.getElementById("score-sheet-class")?.value;
  const subject = document.getElementById("score-sheet-subject")?.value;
  const termId = document.getElementById("score-sheet-term")?.value;

  if (!classId || !subject || !termId) {
    alert("Please select Class, Subject and Term");
    return;
  }

  const tbody = document.getElementById("score-sheet-table-body");
  const headerClassText = document.getElementById("score-sheet-class-text");
  const headerSubjectText = document.getElementById("score-sheet-subject-text");
  const headerTermText = document.getElementById("score-sheet-term-text");
  const summaryText = document.getElementById("score-sheet-summary");
  const teacherText = document.getElementById("score-sheet-teacher");
  const academicYearText = document.getElementById("score-sheet-academic-year");

  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="8">Loading score sheet...</td></tr>`;

  /* =====================================
     GET ACADEMIC YEAR
  ===================================== */
  const academicYear = await getAcademicYear();

  if (academicYearText) {
    academicYearText.textContent = `Academic Year: ${academicYear}`;
  }

  /* =====================================
     GET CLASS NAME
  ===================================== */
  const { data: classData } = await supabaseAdminScoreSheet
    .from("classes")
    .select("class_name")
    .eq("id", classId)
    .single();

  /* =====================================
     GET TERM NAME
  ===================================== */
  const { data: termData } = await supabaseAdminScoreSheet
    .from("terms")
    .select("name")
    .eq("id", termId)
    .single();

  if (headerClassText) {
    headerClassText.textContent =
      `Class - ${classData?.class_name || ""}  |        Subject: ${subject || ""} |      Term: ${termData?.name || ""}`;
  }
  // headerClass.textContent = ${classData?.class_name || ""};
  // headerSubject.textContent = ${subject || ""};
  // headerTermText.textContent = ${termData?.name};

  // if (headerSubjectText){
  //   headerSubjectText.textContent = ${subject};
  // }

  // if (headerClassText) {
  //   headerClassText.textContent =
  //     `Class - ${classData?.class_name || ""}`;
  // }

  

  

  /* =====================================
     GET TEACHER FROM ASSIGNMENTS TABLE
  ===================================== */
  let teacherName = "N/A";

  const { data: assignmentData, error: assignmentError } =
    await supabaseAdminScoreSheet
      .from("teacher_subject_assignments")
      .select(`
        teacher_id,
        teachers (surname, first_name)
      `)
      .eq("class_id", classId)
      .eq("subject", subject)
      .maybeSingle();

  if (assignmentError) {
    console.error("Teacher Assignment Error:", assignmentError.message);
  }

  if (assignmentData?.teachers) {
    teacherName = `${assignmentData.teachers.surname} ${assignmentData.teachers.first_name}`;
  }

  if (teacherText) {
    teacherText.textContent = `Teacher: ${teacherName}`;
  }

  /* =====================================
     LOAD MARKS
  ===================================== */
  const { data, error } = await supabaseAdminScoreSheet
    .from("student_marks")
    .select(`
      id,
      student_id,
      class_score,
      exam_score,
      marks,
      grade,
      remark,
      students (
        surname,
        first_name
      )
    `)
    .eq("class_id", classId)
    .eq("subject", subject)
    .eq("term_id", termId)
    .order("marks", { ascending: false });

  if (error) {
    console.error(error.message);
    tbody.innerHTML = `<tr><td colspan="8">Error loading score sheet</td></tr>`;
    return;
  }

  if (!data || data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8">No marks found for this term</td></tr>`;
    return;
  }

  /* =====================================
     SUMMARY
  ===================================== */
  const totals = data.map((d) => Number(d.marks || 0));
  const highest = Math.max(...totals);
  const lowest = Math.min(...totals);
  const sum = totals.reduce((a, b) => a + b, 0);
  const average = (sum / totals.length).toFixed(2);

  if (summaryText) {
    summaryText.innerHTML = `
      <strong>Total Students:</strong> ${totals.length} |
      <strong>Average:</strong> ${average} |
      <strong>Highest:</strong> ${highest} |
      <strong>Lowest:</strong> ${lowest}
    `;
  }

  /* =====================================
     RANKING WITH TIES
  ===================================== */
  tbody.innerHTML = "";

  let lastScore = null;
  let position = 0;

  data.forEach((row, index) => {
    const score = Number(row.marks || 0);

    if (score !== lastScore) {
      position = index + 1;
      lastScore = score;
    }

    const fullName =
      `${row.students?.surname || ""} ${row.students?.first_name || ""}`.trim();

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${index + 1}</td>
      <td>${escapeHtml(fullName)}</td>
      <td>${row.class_score ?? 0}</td>
      <td>${row.exam_score ?? 0}</td>
      <td>${row.marks ?? 0}</td>
      <td>${formatPosition(position)}</td>
      <td>${escapeHtml(row.grade || "-")}</td>
      <td>${escapeHtml(row.remark || "-")}</td>
    `;

    tbody.appendChild(tr);
  });

  const container = document.querySelector(".score-sheet-container");
  if (container) {
    container.style.display = "block";
  }
}

/* =====================================
   PRINT SCORE SHEET (A4)
===================================== */
function printScoreSheet() {
  const printArea = document.getElementById("score-sheet-print-area");

  if (!printArea || !printArea.innerHTML.trim()) {
    alert("No score sheet loaded to print.");
    return;
  }

  const printWindow = window.open("", "_blank", "width=1000,height=800");

  if (!printWindow) {
    alert("Unable to open print window.");
    return;
  }

  printWindow.document.open();
  printWindow.document.write(`
    <html>
      <head>
        <title>Score Sheet</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            color: #000;
            padding: 12px;
            margin: 0;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .score-sheet-container,
          #score-sheet-print-area {
            width: 100%;
          }

          h1, h2, h3, h4, h5, p {
            margin: 4px 0;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 12px;
          }

          th, td {
            border: 1px solid #000;
            padding: 6px;
            font-size: 12px;
            text-align: left;
          }

          th {
            background: #f2f2f2;
          }

          .text-center {
            text-align: center;
          }

          .text-right {
            text-align: right;
          }

          .scoresheet-hearders{
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-block: .8rem;
    gap: .5rem;
}

    .flex-scoresheet{
    display: flex;
    align-items: center;
    gap:  0 1.5rem;
}
.flex-scoresheet p{
    font-family: poppins;
    color: #000;
}

          @page {
            size: A4 portrait;
            margin: 10mm;
          }
        </style>
      </head>
      <body>
        ${printArea.innerHTML}
      </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();

  setTimeout(() => {
    printWindow.print();
  }, 400);
}