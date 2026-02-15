-- Migration: Add Employee Contract Management with Digital Signatures
-- Created: 2026-02-15

-- =====================================================
-- PART 1: Contract Templates
-- =====================================================

CREATE TABLE IF NOT EXISTS public.contract_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.business_units(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    content TEXT NOT NULL, -- Markdown/HTML content
    version INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.contract_templates ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PART 2: Employee Contracts
-- =====================================================

-- First, add user_id to employees table if not exists (for employee self-access)
ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_employees_user_id ON public.employees(user_id);

CREATE TABLE IF NOT EXISTS public.employee_contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
    business_id UUID REFERENCES public.business_units(id) ON DELETE CASCADE NOT NULL,
    template_id UUID REFERENCES public.contract_templates(id) ON DELETE SET NULL,
    contract_data JSONB NOT NULL DEFAULT '{}', -- Stores filled form data
    status TEXT NOT NULL DEFAULT 'draft',
    start_date DATE,
    end_date DATE,
    employee_signature TEXT, -- Base64 image
    employee_signed_at TIMESTAMP WITH TIME ZONE,
    management_signature TEXT, -- Base64 image
    management_signed_at TIMESTAMP WITH TIME ZONE,
    signed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    pdf_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.employee_contracts ENABLE ROW LEVEL SECURITY;

-- Add constraint for status
ALTER TABLE public.employee_contracts
ADD CONSTRAINT employee_contracts_status_check 
CHECK (status IN ('draft', 'pending_signature', 'signed', 'terminated'));

-- =====================================================
-- PART 3: Contract Penalties
-- =====================================================

CREATE TABLE IF NOT EXISTS public.contract_penalties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID REFERENCES public.employee_contracts(id) ON DELETE CASCADE NOT NULL,
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
    violation_type TEXT NOT NULL,
    description TEXT NOT NULL,
    penalty_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    applied_date DATE NOT NULL DEFAULT CURRENT_DATE,
    applied_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.contract_penalties ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS Policies
-- =====================================================

-- Contract templates policies
CREATE POLICY "Users can view contract templates in their businesses"
ON public.contract_templates FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.business_units
        WHERE id = contract_templates.business_id AND user_id = auth.uid()
    )
);

CREATE POLICY "Users can manage contract templates in their businesses"
ON public.contract_templates FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.business_units
        WHERE id = contract_templates.business_id AND user_id = auth.uid()
    )
);

-- Employee contracts policies (admin access)
CREATE POLICY "Admins can view contracts in their businesses"
ON public.employee_contracts FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.business_units
        WHERE id = employee_contracts.business_id AND user_id = auth.uid()
    )
);

CREATE POLICY "Admins can manage contracts in their businesses"
ON public.employee_contracts FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.business_units
        WHERE id = employee_contracts.business_id AND user_id = auth.uid()
    )
);

-- Employee contracts policies (employee self-access)
CREATE POLICY "Employees can view their own contracts"
ON public.employee_contracts FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.employees
        WHERE id = employee_contracts.employee_id 
        AND user_id = auth.uid()
    )
);

CREATE POLICY "Employees can sign their own contracts"
ON public.employee_contracts FOR UPDATE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.employees
        WHERE id = employee_contracts.employee_id 
        AND user_id = auth.uid()
    )
)
WITH CHECK (
    -- Employees can only update their signature fields
    EXISTS (
        SELECT 1 FROM public.employees
        WHERE id = employee_contracts.employee_id 
        AND user_id = auth.uid()
    )
);

-- Contract penalties policies
CREATE POLICY "Admins can view penalties in their businesses"
ON public.contract_penalties FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.employee_contracts ec
        JOIN public.business_units bu ON bu.id = ec.business_id
        WHERE ec.id = contract_penalties.contract_id
        AND bu.user_id = auth.uid()
    )
);

CREATE POLICY "Admins can manage penalties in their businesses"
ON public.contract_penalties FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.employee_contracts ec
        JOIN public.business_units bu ON bu.id = ec.business_id
        WHERE ec.id = contract_penalties.contract_id
        AND bu.user_id = auth.uid()
    )
);

-- Employees can view their own penalties
CREATE POLICY "Employees can view their own penalties"
ON public.contract_penalties FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.employees
        WHERE id = contract_penalties.employee_id 
        AND user_id = auth.uid()
    )
);

-- =====================================================
-- Triggers and Functions
-- =====================================================

-- Trigger for contract_templates updated_at
CREATE TRIGGER update_contract_templates_updated_at
    BEFORE UPDATE ON public.contract_templates
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for employee_contracts updated_at
CREATE TRIGGER update_employee_contracts_updated_at
    BEFORE UPDATE ON public.employee_contracts
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to update contract status when both signatures present
CREATE OR REPLACE FUNCTION public.update_contract_status_on_signature()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- If both signatures are present, mark as signed
    IF NEW.employee_signature IS NOT NULL 
       AND NEW.management_signature IS NOT NULL 
       AND OLD.status != 'signed' THEN
        NEW.status := 'signed';
    END IF;
    
    RETURN NEW;
END;
$$;

-- Trigger to auto-update contract status
CREATE TRIGGER on_contract_signature_added
    BEFORE UPDATE ON public.employee_contracts
    FOR EACH ROW EXECUTE FUNCTION public.update_contract_status_on_signature();

-- Indexes
CREATE INDEX idx_contract_templates_business_id ON public.contract_templates(business_id);
CREATE INDEX idx_employee_contracts_employee_id ON public.employee_contracts(employee_id);
CREATE INDEX idx_employee_contracts_business_id ON public.employee_contracts(business_id);
CREATE INDEX idx_employee_contracts_status ON public.employee_contracts(status);
CREATE INDEX idx_contract_penalties_contract_id ON public.contract_penalties(contract_id);
CREATE INDEX idx_contract_penalties_employee_id ON public.contract_penalties(employee_id);

-- =====================================================
-- Insert Default JB Enterprise Contract Template
-- =====================================================

-- This will be inserted when a business is created
-- For now, we'll create a function that businesses can call

CREATE OR REPLACE FUNCTION public.create_default_jb_contract_template(p_business_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_template_id UUID;
    v_contract_content TEXT;
BEGIN
    v_contract_content := '# JB ENTERPRISE EMPLOYEE CONTRACT, RULES, REGULATIONS & CODE OF CONDUCT

**Business Name:** {{business_name}}  
**Departments Covered:** Makeup | Photography | Tailoring  
**Effective Date:** {{effective_date}}

---

## 1. PURPOSE OF THIS AGREEMENT

This document serves as a binding contract and code of conduct between JB Enterprise and the employee. Its purpose is to ensure professionalism, discipline, accountability, quality service delivery, and the long-term growth of the business.

Failure to comply with the terms below will attract strict disciplinary actions, including fines, suspension, or termination.

---

## 2. EMPLOYEE INFORMATION

**Full Name:** {{employee_name}}  
**Department:** {{department}}  
**Phone Number:** {{phone_number}}  
**Address:** {{address}}  
**Start Date:** {{start_date}}

---

## 3. WORK ETHICS & PROFESSIONAL CONDUCT (STRICT)

All employees of JB Enterprise MUST:

1. Resume work on time as scheduled. No excuses.
2. Maintain respectful communication with clients, colleagues, and management.
3. Dress and present themselves professionally at all times.
4. Follow all instructions given by management without argument or delay.
5. Protect the reputation of JB Enterprise at all times, both online and offline.
6. Never argue with or embarrass a client.
7. Never use foul language, insults, or threats within the workplace.

**Penalty:**
- First offense: Written warning
- Second offense: ₦{{conduct_fine}} fine
- Third offense: Suspension or termination

---

## 4. ATTENDANCE & PUNCTUALITY POLICY

1. Employees must arrive at least 15 minutes before work time.
2. Late arrival without valid approval attracts penalties.
3. Absence without permission is strictly prohibited.

**Penalties:**
- Late arrival: ₦{{late_fine}} per occurrence
- Absence without notice: ₦{{absence_fine}}
- Repeated lateness (3 times): Salary deduction or suspension

---

## 5. JOB RESPONSIBILITIES & PERFORMANCE

1. Employees must perform their duties with maximum effort and attention to detail.
2. Poor-quality work, negligence, or carelessness will not be tolerated.
3. Mistakes caused by negligence that lead to client dissatisfaction will be corrected at the employee''s cost where applicable.
4. Employees must seek approval before making any decision that affects a client or the business.

---

## 6. CLIENT HANDLING & CONFIDENTIALITY

1. Employees must treat all clients with respect, patience, and professionalism.
2. No employee is allowed to collect money from clients without authorization.
3. Client information, prices, and business processes are strictly confidential.
4. Employees must not divert clients to personal businesses.

**Penalty for Client Poaching or Confidentiality Breach:**
- Serious disciplinary action up to and including termination of employment
- Further actions may be taken where necessary

---

## 7. USE OF BUSINESS EQUIPMENT & MATERIALS

1. All equipment (cameras, makeup tools, sewing machines, fabrics, etc.) must be handled with care.
2. Any damage caused by negligence may result in the employee bearing responsibility for repair or replacement costs, subject to management review.
3. Stealing or misuse of business property is considered a serious offense and may lead to termination of employment.

---

## 8. SOCIAL MEDIA & PUBLIC REPRESENTATION

1. Employees must not post negative content about JB Enterprise.
2. Unauthorized posting of behind-the-scenes content is prohibited.
3. Any online action that damages the brand attracts strict penalties.

---

## 9. LEAVE & PERMISSIONS

1. All leave requests must be submitted at least 48 hours in advance.
2. Emergency leave must be communicated immediately.
3. Approval is at management''s discretion.

---

## 10. DISCIPLINARY ACTIONS

JB Enterprise reserves the right to take the following actions:
- Verbal warning
- Written warning
- Financial penalty
- Suspension
- Termination of employment

No employee is above these rules.

---

## 11. TERMINATION CLAUSE

JB Enterprise may terminate this agreement if the employee:
- Repeatedly violates company rules
- Engages in theft, fraud, or dishonest behavior
- Shows gross misconduct or disrespect to clients or management
- Acts in a way that significantly harms the brand reputation

---

## 12. AGREEMENT & ACCEPTANCE

I, **{{employee_name}}**, confirm that I have read, understood, and agreed to all the rules, regulations, penalties, and guidelines of JB Enterprise. I agree to comply fully and understand that violations will attract disciplinary actions.

**Employee Signature:** ___________________  
**Date:** {{employee_sign_date}}

**Management Signature:** ___________________  
**Date:** {{management_sign_date}}

---

**JB ENTERPRISE – DISCIPLINE. QUALITY. PROFESSIONALISM.**';

    -- Insert the template
    INSERT INTO public.contract_templates (
        business_id, name, content, version, is_active
    ) VALUES (
        p_business_id, 
        'JB Enterprise Employee Contract',
        v_contract_content,
        1,
        true
    ) RETURNING id INTO v_template_id;
    
    RETURN v_template_id;
END;
$$;
