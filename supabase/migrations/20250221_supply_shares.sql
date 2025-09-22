-- Create supply_shares table to track per-member shares of a purchase
CREATE TABLE public.supply_shares (
  purchase_id UUID NOT NULL,
  member_id UUID NOT NULL,
  share_cents INTEGER NOT NULL,
  settled BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT supply_shares_purchase_member_pk PRIMARY KEY (purchase_id, member_id),
  CONSTRAINT supply_shares_purchase_id_fkey FOREIGN KEY (purchase_id)
    REFERENCES public.supply_purchases (id)
    ON DELETE CASCADE,
  CONSTRAINT supply_shares_member_id_fkey FOREIGN KEY (member_id)
    REFERENCES public.members (id)
    ON DELETE CASCADE,
  CONSTRAINT supply_shares_share_cents_check CHECK (share_cents >= 0)
);

-- Index member settlement state to support ledger lookups
CREATE INDEX idx_supply_shares_member_settled
  ON public.supply_shares (member_id, settled);
