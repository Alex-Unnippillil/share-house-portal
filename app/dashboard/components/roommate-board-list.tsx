'use client';

import { VirtualizedList } from '@/components/ui/virtualized-list';

type RoommateMessage = {
  id: string;
  content: string;
};

interface RoommateBoardListProps {
  messages: RoommateMessage[];
}

export function RoommateBoardList({ messages }: RoommateBoardListProps) {
  if (messages.length === 0) {
    return null;
  }

  return (
    <VirtualizedList
      items={messages}
      estimateSize={(item) => (item.content.length > 120 ? 72 : 56)}
      getKey={(item) => item.id}
      overscan={4}
      itemClassName="py-2 text-sm"
      role="list"
      itemRole="listitem"
      parentProps={{ className: 'relative text-sm' }}
      fallbackParentProps={{ className: 'text-sm' }}
      useWindowScroll
    >
      {({ item }) => (
        <p className="leading-snug">{item.content}</p>
      )}
    </VirtualizedList>
  );
}
