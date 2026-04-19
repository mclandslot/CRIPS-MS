const supabaseHeadScoreSheet = window.supabaseClient;
const feedShow = document.getElementById("form-feedback");

/* =====================================
   INIT
===================================== */
document.addEventListener("DOMContentLoaded", async () => {
  await loadHeadScoreSheetClasses();
  await loadHeadScoreSheetYears();

  document
    .getElementById("head-score-sheet-year")
    ?.addEventListener("change", loadHeadScoreSheetTerms);

  document
    .getElementById("head-load-score-sheet-btn")
    ?.addEventListener("click", loadHeadScoreSheet);

  document
    .getElementById("head-print-score-sheet-btn")
    ?.addEventListener("click", printHeadScoreSheet);
});

/* =====================================
   LOAD CLASSES
===================================== */
async function loadHeadScoreSheetClasses() {
  const select = document.getElementById("head-score-sheet-class");
  if (!select) return;

  const { data, error } = await supabaseHeadScoreSheet
    .from("classes")
    .select("id, class_name")
    .order("class_name", { ascending: true });

  if (error) {
    console.error("Error loading classes:", error.message);
    return;
  }

  select.innerHTML = `<option value="">Select Class</option>`;

  (data || []).forEach((cls) => {
    const option = document.createElement("option");
    option.value = cls.id;
    option.textContent = cls.class_name;
    select.appendChild(option);
  });
}

/* =====================================
   LOAD ACADEMIC YEARS
===================================== */
async function loadHeadScoreSheetYears() {
  const select = document.getElementById("head-score-sheet-year");
  if (!select) return;

  const { data, error } = await supabaseHeadScoreSheet
    .from("academic_years")
    .select("id, year_name, is_active")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error loading academic years:", error.message);
    return;
  }

  select.innerHTML = `<option value="">Select Academic Year</option>`;

  (data || []).forEach((year) => {
    const option = document.createElement("option");
    option.value = year.id;
    option.textContent = year.year_name;

    if (year.is_active) option.selected = true;

    select.appendChild(option);
  });

  await loadHeadScoreSheetTerms();
}

/* =====================================
   LOAD TERMS
===================================== */
async function loadHeadScoreSheetTerms() {
  const yearId = document.getElementById("head-score-sheet-year")?.value;
  const termSelect = document.getElementById("head-score-sheet-term");

  if (!termSelect) return;

  termSelect.innerHTML = `<option value="">Select Term</option>`;

  if (!yearId) return;

  const { data, error } = await supabaseHeadScoreSheet
    .from("terms")
    .select("id, name")
    .eq("academic_year_id", yearId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error loading terms:", error.message);
    return;
  }

  (data || []).forEach((term) => {
    const option = document.createElement("option");
    option.value = term.id;
    option.textContent = term.name;
    termSelect.appendChild(option);
  });
}

/* =====================================
   LOAD SCORE SHEET
===================================== */
async function loadHeadScoreSheet() {
  const classId = document.getElementById("head-score-sheet-class")?.value;
  const yearId = document.getElementById("head-score-sheet-year")?.value;
  const termId = document.getElementById("head-score-sheet-term")?.value;

  if (!classId || !yearId || !termId) {
    // alert("Select class, academic year and term");
    feedShow.classList.add("show-message", "error");
    feedShow.innerHTML = "Select class, year & term";
    setTimeout(()=>{
      feedShow.classList.remove("show-message", "error");
    },4000);
    return;
  }

  const container = document.getElementById("head-score-sheet-container");
  if (!container) {
    console.error("Score sheet container not found");
    return;
  }

  container.innerHTML = `<p>Loading score sheet...</p>`;

  const [{ data: classData }, { data: yearData }, { data: termData }] = await Promise.all([
    supabaseHeadScoreSheet
      .from("classes")
      .select("id, class_name")
      .eq("id", classId)
      .maybeSingle(),
    supabaseHeadScoreSheet
      .from("academic_years")
      .select("id, year_name")
      .eq("id", yearId)
      .maybeSingle(),
    supabaseHeadScoreSheet
      .from("terms")
      .select("id, name")
      .eq("id", termId)
      .maybeSingle()
  ]);

  const { data: students, error: studentsError } = await supabaseHeadScoreSheet
    .from("students")
    .select("id, surname, first_name")
    .eq("class_id", classId)
    .neq("status", "completed")
    .order("surname", { ascending: true });

  if (studentsError) {
    console.error("Error loading students:", studentsError.message);
    container.innerHTML = `<p>Failed to load students.</p>`;
    return;
  }

  const { data: marks, error: marksError } = await supabaseHeadScoreSheet
    .from("student_marks")
    .select("student_id, subject, marks")
    .eq("class_id", classId)
    .eq("term_id", termId);

  if (marksError) {
    console.error("Error loading marks:", marksError.message);
    container.innerHTML = `<p>Failed to load score sheet.</p>`;
    return;
  }

  if (!students || students.length === 0) {
    container.innerHTML = `<p>No students found.</p>`;
    return;
  }

  const subjects = [...new Set((marks || []).map((m) => m.subject).filter(Boolean))].sort();

  const rows = students.map((student) => {
    const studentMarks = (marks || []).filter((m) => m.student_id === student.id);
    const total = studentMarks.reduce((sum, m) => sum + Number(m.marks || 0), 0);
    const average = studentMarks.length ? (total / studentMarks.length).toFixed(2) : "0.00";

    return {
      student,
      studentMarks,
      total,
      average,
      position: "-"
    };
  });

  rows.sort((a, b) => b.total - a.total);

  let lastTotal = null;
  let currentPosition = 0;

  rows.forEach((row, index) => {
    if (row.total !== lastTotal) {
      currentPosition = index + 1;
      lastTotal = row.total;
    }
    row.position = formatPosition(currentPosition);
  });

  const totals = rows.map((r) => r.total);
  const classAverage = totals.length
    ? (totals.reduce((a, b) => a + b, 0) / totals.length).toFixed(2)
    : "0.00";
  const highestTotal = totals.length ? Math.max(...totals) : 0;
  const lowestTotal = totals.length ? Math.min(...totals) : 0;

  const headerSubjects = subjects.map((s) => `<th>${escapeHtml(s)}</th>`).join("");

  const bodyRows = rows.map((row, index) => {
    const name = `${row.student.surname || ""} ${row.student.first_name || ""}`.trim();

    const subjectCells = subjects.map((subject) => {
      const found = row.studentMarks.find((m) => m.subject === subject);
      return `<td>${found?.marks ?? "-"}</td>`;
    }).join("");

    return `
      <tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(name)}</td>
        ${subjectCells}
        <td>${row.total}</td>
        <td>${row.average}</td>
        <td>${row.position}</td>
      </tr>
    `;
  }).join("");

  container.innerHTML = `
    <div class="head-score-sheet-print-area">
      <div style="margin-bottom: 16px;">
        <h2 style="margin-bottom: 8px;">Class Score Sheet</h2>
        <p><strong>Class:</strong> ${escapeHtml(classData?.class_name || "-")}</p>
        <p><strong>Academic Year:</strong> ${escapeHtml(yearData?.year_name || "-")}</p>
        <p><strong>Term:</strong> ${escapeHtml(termData?.name || "-")}</p>
      </div>

      <div style="display:flex; gap:20px; flex-wrap:wrap; margin-bottom:16px;">
        <p><strong>Total Students:</strong> ${rows.length}</p>
        <p><strong>Class Average:</strong> ${classAverage}</p>
        <p><strong>Highest Total:</strong> ${highestTotal}</p>
        <p><strong>Lowest Total:</strong> ${lowestTotal}</p>
      </div>

      <table class="student-details-table">
        <thead>
          <tr>
            <th>No.</th>
            <th>Student</th>
            ${headerSubjects}
            <th>Total</th>
            <th>Average</th>
            <th>Position</th>
          </tr>
        </thead>
        <tbody>
          ${bodyRows || `<tr><td colspan="${subjects.length + 5}">No score sheet data found.</td></tr>`}
        </tbody>
      </table>
    </div>
  `;
}

/* =====================================
   PRINT SCORE SHEET
===================================== */
function printHeadScoreSheet() {
  const container = document.getElementById("head-score-sheet-container");

  if (!container || !container.innerHTML.trim()) {
    // alert("No score sheet loaded to print.");
       feedShow.classList.add("show-message", "error");
    feedShow.innerHTML = "No broadsheet loaded to print";
    setTimeout(()=>{
      feedShow.classList.remove("show-message", "error");
    },4000);
    return;
  }

  const printWindow = window.open("", "_blank", "width=1200,height=900");
  if (!printWindow) {
    alert("Unable to open print window.");
    return;
  }

  printWindow.document.open();
  printWindow.document.write(`
    <html>
      <head>
        <title>Head Teacher Score Sheet</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 20px;
            color: #000;
          }
          h2, p {
            margin: 0 0 8px 0;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 12px;
          }
          th, td {
            border: 1px solid #000;
            padding: 6px;
            text-align: left;
            font-size: 12px;
          }
          th {
            background: #f2f2f2;
          }
        </style>
      </head>
      <body>
        ${container.innerHTML}
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}

/* =====================================
   HELPERS
===================================== */
function formatPosition(pos) {
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