const supabaseAttendanceView = window.supabaseClient;

/* =====================================
   GLOBAL STATE
===================================== */
let selectedAttendanceClassId = "";
let selectedAttendanceClassName = "";
let selectedAttendanceTermId = "";
let selectedAttendanceTermName = "";
let selectedAttendanceAcademicYearId = "";
let selectedAttendanceAcademicYearName = "";
let selectedAttendanceRows = [];

const attendMessage = document.getElementById("form-feedback");

/* =====================================
   INIT
===================================== */
document.addEventListener("DOMContentLoaded", async () => {
  await loadAcademicYearsForAttendanceView();
  bindAttendanceViewEvents();
});

/* =====================================
   EVENTS
===================================== */
function bindAttendanceViewEvents() {
  document
    .getElementById("select-academic-year-view-attendance")
    ?.addEventListener("change", async () => {
      await loadTermsForAttendanceView();
    });

  document
    .getElementById("attendance-view-btn")
    ?.addEventListener("click", async (e) => {
      e.preventDefault();
      await loadAttendanceReport();
    });

  document
    .getElementById("print-attendance")
    ?.addEventListener("click", (e) => {
      e.preventDefault();
      printAttendanceReport();
    });
}

/* =====================================
   LOAD ACADEMIC YEARS
===================================== */
async function loadAcademicYearsForAttendanceView() {
  const select = document.getElementById("select-academic-year-view-attendance");
  if (!select) return;

  select.innerHTML = `<option value="">Loading year...</option>`;

  const { data, error } = await supabaseAttendanceView
    .from("academic_years")
    .select("id, year_name, is_active, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error loading academic years:", error.message);
    select.innerHTML = `<option value="">Failed to load year</option>`;
    return;
  }

  select.innerHTML = `<option value="">Select year</option>`;

  (data || []).forEach((year) => {
    const option = document.createElement("option");
    option.value = year.id;
    option.textContent = year.year_name || "-";

    if (year.is_active) {
      option.selected = true;
    }

    select.appendChild(option);
  });

  if (select.value) {
    await loadTermsForAttendanceView();
  }
}

/* =====================================
   LOAD TERMS
===================================== */
async function loadTermsForAttendanceView() {
  const yearSelect = document.getElementById("select-academic-year-view-attendance");
  const termSelect = document.getElementById("select-term-view-attendance");

  if (!yearSelect || !termSelect) return;

  const academicYearId = yearSelect.value;

  termSelect.innerHTML = `<option value="">Loading term...</option>`;

  if (!academicYearId) {
    termSelect.innerHTML = `<option value="">Select term</option>`;
    return;
  }

  const { data, error } = await supabaseAttendanceView
    .from("terms")
    .select("id, name, academic_year_id, created_at")
    .eq("academic_year_id", academicYearId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error loading terms:", error.message);
    termSelect.innerHTML = `<option value="">Failed to load term</option>`;
    return;
  }

  termSelect.innerHTML = `<option value="">Select term</option>`;

  (data || []).forEach((term) => {
    const option = document.createElement("option");
    option.value = term.id;
    option.textContent = term.name || "-";
    termSelect.appendChild(option);
  });
}

/* =====================================
   LOAD ATTENDANCE REPORT
===================================== */
async function loadAttendanceReport() {
  const classSelect = document.getElementById("select-class-view-attendance");
  const termSelect = document.getElementById("select-term-view-attendance");
  const yearSelect = document.getElementById("select-academic-year-view-attendance");
  const tableBody = document.getElementById("load-student-class-attendace");

  if (!classSelect || !termSelect || !yearSelect || !tableBody) return;

  const selectedClassValue = classSelect.value || "";

  selectedAttendanceTermId = termSelect.value || "";
  selectedAttendanceTermName =
    termSelect.options[termSelect.selectedIndex]?.textContent?.trim() || "";
  selectedAttendanceAcademicYearId = yearSelect.value || "";
  selectedAttendanceAcademicYearName =
    yearSelect.options[yearSelect.selectedIndex]?.textContent?.trim() || "";

  if (!selectedClassValue) {
    // alert("Please select class.");
    attendMessage.classList.add("show-message", "error");
    attendMessage.innerHTML = "Please select class";
    setTimeout(()=>{
      attendMessage.classList.remove("show-message", "error");
    }, 4000);
    return;
  }

  if (!selectedAttendanceTermId) {
    // alert("Please select term.");
      attendMessage.classList.add("show-message", "error");
    attendMessage.innerHTML = "Please select term";
    setTimeout(()=>{
      attendMessage.classList.remove("show-message", "error");
    }, 4000);
    return;
  }

  if (!selectedAttendanceAcademicYearId) {
    // alert("Please select academic year.");
      attendMessage.classList.add("show-message", "error");
    attendMessage.innerHTML = "Please select academic year";
    setTimeout(()=>{
      attendMessage.classList.remove("show-message", "error");
    }, 4000);
    return;
  }

  tableBody.innerHTML = `<tr><td colspan="8">Loading attendance...</td></tr>`;

  try {
    /* -----------------------------
       1. GET CLASS ID FROM CLASS NAME
    ----------------------------- */
    const { data: classData, error: classError } = await supabaseAttendanceView
      .from("classes")
      .select("id, class_name")
      .eq("class_name", selectedClassValue)
      .maybeSingle();

    if (classError) throw classError;

    if (!classData) {
      selectedAttendanceRows = [];
      tableBody.innerHTML = `<tr><td colspan="8">Selected class was not found.</td></tr>`;
      updateAttendanceHeader([], selectedClassValue);
      return;
    }

    selectedAttendanceClassId = classData.id;
    selectedAttendanceClassName = classData.class_name || selectedClassValue;

    /* -----------------------------
       2. GET TOTAL DAYS FROM term_days
    ----------------------------- */
    let overallDays = 0;

    const { data: termDaysData, error: termDaysError } = await supabaseAttendanceView
      .from("term_days")
      .select("id, total_days, term_id, academic_year_id")
      .eq("term_id", selectedAttendanceTermId)
      .eq("academic_year_id", selectedAttendanceAcademicYearId)
      .limit(1);

    if (termDaysError) {
      console.error("Error loading term days:", termDaysError.message);
    }

    if (termDaysData?.length) {
      overallDays = Number(termDaysData[0].total_days || 0);
    }

    /* -----------------------------
       3. GET ACTIVE STUDENTS IN CLASS
    ----------------------------- */
    const { data: students, error: studentsError } = await supabaseAttendanceView
      .from("students")
      .select("id, surname, first_name, class_id, status")
      .eq("class_id", selectedAttendanceClassId)
      .eq("status", "Present")
      .order("surname", { ascending: true })
      .order("first_name", { ascending: true });

    if (studentsError) throw studentsError;

    if (!students || students.length === 0) {
      selectedAttendanceRows = [];
      tableBody.innerHTML = `<tr><td colspan="8">No students found in this class.</td></tr>`;
      updateAttendanceHeader([], selectedAttendanceClassName);
      return;
    }

    /* -----------------------------
       4. GET ATTENDANCE BY class_id + term_id + academic_year_id
    ----------------------------- */
    const { data: attendanceData, error: attendanceError } = await supabaseAttendanceView
      .from("attendance")
      .select("id, student_id, class_id, term_id, academic_year_id, date, status")
      .eq("class_id", selectedAttendanceClassId)
      .eq("term_id", selectedAttendanceTermId)
      .eq("academic_year_id", selectedAttendanceAcademicYearId);

    if (attendanceError) throw attendanceError;

    const attendanceRows = attendanceData || [];

    /* -----------------------------
       5. COUNT PRESENT / ABSENT
    ----------------------------- */
    const attendanceMap = new Map();

    attendanceRows.forEach((row) => {
      if (!attendanceMap.has(row.student_id)) {
        attendanceMap.set(row.student_id, {
          present: 0,
          absent: 0
        });
      }

      const current = attendanceMap.get(row.student_id);

      if (normalizeAttendanceText(row.status) === "present") {
        current.present += 1;
      } else if (normalizeAttendanceText(row.status) === "absent") {
        current.absent += 1;
      }
    });

    /* -----------------------------
       6. BUILD REPORT ROWS
    ----------------------------- */
    selectedAttendanceRows = students.map((student, index) => {
      const stats = attendanceMap.get(student.id) || { present: 0, absent: 0 };
      const fullName =
        `${student.surname || ""} ${student.first_name || ""}`.trim() || "-";

      return {
        no: index + 1,
        studentName: fullName,
        className: selectedAttendanceClassName,
        academicYear: selectedAttendanceAcademicYearName,
        termName: selectedAttendanceTermName,
        present: stats.present,
        absent: stats.absent,
        overallDays: overallDays
      };
    });

    renderAttendanceTable();
    updateAttendanceHeader(students, selectedAttendanceClassName);
  } catch (error) {
    console.error("Error loading attendance report:", error.message || error);
    selectedAttendanceRows = [];
    tableBody.innerHTML = `<tr><td colspan="8">Failed to load attendance.</td></tr>`;
    updateAttendanceHeader([], selectedClassValue || "");
  }
}

/* =====================================
   RENDER TABLE
===================================== */
function renderAttendanceTable() {
  const tableBody = document.getElementById("load-student-class-attendace");
  if (!tableBody) return;

  if (!selectedAttendanceRows.length) {
    tableBody.innerHTML = `<tr><td colspan="8">No attendance data found.</td></tr>`;
    return;
  }

  tableBody.innerHTML = selectedAttendanceRows
    .map((row) => {
      return `
        <tr>
          <td>${row.no}</td>
          <td>${escapeAttendanceHtml(row.studentName)}</td>
          <td>${escapeAttendanceHtml(row.className)}</td>
          <td>${escapeAttendanceHtml(row.academicYear)}</td>
          <td>${escapeAttendanceHtml(row.termName)}</td>
          <td>${row.present}</td>
          <td>${row.absent}</td>
          <td>${row.overallDays}</td>
        </tr>
      `;
    })
    .join("");
}

/* =====================================
   UPDATE HEADER
===================================== */
function updateAttendanceHeader(students = [], className = "") {
  const classTitle = document.querySelector(".class-seleted-name-for-attendance-view");
  const totalStudents = document.getElementById("total-student-view-class-attendance");
  const academicYearEl = document.getElementById("academic-year-attendance");
  const termNameEl = document.getElementById("term-view-attendance-name");
  const headingClassName = document.querySelector(".attend h3");

  if (classTitle) {
    classTitle.textContent = className ? `${className} Attendance Report` : "";
  }

  if (headingClassName) {
    headingClassName.textContent = className || "-";
  }

  if (totalStudents) {
    totalStudents.textContent = students.length || 0;
  }

  if (academicYearEl) {
    academicYearEl.textContent = selectedAttendanceAcademicYearName || "-";
  }

  if (termNameEl) {
    termNameEl.textContent = selectedAttendanceTermName || "-";
  }
}

/* =====================================
   PRINT
===================================== */
function printAttendanceReport() {
  const wrapper = document.querySelector(".attendance-print-wrapper");

  if (!wrapper || !wrapper.innerHTML.trim()) {
    // alert("No attendance report loaded to print.");
      attendMessage.classList.add("show-message", "error");
    attendMessage.innerHTML = "No attendance report loaded to print";
    setTimeout(()=>{
      attendMessage.classList.remove("show-message", "error");
    }, 4000);
    return;
  }

  if (!selectedAttendanceRows.length) {
    // alert("Please load attendance before printing.");
      attendMessage.classList.add("show-message", "error");
    attendMessage.innerHTML = "Please load attendance before printing";
    setTimeout(()=>{
      attendMessage.classList.remove("show-message", "error");
    }, 4000);
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
        <title>Attendance Report</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 24px;
            color: #000;
          }

          h2, h3, h4, p {
            margin: 0 0 8px 0;
          }

          .report-card-header-details,
          .show-class-name-print {
            margin-bottom: 20px;
          }

          .attend {
            margin-top: 10px;
          }

          table {
            width: 100%;
            border-collapse: collapse;
          }

          th, td {
            border: 1px solid #000;
            padding: 8px;
            text-align: left;
            font-size: 14px;
          }

          th {
            background: #f2f2f2;
          }

          .basic-details {
            display: none;
          }

          @media print {
            body {
              padding: 0;
            }
          }
        </style>
      </head>
      <body>
        ${wrapper.innerHTML}
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
function normalizeAttendanceText(value) {
  return String(value || "").trim().toLowerCase();
}

function escapeAttendanceHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}