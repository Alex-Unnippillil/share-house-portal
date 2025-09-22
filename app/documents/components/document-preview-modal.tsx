"use client";

import { RouteModal } from "@/components/route-modal";
import type { DocumentWithLease } from "@/types/documents";
import { DocumentPreviewContent } from "./document-preview-content";

interface DocumentPreviewModalProps {
  document: DocumentWithLease;
}

export function DocumentPreviewModal({ document }: DocumentPreviewModalProps) {
  return (
    <RouteModal returnTo="/documents">
      <DocumentPreviewContent document={document} />
    </RouteModal>
  );
}
