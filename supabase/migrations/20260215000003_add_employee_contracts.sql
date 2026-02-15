-- Create employee_contracts table
CREATE TABLE IF NOT EXISTS employee_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES business_units(id) ON DELETE CASCADE,
  
  -- Contract details
  contract_type VARCHAR(50) NOT NULL DEFAULT 'employment', -- employment, freelance, nda, etc
  title VARCHAR(255) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  
  -- Contract content
  terms TEXT NOT NULL,
  salary_amount DECIMAL(15,2),
  salary_frequency VARCHAR(20), -- monthly, weekly, biweekly, hourly
  
  -- Status and approval
  status VARCHAR(20) NOT NULL DEFAULT 'draft', -- draft, pending, signed, expired, terminated
  employee_signed_at TIMESTAMP WITH TIME ZONE,
  employee_signature TEXT, -- Base64 encoded signature image
  employer_signed_at TIMESTAMP WITH TIME ZONE,
  employer_signature TEXT,
  employer_name VARCHAR(255),
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Add indexes
CREATE INDEX idx_employee_contracts_employee ON employee_contracts(employee_id);
CREATE INDEX idx_employee_contracts_business ON employee_contracts(business_id);
CREATE INDEX idx_employee_contracts_status ON employee_contracts(status);

-- Enable RLS
ALTER TABLE employee_contracts ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view contracts for their businesses"
  ON employee_contracts FOR SELECT
  USING (
    business_id IN (
      SELECT id FROM business_units
      WHERE owner_id = auth.uid()
    )
    OR employee_id IN (
      SELECT id FROM employees
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Business owners can insert contracts"
  ON employee_contracts FOR INSERT
  WITH CHECK (
    business_id IN (
      SELECT id FROM business_units
      WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Business owners and employees can update their contracts"
  ON employee_contracts FOR UPDATE
  USING (
    business_id IN (
      SELECT id FROM business_units
      WHERE owner_id = auth.uid()
    )
    OR employee_id IN (
      SELECT id FROM employees
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Business owners can delete contracts"
  ON employee_contracts FOR DELETE
  USING (
    business_id IN (
      SELECT id FROM business_units
      WHERE owner_id = auth.uid()
    )
  );

-- Create contract_templates table
CREATE TABLE IF NOT EXISTS contract_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES business_units(id) ON DELETE CASCADE,
  
  name VARCHAR(255) NOT NULL,
  contract_type VARCHAR(50) NOT NULL,
  content TEXT NOT NULL, -- Template with placeholders like {{employee_name}}, {{salary}}, etc
  is_default BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes
CREATE INDEX idx_contract_templates_business ON contract_templates(business_id);
CREATE INDEX idx_contract_templates_type ON contract_templates(contract_type);

-- Enable RLS
ALTER TABLE contract_templates ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view templates for their businesses"
  ON contract_templates FOR SELECT
  USING (
    business_id IN (
      SELECT id FROM business_units
      WHERE owner_id = auth.uid()
    )
    OR business_id IS NULL -- Allow viewing global templates
  );

CREATE POLICY "Business owners can manage templates"
  ON contract_templates FOR ALL
  USING (
    business_id IN (
      SELECT id FROM business_units
      WHERE owner_id = auth.uid()
    )
  );
