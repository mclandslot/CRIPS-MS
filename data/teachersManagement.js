const supabaseTeachersData = window.supabaseClient;
const supabaseTeachers = window.supabaseClient;

const addTeacherBtn = document.getElementById("addTeachersBtn");

let editingTeacherId = null;
const feedBackMessage = document.getElementById("form-feedback");

/* =====================================
   ROLE MAPPING (FIXED 🔥)
===================================== */
function mapProfileRole(role) {
  const value = String(role || "").trim().toLowerCase();

  if (value === "administrator" || value === "admin") return "admin";
  if (value === "system admin" || value === "system_admin") return "system_admin";
  if (value === "head teacher" || value === "head_teacher") return "head_teacher";
  if (value === "teacher") return "teacher";

  return "";
}

/* =====================================
   EVENT
===================================== */
if (addTeacherBtn) {
  addTeacherBtn.addEventListener("click", registerTeacher);
}

/* =====================================
   REGISTER TEACHER
===================================== */
async function registerTeacher() {
  try {

    const surname = document.getElementById("teacher-surname").value.trim();
    const firstname = document.getElementById("teacher-firstname").value.trim();
    const dob = document.getElementById("datePicker-dob")?.value || null;
    const gender = document.getElementById("teacher-gender").value;
    const marital = document.getElementById("marital-status").value;
    const qualification = document.getElementById("Qualification").value;

    const status =
      document.querySelector('[name="teacher-Active-Status"]:checked')?.value ||
      "Active";

    const phone = document.getElementById("teacher-Phone").value.trim();
    const email = document.getElementById("teacher-Email").value.trim().toLowerCase();
    const address = document.getElementById("teacher-Address").value.trim();

    const role = document.getElementById("role").value;
    const password = document.getElementById("teacher-password").value;

    const employedDate = document.getElementById("employed-date")?.value || null;

    if (!surname || !firstname || !gender || !phone || !email || !role || !password) {
      feedBackMessage.classList.add("show-message", "error");
      feedBackMessage.innerHTML = "Fill all required fields (*)";
      setTimeout(() => {
        feedBackMessage.classList.remove("show-message", "error");
      }, 3000);
      return;
    }

    /* =========================
       ROLE FIX
    ========================= */
    const formattedRole = mapProfileRole(role);

    if (!formattedRole) {
      alert("Invalid role selected");
      return;
    }

    /* =========================
       IMAGE UPLOAD
    ========================= */
    let pictureUrl = null;

    const file = document.getElementById("teacher-picture").files[0];

    if (file) {
      const filePath = `teachers/${Date.now()}-${file.name}`;

      const { error: uploadError } =
        await supabaseTeachers.storage
          .from("teacher-pictures")
          .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } =
        supabaseTeachers.storage
          .from("teacher-pictures")
          .getPublicUrl(filePath);

      pictureUrl = data.publicUrl;
    }

    /* =========================
       CREATE AUTH USER
    ========================= */
    const { data: authUser, error: authError } =
      await supabaseTeachers.auth.signUp({
        email,
        password
      });

    if (authError) throw authError;

    const userId = authUser.user.id;

    /* =========================
       SAVE TEACHER TABLE
    ========================= */
    const { error: teacherError } =
      await supabaseTeachers
        .from("teachers")
        .insert({
          id: userId,
          surname,
          first_name: firstname,
          dob: dob || null,
          gender,
          marital_status: marital,
          qualification,
          status,
          phone,
          email,
          address,
          role,
          employed_date: employedDate || null,
          picture_url: pictureUrl
        });

    if (teacherError) throw teacherError;

    /* =========================
       SAVE PROFILE (FIXED 🔥)
    ========================= */
    const fullName = `${surname} ${firstname}`.trim();

    const { error: profileError } =
      await supabaseTeachers
        .from("profiles")
        .upsert({
          id: userId,
          full_name: fullName,
          email: email,
          role: formattedRole, // 🔥 FIXED HERE
          is_active: true,
          must_change_password: true
        }, {
          onConflict: "id"
        });

    if (profileError) throw profileError;

    /* =========================
       SUCCESS UI
    ========================= */
    feedBackMessage.classList.add("show-message", "success");
    feedBackMessage.innerHTML = "Teacher added successfully";

    setTimeout(() => {
      feedBackMessage.classList.remove("show-message", "success");
    }, 4000);

    loadTeachers();

  } catch (err) {
    console.error("Teacher error:", err);
    alert(err.message);
  }
}


async function loadTotalTeachers() {

  const el = document.getElementById("total-teachers");
  if (!el) return;

  try {

    const { count, error } = await supabaseTeachers
      .from("teachers")
      .select("*", { count: "exact", head: true });

    if (error) throw error;

    el.textContent = count || 0;

  } catch (err) {
    console.error("Error loading teacher count:", err.message);
    el.textContent = "0";
  }
}

loadTotalTeachers();