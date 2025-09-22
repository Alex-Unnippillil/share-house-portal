CREATE TABLE public.supply_purchases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  supply_item_id UUID NOT NULL REFERENCES public.supply_items(id) ON DELETE CASCADE,
  household_id UUID NOT NULL REFERENCES public.households(id),
  member_id UUID NOT NULL REFERENCES public.members(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  price_cents INTEGER NOT NULL CHECK (price_cents > 0),
  receipt_url TEXT,
  purchased_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
