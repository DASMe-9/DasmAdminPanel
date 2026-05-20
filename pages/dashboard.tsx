import type { GetServerSideProps } from "next";

export const getServerSideProps: GetServerSideProps = async () => ({
  redirect: {
    destination: "/admin/control-room",
    permanent: false,
  },
});

export default function DashboardRedirect() {
  return null;
}
