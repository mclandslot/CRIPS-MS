const supabaseAttendanceMarks = window.supabaseClient;

/* =====================================
   GLOBAL STATE
===================================== */
let selectedStudents = [];
let attendanceStatus = {};
let currentClassId = null;
let currentTermId = null;
let currentAcademicYearId = null;

let studentChannel = null;
let attendanceChannel = null;
let currentTotalDays = 0;
const attendaceFeedBack = document.getElementById("form-feedback");

/* =====================================
   INIT
===================================== */
document.addEventListener("DOMContentLoaded", async () => {
  await loadActiveTermAndYear();
  await loadTermDays();
  await loadAttendanceForAssignedTeacher();

  const showBtn = document.getElementById("mark-attendance-shown-btn");
  const markAllBtn = document.getElementById("mark-all-student-present-btn");
  const attendanceUI = document.getElementById("shows-attendance-list");

  if (attendanceUI) attendanceUI.style.display = "none";

  if (showBtn) {
    showBtn.addEventListener("click", async () => {
      if (attendanceUI) attendanceUI.style.display = "block";
      await loadAssignedClassStudents();
    });
  }

  if (markAllBtn) {
    markAllBtn.addEventListener("click", markAllPresent);
  }
});

/* =====================================
   LOAD TERM DAYS
===================================== */
async function loadTermDays() {
  if (!currentTermId) {
    console.error("❌ currentTermId not set");
    return;
  }

  const { data, error } = await supabaseAttendanceMarks
    .from("term_days")
    .select("total_days")
    .eq("term_id", currentTermId)
    .single();

  if (error || !data) {
    console.error("❌ Error loading term days:", error?.message);
    return;
  }

  currentTotalDays = Number(data.total_days) || 0;

  const el = document.getElementById("total-set-days");
  if (el) {
    el.innerText = currentTotalDays;
  }

  console.log("✅ Total Days:", currentTotalDays);
}

/* =====================================
   LOAD ASSIGNED CLASS STUDENTS
===================================== */
async function loadAssignedClassStudents() {
  const teacherId = localStorage.getItem("teacherId");

  if (!teacherId) {
    // alert("Session expired. Please login again.");
    attendaceFeedBack.classList.add("show-message", "error");
    attendaceFeedBack.innerHTML = "Please login again";
    setTimeout(()=>{
      attendaceFeedBack.classList.remove("show-message", "error");
    }, 3000);
    return;
  }

  const { data: assigned, error: assignError } = await supabaseAttendanceMarks
    .from("class_teachers")
    .select(`class_id, classes (class_name)`)
    .eq("teacher_id", teacherId)
    .single();

  if (assignError || !assigned) {
    // alert("No class assigned to this teacher");
    attendaceFeedBack.classList.add("show-message", "error");
    attendaceFeedBack.innerHTML = "No class assigned";
    setTimeout(()=>{
      attendaceFeedBack.classList.remove("show-message", "error");
    }, 3000);
    return;
  }

  currentClassId = assigned.class_id;

  const { data: students, error } = await supabaseAttendanceMarks
    .from("students")
    .select("*")
    .eq("class_id", currentClassId)
    .order("surname", { ascending: true });

  if (error) {
    console.error(error.message);
    return;
  }

  selectedStudents = students || [];

  document.getElementById("assigned-class-name").innerText =
    "Class: " + (assigned.classes?.class_name || "Unknown");

  document.getElementById("display-assign-class-total-student").innerText =
    selectedStudents.length;

  renderStudents(selectedStudents);
  listenForNewStudents();
}

/* =====================================
   MARK SINGLE ATTENDANCE
===================================== */
async function markAttendance(studentId, status) {
  if (!currentTermId || !currentAcademicYearId || !currentClassId) {
    // alert("Missing term, academic year or class.");
    attendaceFeedBack.classList.add("show-message", "error");
    attendaceFeedBack.innerHTML = "No term, year or class";
    setTimeout(()=>{
      attendaceFeedBack.classList.remove("show-message", "error");
    }, 3000);
    return;
  }

  const today = new Date().toISOString().split("T")[0];

  const { error } = await supabaseAttendanceMarks
    .from("attendance")
    .upsert(
      {
        student_id: studentId,
        class_id: currentClassId,
        term_id: currentTermId,
        academic_year_id: currentAcademicYearId,
        date: today,
        status: status
      },
      {
        onConflict: "student_id,term_id,date"
      }
    );

  if (error) {
    console.error("Attendance error:", error.message);
  }
}

/* =====================================
   RENDER STUDENTS
===================================== */
function renderStudents(students) {
  const container = document.getElementById("mark-list-attendance");

  if (!container) {
    console.error("❌ mark-list-attendance NOT FOUND");
    return;
  }

  container.innerHTML = `<div id="students-wrapper"></div>`;
  attendanceStatus = {};

  const wrapper = document.getElementById("students-wrapper");

  students.forEach((student, index) => {
    attendanceStatus[student.id] = null;

    const row = document.createElement("div");
    row.className = "student-row";

    row.innerHTML = `
      <span class="roll">${index + 1}</span>
      <span class="name">${student.surname || ""} ${student.first_name || ""}</span>
      <div class="actions">
        <button class="present">Present</button>
        <button class="absent">Absent</button>
      </div>
    `;

    const presentBtn = row.querySelector(".present");
    const absentBtn = row.querySelector(".absent");

    presentBtn.onclick = () => {
      attendanceStatus[student.id] = "Present";
      presentBtn.classList.add("active-present");
      absentBtn.classList.remove("active-absent");
      updateCounts();
    };

    absentBtn.onclick = () => {
      attendanceStatus[student.id] = "Absent";
      absentBtn.classList.add("active-absent");
      presentBtn.classList.remove("active-present");
      updateCounts();
    };

    wrapper.appendChild(row);
  });

  const saveBtn = document.createElement("button");
  saveBtn.className = "save-btn save-all";
  saveBtn.id = "save-attendance-btn";
  saveBtn.innerText = "Save Attendance";
  saveBtn.disabled = true;
  saveBtn.onclick = saveAttendance;

  container.appendChild(saveBtn);
  updateCounts();
}

/* =====================================
   HANDLE STATUS CHANGE
===================================== */
function handleStatusChange(studentId, status) {
  if (!status) return;
  attendanceStatus[studentId] = status;
  markAttendance(studentId, status);
}

/* =====================================
   MARK ALL PRESENT
===================================== */
function markAllPresent() {
  if (!selectedStudents.length) return;

  selectedStudents.forEach((student) => {
    attendanceStatus[student.id] = "Present";
  });

  const wrapper = document.getElementById("students-wrapper");
  if (wrapper) {
    wrapper.querySelectorAll(".student-row").forEach((row) => {
      const presentBtn = row.querySelector(".present");
      const absentBtn = row.querySelector(".absent");

      presentBtn?.classList.add("active-present");
      absentBtn?.classList.remove("active-absent");
    });
  }

  updateCounts();
}

/* =====================================
   REALTIME NEW STUDENTS
===================================== */
function listenForNewStudents() {
  if (!currentClassId) return;

  if (studentChannel) {
    supabaseAttendanceMarks.removeChannel(studentChannel);
    studentChannel = null;
  }

  studentChannel = supabaseAttendanceMarks
    .channel("students-live-" + currentClassId)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "students"
      },
      (payload) => {
        const newStudent = payload.new;

        if (newStudent.class_id === currentClassId) {
          const exists = selectedStudents.some((s) => s.id === newStudent.id);
          if (exists) return;

          selectedStudents.push(newStudent);

          selectedStudents.sort((a, b) =>
            (a.surname || "").localeCompare(b.surname || "")
          );

          const totalEl = document.getElementById("display-assign-class-total-student");
          if (totalEl) {
            totalEl.innerText = selectedStudents.length;
          }

          renderStudents(selectedStudents);
          // console.log("✅ New student added:", newStudent);
        }
      }
    )
    .subscribe();
}

/* =====================================
   UPDATE COUNTS
===================================== */
function updateCounts() {
  let present = 0;
  let absent = 0;
  let totalMarked = 0;

  Object.values(attendanceStatus).forEach((status) => {
    if (status === "Present") {
      present++;
      totalMarked++;
    } else if (status === "Absent") {
      absent++;
      totalMarked++;
    }
  });

  const presentEl = document.getElementById("total-present-students");
  const absentEl = document.getElementById("total-absents-students");

  if (presentEl) presentEl.innerText = present;
  if (absentEl) absentEl.innerText = absent;

  const saveBtn = document.getElementById("save-attendance-btn");
  if (saveBtn) {
    saveBtn.disabled = totalMarked !== selectedStudents.length;
  }
}

/* =====================================
   CHECK IF DATE ALREADY EXISTS
===================================== */
async function hasAttendanceForSelectedDate(dateValue) {
  const { data, error } = await supabaseAttendanceMarks
    .from("attendance")
    .select("date")
    .eq("class_id", currentClassId)
    .eq("term_id", currentTermId)
    .eq("academic_year_id", currentAcademicYearId)
    .eq("date", dateValue)
    .limit(1);

  if (error) {
    throw error;
  }

  return (data || []).length > 0;
}

/* =====================================
   COUNT USED ATTENDANCE DAYS
===================================== */
async function getUsedAttendanceDays() {
  const { data, error } = await supabaseAttendanceMarks
    .from("attendance")
    .select("date")
    .eq("class_id", currentClassId)
    .eq("term_id", currentTermId)
    .eq("academic_year_id", currentAcademicYearId);

  if (error) {
    throw error;
  }

  const uniqueDates = new Set((data || []).map((item) => item.date).filter(Boolean));
  return uniqueDates.size;
}

/* =====================================
   SAVE ATTENDANCE
===================================== */
async function saveAttendance() {
  const dateInput = document.getElementById("datePickerDate");

  if (!dateInput || !dateInput.value) {
    // alert("Select date");
    attendaceFeedBack.classList.add("show-message", "error");
    attendaceFeedBack.innerHTML = "Select date";
    setTimeout(()=>{
      attendaceFeedBack.classList.remove("show-message", "error");
    }, 3000);
    return;
  }

  if (!currentTermId || !currentAcademicYearId || !currentClassId) {
    // alert("Missing term, academic year or class");
    attendaceFeedBack.classList.add("show-message", "error");
    attendaceFeedBack.innerHTML = "No term, year or class";
    setTimeout(()=>{
      attendaceFeedBack.classList.remove("show-message", "error");
    }, 3000);
    return;
  }

  const formattedDate = new Date(dateInput.value).toISOString().split("T")[0];

  const records = selectedStudents
    .filter((student) => attendanceStatus[student.id])
    .map((student) => ({
      student_id: student.id,
      class_id: currentClassId,
      term_id: currentTermId,
      academic_year_id: currentAcademicYearId,
      date: formattedDate,
      status: attendanceStatus[student.id]
    }));

  if (records.length === 0) {
    // alert("No attendance marked");
    attendaceFeedBack.classList.add("show-message", "error");
    attendaceFeedBack.innerHTML = "No attendance marked";
    setTimeout(()=>{
      attendaceFeedBack.classList.remove("show-message", "error");
    }, 3000);
    return;
  }

  try {
    const dateAlreadySaved = await hasAttendanceForSelectedDate(formattedDate);
    const usedAttendanceDays = await getUsedAttendanceDays();

    if (!dateAlreadySaved && currentTotalDays > 0 && usedAttendanceDays >= currentTotalDays) {
      // alert(`Attendance cannot be saved. Total attendance days for this term has reached ${currentTotalDays}.`);
      attendaceFeedBack.classList.add("show-message", "error");
      attendaceFeedBack.innerHTML = ` Term has reached ${currentTotalDays}.`;
      setTimeout(()=>{
        attendaceFeedBack.classList.remove("show-message", "error");
      }, 3000);
      return;
    }

    const { error } = await supabaseAttendanceMarks
      .from("attendance")
      .upsert(records, {
        onConflict: "student_id,term_id,date"
      });

    if (error) throw error;

    // alert("✅ Attendance saved successfully");
    attendaceFeedBack.classList.add("show-message", "success");
    attendaceFeedBack.innerHTML = "Attendance saved";
    setTimeout(()=>{
      attendaceFeedBack.classList.remove("show-message", "error");
    }, 3000);
    
    console.log("Saved records:", records);

    await loadTermDays();
    await loadAttendanceForAssignedTeacher();
  } catch (err) {
    console.error("❌ Save error:", err.message);
    // alert("Error saving attendance");
    attendaceFeedBack.classList.add("show-message", "error");
    attendaceFeedBack.innerHTML = "Error saving attendance";
    setTimeout(()=>{
      attendaceFeedBack.classList.remove("show-message", "error");
    }, 3000);
    return;
  }
}

/* =====================================
   LOAD ATTENDANCE FOR LOGGED-IN TEACHER
===================================== */
async function loadAttendanceForAssignedTeacher() {
  const tableBody = document.getElementById("display-attendance-data-table");

  if (!tableBody) return;

  tableBody.innerHTML = `<tr><td colspan="4">Loading attendance...</td></tr>`;

  try {
    const { data: userData, error: userError } =
      await supabaseAttendanceMarks.auth.getUser();

    if (userError || !userData?.user) {
      throw new Error("User not logged in");
    }

    const userEmail = userData.user.email;

    const { data: teacher, error: teacherError } =
      await supabaseAttendanceMarks
        .from("teachers")
        .select("id")
        .eq("email", userEmail)
        .single();

    if (teacherError || !teacher) {
      throw new Error("Teacher record not found");
    }

    const { data: classAssign, error: classError } =
      await supabaseAttendanceMarks
        .from("class_teachers")
        .select("class_id, classes(class_name)")
        .eq("teacher_id", teacher.id)
        .single();

    if (classError || !classAssign) {
      tableBody.innerHTML = `<tr><td colspan="4">No class assigned</td></tr>`;
      return;
    }

    const classId = classAssign.class_id;

    const classNameDisplay = document.getElementById("term-name");
    if (classNameDisplay) {
      classNameDisplay.textContent =
        `Class: ${classAssign.classes?.class_name || ""}`;
    }

    if (!currentTermId) {
      throw new Error("Active term not loaded");
    }

    const termId = currentTermId;

    const { data: termDaysData } =
      await supabaseAttendanceMarks
        .from("term_days")
        .select("total_days")
        .eq("term_id", currentTermId)
        .single();

    const totalDays = Number(termDaysData?.total_days) || 0;
    currentTotalDays = totalDays;

    const { data: students, error: studentError } =
      await supabaseAttendanceMarks
        .from("students")
        .select("id, surname, first_name")
        .eq("class_id", classId);

    if (studentError) throw studentError;

    const { data: attendance, error: attendanceError } =
      await supabaseAttendanceMarks
        .from("attendance")
        .select("student_id, status, date")
        .eq("class_id", classId)
        .eq("term_id", termId);

    if (attendanceError) throw attendanceError;

    tableBody.innerHTML = "";

    if (!students || students.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="4">No students found</td></tr>`;
      return;
    }

    students.forEach((student) => {
      const fullName =
        `${student.surname || ""} ${student.first_name || ""}`.trim();

      const records = attendance.filter((a) => a.student_id === student.id);

      let present = 0;
      let absent = 0;

      records.forEach((a) => {
        const status = (a.status || "").toLowerCase();

        if (status === "present") present++;
        if (status === "absent") absent++;
      });

      const usedTotalDays = currentTotalDays || (present + absent);

      const percentage =
        usedTotalDays > 0
          ? ((present / usedTotalDays) * 100).toFixed(1)
          : 0;

      const row = document.createElement("tr");

      row.innerHTML = `
        <td>${fullName}</td>
        <td>${present}</td>
        <td>${absent}</td>
        <td>${percentage}% (${present}/${usedTotalDays})</td>
      `;

      tableBody.appendChild(row);
    });
  } catch (err) {
    console.error("Attendance error:", err);
    tableBody.innerHTML = `<tr><td colspan="4">Error loading attendance</td></tr>`;
  }
}

/* =====================================
   LOAD TERMS INTO DROPDOWN
===================================== */
async function loadTermsDropdown() {
  const { data: terms, error } = await supabaseAttendanceMarks
    .from("terms")
    .select("id, name")
    .eq("academic_year_id", currentAcademicYearId);

  if (error) {
    console.error("❌ Error loading terms:", error.message);
    return;
  }

  const select = document.getElementById("term-select");
  if (!select) return;

  select.innerHTML = "";

  terms.forEach((term) => {
    const option = document.createElement("option");
    option.value = term.id;
    option.textContent = term.name || `Term ${term.id}`;
    select.appendChild(option);
  });

  if (terms.length > 0) {
    currentTermId = terms[0].id;
    select.value = currentTermId;
  }
}

/* =====================================
   HANDLE TERM CHANGES
===================================== */
function setupTermChangeListener() {
  const select = document.getElementById("term-select");
  if (!select) return;

  select.addEventListener("change", async (e) => {
    currentTermId = e.target.value;
    console.log("🔄 Term changed:", currentTermId);

    await loadTermDays();
    await loadAttendanceForAssignedTeacher();
  });
}

/* =====================================
   LOAD ACTIVE TERM AND YEAR
===================================== */
async function loadActiveTermAndYear() {
  try {
    const { data: academicYear } = await supabaseAttendanceMarks
      .from("academic_years")
      .select("id")
      .eq("is_active", true)
      .single();

    currentAcademicYearId = academicYear.id;

    await loadTermsDropdown();
    setupTermChangeListener();
    await loadTermDays();
    await loadAttendanceForAssignedTeacher();
  } catch (err) {
    console.error("❌ Init error:", err.message);
  }
}