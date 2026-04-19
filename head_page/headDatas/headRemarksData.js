const supabaseHeadTeacherRemarks = window.supabaseClient;

/* =====================================
   GLOBAL STATE
===================================== */
let selectedRemarkStudentId = null;
let selectedRemarkClassId = "";
let selectedRemarkTermId = "";
let selectedRemarkAcademicYearId = "";
let selectedRemarkStudentName = "";
let editingRemarkRecordId = null;

const feedBackMessages = document.getElementById("form-feedback");

/* =====================================
   INIT
===================================== */
document.addEventListener("DOMContentLoaded", async () => {
  await loadHeadRemarkClasses();
  await loadHeadRemarkAcademicYears();
  bindHeadRemarkEvents();
});

function bindHeadRemarkEvents() {
  document
    .getElementById("head-remark-academic-year")
    ?.addEventListener("change", loadHeadRemarkTerms);

  document
    .getElementById("head-load-remarks-btn")
    ?.addEventListener("click", loadStudentsMarksForHeadRemarks);

  document
    .getElementById("head-remark-class")
    ?.addEventListener("change", tryAutoLoadHeadRemarks);

  document
    .getElementById("head-remark-term")
    ?.addEventListener("change", tryAutoLoadHeadRemarks);

  document
    .getElementById("head-remark-academic-year")
    ?.addEventListener("change", tryAutoLoadHeadRemarks);

  document
    .getElementById("save-head-teacher-remark-btn")
    ?.addEventListener("click", saveHeadTeacherRemarkFromModal);

  document
    .getElementById("close-head-teacher-remark-modal")
    ?.addEventListener("click", closeHeadTeacherRemarkModal);

  document
    .getElementById("head-teacher-remark-overlay")
    ?.addEventListener("click", (e) => {
      if (e.target.id === "head-teacher-remark-overlay") {
        closeHeadTeacherRemarkModal();
      }
    });
}

function tryAutoLoadHeadRemarks() {
  const classId = document.getElementById("head-remark-class")?.value || "";
  const termId = document.getElementById("head-remark-term")?.value || "";
  const academicYearId =
    document.getElementById("head-remark-academic-year")?.value || "";

  if (classId && termId && academicYearId) {
    loadStudentsMarksForHeadRemarks();
  }
}

/* =====================================
   LOAD CLASSES
===================================== */
async function loadHeadRemarkClasses() {
  const select = document.getElementById("head-remark-class");
  if (!select) return;

  select.innerHTML = `<option value="">Loading classes...</option>`;

  const { data, error } = await supabaseHeadTeacherRemarks
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
    option.textContent = cls.class_name || "-";
    select.appendChild(option);
  });
}

/* =====================================
   LOAD ACADEMIC YEARS
===================================== */
async function loadHeadRemarkAcademicYears() {
  const select = document.getElementById("head-remark-academic-year");
  if (!select) return;

  select.innerHTML = `<option value="">Loading academic years...</option>`;

  const { data, error } = await supabaseHeadTeacherRemarks
    .from("academic_years")
    .select("id, year_name, is_active")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error loading academic years:", error.message);
    select.innerHTML = `<option value="">Failed to load academic years</option>`;
    return;
  }

  select.innerHTML = `<option value="">Select academic</option>`;

  (data || []).forEach((year) => {
    const option = document.createElement("option");
    option.value = year.id;
    option.textContent = year.year_name || "-";
    if (year.is_active) option.selected = true;
    select.appendChild(option);
  });

  await loadHeadRemarkTerms();
}

/* =====================================
   LOAD TERMS
===================================== */
async function loadHeadRemarkTerms() {
  const academicYearId =
    document.getElementById("head-remark-academic-year")?.value || "";
  const termSelect = document.getElementById("head-remark-term");

  if (!termSelect) return;

  termSelect.innerHTML = `<option value="">Loading terms...</option>`;

  if (!academicYearId) {
    termSelect.innerHTML = `<option value="">Select term</option>`;
    return;
  }

  const { data, error } = await supabaseHeadTeacherRemarks
    .from("terms")
    .select("id, name, academic_year_id")
    .eq("academic_year_id", academicYearId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error loading terms:", error.message);
    termSelect.innerHTML = `<option value="">Failed to load terms</option>`;
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
   LOAD STUDENTS + FULL MARKS + REMARKS
===================================== */
async function loadStudentsMarksForHeadRemarks() {
  const classId = document.getElementById("head-remark-class")?.value || "";
  const termId = document.getElementById("head-remark-term")?.value || "";
  const academicYearId =
    document.getElementById("head-remark-academic-year")?.value || "";

  const container =
    document.getElementById("load-students-marks") ||
    document.querySelector(".load-student-marks");

  if (!container) {
    console.error("Remarks container not found");
    return;
  }

  if (!classId || !termId || !academicYearId) {
    container.innerHTML = `<p>Please select class, term and academic year.</p>`;
    return;
  }

  selectedRemarkClassId = classId;
  selectedRemarkTermId = termId;
  selectedRemarkAcademicYearId = academicYearId;

  container.innerHTML = `<p>Loading students marks...</p>`;

  const [
    { data: classData },
    { data: termData },
    { data: yearData },
    { data: students, error: studentsError },
    { data: marks, error: marksError },
    { data: remarksRows, error: remarksError }
  ] = await Promise.all([
    supabaseHeadTeacherRemarks
      .from("classes")
      .select("id, class_name")
      .eq("id", classId)
      .maybeSingle(),

    supabaseHeadTeacherRemarks
      .from("terms")
      .select("id, name")
      .eq("id", termId)
      .maybeSingle(),

    supabaseHeadTeacherRemarks
      .from("academic_years")
      .select("id, year_name")
      .eq("id", academicYearId)
      .maybeSingle(),

    supabaseHeadTeacherRemarks
      .from("students")
      .select("id, surname, first_name, class_id, status")
      .eq("class_id", classId)
      .neq("status", "completed")
      .order("surname", { ascending: true })
      .order("first_name", { ascending: true }),

    supabaseHeadTeacherRemarks
      .from("student_marks")
      .select(`
        id,
        student_id,
        subject,
        class_score,
        exam_score,
        marks,
        grade,
        remark
      `)
      .eq("class_id", classId)
      .eq("term_id", termId),

    supabaseHeadTeacherRemarks
      .from("class_teacher_remarks")
      .select(`
        id,
        student_id,
        class_id,
        term_id,
        remark,
        conduct,
        attitude,
        interest,
        head_teacher_remark
      `)
      .eq("class_id", classId)
      .eq("term_id", termId)
  ]);

  if (studentsError) {
    console.error("Error loading students:", studentsError.message);
    container.innerHTML = `<p>Failed to load students.</p>`;
    return;
  }

  if (marksError) {
    console.error("Error loading marks:", marksError.message);
    container.innerHTML = `<p>Failed to load marks.</p>`;
    return;
  }

  if (remarksError) {
    console.error("Error loading remarks:", remarksError.message);
  }

  if (!students || students.length === 0) {
    container.innerHTML = `<p>No students found for the selected class.</p>`;
    return;
  }

  const allSubjects = [
    ...new Set(
      (marks || [])
        .map((row) => String(row.subject || "").trim())
        .filter(Boolean)
    )
  ].sort((a, b) => a.localeCompare(b));

  const remarksMap = new Map();
  (remarksRows || []).forEach((row) => {
    remarksMap.set(row.student_id, row);
  });

  const subjectPositionMap = new Map();

  allSubjects.forEach((subjectName) => {
    const subjectRows = students.map((student) => {
      const found = (marks || []).find(
        (mark) =>
          mark.student_id === student.id &&
          normalizeText(mark.subject) === normalizeText(subjectName)
      );

      const total =
        found?.marks !== null &&
        found?.marks !== undefined &&
        found?.marks !== ""
          ? Number(found.marks)
          : Number(found?.class_score || 0) + Number(found?.exam_score || 0);

      return {
        student_id: student.id,
        score: total
      };
    });

    const rankMap = createDenseRankMap(
      subjectRows,
      (row) => row.score,
      (row) => row.student_id
    );

    subjectRows.forEach((row) => {
      subjectPositionMap.set(
        `${row.student_id}__${normalizeText(subjectName)}`,
        rankMap.get(row.student_id) || "-"
      );
    });
  });

  const rows = students.map((student) => {
    const fullName =
      `${student.surname || ""} ${student.first_name || ""}`.trim() || "-";

    const studentMarks = (marks || []).filter(
      (mark) => mark.student_id === student.id
    );

    const subjectRows = allSubjects.map((subjectName) => {
      const found = studentMarks.find(
        (mark) => normalizeText(mark.subject) === normalizeText(subjectName)
      );

      const classScore =
        found?.class_score !== null && found?.class_score !== undefined
          ? Number(found.class_score)
          : null;

      const examScore =
        found?.exam_score !== null && found?.exam_score !== undefined
          ? Number(found.exam_score)
          : null;

      const totalMark =
        found?.marks !== null && found?.marks !== undefined && found?.marks !== ""
          ? Number(found.marks)
          : Number(found?.class_score || 0) + Number(found?.exam_score || 0);

      const subjectPosition =
        subjectPositionMap.get(
          `${student.id}__${normalizeText(subjectName)}`
        ) || "-";

      return {
        subject: subjectName,
        classScore,
        examScore,
        totalMark: found ? totalMark : null,
        grade: found?.grade || "-",
        remark: found?.remark || "-",
        subjectPosition:
          subjectPosition === "-" ? "-" : formatPosition(subjectPosition)
      };
    });

    const validTotals = subjectRows
      .map((item) => Number(item.totalMark))
      .filter((num) => !Number.isNaN(num));

    const overallTotal = validTotals.reduce((sum, num) => sum + num, 0);
    const average = validTotals.length
      ? (overallTotal / validTotals.length).toFixed(2)
      : "0.00";

    const currentHeadTeacherRemark =
      remarksMap.get(student.id)?.head_teacher_remark || "";

    const remarkId = remarksMap.get(student.id)?.id || null;

    return {
      student_id: student.id,
      student_name: fullName,
      subjects_count: subjectRows.length,
      subjectRows,
      overallTotal,
      average,
      classPosition: "-",
      currentHeadTeacherRemark,
      remarkId
    };
  });

  rows.sort((a, b) => {
    if (b.overallTotal !== a.overallTotal) return b.overallTotal - a.overallTotal;
    return a.student_name.localeCompare(b.student_name);
  });

  let currentPosition = 0;
  let lastTotal = null;

  rows.forEach((row, index) => {
    if (row.overallTotal !== lastTotal) {
      currentPosition = index + 1;
      lastTotal = row.overallTotal;
    }
    row.classPosition = formatPosition(currentPosition);
    row.no = index + 1;
  });

  const className = classData?.class_name || "-";
  const termName = termData?.name || "-";
  const yearName = yearData?.year_name || "-";

  container.innerHTML = `
    <div class="head-remarks-table-wrapper">
      <div style="margin-bottom:12px;">
        <h3>Head Teacher Remarks</h3>
        <p><strong>Class:</strong> ${escapeHtml(className)}</p>
        <p><strong>Term:</strong> ${escapeHtml(termName)}</p>
        <p><strong>Academic Year:</strong> ${escapeHtml(yearName)}</p>
      </div>

      ${rows.map((row) => `
        <div class="assessment-table-container" style="margin-bottom:20px; border:1px solid #ddd; padding:12px; border-radius:8px;">
          <div style="display:flex; justify-content:space-between; gap:16px; flex-wrap:wrap; margin-bottom:12px;">
            <div>
              <h4>${escapeHtml(row.student_name)}</h4>
              <p><strong>Overall Total Mark:</strong> ${row.overallTotal}</p>
              <p><strong>Average:</strong> ${row.average}</p>
              <p><strong>Position in Class:</strong> ${row.classPosition}</p>
            </div>
            <div>
              <p><strong>Current Head Teacher Remark:</strong></p>
              <p>${escapeHtml(row.currentHeadTeacherRemark || "-")}</p>
              <button
                class="view-btn action-btn"
                style="margin-top:8px;"
                onclick="openHeadTeacherRemarkModal(
                  '${row.student_id}',
                  '${escapeJs(row.student_name)}',
                  '${escapeJs(row.currentHeadTeacherRemark || "")}',
                  '${row.remarkId || ""}'
                )"
              >
                ${row.currentHeadTeacherRemark ? "Update Remark" : "Give Remark"}
              </button>
            </div>
          </div>

          <table class="student-details-table">
            <thead>
              <tr>
                <th>Subject</th>
                <th>Class Score</th>
                <th>Exam Score</th>
                <th>Total Mark</th>
                <th>Grade</th>
                  <th>Remark</th>
                <th>Position on Subject</th>
              </tr>
            </thead>
            <tbody>
              ${row.subjectRows.map((subjectRow) => `
                <tr>
                  <td>${escapeHtml(subjectRow.subject)}</td>
                  <td>${subjectRow.classScore ?? "-"}</td>
                  <td>${subjectRow.examScore ?? "-"}</td>
                  <td>${subjectRow.totalMark ?? "-"}</td>
                  <td>${escapeHtml(subjectRow.grade || "-")}</td>
                  <td>${escapeHtml(subjectRow.remark || "-")}</td>
                  <td>${subjectRow.subjectPosition}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      `).join("")}
    </div>
  `;
}

/* =====================================
   OPEN REMARK MODAL
===================================== */
function openHeadTeacherRemarkModal(studentId, studentName, existingRemark = "", remarkId = "") {
  selectedRemarkStudentId = studentId || null;
  selectedRemarkStudentName = studentName || "";
  editingRemarkRecordId = remarkId || null;

  const overlay = document.getElementById("head-teacher-remark-overlay");
  const nameEl = document.getElementById("head-teacher-remark-student-name");
  const textarea = document.getElementById("head-teacher-remark-textarea");

  if (nameEl) {
    nameEl.textContent = studentName || "-";
  }

  if (textarea) {
    textarea.value = existingRemark || "";
  }

  if (overlay) {
    overlay.style.display = "flex";
  }
}

/* =====================================
   CLOSE REMARK MODAL
===================================== */
function closeHeadTeacherRemarkModal() {
  const overlay = document.getElementById("head-teacher-remark-overlay");
  const nameEl = document.getElementById("head-teacher-remark-student-name");
  const textarea = document.getElementById("head-teacher-remark-textarea");

  selectedRemarkStudentId = null;
  selectedRemarkStudentName = "";
  editingRemarkRecordId = null;

  if (nameEl) nameEl.textContent = "";
  if (textarea) textarea.value = "";
  if (overlay) overlay.style.display = "none";
}

/* =====================================
   SAVE REMARK
===================================== */
async function saveHeadTeacherRemarkFromModal() {
  const textarea = document.getElementById("head-teacher-remark-textarea");
  const remarkText = textarea?.value.trim() || "";

  if (!selectedRemarkStudentId) {
      feedBackMessages.classList.add("show-message", "error");
    feedBackMessages.innerHTML = "No student selected.";
    setTimeout(()=>{
          feedBackMessages.classList.remove("show-message", "error");
    }, 3000);
    return;
  }

  if (!selectedRemarkClassId) {
          feedBackMessages.classList.add("show-message", "error");
    feedBackMessages.innerHTML = "No class selected.";
    setTimeout(()=>{
          feedBackMessages.classList.remove("show-message", "error");
    }, 3000);
    return;
  }

  if (!selectedRemarkTermId) {
          feedBackMessages.classList.add("show-message", "error");
    feedBackMessages.innerHTML = "No term selected.";
    setTimeout(()=>{
          feedBackMessages.classList.remove("show-message", "error");
    }, 3000);
    return;
  }

  if (!remarkText) {
          feedBackMessages.classList.add("show-message", "error");
    feedBackMessages.innerHTML = "Please enter remarks.";
    setTimeout(()=>{
          feedBackMessages.classList.remove("show-message", "error");
    }, 3000);
    return;
  }

  try {
    const { data: existingRow, error: fetchError } =
      await supabaseHeadTeacherRemarks
        .from("class_teacher_remarks")
        .select(`
          id,
          student_id,
          class_id,
          term_id,
          teacher_id,
          remark,
          conduct,
          attitude,
          interest,
          head_teacher_remark
        `)
        .eq("student_id", selectedRemarkStudentId)
        .eq("class_id", selectedRemarkClassId)
        .eq("term_id", selectedRemarkTermId)
        .maybeSingle();

    if (fetchError) {
      console.error("Error checking existing remark row:", fetchError.message);
      alert("Failed to save remark.");
      return;
    }

    let saveError = null;

    if (existingRow?.id) {
      const { error } = await supabaseHeadTeacherRemarks
        .from("class_teacher_remarks")
        .update({
          head_teacher_remark: remarkText,
          updated_at: new Date().toISOString()
        })
        .eq("id", existingRow.id);

      saveError = error;
    } else {
      const { error } = await supabaseHeadTeacherRemarks
        .from("class_teacher_remarks")
        .insert({
          student_id: selectedRemarkStudentId,
          class_id: selectedRemarkClassId,
          term_id: selectedRemarkTermId,
          head_teacher_remark: remarkText,
          updated_at: new Date().toISOString()
        });

      saveError = error;
    }

    if (saveError) {
      console.error("Error saving head teacher remark:", saveError.message);
      alert("Failed to save remark.");
      return;
    }

    feedBackMessages.classList.add("show-message", "success");
    feedBackMessages.innerHTML = "Remark saved successfully";
    setTimeout(()=>{
          feedBackMessages.classList.remove("show-message", "success");
    }, 3000);


    closeHeadTeacherRemarkModal();
    await loadStudentsMarksForHeadRemarks();
  } catch (err) {
    console.error("Unexpected error saving head teacher remark:", err);
    alert("Unexpected error saving remark.");
  }
}

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

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function createDenseRankMap(rows, valueGetter, keyGetter) {
  const sorted = [...rows].sort((a, b) => {
    const bv = Number(valueGetter(b)) || 0;
    const av = Number(valueGetter(a)) || 0;

    if (bv !== av) return bv - av;
    return String(keyGetter(a)).localeCompare(String(keyGetter(b)));
  });

  const rankMap = new Map();
  let currentRank = 0;
  let lastValue = null;

  sorted.forEach((row, index) => {
    const value = Number(valueGetter(row)) || 0;

    if (value !== lastValue) {
      currentRank = index + 1;
    }

    rankMap.set(keyGetter(row), currentRank);
    lastValue = value;
  });

  return rankMap;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeJs(value) {
  return String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'");
}