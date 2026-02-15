import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { ArrowLeft, FileText } from 'lucide-react';

interface Employee {
    id: string;
    name: string;
}

export default function NewContract() {
    const { id: businessId } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(false);

    // Form state
    const [employeeId, setEmployeeId] = useState('');
    const [title, setTitle] = useState('');
    const [contractType, setContractType] = useState('employment');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [salaryAmount, setSalaryAmount] = useState('');
    const [salaryFrequency, setSalaryFrequency] = useState('monthly');
    const [terms, setTerms] = useState(
        `EMPLOYMENT CONTRACT

This Employment Contract is entered into between [Business Name] ("Employer") and [Employee Name] ("Employee").

1. POSITION AND DUTIES
The Employee is hired for the position as agreed upon. The Employee agrees to perform duties and responsibilities as assigned by the Employer.

2. COMPENSATION
The Employee shall receive compensation as specified in this contract, payable according to the agreed frequency.

3. WORKING HOURS
Working hours and schedule will be determined by the Employer in accordance with business needs.

4. PROBATION PERIOD
The Employee shall undergo a probation period of [specify duration] from the start date.

5. TERMINATION
Either party may terminate this contract with [specify notice period] written notice, or immediately for just cause.

6. CONFIDENTIALITY
The Employee agrees to maintain confidentiality of all business information during and after employment.

7. GOVERNING LAW
This contract shall be governed by the laws of the Federal Republic of Nigeria.

By signing below, both parties acknowledge and agree to the terms and conditions stated in this contract.`
    );

    useEffect(() => {
        fetchEmployees();
    }, [businessId]);

    const fetchEmployees = async () => {
        if (!businessId) return;

        const { data, error } = await supabase
            .from('employees')
            .select('id, name')
            .eq('business_id', businessId)
            .order('name');

        if (error) {
            console.error(error);
        } else {
            setEmployees(data || []);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!employeeId || !title || !startDate || !terms) {
            toast.error('Please fill in all required fields');
            return;
        }

        setLoading(true);

        try {
            const { data, error } = await supabase
                .from('employee_contracts')
                .insert({
                    business_id: businessId,
                    employee_id: employeeId,
                    title,
                    contract_type: contractType,
                    start_date: startDate,
                    end_date: endDate || null,
                    salary_amount: salaryAmount ? parseFloat(salaryAmount) : null,
                    salary_frequency: salaryAmount ? salaryFrequency : null,
                    terms,
                    status: 'pending',
                })
                .select()
                .single();

            if (error) throw error;

            toast.success('Contract created successfully!');
            navigate(`/business/${businessId}/contracts/${data.id}`);
        } catch (error: any) {
            toast.error('Failed to create contract: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-4">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link to={`/business/${businessId}/contracts`}>
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold">Create New Contract</h1>
                    <p className="text-sm text-muted-foreground">
                        Fill in the details below to create an employee contract
                    </p>
                </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit}>
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="w-5 h-5" />
                            Contract Information
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Employee *</Label>
                                <Select value={employeeId} onValueChange={setEmployeeId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select employee" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {employees.map((emp) => (
                                            <SelectItem key={emp.id} value={emp.id}>
                                                {emp.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Contract Title *</Label>
                                <Input
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="e.g., Full-Time Employment Contract"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Contract Type *</Label>
                                <Select value={contractType} onValueChange={setContractType}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="employment">Employment</SelectItem>
                                        <SelectItem value="freelance">Freelance</SelectItem>
                                        <SelectItem value="internship">Internship</SelectItem>
                                        <SelectItem value="nda">NDA</SelectItem>
                                        <SelectItem value="other">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Start Date *</Label>
                                <Input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>End Date (Optional)</Label>
                                <Input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Salary Amount (Optional)</Label>
                                <Input
                                    type="number"
                                    value={salaryAmount}
                                    onChange={(e) => setSalaryAmount(e.target.value)}
                                    placeholder="0.00"
                                    step="0.01"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Salary Frequency</Label>
                                <Select value={salaryFrequency} onValueChange={setSalaryFrequency}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="monthly">Monthly</SelectItem>
                                        <SelectItem value="weekly">Weekly</SelectItem>
                                        <SelectItem value="biweekly">Bi-weekly</SelectItem>
                                        <SelectItem value="hourly">Hourly</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Terms and Conditions *</Label>
                            <Textarea
                                value={terms}
                                onChange={(e) => setTerms(e.target.value)}
                                rows={15}
                                className="font-mono text-xs"
                                placeholder="Enter contract terms..."
                                required
                            />
                            <p className="text-xs text-muted-foreground">
                                You can edit the default template above or write your own terms
                            </p>
                        </div>

                        <div className="flex gap-2 pt-4">
                            <Button type="submit" disabled={loading}>
                                {loading ? 'Creating...' : 'Create Contract'}
                            </Button>
                            <Link to={`/business/${businessId}/contracts`}>
                                <Button type="button" variant="outline">
                                    Cancel
                                </Button>
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </form>
        </div>
    );
}
