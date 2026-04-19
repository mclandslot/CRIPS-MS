const supabaseMarksEnteringData = window.supabaseClient;

let teacherId = null;
let assignmentsData = [];
const messageResponse = document.getElementById("form-feedback");

/* =====================================
   INIT
===================================== */
document.addEventListener("DOMContentLoaded", async () => {
  const { data } = await supabaseMarksEnteringData.auth.getUser();
  teacherId = data?.user?.id;

  await loadTeacherAssignments();

  document
    .getElementById("selected-class-assigned-option")
    ?.addEventListener("change", loadSubjectsForClass);

  document
    .getElementById("load-students-data-btn")
    ?.addEventListener("click", loadStudentsForMarks);
});

/* =====================================
   GET CURRENT TERM ID
===================================== */
async function getCurrentTermId() {
  const { data, error } = await supabaseMarksEnteringData
    .from("terms")
    .select("id")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error) {
    console.error(error.message);
    return null;
  }

  return data.id;
}

/* =====================================
   GRADE + REMARK FUNCTIONS
===================================== */
function getGrade(total) {
  if (total >= 90) return "A";
  if (total >= 80) return "B";
  if (total >= 70) return "C";
  if (total >= 60) return "D";
  if (total >= 50) return "E";
  return "F";
}

function getRemark(total) {
  if (total >= 90) return "EXCELLENT";
  if (total >= 80) return "VERY GOOD";
  if (total >= 70) return "GOOD";
  if (total >= 60) return "AVERAGE";
  if (total >= 50) return "WEAK PASS";
  return "FAIL";
}

/* =====================================
   LOAD TEACHER ASSIGNMENTS
===================================== */
async function loadTeacherAssignments() {
  const { data, error } = await supabaseMarksEnteringData
    .from("teacher_subject_assignments")
    .select(
      `
      class_id,
      subject,
      classes (class_name)
    `
    )
    .eq("teacher_id", teacherId);

  if (error) {
    console.error(error.message);
    return;
  }

  assignmentsData = data;

  // Populate classes
  const classSelect = document.getElementById("selected-class-assigned-option");

  const uniqueClasses = {};
  data.forEach((a) => {
    if (a.class_id) {
      uniqueClasses[a.class_id] = a.classes?.class_name;
    }
  });

  classSelect.innerHTML = `<option value="">Select Class</option>`;

  Object.entries(uniqueClasses).forEach(([id, name]) => {
    const option = document.createElement("option");
    option.value = id;
    option.textContent = name;
    classSelect.appendChild(option);
  });
}

/* =====================================
   LOAD SUBJECTS BASED ON CLASS
===================================== */
function loadSubjectsForClass() {
  const classId = document.getElementById(
    "selected-class-assigned-option"
  ).value;

  const subjectSelect = document.getElementById(
    "selected-subject-assigned-option"
  );

  subjectSelect.innerHTML = `<option value="">Select Subject</option>`;

  const subjects = assignmentsData
    .filter((a) => a.class_id === classId)
    .map((a) => a.subject);

  const uniqueSubjects = [...new Set(subjects)];

  uniqueSubjects.forEach((subject) => {
    const option = document.createElement("option");
    option.value = subject;
    option.textContent = subject;
    subjectSelect.appendChild(option);
  });
}

/* =====================================
   LOAD STUDENTS + SHOW MARKS UI
===================================== */
async function loadStudentsForMarks() {
  const classId = document.getElementById(
    "selected-class-assigned-option"
  ).value;

  const subject = document.getElementById(
    "selected-subject-assigned-option"
  ).value;

  if (!classId || !subject) {
    messageResponse.classList.add("show-message", "error");
    messageResponse.innerHTML =
      '<i class="fa-solid fa-circle-xmark"> </i> Select class and subject';
    setTimeout(
      () => messageResponse.classList.remove("show-message", "error"),
      3000
    );
    return;
  }

  const marksContainer = document.querySelector(".marks-container");
  marksContainer.style.display = "block";

  const className =
    document.getElementById("selected-class-assigned-option").selectedOptions[0]
      .text;
  document.getElementById("selected-class-name").textContent = className;
  document.getElementById("selected-subject").textContent = subject;

  const { data, error } = await supabaseMarksEnteringData
    .from("students")
    .select("id, surname, first_name")
    .eq("class_id", classId)
    .order("surname", { ascending: true });

  if (error) {
    console.error(error.message);
    return;
  }

  document.getElementById("total-student-show-text").textContent = `${data.length} Students`;

  const tbody = document.getElementById("marks-entering-data");
  tbody.innerHTML = "";

  const termId = await getCurrentTermId();

  for (let index = 0; index < data.length; index++) {
    const student = data[index];

    const fullName = `${student.surname} ${student.first_name}`;

    // check if marks exist
    const { data: existing } = await supabaseMarksEnteringData
      .from("student_marks")
      .select("id, class_score, exam_score")
      .eq("student_id", student.id)
      .eq("class_id", classId)
      .eq("subject", subject)
      .eq("term_id", termId)
      .maybeSingle();

    const classScoreVal = existing?.class_score || 0;
    const examScoreVal = existing?.exam_score || 0;
    const totalVal = classScoreVal + examScoreVal;

    const gradeVal = getGrade(totalVal);
    const remarkVal = getRemark(totalVal);

    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${index + 1}</td>

      <td class="student">${fullName}</td>

      <td>
        <input type="number" class="score class-score" value="${classScoreVal}" min="0" max="50">
        <span>/ 50</span>
      </td>

      <td>
        <input type="number" class="score exam-score" value="${examScoreVal}" min="0" max="50">
        <span>/ 50</span>
      </td>

      <td>
        <strong class="total">${totalVal}</strong> <span>/ 100</span>
      </td>

      <td>
        <strong class="grade">${gradeVal}</strong>
      </td>

      <td>
        <strong class="remark">${remarkVal}</strong>
      </td>

      <td>
        <button class="save-marks-btn view-btn">
          ${existing ? "Update" : "Save"}
        </button>

        <button class="edit-btn">
          <i class="fa-solid fa-pen-to-square"></i> Edit
        </button>
      </td>
    `;

    const classInput = row.querySelector(".class-score");
    const examInput = row.querySelector(".exam-score");
    const totalDisplay = row.querySelector(".total");
    const gradeDisplay = row.querySelector(".grade");
    const remarkDisplay = row.querySelector(".remark");

    const saveBtn = row.querySelector(".save-marks-btn");
    const editBtn = row.querySelector(".edit-btn");

    // if marks already exist, lock input by default
    if (existing) {
      classInput.disabled = true;
      examInput.disabled = true;
      editBtn.style.display = "inline-block";
    } else {
      editBtn.style.display = "none";
    }

    function validateAndUpdate() {
      let c = Number(classInput.value) || 0;
      let e = Number(examInput.value) || 0;

      if (c > 50) {
        messageResponse.classList.add("show-message", "error");
        messageResponse.innerHTML =
          '<i class="fa-solid fa-circle-xmark"> </i> Class score cannot exceed 50%';
        setTimeout(
          () => messageResponse.classList.remove("show-message", "error"),
          3000
        );
        c = 50;
        classInput.value = 50;
      }

      if (e > 50) {
        messageResponse.classList.add("show-message", "error");
        messageResponse.innerHTML =
          '<i class="fa-solid fa-circle-xmark"> </i> Exam score cannot exceed 50%';
        setTimeout(
          () => messageResponse.classList.remove("show-message", "error"),
          3000
        );
        e = 50;
        examInput.value = 50;
      }

      const total = c + e;

      totalDisplay.textContent = total;
      gradeDisplay.textContent = getGrade(total);
      remarkDisplay.textContent = getRemark(total);
    }

    classInput.addEventListener("input", validateAndUpdate);
    examInput.addEventListener("input", validateAndUpdate);

    /* =====================================
       EDIT BUTTON FUNCTION
    ===================================== */
    editBtn.addEventListener("click", () => {
      classInput.disabled = false;
      examInput.disabled = false;

      classInput.focus();

      messageResponse.classList.add("show-message", "success");
      messageResponse.innerHTML =
        '<i class="fa-solid fa-circle-check"></i> You can now edit marks';
      setTimeout(
        () => messageResponse.classList.remove("show-message", "success"),
        2500
      );
    });

    /* =====================================
       SAVE / UPDATE BUTTON FUNCTION
    ===================================== */
    saveBtn.addEventListener("click", async () => {
      const classScore = Number(classInput.value) || 0;
      const examScore = Number(examInput.value) || 0;

      if (classScore > 50 || examScore > 50) {
        messageResponse.classList.add("show-message", "error");
        messageResponse.innerHTML =
          '<i class="fa-solid fa-circle-xmark"> </i> Score cannot exceed 50%';
        setTimeout(
          () => messageResponse.classList.remove("show-message", "error"),
          3000
        );
        return;
      }

      const total = classScore + examScore;

      const { error } = await supabaseMarksEnteringData
        .from("student_marks")
        .upsert(
          {
            student_id: student.id,
            class_id: classId,
            subject: subject,
            teacher_id: teacherId,
            term_id: termId,
            class_score: classScore,
            exam_score: examScore,
            marks: total,
            grade: getGrade(total),
            remark: getRemark(total),
          },
          { onConflict: "student_id,class_id,subject,term_id" }
        );

      if (error) {
        console.error(error.message);
        messageResponse.classList.add("show-message", "error");
        messageResponse.innerHTML =
          '<i class="fa-solid fa-circle-xmark"> </i> Error saving marks';
        setTimeout(
          () => messageResponse.classList.remove("show-message", "error"),
          3000
        );
        return;
      }

      // lock inputs again after saving
      classInput.disabled = true;
      examInput.disabled = true;
      editBtn.style.display = "inline-block";

      messageResponse.classList.add("show-message", "success");
      messageResponse.innerHTML =
        '<i class="fa-solid fa-circle-check"> </i> Marks saved successfully';
      setTimeout(
        () => messageResponse.classList.remove("show-message", "success"),
        3000
      );
    });

    tbody.appendChild(row);
  }

  setupLiveTotalCalculation();
}

/* =====================================
   AUTO CALCULATE TOTAL
===================================== */
function setupLiveTotalCalculation() {
  const rows = document.querySelectorAll("#marks-entering-data tr");

  rows.forEach((row) => {
    const classInput = row.querySelector(".class-score");
    const examInput = row.querySelector(".exam-score");
    const totalDisplay = row.querySelector(".total");
    const gradeDisplay = row.querySelector(".grade");
    const remarkDisplay = row.querySelector(".remark");

    function updateTotal() {
      const classScore = Number(classInput.value) || 0;
      const examScore = Number(examInput.value) || 0;

      const total = classScore + examScore;

      totalDisplay.textContent = total;
      gradeDisplay.textContent = getGrade(total);
      remarkDisplay.textContent = getRemark(total);
    }

    classInput.addEventListener("input", updateTotal);
    examInput.addEventListener("input", updateTotal);
  });
}