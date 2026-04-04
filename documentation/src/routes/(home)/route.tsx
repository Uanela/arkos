import { createFileRoute } from "@tanstack/react-router";
import { Outlet } from "@tanstack/react-router";
import Footer from "./-components/footer";

export const Route = createFileRoute("/(home)")({
  component: HomeGroupLayout,
});

export default function HomeGroupLayout() {
  return (
    <>
      {/* <HomeLayout {...baseOptions()}> */}
      <Outlet />
      <Footer />
      {/* </HomeLayout> */}
    </>
  );
}
