const supabaseSubjects = window.supabaseClient;

/* =====================================
   GLOBAL STATE
===================================== */
let selectedSubjectsArray = [];
let editSelectedSubjects = [];
let currentEditTeacher = null;
let currentEditClass = null;

/* =====================================
   HELPERS
===================================== */
function showFormFeedback(message, type = "error") {
  const messageResponse = document.getElementById("form-feedback");

  if (!messageResponse) {
    alert(String(message).replace(/<[^>]*>/g, ""));
    return;
  }

  messageResponse.classList.remove("show-message", "error", "success");
  messageResponse.innerHTML = message;
  messageResponse.classList.add("show-message", type);

  setTimeout(() => {
    messageResponse.classList.remove("show-message", "error", "success");
    messageResponse.innerHTML = "";
  }, 3000);
}

function resetAssignSubjectTags() {
  selectedSubjectsArray = [];
  document.querySelectorAll("#subjectTags .tag").forEach((tag) => {
    tag.classList.remove("active");
  });
}

function resetEditSubjectTags() {
  editSelectedSubjects = [];
  document.querySelectorAll("#editSubjectTags .tag").forEach((tag) => {
    tag.classList.remove("active");
  });
}

/* =====================================
   LOAD TEACHERS
===================================== */
async function loadTeachersForSubjects() {
  const select = document.getElementById("assigned-select-teacher");
  if (!select) return;

  select.innerHTML = `<option value="">Loading teachers...</option>`;

  try {
    const { data, error } = await supabaseSubjects
      .from("teachers")
      .select("id, surname, first_name")
      .order("surname", { ascending: true });

    if (error) throw error;

    select.innerHTML = `<option value="">Select Teacher</option>`;

    (data || []).forEach((teacher) => {
      const option = document.createElement("option");
      option.value = teacher.id;
      option.textContent =
        `${teacher.surname || ""} ${teacher.first_name || ""}`.trim();
      select.appendChild(option);
    });
  } catch (err) {
    console.error("Error loading teachers:", err);
    select.innerHTML = `<option value="">Failed to load teachers</option>`;
  }
}

/* =====================================
   LOAD CLASSES
===================================== */
async function loadClassesForSubjects() {
  const select = document.getElementById("select-class-to-assigned-subject");
  if (!select) return;

  select.innerHTML = `<option value="">Loading classes...</option>`;

  try {
    const { data, error } = await supabaseSubjects
      .from("classes")
      .select("id, class_name")
      .order("class_name", { ascending: true });

    if (error) throw error;

    select.innerHTML = `<option value="">Select Class</option>`;

    (data || []).forEach((cls) => {
      const option = document.createElement("option");
      option.value = cls.id;
      option.textContent = cls.class_name || "";
      select.appendChild(option);
    });
  } catch (err) {
    console.error("Error loading classes:", err);
    select.innerHTML = `<option value="">Failed to load classes</option>`;
  }
}

/* =====================================
   SUBJECT TAG SELECTION
===================================== */
function setupSubjectTags() {
  const tags = document.querySelectorAll("#subjectTags .tag");

  tags.forEach((tag) => {
    tag.addEventListener("click", () => {
      const value = tag.dataset.value;
      if (!value) return;

      if (selectedSubjectsArray.includes(value)) {
        selectedSubjectsArray = selectedSubjectsArray.filter((s) => s !== value);
        tag.classList.remove("active");
      } else {
        selectedSubjectsArray.push(value);
        tag.classList.add("active");
      }
    });
  });
}

/* =====================================
   ASSIGN SUBJECTS
===================================== */
async function assignSubjectsToTeacher() {
  const teacherId =
    document.getElementById("assigned-select-teacher")?.value || "";
  const classId =
    document.getElementById("select-class-to-assigned-subject")?.value || "";

  if (!teacherId || !classId || selectedSubjectsArray.length === 0) {
    showFormFeedback(
      '<i class="fa-solid fa-circle-xmark"></i> Please select teacher, class and subject',
      "error"
    );
    return;
  }

  try {
    const { error: deleteError } = await supabaseSubjects
      .from("teacher_subject_assignments")
      .delete()
      .eq("teacher_id", teacherId)
      .eq("class_id", classId);

    if (deleteError) throw deleteError;

    const inserts = selectedSubjectsArray.map((subject) => ({
      teacher_id: teacherId,
      class_id: classId,
      subject
    }));

    const { error: insertError } = await supabaseSubjects
      .from("teacher_subject_assignments")
      .insert(inserts);

    if (insertError) throw insertError;

    showFormFeedback(
      '<i class="fa-solid fa-circle-check"></i> Subjects assigned successfully',
      "success"
    );

    resetAssignSubjectTags();
    await loadSubjectAssignments();
  } catch (err) {
    console.error("Assign subjects error:", err);
    showFormFeedback(
      '<i class="fa-solid fa-circle-xmark"></i> Error assigning subjects',
      "error"
    );
  }
}

/* =====================================
   LOAD ASSIGNMENTS
===================================== */
async function loadSubjectAssignments() {
  const tableBody = document.getElementById("subject-assignment-table-body");
  if (!tableBody) return;

  tableBody.innerHTML = `<tr><td colspan="4">Loading...</td></tr>`;

  try {
    const { data, error } = await supabaseSubjects
      .from("teacher_subject_assignments")
      .select(`
        id,
        teacher_id,
        class_id,
        subject,
        teachers (surname, first_name),
        classes (class_name)
      `)
      .order("subject", { ascending: true });

    if (error) throw error;

    if (!data || data.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="4">No assignments found</td></tr>`;
      return;
    }

    const grouped = {};

    data.forEach((item) => {
      const key = `${item.teacher_id}_${item.class_id}`;

      if (!grouped[key]) {
        grouped[key] = {
          ids: [],
          teacher: `${item.teachers?.surname || ""} ${item.teachers?.first_name || ""}`.trim(),
          class: item.classes?.class_name || "",
          teacher_id: item.teacher_id,
          class_id: item.class_id,
          subjects: []
        };
      }

      grouped[key].ids.push(item.id);
      grouped[key].subjects.push(item.subject);
    });

    let html = "";

    Object.values(grouped).forEach((item) => {
      const idsString = item.ids.join(",");

      html += `
        <tr>
          <td>${item.teacher}</td>
          <td>${item.class}</td>
          <td>${item.subjects.join(" • ")}</td>
          <td>
            <button
              type="button"
              class="edit-btn"
              onclick="window.editSubjects('${item.teacher_id}','${item.class_id}')"
            >
              <i class="fa-solid fa-eye"></i>
            </button>
            <button
              type="button"
              class="delete-btn"
              onclick="window.deleteAssignmentByIds('${idsString}')"
            >
              <i class="fa-solid fa-trash"></i>
            </button>
          </td>
        </tr>
      `;
    });

    tableBody.innerHTML = html;
  } catch (err) {
    console.error("Load assignments error:", err);
    tableBody.innerHTML = `<tr><td colspan="4">Error loading data</td></tr>`;
  }
}

/* =====================================
   EDIT
===================================== */
async function editSubjects(teacherId, classId) {
  const modal = document.getElementById("edit-subject-modal");
  if (modal) modal.style.display = "flex";

  currentEditTeacher = teacherId;
  currentEditClass = classId;
  resetEditSubjectTags();

  try {
    const { data, error } = await supabaseSubjects
      .from("teacher_subject_assignments")
      .select("subject")
      .eq("teacher_id", teacherId)
      .eq("class_id", classId);

    if (error) throw error;

    editSelectedSubjects = (data || []).map((d) => d.subject);

    document.querySelectorAll("#editSubjectTags .tag").forEach((tag) => {
      tag.classList.toggle(
        "active",
        editSelectedSubjects.includes(tag.dataset.value)
      );
    });
  } catch (err) {
    console.error("Edit subjects load error:", err);
    showFormFeedback(
      '<i class="fa-solid fa-circle-xmark"></i> Error loading assignment for editing',
      "error"
    );
  }
}

/* =====================================
   UPDATE
===================================== */
async function updateSubjects() {
  if (!currentEditTeacher || !currentEditClass) {
    showFormFeedback(
      '<i class="fa-solid fa-circle-xmark"></i> No assignment selected for update',
      "error"
    );
    return;
  }

  if (editSelectedSubjects.length === 0) {
    showFormFeedback(
      '<i class="fa-solid fa-circle-xmark"></i> Select at least one subject',
      "error"
    );
    return;
  }

  try {
    const { error: deleteError } = await supabaseSubjects
      .from("teacher_subject_assignments")
      .delete()
      .eq("teacher_id", currentEditTeacher)
      .eq("class_id", currentEditClass);

    if (deleteError) throw deleteError;

    const inserts = editSelectedSubjects.map((subject) => ({
      teacher_id: currentEditTeacher,
      class_id: currentEditClass,
      subject
    }));

    const { error: insertError } = await supabaseSubjects
      .from("teacher_subject_assignments")
      .insert(inserts);

    if (insertError) throw insertError;

    showFormFeedback(
      '<i class="fa-solid fa-circle-check"></i> Subjects updated successfully',
      "success"
    );

    closeEditModal();
    await loadSubjectAssignments();
  } catch (err) {
    console.error("Update subjects error:", err);
    showFormFeedback(
      '<i class="fa-solid fa-circle-xmark"></i> Error updating subjects',
      "error"
    );
  }
}

/* =====================================
   DELETE
===================================== */
async function deleteAssignmentByIds(idsString) {
  if (!idsString) {
    showFormFeedback(
      '<i class="fa-solid fa-circle-xmark"></i> Invalid assignment selected',
      "error"
    );
    return;
  }

  const ids = idsString
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  if (!ids.length) {
    showFormFeedback(
      '<i class="fa-solid fa-circle-xmark"></i> No valid rows found to delete',
      "error"
    );
    return;
  }

  if (!confirm("Delete this assignment?")) return;

  try {
    const { data, error } = await supabaseSubjects
      .from("teacher_subject_assignments")
      .delete()
      .in("id", ids)
      .select("id, subject");

    if (error) throw error;

    if (!data || data.length === 0) {
      showFormFeedback(
        '<i class="fa-solid fa-circle-xmark"></i> No assignment rows were deleted',
        "error"
      );
      return;
    }

    showFormFeedback(
      '<i class="fa-solid fa-circle-check"></i> Assignment deleted successfully',
      "success"
    );

    await loadSubjectAssignments();
  } catch (err) {
    console.error("Delete assignment error:", err);
    showFormFeedback(
      '<i class="fa-solid fa-circle-xmark"></i> Error deleting assignment',
      "error"
    );
  }
}

/* =====================================
   EDIT TAGS
===================================== */
function setupEditTags() {
  const tags = document.querySelectorAll("#editSubjectTags .tag");

  tags.forEach((tag) => {
    tag.addEventListener("click", () => {
      const value = tag.dataset.value;
      if (!value) return;

      if (editSelectedSubjects.includes(value)) {
        editSelectedSubjects = editSelectedSubjects.filter((s) => s !== value);
        tag.classList.remove("active");
      } else {
        editSelectedSubjects.push(value);
        tag.classList.add("active");
      }
    });
  });
}

function closeEditModal() {
  const modal = document.getElementById("edit-subject-modal");
  if (modal) modal.style.display = "none";

  currentEditTeacher = null;
  currentEditClass = null;
  resetEditSubjectTags();
}

function openAssignSubjectsModal() {
  const modal = document.getElementById("assigned-subjects");

  if (modal) {
    modal.style.display = "flex";
  }

  loadTeachersForSubjects();
  loadClassesForSubjects();
  resetAssignSubjectTags();
}

/* =====================================
   EXPOSE TO WINDOW
===================================== */
window.editSubjects = editSubjects;
window.deleteAssignmentByIds = deleteAssignmentByIds;
window.openAssignSubjectsModal = openAssignSubjectsModal;
window.closeEditModal = closeEditModal;
window.updateSubjects = updateSubjects;

/* =====================================
   INIT
===================================== */
document.addEventListener("DOMContentLoaded", () => {
  console.log("subject assignment js loaded");

  setupSubjectTags();
  setupEditTags();
  loadSubjectAssignments();

  const btn = document.getElementById("assignSubjects");
  if (btn) {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      assignSubjectsToTeacher();
    });
  }

  const updateBtn = document.getElementById("updateSubjectsBtn");
  if (updateBtn) {
    updateBtn.addEventListener("click", (e) => {
      e.preventDefault();
      updateSubjects();
    });
  }
});