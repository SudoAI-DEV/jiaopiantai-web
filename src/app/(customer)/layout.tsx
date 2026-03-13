import { getSession } from "@/lib/auth-utils";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { userProfiles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { CustomerHeader } from "@/components/shared/customer-header";

export default async function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session?.user) {
    redirect("/login");
  }

  // Get user profile with role check
  const profile = await db.query.userProfiles.findFirst({
    where: eq(userProfiles.id, session.user.id),
  });

  // Only allow customers (not admins) in customer area
  if (profile?.role === "admin") {
    redirect("/admin");
  }

  return (
    <div className="min-h-screen bg-[#FFF8E1] overflow-x-hidden">
      <CustomerHeader user={session.user} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
