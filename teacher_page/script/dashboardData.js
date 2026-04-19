if (!window.supabaseClient) {
  console.error("Supabase client not initialized");
}

const supabaseTeacherDashboard = window.supabaseClient;

async function loadTeacherDashboard() {

  try {

    /* GET LOGGED IN USER */
    const { data: sessionData } =
await supabaseTeacherDashboard.auth.getSession();

if (!sessionData.session) {

  console.log("No active session. Redirecting to login...");

  window.location.href = "/login.html";
  return;

}

const teacherId = sessionData.session.user.id;

    // const teacherId = userData.user.id;

    /* GET ASSIGNED SUBJECTS + CLASSES */

    const { data: assignments, error: assignError } =
      await supabaseTeacherDashboard
        .from("teacher_subjects")
        .select("class, subject")
        .eq("teacher_id", teacherId);

    if (assignError) {
      console.error(assignError);
      return;
    }

    if (!assignments || assignments.length === 0) {
      document.getElementById("total-assigned-class").textContent = 0;
      document.getElementById("total-assigned-subjects").textContent = 0;
      document.getElementById("total-assigned-students").textContent = 0;
      return;
    }

    /* UNIQUE CLASSES + SUBJECTS */

    const classes = [...new Set(assignments.map(a => a.class))];
    const subjects = [...new Set(assignments.map(a => a.subject))];

    document.getElementById("total-assigned-class").textContent = classes.length;
    document.getElementById("total-assigned-subjects").textContent = subjects.length;

    /* GET STUDENTS IN THOSE CLASSES */

    // const { data: students, error: studentError } =
    //   await supabaseTeacherDashboard
    //     .from("students")
    //     .select("id, class")
    //     .in("class", classes);

    // if (studentError) {
    //   console.error(studentError);
    //   return;
    // }

    /* GET STUDENTS IN THOSE CLASSES */

const { data: students, error: studentError } =
  await supabaseTeacherDashboard
    .from("students")
    .select("id, class");

if (studentError) {
  console.error("Student error:", studentError);
  return;
}

console.log("All students:", students);
console.log("Classes:", classes);

/* FILTER STUDENTS MANUALLY */

const studentList = (students || []).filter(s =>
  classes.includes(s.class)
);

/* TOTAL STUDENTS */

document.getElementById("total-assigned-students").textContent =
  studentList.length;

    // const studentList = students || [];

    /* TOTAL ASSIGNED STUDENTS */

    document.getElementById("total-assigned-students").textContent =
      studentList.length;

    /* DISPLAY CLASS CARDS */

    const classContainer =
      document.querySelectorAll(".assign-card-flex")[0];

    classContainer.innerHTML = "";

    classes.forEach(cls => {

      const classStudents =
        studentList.filter(s => s.class === cls);

      const card = document.createElement("div");
      card.className = "assign-card";

      card.innerHTML = `
        <h4>${cls}</h4>
        <p class="bold-p-assign">
          <i class="fa-solid fa-users"></i>
          ${classStudents.length} Students
        </p>
      `;

      classContainer.appendChild(card);

    });

    /* DISPLAY SUBJECT CARDS */

    const subjectContainer =
      document.querySelectorAll(".assign-card-flex")[1];

    subjectContainer.innerHTML = "";

    subjects.forEach(sub => {

      const card = document.createElement("div");
      card.className = "assign-card";

      card.innerHTML = `
        <h4>${sub}</h4>
        <p class="bold-p-assign">
          <i class="fa-solid fa-users"></i>
          ${studentList.length} Students
        </p>
      `;

      subjectContainer.appendChild(card);

    });

  } catch (err) {

    console.error("Dashboard error:", err);

  }

}

/* LOAD DASHBOARD */

document.addEventListener("DOMContentLoaded", () => {
  loadTeacherDashboard();
});