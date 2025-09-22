import { withCache } from '@/lib/cache/store';
import { CACHE_TAGS, CACHE_TTL, getTagsForTables } from '@/lib/cache/tags';
import { catchUpBalances } from './mock-data';
import type { CatchUpBalance } from '@/types/payments';

const CATCH_UP_CACHE_KEY = 'payments:catch-up:balances';

function cloneBalance(balance: CatchUpBalance): CatchUpBalance {
  return {
    ...balance,
    charges: balance.charges.map((charge) => ({ ...charge })),
    contacts: {
      ...balance.contacts,
      roommates: balance.contacts.roommates?.map((roommate) => ({ ...roommate })),
      propertyManager: balance.contacts.propertyManager
        ? { ...balance.contacts.propertyManager }
        : undefined,
      primary: { ...balance.contacts.primary },
    },
  };
}

export async function loadCatchUpBalances(): Promise<CatchUpBalance[]> {
  const tags = [
    CACHE_TAGS.payments.list,
    CACHE_TAGS.payments.summary,
    ...getTagsForTables('rent_payments', 'subscriptions'),
  ];

  return withCache<CatchUpBalance[]>(
    CATCH_UP_CACHE_KEY,
    { ttl: CACHE_TTL.paymentsSummary, tags },
    async () => catchUpBalances.map(cloneBalance)
  );
}
