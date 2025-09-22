import Image from "next/image";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Download, FileText, Paperclip } from "lucide-react";

interface AttachmentPreview {
  id: string;
  name: string;
  url: string;
  thumbnailUrl?: string | null;
  previewUrl?: string | null;
  contentType: string;
  size: number;
}

interface MessageAuthor {
  name: string;
  role: string;
  avatar: string;
  initials: string;
}

interface ThreadMessage {
  id: string;
  author: MessageAuthor;
  body: string;
  createdAt: string;
  attachments?: AttachmentPreview[];
}

interface ThreadSummary {
  id: string;
  title: string;
  updatedAt: string;
  messages: ThreadMessage[];
}

const mockThreads: ThreadSummary[] = [
  {
    id: "washer-repair",
    title: "Washer repair visit",
    updatedAt: "15 minutes ago",
    messages: [
      {
        id: "msg-1",
        author: {
          name: "Jordan Blake",
          role: "Roommate",
          avatar: "/avatars/01.png",
          initials: "JB",
        },
        body: "The repair tech is swinging by tomorrow at 9am. I uploaded the invoice and the before/after shots so everyone knows what to expect.",
        createdAt: "15 minutes ago",
        attachments: [
          {
            id: "att-1",
            name: "laundry-room.jpg",
            url: "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1200&q=60",
            thumbnailUrl: "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=320&q=60",
            previewUrl: "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=960&q=70",
            contentType: "image/jpeg",
            size: 2448126,
          },
          {
            id: "att-2",
            name: "repair-invoice.pdf",
            url: "https://example.com/repair-invoice.pdf",
            thumbnailUrl: null,
            previewUrl: null,
            contentType: "application/pdf",
            size: 328104,
          },
        ],
      },
      {
        id: "msg-2",
        author: {
          name: "Avery Cho",
          role: "Roommate",
          avatar: "/avatars/02.png",
          initials: "AC",
        },
        body: "Thanks for coordinating! I added the warranty card we need to keep on file. Supabase handled the thumbnail perfectly—no more guessing what attachment is which.",
        createdAt: "8 minutes ago",
        attachments: [
          {
            id: "att-3",
            name: "warranty-card.png",
            url: "https://images.unsplash.com/photo-1618005198919-d3d4b5a92eee?auto=format&fit=crop&w=1200&q=60",
            thumbnailUrl: "https://images.unsplash.com/photo-1618005198919-d3d4b5a92eee?auto=format&fit=crop&w=320&q=60",
            previewUrl: "https://images.unsplash.com/photo-1618005198919-d3d4b5a92eee?auto=format&fit=crop&w=960&q=70",
            contentType: "image/png",
            size: 1100234,
          },
        ],
      },
    ],
  },
  {
    id: "package-room",
    title: "Package room drop-off",
    updatedAt: "Yesterday",
    messages: [
      {
        id: "msg-3",
        author: {
          name: "Morgan Ruiz",
          role: "Property Manager",
          avatar: "/avatars/03.png",
          initials: "MR",
        },
        body: "Left the shelving kit in the package room. Preview is still processing but the file is ready to download if anyone wants to assemble early.",
        createdAt: "Yesterday",
        attachments: [
          {
            id: "att-4",
            name: "assembly-guide.docx",
            url: "https://example.com/assembly-guide.docx",
            thumbnailUrl: null,
            previewUrl: null,
            contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            size: 512000,
          },
        ],
      },
    ],
  },
];

const formatFileSize = (bytes: number) => {
  const units = ["B", "KB", "MB", "GB"] as const;
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
};

export function ThreadFeed() {
  return (
    <div className="space-y-6">
      {mockThreads.map((thread) => (
        <Card key={thread.id} className="border-primary/10 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base font-semibold">{thread.title}</CardTitle>
                <p className="text-xs text-muted-foreground">Active • updated {thread.updatedAt}</p>
              </div>
              <Badge variant="outline" className="text-xs">{thread.messages.length} messages</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {thread.messages.map((message, index) => (
              <div key={message.id}>
                <div className="flex gap-3">
                  <Avatar className="size-10 border">
                    <AvatarImage src={message.author.avatar} alt={message.author.name} />
                    <AvatarFallback>{message.author.initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{message.author.name}</span>
                      <Badge variant="secondary" className="text-[11px] uppercase tracking-wide">
                        {message.author.role}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{message.createdAt}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{message.body}</p>

                    {message.attachments?.length ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          <Paperclip className="size-3.5" />
                          <span>{message.attachments.length} attachment{message.attachments.length > 1 ? 's' : ''}</span>
                        </div>
                        <div className="flex flex-wrap gap-4">
                          {message.attachments.map((attachment) => {
                            const hasThumbnail = !!attachment.thumbnailUrl;
                            return (
                              <div key={attachment.id} className="w-32">
                                <div className="overflow-hidden rounded-md border bg-background">
                                  {hasThumbnail ? (
                                    <Image
                                      src={attachment.thumbnailUrl as string}
                                      alt={`${attachment.name} preview`}
                                      width={128}
                                      height={96}
                                      className="h-24 w-full object-cover"
                                      sizes="128px"
                                    />
                                  ) : (
                                    <div className="flex h-24 w-full items-center justify-center bg-muted">
                                      <FileText className="size-8 text-muted-foreground" />
                                    </div>
                                  )}
                                </div>
                                <div className="mt-2 truncate text-xs font-medium text-foreground" title={attachment.name}>
                                  {attachment.name}
                                </div>
                                <div className="text-[10px] text-muted-foreground">
                                  {formatFileSize(attachment.size)} • {attachment.contentType}
                                </div>
                                <Button variant="ghost" size="sm" className="mt-2 h-7 px-2 text-xs">
                                  <Download className="mr-1 size-3.5" />
                                  Download
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
                {index < thread.messages.length - 1 && <Separator className="my-5" />}
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
