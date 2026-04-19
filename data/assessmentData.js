const supabaseAssessmentSheet = window.supabaseClient;

/* =====================================
   GLOBAL STATE
===================================== */
let assessmentClasses = [];
let assessmentTerms = [];
let assessmentAssignments = [];
let assessmentAcademicYearText = "";

const assessFeedback = document.getElementById("form-feedback");

/* =====================================
   INIT
===================================== */
document.addEventListener("DOMContentLoaded", async () => {
  await initializeAssessmentSheetUI();
});

async function initializeAssessmentSheetUI() {
  await loadAssessmentSheetClasses();
  await loadAssessmentSheetTerms();

  document
    .getElementById("assessment-sheet-class")
    ?.addEventListener("change", loadAssessmentSubjectsForSelectedClass);

  document
    .getElementById("load-assessment-sheet-btn")
    ?.addEventListener("click", handleLoadAssessmentSheet);

  document
    .getElementById("print-assessemt-sheet-btn")
    ?.addEventListener("click", printAssessmentSheet);
}

/* =====================================
   HELPERS
===================================== */
function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function setAssessmentText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value || "-";
}

function getTeacherDisplayName(assignment) {
  const teacherObj =
    assignment?.teachers ||
    assignment?.teacher ||
    assignment?.teachers_data ||
    null;

  if (teacherObj) {
    const surname = teacherObj.surname || "";
    const firstName = teacherObj.first_name || "";
    const fullName = `${surname} ${firstName}`.trim();
    if (fullName) return fullName;
  }

  return assignment?.teacher_name || "-";
}

/* =====================================
   LOAD CLASSES
===================================== */
async function loadAssessmentSheetClasses() {
  const classSelect = document.getElementById("assessment-sheet-class");
  if (!classSelect) return;

  classSelect.innerHTML = `<option value="">Loading classes...</option>`;

  const { data, error } = await supabaseAssessmentSheet
    .from("classes")
    .select("id, class_name")
    .order("class_name", { ascending: true });

  if (error) {
    console.error("Error loading classes:", error.message);
    classSelect.innerHTML = `<option value="">Failed to load classes</option>`;
    return;
  }

  assessmentClasses = data || [];

  classSelect.innerHTML = `<option value="">Select class</option>`;

  assessmentClasses.forEach((cls) => {
    const option = document.createElement("option");
    option.value = cls.id;
    option.textContent = cls.class_name || "Unnamed Class";
    classSelect.appendChild(option);
  });
}

/* =====================================
   LOAD TERMS
===================================== */
async function loadAssessmentSheetTerms() {
  const termSelect = document.getElementById("assessment-sheet-term");
  if (!termSelect) return;

  termSelect.innerHTML = `<option value="">Loading terms...</option>`;

  const { data, error } = await supabaseAssessmentSheet
    .from("terms")
    .select(`
      id,
      name,
      academic_year_id,
      academic_years (
        id,
        year_name
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error loading terms:", error.message);
    termSelect.innerHTML = `<option value="">Failed to load terms</option>`;
    return;
  }

  assessmentTerms = data || [];

  termSelect.innerHTML = `<option value="">Select term</option>`;

  assessmentTerms.forEach((term) => {
    const option = document.createElement("option");
    option.value = term.id;
    option.textContent = term.name || "Unnamed Term";
    option.dataset.termName = term.name || "";
    option.dataset.academicYear =
      term.academic_years?.year_name || "";
    termSelect.appendChild(option);
  });
}

/* =====================================
   LOAD SUBJECTS FOR SELECTED CLASS
===================================== */
async function loadAssessmentSubjectsForSelectedClass() {
  const classSelect = document.getElementById("assessment-sheet-class");
  const subjectSelect = document.getElementById("assessment-sheet-subject");

  if (!classSelect || !subjectSelect) return;

  const classId = classSelect.value;

  subjectSelect.innerHTML = `<option value="">Loading subjects...</option>`;

  if (!classId) {
    subjectSelect.innerHTML = `<option value="">Select subject</option>`;
    return;
  }

  const { data, error } = await supabaseAssessmentSheet
    .from("teacher_subject_assignments")
    .select(`
      id,
      class_id,
      subject,
      teacher_id,
      teachers (
        surname,
        first_name
      )
    `)
    .eq("class_id", classId)
    .order("subject", { ascending: true });

  if (error) {
    console.error("Error loading assigned subjects:", error.message);
    subjectSelect.innerHTML = `<option value="">Failed to load subjects</option>`;
    return;
  }

  assessmentAssignments = data || [];

  const uniqueSubjectsMap = new Map();

  assessmentAssignments.forEach((item) => {
    const subjectName = String(item.subject || "").trim();
    if (!subjectName) return;

    const key = normalizeText(subjectName);
    if (!uniqueSubjectsMap.has(key)) {
      uniqueSubjectsMap.set(key, item);
    }
  });

  const uniqueSubjects = [...uniqueSubjectsMap.values()];

  subjectSelect.innerHTML = `<option value="">Select subject</option>`;

  uniqueSubjects.forEach((item) => {
    const option = document.createElement("option");
    option.value = item.subject;
    option.textContent = item.subject;
    subjectSelect.appendChild(option);
  });
}

/* =====================================
   LOAD ASSESSMENT SHEET
===================================== */
async function handleLoadAssessmentSheet() {
  const classSelect = document.getElementById("assessment-sheet-class");
  const subjectSelect = document.getElementById("assessment-sheet-subject");
  const termSelect = document.getElementById("assessment-sheet-term");
  const tableBody = document.getElementById("assessment-sheet-table-body");
  const container = document.querySelector(".assessement-sheet-container");

  if (!classSelect || !subjectSelect || !termSelect || !tableBody || !container) {
    return;
  }

  const classId = classSelect.value;
  const subjectName = subjectSelect.value;
  const termId = termSelect.value;

  if (!classId) {
    // alert("Please select a class.");
    assessFeedback.classList.add("show-message", "error");
    assessFeedback.innerHTML = "Please select a class";
    setTimeout(()=>{
         assessFeedback.classList.remove("show-message", "error");
    }, 3000);
    return;
  }

  if (!subjectName) {
     assessFeedback.classList.add("show-message", "error");
    assessFeedback.innerHTML = "Please select a subject";
    setTimeout(()=>{
         assessFeedback.classList.remove("show-message", "error");
    }, 3000);
    return;
  }

  if (!termId) {
      assessFeedback.classList.add("show-message", "error");
    assessFeedback.innerHTML = "Please select term";
    setTimeout(()=>{
         assessFeedback.classList.remove("show-message", "error");
    }, 3000);
    return;
  }

  tableBody.innerHTML = `
    <tr>
      <td colspan="10">Loading assessment sheet...</td>
    </tr>
  `;

  container.style.display = "block";

  const selectedClassText =
    classSelect.options[classSelect.selectedIndex]?.textContent?.trim() || "-";
  const selectedSubjectText =
    subjectSelect.options[subjectSelect.selectedIndex]?.textContent?.trim() || "-";
  const selectedTermOption = termSelect.options[termSelect.selectedIndex];
  const selectedTermText =
    selectedTermOption?.dataset?.termName ||
    selectedTermOption?.textContent?.trim() ||
    "-";

  assessmentAcademicYearText =
    selectedTermOption?.dataset?.academicYear || "-";

  const matchedAssignment = assessmentAssignments.find(
    (item) =>
      item.class_id === classId &&
      normalizeText(item.subject) === normalizeText(subjectName)
  );

  const teacherName = getTeacherDisplayName(matchedAssignment);

  setAssessmentText("assessment-sheet-teacher", teacherName);
  setAssessmentText("assessment-sheet-academic-year", assessmentAcademicYearText);
  setAssessmentText("assessment-sheet-term-text", selectedTermText);
  setAssessmentText("assement-sheet-class-text", selectedClassText);
  setAssessmentText("assement-sheet-subject-text", selectedSubjectText);

  const { data: students, error: studentsError } = await supabaseAssessmentSheet
    .from("students")
    .select("id, surname, first_name")
    .eq("class_id", classId)
    .order("surname", { ascending: true })
    .order("first_name", { ascending: true });

  if (studentsError) {
    console.error("Error loading students:", studentsError.message);
    tableBody.innerHTML = `
      <tr>
        <td colspan="10">Failed to load students.</td>
      </tr>
    `;
    return;
  }

  const sortedStudents = [...(students || [])].sort((a, b) => {
    const nameA = `${a.surname || ""} ${a.first_name || ""}`.trim();
    const nameB = `${b.surname || ""} ${b.first_name || ""}`.trim();
    return nameA.localeCompare(nameB);
  });

  if (!sortedStudents.length) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="10">No students found in the selected class.</td>
      </tr>
    `;
    return;
  }

  tableBody.innerHTML = sortedStudents
    .map((student, index) => {
      const fullName =
        `${student.surname || ""} ${student.first_name || ""}`.trim() || "-";

      return `
        <tr>
          <td>${index + 1}</td>
          <td class="left-text">${escapeHtml(fullName)}</td>
          <td></td>
          <td></td>
          <td></td>
          <td></td>
          <td></td>
          <td></td>
          <td></td>
          <td></td>
        </tr>
      `;
    })
    .join("");
}

/* =====================================
   PRINT
===================================== */
function printAssessmentSheet() {
  const printArea = document.getElementById("assessement-sheet-print-area");
  if (!printArea) return;

  const printWindow = window.open("", "_blank", "width=1200,height=800");
  if (!printWindow) {
    alert("Pop-up blocked. Please allow pop-ups to print.");
    return;
  }

  printWindow.document.open();
  printWindow.document.write(`
    <html>
      <head>
        <title>Assessment Sheet</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 20px;
            color: #000;
          }

          .scoresheet-hearders {
            text-align: center;
             justify-content: center;
            margin-bottom: 16px;
          }

          .scoresheet-hearders h3,
          .scoresheet-hearders h4,
          .scoresheet-hearders p {
            margin: 4px 0;
          }

        //   .flex-scoresheet {
        //     display: flex;
        //     justify-content: space-between;
        //     gap: 12px;
        //     flex-wrap: wrap;
        //     margin-top: 10px;
        //   }

        .flex-assessements{
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 3.5rem;
}

          .score-sheet-table-content {
            width: 100%;
            border-collapse: collapse;
            margin-top: 16px;
          }

          .score-sheet-table-content th,
          .score-sheet-table-content td {
            border: 1px solid #000;
            padding: 8px;
            font-size: 12px;
            text-align: center;
          }

          .score-sheet-table-content th {
            background: #f3f3f3;
          }

          .left-text {
            text-align: left !important;
          }

          @media print {
            body {
              margin: 0;
              padding: 10px;
            }
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
    printWindow.close();
  }, 500);
}