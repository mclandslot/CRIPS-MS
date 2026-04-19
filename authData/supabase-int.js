async function protectPage(requiredRole) {

    const { data } = await supabaseClient.auth.getSession();

    if (!data.session) {
        window.location.href = "/index.html";
        return;
    }

    const { data: profile } = await supabaseClient
        .from("profiles")
        .select("role")
        .eq("id", data.session.user.id)
        .single();

    if (profile.role !== requiredRole) {
        window.location.href = "/index.html";
    }
}

protectPage("system_admin");
