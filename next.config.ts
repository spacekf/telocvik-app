import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "bcryptjs"],
  async redirects() {
    // Cesty byly lokalizovány do češtiny – staré anglické (/teacher/*, /student/*,
    // /login, /change-password) i historické /admin/* přesměruj na nové české.
    // Explicitní řádek pro každou stránku (mění se i vnořené slugy), wildcard
    // fallback na konci jako záchrana.
    return [
      // Veřejné / společné
      { source: "/login", destination: "/prihlaseni", permanent: true },
      { source: "/change-password", destination: "/zmena-hesla", permanent: true },

      // Žák
      { source: "/student", destination: "/zak", permanent: true },
      { source: "/student/athletics", destination: "/zak/atletika", permanent: true },
      { source: "/student/fitness", destination: "/zak/zdatnost", permanent: true },
      { source: "/student/attendance", destination: "/zak/dochazka", permanent: true },
      { source: "/student/progress", destination: "/zak/vyvoj", permanent: true },
      { source: "/student/scoring", destination: "/zak/bodovani", permanent: true },

      // Učitel
      { source: "/teacher", destination: "/ucitel", permanent: true },
      {
        source: "/teacher/results/athletics",
        destination: "/ucitel/vysledky/atletika",
        permanent: true,
      },
      {
        source: "/teacher/results/fitness",
        destination: "/ucitel/vysledky/zdatnost",
        permanent: true,
      },
      { source: "/teacher/attendance", destination: "/ucitel/dochazka", permanent: true },
      { source: "/teacher/students", destination: "/ucitel/zaci", permanent: true },
      { source: "/teacher/students/:id", destination: "/ucitel/zaci/:id", permanent: true },
      { source: "/teacher/users", destination: "/ucitel/zaci", permanent: true },
      { source: "/teacher/teachers", destination: "/ucitel/ucitele", permanent: true },
      { source: "/teacher/classes", destination: "/ucitel/skupiny", permanent: true },
      { source: "/teacher/terms", destination: "/ucitel/pololeti", permanent: true },
      { source: "/teacher/school-years", destination: "/ucitel/skolni-roky", permanent: true },
      {
        source: "/teacher/school-years/rollover",
        destination: "/ucitel/skolni-roky/prevod",
        permanent: true,
      },
      { source: "/teacher/scoring", destination: "/ucitel/bodovani", permanent: true },
      { source: "/teacher/import", destination: "/ucitel/import", permanent: true },
      { source: "/teacher/history", destination: "/ucitel/historie", permanent: true },
      { source: "/teacher/audit-log", destination: "/ucitel/historie", permanent: true },

      // Zrušená stránka Audit log – splynula s Historií změn (filtry zůstaly)
      { source: "/ucitel/audit", destination: "/ucitel/historie", permanent: true },

      // Zrušená stránka Účty – zakládání osob je na stránkách Žáci a Učitelé
      { source: "/ucitel/uzivatele", destination: "/ucitel/zaci", permanent: true },

      // Historické /admin/* (role ADMIN byla zrušena)
      { source: "/admin", destination: "/ucitel", permanent: true },
      { source: "/admin/users", destination: "/ucitel/zaci", permanent: true },
      { source: "/admin/students", destination: "/ucitel/zaci", permanent: true },
      { source: "/admin/teachers", destination: "/ucitel/ucitele", permanent: true },
      { source: "/admin/classes", destination: "/ucitel/skupiny", permanent: true },
      { source: "/admin/school-years", destination: "/ucitel/skolni-roky", permanent: true },
      { source: "/admin/terms", destination: "/ucitel/pololeti", permanent: true },
      { source: "/admin/scoring", destination: "/ucitel/bodovani", permanent: true },
      { source: "/admin/import", destination: "/ucitel/import", permanent: true },
      { source: "/admin/audit-log", destination: "/ucitel/historie", permanent: true },

      // Wildcard fallback pro cokoli, co výše nepokrývá
      { source: "/admin/:path*", destination: "/ucitel", permanent: true },
      { source: "/teacher/:path*", destination: "/ucitel", permanent: true },
      { source: "/student/:path*", destination: "/zak", permanent: true },
    ];
  },
};

export default nextConfig;
