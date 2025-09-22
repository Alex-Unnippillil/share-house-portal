import type { ReactNode } from "react";

interface BookingsLayoutProps {
  children: ReactNode;
  modal: ReactNode;
}

export default function BookingsLayout({ children, modal }: BookingsLayoutProps) {
  return (
    <>
      {children}
      {modal}
    </>
  );
}
