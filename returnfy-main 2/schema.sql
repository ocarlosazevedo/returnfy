-- ============================================
-- RETURNFY - Database Schema
-- Run this in Supabase SQL Editor
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- STORES TABLE
-- Connected Shopify stores
-- ============================================
CREATE TABLE IF NOT EXISTS stores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  shopify_domain VARCHAR(255) NOT NULL UNIQUE,
  shopify_token TEXT NOT NULL,
  logo_url TEXT,
  primary_color VARCHAR(7) DEFAULT '#000000',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- RETURN REQUESTS TABLE
-- Customer return/refund requests
-- ============================================
CREATE TABLE IF NOT EXISTS return_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  
  -- Shopify Order Data
  shopify_order_id VARCHAR(50) NOT NULL,
  shopify_order_number VARCHAR(50) NOT NULL,
  order_date TIMESTAMPTZ,
  order_total DECIMAL(10,2),
  order_currency VARCHAR(3) DEFAULT 'USD',
  
  -- Customer Data
  customer_email VARCHAR(255) NOT NULL,
  customer_name VARCHAR(255),
  customer_phone VARCHAR(50),
  customer_document VARCHAR(50),
  
  -- Form Data (JSON for flexibility)
  form_data JSONB NOT NULL DEFAULT '{}',
  
  -- Uploaded Files
  attachments TEXT[] DEFAULT '{}',
  
  -- Status & Resolution
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'approved_refund', 'approved_resend', 'denied')),
  admin_notes TEXT,
  resolution_date TIMESTAMPTZ,
  
  -- Tracking
  current_step INT DEFAULT 1,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  time_spent_seconds INT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ADMIN ACTIONS TABLE
-- Audit log for admin actions
-- ============================================
CREATE TABLE IF NOT EXISTS admin_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  return_request_id UUID REFERENCES return_requests(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_stores_domain ON stores(shopify_domain);
CREATE INDEX IF NOT EXISTS idx_stores_active ON stores(is_active);

CREATE INDEX IF NOT EXISTS idx_returns_store ON return_requests(store_id);
CREATE INDEX IF NOT EXISTS idx_returns_status ON return_requests(status);
CREATE INDEX IF NOT EXISTS idx_returns_email ON return_requests(customer_email);
CREATE INDEX IF NOT EXISTS idx_returns_order ON return_requests(shopify_order_id);
CREATE INDEX IF NOT EXISTS idx_returns_created ON return_requests(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_actions_return ON admin_actions(return_request_id);

-- ============================================
-- UPDATED_AT TRIGGER
-- Auto-update updated_at column
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_stores_updated_at ON stores;
CREATE TRIGGER update_stores_updated_at
  BEFORE UPDATE ON stores
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_returns_updated_at ON return_requests;
CREATE TRIGGER update_returns_updated_at
  BEFORE UPDATE ON return_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- RLS (Row Level Security) - Optional
-- Enable if you want extra security
-- ============================================
-- ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE return_requests ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE admin_actions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================
-- INSERT INTO stores (name, shopify_domain, shopify_token) VALUES
-- ('Test Store Brazil', 'teststore-br.myshopify.com', 'shpat_test_token_here');

-- ============================================
-- VERIFICATION
-- ============================================
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('stores', 'return_requests', 'admin_actions')
ORDER BY table_name, ordinal_position;
