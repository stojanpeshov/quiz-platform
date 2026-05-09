import { Outlet } from "react-router-dom";
import { NavBar } from "../components/NavBar";

// Wraps every authenticated route — provides the persistent NavBar and a
// full-bleed content area. Replaces the root app/layout.tsx.
export function Layout() {
  return (
    <>
      <NavBar />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <Outlet />
      </main>
    </>
  );
}
