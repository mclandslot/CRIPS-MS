async function checkMustChangePassword() {
    const supabase = window.supabaseClient;
  
    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser();
  
    if (userError || !user) return;
  
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("must_change_password")
      .eq("id", user.id)
      .single();
  
    if (profileError || !profile) return;
  
    if (profile.must_change_password) {
      const modal = document.getElementById("change-password-modal");
      if (modal) {
        modal.style.display = "flex";
      }
    }
  }
  
  document.addEventListener("DOMContentLoaded", async () => {
    await checkMustChangePassword();
  });



  document.getElementById("save-staff-password-btn")?.addEventListener("click", updateOwnPassword);

function showStaffPasswordFeedback(message, type = "error") {
  const el = document.getElementById("staff-password-feedback");
  if (!el) return;

  el.textContent = message;
  el.className = type;
}

async function updateOwnPassword() {
  const supabase = window.supabaseClient;

  const newPassword = document.getElementById("staff-new-password")?.value?.trim() || "";
  const confirmPassword = document.getElementById("staff-confirm-password")?.value?.trim() || "";

  if (!newPassword || !confirmPassword) {
    showStaffPasswordFeedback("Fill in all fields.");
    return;
  }

  if (newPassword.length < 6) {
    showStaffPasswordFeedback("Password must be at least 6 characters.");
    return;
  }

  if (newPassword !== confirmPassword) {
    showStaffPasswordFeedback("Passwords do not match.");
    return;
  }

  try {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) {
      showStaffPasswordFeedback(error.message);
      return;
    }

    const userId = data?.user?.id;
    if (!userId) {
      showStaffPasswordFeedback("Unable to find user.");
      return;
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .update({ must_change_password: false })
      .eq("id", userId);

    if (profileError) {
      showStaffPasswordFeedback(profileError.message);
      return;
    }

    showStaffPasswordFeedback("Password changed successfully.", "success");

    setTimeout(() => {
      const modal = document.getElementById("change-password-modal");
      if (modal) modal.style.display = "none";
    }, 1000);

  } catch (error) {
    console.error(error);
    showStaffPasswordFeedback("Failed to change password.");
  }
}