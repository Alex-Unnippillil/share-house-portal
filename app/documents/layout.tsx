import type { ReactNode } from "react";

interface DocumentsLayoutProps {
  children: ReactNode;
  modal: ReactNode;
}

export default function DocumentsLayout({ children, modal }: DocumentsLayoutProps) {
  return (
    <>
      {children}
      {modal}
    </>
  );
}
