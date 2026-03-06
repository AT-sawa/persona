import { createClient } from "@/lib/supabase/server";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Server-side auth: single call replaces 3 client-side calls
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isAdmin = false;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();
    isAdmin = data?.is_admin ?? false;
  }

  return (
    <>
      <Header isLoggedIn={true} />
      <main className="pt-[72px] pb-[100px] lg:pb-[72px] px-4 md:px-8 min-h-screen bg-gray-bg">
        <div className="max-w-[1320px] mx-auto flex gap-8">
          <DashboardSidebar isAdmin={isAdmin} />
          <div className="flex-1 min-w-0">{children}</div>
        </div>
      </main>
      <Footer />
    </>
  );
}
