import Header from "@/components/Header";
import Footer from "@/components/Footer";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      <main className="pt-[72px] pb-[100px] lg:pb-[72px] px-4 md:px-6 min-h-screen bg-gray-bg">
        <div className="max-w-[1060px] mx-auto flex gap-8">
          <DashboardSidebar />
          <div className="flex-1 min-w-0">{children}</div>
        </div>
      </main>
      <Footer />
    </>
  );
}
