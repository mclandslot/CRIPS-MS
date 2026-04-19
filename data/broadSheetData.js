const supabaseAdminBroadsheet = window.supabaseClient;

/* =====================================
   GLOBAL STATE
===================================== */
const broadMessage = document.getElementById("form-feedback");
let broadsheetSubjects = [];
let broadsheetRows = [];
let broadsheetMeta = {
  className: "",
  termName: "",
  academicYear: ""
};

/* =====================================
   INIT
===================================== */
document.addEventListener("DOMContentLoaded", () => {
  loadClassesForBroadsheet();
  loadTermsForBroadsheet();

  document
    .getElementById("load-broadsheet-btn")
    ?.addEventListener("click", loadBroadsheetData);

  document
    .getElementById("print-broadsheet-btn")
    ?.addEventListener("click", printBroadsheet);
});

/* =====================================
   HELPERS
===================================== */
function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatPosition(num) {
  if (!num) return "-";

  const j = num % 10;
  const k = num % 100;

  if (j === 1 && k !== 11) return `${num}st`;
  if (j === 2 && k !== 12) return `${num}nd`;
  if (j === 3 && k !== 13) return `${num}rd`;
  return `${num}th`;
}

/* =====================================
   LOAD CLASSES
===================================== */
async function loadClassesForBroadsheet() {
  const select = document.getElementById("broadsheet-class");
  if (!select) return;

  select.innerHTML = `<option value="">Loading classes...</option>`;

  const { data, error } = await supabaseAdminBroadsheet
    .from("classes")
    .select("id, class_name")
    .order("class_name", { ascending: true });

  if (error) {
    console.error("Error loading classes:", error.message);
    select.innerHTML = `<option value="">Failed to load classes</option>`;
    return;
  }

  select.innerHTML = `<option value="">Select Class</option>`;

  (data || []).forEach((cls) => {
    const option = document.createElement("option");
    option.value = cls.id;
    option.textContent = cls.class_name || "Unnamed Class";
    select.appendChild(option);
  });
}

/* =====================================
   LOAD TERMS
===================================== */
async function loadTermsForBroadsheet() {
  const select = document.getElementById("broadsheet-term");
  if (!select) return;

  select.innerHTML = `<option value="">Loading terms...</option>`;

  try {
    const { data: termsData, error: termsError } =
      await supabaseAdminBroadsheet
        .from("terms")
        .select("id, name, academic_year_id, created_at")
        .order("created_at", { ascending: false });

    if (termsError) {
      console.error("Error loading terms:", termsError.message);
      select.innerHTML = `<option value="">Failed to load terms</option>`;
      return;
    }

    const academicYearIds = [
      ...new Set(
        (termsData || [])
          .map((item) => item.academic_year_id)
          .filter(Boolean)
      )
    ];

    let academicYearsMap = new Map();

    if (academicYearIds.length > 0) {
      const { data: yearRows, error: yearError } =
        await supabaseAdminBroadsheet
          .from("academic_years")
          .select("id, year_name")
          .in("id", academicYearIds);

      if (yearError) {
        console.error("Error loading academic years:", yearError.message);
      } else {
        academicYearsMap = new Map(
          (yearRows || []).map((row) => [row.id, row.year_name || ""])
        );
      }
    }

    select.innerHTML = `<option value="">Select Term</option>`;

    (termsData || []).forEach((termRow) => {
      const academicYearName =
        academicYearsMap.get(termRow.academic_year_id) || "";

      const option = document.createElement("option");
      option.value = termRow.id;
      option.textContent = academicYearName
        ? `${termRow.name} - ${academicYearName}`
        : (termRow.name || "Unnamed Term");

      option.dataset.termName = termRow.name || "";
      option.dataset.academicYear = academicYearName || "";
      select.appendChild(option);
    });
  } catch (err) {
    console.error("Unexpected error loading terms:", err);
    select.innerHTML = `<option value="">Failed to load terms</option>`;
  }
}

/* =====================================
   LOAD BROADSHEET DATA
===================================== */
async function loadBroadsheetData() {
  const classSelect = document.getElementById("broadsheet-class");
  const termSelect = document.getElementById("broadsheet-term");
  const tableHead = document.getElementById("broadsheet-table-head");
  const tableBody = document.getElementById("broadsheet-table-body");

  if (!classSelect || !termSelect || !tableHead || !tableBody) return;

  const classId = classSelect.value;
  const termId = termSelect.value;

  if (!classId || !termId) {
    // alert("Please select class and term.");
      broadMessage.classList.add("show-message", "error");
   broadMessage.innerHTML = "Please select class and term";
    setTimeout(()=>{
      broadMessage.classList.remove("show-message", "error");
    }, 4000);
    return;
  }

  const selectedTermOption = termSelect.options[termSelect.selectedIndex];

  broadsheetMeta = {
    className:
      classSelect.options[classSelect.selectedIndex]?.textContent || "-",
    termName: selectedTermOption?.dataset.termName || "-",
    academicYear: selectedTermOption?.dataset.academicYear || "-"
  };

  updateBroadsheetHeader();

  tableHead.innerHTML = "";
  tableBody.innerHTML = `<tr><td colspan="100%">Loading broadsheet...</td></tr>`;

  try {
    const { data: students, error: studentsError } =
      await supabaseAdminBroadsheet
        .from("students")
        .select("id, surname, first_name, class_id")
        .eq("class_id", classId)
        .order("surname", { ascending: true })
        .order("first_name", { ascending: true });

    if (studentsError) {
      console.error("Error loading students:", studentsError.message);
      tableBody.innerHTML = `<tr><td colspan="100%">Failed to load students</td></tr>`;
      return;
    }

    const { data: assignmentRows, error: assignmentsError } =
      await supabaseAdminBroadsheet
        .from("teacher_subject_assignments")
        .select("id, class_id, subject")
        .eq("class_id", classId)
        .order("subject", { ascending: true });

    if (assignmentsError) {
      console.error("Error loading subject assignments:", assignmentsError.message);
      tableBody.innerHTML = `<tr><td colspan="100%">Failed to load subject assignments</td></tr>`;
      return;
    }

    const subjectMap = new Map();

    (assignmentRows || []).forEach((row) => {
      const rawSubject = String(row.subject || "").trim();
      if (!rawSubject) return;

      const key = normalizeText(rawSubject);

      if (!subjectMap.has(key)) {
        subjectMap.set(key, {
          id: key,
          key,
          name: rawSubject
        });
      }
    });

    const { data: marks, error: marksError } =
      await supabaseAdminBroadsheet
        .from("student_marks")
        .select(`
          id,
          student_id,
          class_id,
          subject,
          teacher_id,
          term_id,
          marks,
          class_score,
          exam_score,
          grade,
          remark
        `)
        .eq("class_id", classId)
        .eq("term_id", termId);

    if (marksError) {
      console.error("Error loading marks:", marksError.message);
      tableBody.innerHTML = `<tr><td colspan="100%">Failed to load marks</td></tr>`;
      return;
    }

    (marks || []).forEach((mark) => {
      const rawSubject = String(mark.subject || "").trim();
      if (!rawSubject) return;

      const key = normalizeText(rawSubject);

      if (!subjectMap.has(key)) {
        subjectMap.set(key, {
          id: key,
          key,
          name: rawSubject
        });
      }
    });

    broadsheetSubjects = [...subjectMap.values()].sort((a, b) =>
      a.name.localeCompare(b.name)
    );

    const marksMap = new Map();

    (marks || []).forEach((mark) => {
      const subjectKey = normalizeText(mark.subject);
      const key = `${mark.student_id}__${subjectKey}`;

      marksMap.set(key, {
        marks:
          mark.marks !== null &&
          mark.marks !== undefined &&
          mark.marks !== ""
            ? Number(mark.marks)
            : null
      });
    });

    broadsheetRows = (students || []).map((student) => {
      const fullName =
        `${student.surname || ""} ${student.first_name || ""}`.trim() || "-";

      const row = {
        student_id: student.id,
        student_name: fullName,
        subjectScores: {},
        total: 0,
        position: "-"
      };

      broadsheetSubjects.forEach((subject) => {
        const key = `${student.id}__${subject.key}`;
        const markRecord = marksMap.get(key);

        const score =
          markRecord?.marks !== null &&
          markRecord?.marks !== undefined &&
          markRecord?.marks !== ""
            ? Number(markRecord.marks)
            : null;

        row.subjectScores[subject.id] = score;

        if (score !== null && !Number.isNaN(score)) {
          row.total += score;
        }
      });

      return row;
    });

    broadsheetRows.sort((a, b) => {
      if (b.total !== a.total) return b.total - a.total;
      return a.student_name.localeCompare(b.student_name);
    });

    let currentPosition = 0;
    let lastTotal = null;

    broadsheetRows.forEach((row, index) => {
      if (row.total !== lastTotal) {
        currentPosition = index + 1;
      }
      row.position = currentPosition;
      lastTotal = row.total;
    });

    renderBroadsheetTable();
  } catch (err) {
    console.error("Unexpected broadsheet error:", err);
    tableBody.innerHTML = `<tr><td colspan="100%">Unexpected error occurred</td></tr>`;
  }
}

/* =====================================
   RENDER TABLE
===================================== */
function renderBroadsheetTable() {
  const tableHead = document.getElementById("broadsheet-table-head");
  const tableBody = document.getElementById("broadsheet-table-body");

  if (!tableHead || !tableBody) return;

  let headHtml = `
    <tr>
      <th>No.</th>
      <th class="student-name-col">Student Name</th>
  `;

  broadsheetSubjects.forEach((subject) => {
    headHtml += `<th>${escapeHtml(subject.name)}</th>`;
  });

  headHtml += `
      <th>Overall Total</th>
      <th>Position</th>
    </tr>
  `;

  tableHead.innerHTML = headHtml;

  if (!broadsheetRows.length) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="${broadsheetSubjects.length + 4}">
          No broadsheet data found
        </td>
      </tr>
    `;
    return;
  }

  tableBody.innerHTML = "";

  broadsheetRows.forEach((row, index) => {
    let html = `
      <tr>
        <td>${index + 1}</td>
        <td class="student-name-cell">${escapeHtml(row.student_name)}</td>
    `;

    broadsheetSubjects.forEach((subject) => {
      const score = row.subjectScores[subject.id];
      html += `<td>${score !== null && score !== undefined ? score : "-"}</td>`;
    });

    html += `
        <td><strong>${row.total}</strong></td>
        <td><strong>${formatPosition(row.position)}</strong></td>
      </tr>
    `;

    tableBody.innerHTML += html;
  });
}

/* =====================================
   UPDATE HEADER
===================================== */
function updateBroadsheetHeader() {
  const classEl = document.getElementById("broadsheet-display-class");
  const termEl = document.getElementById("broadsheet-display-term");
  const yearEl = document.getElementById("broadsheet-display-academic-year");

  if (classEl) classEl.textContent = broadsheetMeta.className || "-";
  if (termEl) termEl.textContent = broadsheetMeta.termName || "-";
  if (yearEl) yearEl.textContent = broadsheetMeta.academicYear || "-";
}

/* =====================================
   PRINT
===================================== */
// function printBroadsheet() {
//   updateBroadsheetHeader();
//   window.print();
// }

/* =====================================
   PRINT BROADSHEET (A4 LANDSCAPE)
===================================== */
function printBroadsheet() {
  const table = document.querySelector(".broadsheet-table-wrapper");

  if (!table || !table.innerHTML.trim()) {
    // alert("No broadsheet loaded to print.");
        broadMessage.classList.add("show-message", "error");
   broadMessage.innerHTML = "No broadsheet loaded to print";
    setTimeout(()=>{
      broadMessage.classList.remove("show-message", "error");
    }, 4000);
    return;
  }

  // Capture header values
  const className = broadsheetMeta.className || "-";
  const termName = broadsheetMeta.termName || "-";
  const academicYear = broadsheetMeta.academicYear || "-";

  const printWindow = window.open("", "_blank", "width=1400,height=900");

  if (!printWindow) {
    alert("Unable to open print window.");
    return;
  }

  printWindow.document.open();
  printWindow.document.write(`
    <html>
      <head>
        <title>Broadsheet</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 15px;
            color: #000;
          }

          h2, h3, h4 {
            margin: 4px 0;
            text-align: center;
          }

          .header-box {
            text-align: center;
            margin-bottom: 15px;
          }

          .meta-info {
            display: flex;
            justify-content: space-between;
            margin: 10px 0 15px;
            font-size: 14px;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            table-layout: auto;
          }

          th, td {
            border: 1px solid #000;
            padding: 4px;
            font-size: 11px;
            text-align: center;
            white-space: nowrap;
          }

          th {
            background-color: #f2f2f2;
          }

          .student-name-cell {
            text-align: left;
          }

          /* FORCE LANDSCAPE */
          @page {
            size: A4 landscape;
            margin: 10mm;
          }

          /* PRINT COLORS */
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        </style>
      </head>

      <body>

        <div class="header-box">
          <h2>MINISTRY OF EDUCATION</h2>
          <h3>CRIG PRIMARY SCHOOL</h3>
          <h4>CLASS BROADSHEET</h4>
        </div>

        <div class="meta-info">
          <div><strong>Class:</strong> ${className}</div>
          <div><strong>Term:</strong> ${termName}</div>
          <div><strong>Academic Year:</strong> ${academicYear}</div>
        </div>

        ${table.outerHTML}

      </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();

  // Wait before printing (important for rendering)
  setTimeout(() => {
    printWindow.print();
  }, 500);
}