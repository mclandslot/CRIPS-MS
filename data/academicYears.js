const supabaseAcademicYearsSave = window.supabaseClient;

const academicMessage = document.getElementById("form-feedback");

document.getElementById("save-year-btn")
  .addEventListener("click", saveAcademicYear);

async function saveAcademicYear() {

  const yearName =
    document.getElementById("year-name-date").value.trim();

  const isActive =
    document.getElementById("is-active-checkbox").checked;

  if (!yearName) {
    // alert("Please enter academic year");
    academicMessage.classList.add("show-message", "error");
    academicMessage.innerHTML = "Please enter academic year";
    setTimeout(()=>{
      academicMessage.classList.remove("show-message", "error");
    }, 4000);
    return;
  }

  try {

    // ✅ If setting active → deactivate others
    if (isActive) {
      const { error: resetError } =
        await supabaseAcademicYearsSave
          .from("academic_years")
          .update({ is_active: false })
          .neq("id", "00000000-0000-0000-0000-000000000000");

      if (resetError) throw resetError;
    }

    // ✅ Insert new year
    const { error } = await supabaseAcademicYearsSave
      .from("academic_years")
      .insert({
        year_name: yearName,
        is_active: isActive
      });

    if (error) throw error;

    // alert("Academic Year saved successfully");
     academicMessage.classList.add("show-message", "success");
    academicMessage.innerHTML = "Academic year saved successfully";
    setTimeout(()=>{
      academicMessage.classList.remove("show-message", "success");
    }, 4000);

    // Clear form
    document.getElementById("year-name-date").value = "";
    document.getElementById("is-active-checkbox").checked = false;

  } catch (err) {
    console.error("Error saving year:", err);
    alert("Error saving academic year");
  }
}




// const supabaseReport = window.supabaseClient;

/* =====================================
   LOAD ACADEMIC YEARS INTO DROPDOWN
===================================== */
async function loadAcademicYearsForReport() {

  const { data, error } = await supabaseAcademicYearsSave
    .from("academic_years")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    return;
  }

  const select = document.getElementById("academic-year-select");

  select.innerHTML = `<option value="">Select Academic Year</option>`;

  data.forEach(year => {
    const option = document.createElement("option");
    option.value = year.id;
    option.textContent = year.year_name;
    select.appendChild(option);
  });
}


/* =====================================
   SAVE TERM + REPORT SETTINGS
===================================== */
document.getElementById("save-report-settings")
  .addEventListener("click", saveReportSettings);

async function saveReportSettings() {

  const academicYearId =
    document.getElementById("academic-year-select").value;

  const termName =
    document.getElementById("term-name-set").value.trim();

  const startDate =
    document.getElementById("term-start-date").value;

  const endDate =
    document.getElementById("term-end-date").value;

  const vacationDate =
    document.getElementById("vacation-date").value;

  const nextTermDate =
    document.getElementById("next-term-date").value;

  if (!academicYearId || !termName) {
    // alert("Please fill all required fields");
     academicMessage.classList.add("show-message", "error");
    academicMessage.innerHTML = "Please fill all required fields";
    setTimeout(()=>{
      academicMessage.classList.remove("show-message", "error");
    }, 4000);
    return;
  }

  try {

    /* =====================================
       1. CHECK OR CREATE TERM
    ===================================== */
    let termId;

    const { data: existingTerm } = await supabaseAcademicYearsSave
      .from("terms")
      .select("*")
      .eq("name", termName)
      .eq("academic_year_id", academicYearId)
      .single();

    if (existingTerm) {

      termId = existingTerm.id;

    } else {

      const { data: newTerm, error: termError } =
        await supabaseAcademicYearsSave
          .from("terms")
          .insert({
            name: termName,
            academic_year_id: academicYearId,
            start_date: startDate,
            end_date: endDate
          })
          .select()
          .single();

      if (termError) throw termError;

      termId = newTerm.id;
    }


    /* =====================================
       2. SAVE REPORT SETTINGS
    ===================================== */
    const { error: reportError } =
      await supabaseAcademicYearsSave
        .from("report_settings")
        .upsert({
          academic_year_id: academicYearId,
          term_id: termId,
          vacation_date: vacationDate,
          next_term_date: nextTermDate
        });

    if (reportError) throw reportError;


    /* =====================================
       SUCCESS
    ===================================== */
    // alert("Report settings saved successfully");
     academicMessage.classList.add("show-message", "success");
    academicMessage.innerHTML = "Report settings saved successfully";
    setTimeout(()=>{
      academicMessage.classList.remove("show-message", "success");
    }, 4000);

    // Optional: reset form
    document.getElementById("term-name-set").value = "";
    document.getElementById("term-start-date").value = "";
    document.getElementById("term-end-date").value = "";
    document.getElementById("vacation-date").value = "";
    document.getElementById("next-term-date").value = "";

  } catch (err) {
    console.error("Error saving report settings:", err);
    // alert("Error saving data");
     academicMessage.classList.add("show-message", "error");
    academicMessage.innerHTML = "Error saving data";
    setTimeout(()=>{
      academicMessage.classList.remove("show-message", "error");
    }, 4000);
  }
}


async function loadAcademicYearsForDays() {

  const { data, error } = await supabaseAcademicYearsSave
    .from("academic_years")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    return;
  }

  const select = document.getElementById("select-academic-year-days");

  select.innerHTML = `<option value="">Select Academic Year</option>`;

  data.forEach(year => {
    const option = document.createElement("option");
    option.value = year.id;
    option.textContent = year.year_name;
    select.appendChild(option);
  });
}


document.getElementById("select-academic-year-days")
  .addEventListener("change", loadTermsForSelectedYear);

async function loadTermsForSelectedYear() {

  const yearId = document.getElementById("select-academic-year-days").value;

  console.log("Selected Year ID:", yearId);

  if (!yearId) return;

  const { data, error } = await supabaseAcademicYearsSave
    .from("terms")
    .select("*")
    .eq("academic_year_id", yearId);

  console.log("TERMS FROM DB:", data);

  if (error) {
    console.error(error);
    return;
  }

  // 🔥 ALWAYS re-fetch the element at runtime
  const termSelect = document.querySelector("#select-term-add-days");

  if (!termSelect) {
    console.error("Term select not found");
    return;
  }

  // Clear
  termSelect.options.length = 0;

  // Default option
  const defaultOption = document.createElement("option");
  defaultOption.value = "";
  defaultOption.textContent = "Select Term";
  termSelect.appendChild(defaultOption);

  // Add DB terms
  data.forEach(term => {
    const option = document.createElement("option");
    option.value = term.id;
    option.textContent = term.name;
    termSelect.appendChild(option);
  });

//   console.log("Dropdown element:", termSelect);
// console.log("Options count:", termSelect.options.length);

//   console.log("✅ Dropdown populated:", termSelect.options.length);
}


// save academic days
document.getElementById("save-term-btn")
  .addEventListener("click", saveTermDays);

async function saveTermDays() {

  const academicYearId =
    document.getElementById("select-academic-year-days").value;

  const termId =
    document.getElementById("select-term-add-days").value;

  const totalDays =
    document.getElementById("total-days-for-term").value;

  if (!academicYearId || !termId || !totalDays) {
    // alert("Please fill all fields");
     academicMessage.classList.add("show-message", "error");
    academicMessage.innerHTML = "Please fill all fields";
    setTimeout(()=>{
      academicMessage.classList.remove("show-message", "error");
    }, 4000);
    return;
  }

  try {

    const { error } = await supabaseAcademicYearsSave
      .from("term_days")
      .upsert({
        academic_year_id: academicYearId,
        term_id: termId,
        total_days: totalDays
      });

    if (error) throw error;

    // alert("Total days saved successfully");
     academicMessage.classList.add("show-message", "success");
    academicMessage.innerHTML = "Total days saved successfully";
    setTimeout(()=>{
      academicMessage.classList.remove("show-message", "success");
    }, 4000);

    // Reset
    document.getElementById("total-days-for-term").value = "";

  } catch (err) {
    console.error("Error saving term days:", err);
    // alert("Error saving data");
     academicMessage.classList.add("show-message", "error");
    academicMessage.innerHTML = "Error saving data";
    setTimeout(()=>{
      academicMessage.classList.remove("show-message", "error");
    }, 4000);
  }
}


/* =====================================
   INIT
===================================== */
document.addEventListener("DOMContentLoaded", () => {
  loadAcademicYearsForReport();
   loadAcademicYearsForDays();
    loadTermsForSelectedYear();
//    loadTermsForSelectedYear()

   
//   saveAcademicYear();
});


// document.getElementById("select-academic-year-days")
//   .addEventListener("change", () => {
//     loadTermsForSelectedYear();
//   });