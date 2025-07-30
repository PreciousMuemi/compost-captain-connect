-- Add blockchain sync fields to track which records have been logged to blockchain
ALTER TABLE public.waste_reports 
ADD COLUMN blockchain_synced BOOLEAN DEFAULT false,
ADD COLUMN blockchain_tx_hash TEXT,
ADD COLUMN blockchain_block_number INTEGER;

ALTER TABLE public.processing_batches 
ADD COLUMN blockchain_synced BOOLEAN DEFAULT false,
ADD COLUMN blockchain_tx_hash TEXT,
ADD COLUMN blockchain_block_number INTEGER;

ALTER TABLE public.products 
ADD COLUMN blockchain_synced BOOLEAN DEFAULT false,
ADD COLUMN blockchain_tx_hash TEXT,
ADD COLUMN blockchain_block_number INTEGER;

ALTER TABLE public.payments 
ADD COLUMN blockchain_synced BOOLEAN DEFAULT false,
ADD COLUMN blockchain_tx_hash TEXT,
ADD COLUMN blockchain_block_number INTEGER;

-- Add blockchain events table to track all blockchain events
CREATE TABLE public.blockchain_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    contract_address TEXT NOT NULL,
    transaction_hash TEXT NOT NULL,
    block_number INTEGER NOT NULL,
    event_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add blockchain transactions table
CREATE TABLE public.blockchain_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_hash TEXT UNIQUE NOT NULL,
    from_address TEXT NOT NULL,
    to_address TEXT NOT NULL,
    amount DECIMAL(20,18) NOT NULL,
    transaction_type TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed')),
    block_number INTEGER,
    gas_used INTEGER,
    gas_price DECIMAL(20,18),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS for new tables
ALTER TABLE public.blockchain_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blockchain_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for blockchain_events
CREATE POLICY "Admin can view blockchain events" ON public.blockchain_events
    FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can insert blockchain events" ON public.blockchain_events
    FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for blockchain_transactions
CREATE POLICY "Admin can view blockchain transactions" ON public.blockchain_transactions
    FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can insert blockchain transactions" ON public.blockchain_transactions
    FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create function to update blockchain sync status
CREATE OR REPLACE FUNCTION public.update_blockchain_sync_status(
    table_name TEXT,
    record_id UUID,
    tx_hash TEXT,
    block_number INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    EXECUTE format('
        UPDATE public.%I 
        SET blockchain_synced = true, 
            blockchain_tx_hash = %L, 
            blockchain_block_number = %L,
            updated_at = now()
        WHERE id = %L
    ', table_name, tx_hash, block_number, record_id);
END;
$$;

-- Create function to log blockchain event
CREATE OR REPLACE FUNCTION public.log_blockchain_event(
    event_type TEXT,
    contract_address TEXT,
    transaction_hash TEXT,
    block_number INTEGER,
    event_data JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
    event_id UUID;
BEGIN
    INSERT INTO public.blockchain_events (
        event_type,
        contract_address,
        transaction_hash,
        block_number,
        event_data
    ) VALUES (
        event_type,
        contract_address,
        transaction_hash,
        block_number,
        event_data
    ) RETURNING id INTO event_id;
    
    RETURN event_id;
END;
$$;

-- Create function to log blockchain transaction
CREATE OR REPLACE FUNCTION public.log_blockchain_transaction(
    transaction_hash TEXT,
    from_address TEXT,
    to_address TEXT,
    amount DECIMAL(20,18),
    transaction_type TEXT,
    description TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
    tx_id UUID;
BEGIN
    INSERT INTO public.blockchain_transactions (
        transaction_hash,
        from_address,
        to_address,
        amount,
        transaction_type,
        description
    ) VALUES (
        transaction_hash,
        from_address,
        to_address,
        amount,
        transaction_type,
        description
    ) RETURNING id INTO tx_id;
    
    RETURN tx_id;
END;
$$;

-- Create trigger for updated_at on blockchain_transactions
CREATE TRIGGER update_blockchain_transactions_updated_at
    BEFORE UPDATE ON public.blockchain_transactions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column(); 