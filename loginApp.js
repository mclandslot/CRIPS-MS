



// LOGIN FUNCTION
async function handleLogin(e) {
  e.preventDefault();

  const email = document.getElementById("user_name").value.trim();
  const password = document.getElementById("password").value.trim();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    alert(error.message);
    return;
  }

  await redirectUser();
}


// REDIRECT BASED ON ROLE
async function redirectUser() {
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", user.id)
    .single();

  if (!profile || !profile.is_active) {
    await supabase.auth.signOut();
    window.location.href = "/login.html";
    return;
  }

  if (profile.role === "system_admin") {
    window.location.href = "../admin_page/index.html";
  }

  if (profile.role === "admin") {
    window.location.href = "../admin_page/index.html";
  }

  if (profile.role === "head_teacher") {
    window.location.href = "/head/dashboard.html";
  }

  if (profile.role === "teacher") {
    window.location.href = "/teacher/dashboard.html";
  }
}

document.addEventListener("DOMContentLoaded", () => {

  const passwordInput = document.getElementById("user_password");
  const toggleIcon = document.getElementById("toggle-password");

  if (!passwordInput || !toggleIcon) {
    console.error("Password or icon not found");
    return;
  }

  toggleIcon.addEventListener("click", () => {

    console.log("Eye clicked"); // 🔥 debug

    if (passwordInput.type === "password") {
      passwordInput.type = "text";
      toggleIcon.classList.remove("fa-eye");
      toggleIcon.classList.add("fa-eye-slash");
    } else {
      passwordInput.type = "password";
      toggleIcon.classList.remove("fa-eye-slash");
      toggleIcon.classList.add("fa-eye");
    }

  });

});