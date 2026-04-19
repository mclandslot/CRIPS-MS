async function protectTeacherPage() {

  const { data } = await supabaseTeacherDashboard.auth.getSession();

  if (!data.session) {
    window.location.href = "/login.html";
  }

}

protectTeacherPage();


const supabaseTeachers = window.supabaseClient;

async function logout() {
  const singOutBnt = document.getElementById('btn-yes-logout');
  singOutBnt.innerHTML = 'signing out..';
  await supabaseClient.auth.signOut();
  window.location.replace("/login.html"); // prevents back-button access
}


async function loadTeacherInfo() {

  const { data } = await supabaseClient.auth.getUser();

  const { data: profile } = await supabaseClient
    .from("profiles")
    .select("full_name")
    .eq("id", data.user.id)
    .single();

  document.getElementById("teacher-name").textContent = profile.full_name;
}
