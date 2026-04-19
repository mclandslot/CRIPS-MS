
// Make sure this runs after DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  const addBtn = document.getElementById("addTeachersBtn");
  if (addBtn) {
    addBtn.addEventListener("click", submitTeacherForm);
  }
});

async function submitTeacherForm() {
  const btn = document.getElementById("addTeachersBtn");
  if (!btn) return;

  btn.disabled = true;
  btn.textContent = "Registering..."; // Optional UX feedback

  try {
    // ── Collect form values ────────────────────────────────────────
    const surname     = document.getElementById("teacher-surname")?.value.trim()     || "";
    const firstname   = document.getElementById("teacher-firstname")?.value.trim()   || "";
    const dob         = document.getElementById("datePicker")?.value                || "";
    const gender      = document.getElementById("teacher-gender")?.value            || "";
    const marital     = document.getElementById("marital-status")?.value            || "";
    const qualification = document.getElementById("Qualification")?.value         || "";
    const status      = document.querySelector('[name="teacher-Active-Status"]')?.value || "active";
    const phone       = document.getElementById("teacher-Phone")?.value.trim()      || "";
    const email       = document.getElementById("teacher-Email")?.value.trim()      || "";
    const address     = document.getElementById("teacher-Address")?.value.trim()    || "";
    const username    = document.getElementById("teacher-username")?.value.trim()   || "";
    const password    = document.getElementById("teacher-password")?.value          || "";

    // ── Basic client-side validation ───────────────────────────────
    if (!surname || !firstname || !email || !username || !password) {
      alert("Please fill all required fields (surname, firstname, email, username, password).");
      return;
    }

    // Optional: more specific validation
    if (!email.includes("@")) {
      alert("Please enter a valid email address.");
      return;
    }
    if (password.length < 6) {
      alert("Password must be at least 6 characters long.");
      return;
    }

    // ── Get Supabase client (assumes global window.supabaseClient) ──
    const supabase = window.supabaseClient;
    if (!supabase) {
      alert("Supabase client not initialized. Check your page setup.");
      return;
    }

    // ── Check active session ───────────────────────────────────────
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session?.access_token) {
      alert("Your session has expired. Please log in again.");
      window.location.href = "../login.html";
      return;
    }

    // ── Invoke edge function ───────────────────────────────────────
    const { data, error } = await supabase.functions.invoke("create-teacher", {
      body: {
        surname,
        firstname,
        date_of_birth: dob,           // ISO date string expected (YYYY-MM-DD)
        gender,
        marital_status: marital,
        qualification,
        status,
        phone,
        email,
        address,
        username,
        password
      }
      // No need to manually set Authorization header — supabase-js does it automatically
    });

    if (error) {
      console.error("Edge function error:", error);

      // Try to get more detailed message from the function response
      let errorMessage = error.message || "Failed to register teacher";

      if (error.context?.json) {
        try {
          const body = await error.context.json();
          errorMessage = body.error || body.message || errorMessage;
          console.log("Detailed response from edge function:", body);
        } catch {}
      }

      alert(`Registration failed:\n${errorMessage}`);
      return;
    }

    // ── Success ────────────────────────────────────────────────────
    alert("Teacher registered successfully ✅");

    // Reset form
    document.querySelectorAll("input.form-input, input[type='text'], input[type='password'], input[type='date']").forEach(el => {
      el.value = "";
    });

    document.querySelectorAll("select").forEach(select => {
      select.selectedIndex = 0;
    });

  } catch (err) {
    console.error("Unexpected client-side error:", err);
    alert("An unexpected error occurred. Please try again or contact support.");
  } finally {
    btn.disabled = false;
    btn.textContent = "Add Teacher"; // Reset button text
  }
}

