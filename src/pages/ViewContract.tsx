import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { PDFDownloadLink, PDFViewer } from '@react-pdf/renderer';
import { ContractPDF } from '@/components/contracts/ContractPDF';
import SignatureCanvas from 'react-signature-canvas';
import { toast } from 'sonner';
import {
    ArrowLeft,
    Download,
    FileText,
    CheckCircle,
    Pencil,
    X,
    Eye,
    Printer,
} from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { TerminateContractButton } from '@/components/contracts/TerminateContractButton';

interface Contract {
    id: string;
    employee_id: string;
    business_id: string;
    title: string;
    contract_type: string;
    start_date: string;
    end_date: string | null;
    terms: string;
    salary_amount: number | null;
    salary_frequency: string | null;
    status: string;
    employee_signed_at: string | null;
    employee_signature: string | null;
    employer_signed_at: string | null;
    employer_signature: string | null;
    employer_name: string | null;
    employees: {
        name: string;
        user_id: string;
    } | null;
    business_units: {
        name: string;
    } | null;
}

export default function ViewContract() {
    const { id: businessId, contractId } = useParams<{ id: string; contractId: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [contract, setContract] = useState<Contract | null>(null);
    const [loading, setLoading] = useState(true);
    const [signDialogOpen, setSignDialogOpen] = useState(false);
    const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);
    const [terminateDialogOpen, setTerminateDialogOpen] = useState(false);
    const [terminationReason, setTerminationReason] = useState('');
    const [isEmployeeView, setIsEmployeeView] = useState(false);

    const signaturePadRef = useRef<SignatureCanvas>(null);

    const fetchContract = async () => {
        if (!contractId) return;

        const { data, error } = await supabase
            .from('employee_contracts')
            .select(`
        *,
        employees(name, user_id),
        business_units(name)
      `)
            .eq('id', contractId)
            .single();

        if (error) {
            toast.error('Failed to load contract');
            console.error(error);
            navigate(`/business/${businessId}/contracts`);
        } else {
            setContract(data);
            // Check if current user is the employee
            setIsEmployeeView(data.employees?.user_id === user?.id);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchContract();
    }, [contractId]);

    const clearSignature = () => {
        signaturePadRef.current?.clear();
    };

    const handleSign = async () => {
        if (!signaturePadRef.current || signaturePadRef.current.isEmpty()) {
            toast.error('Please provide a signature');
            return;
        }

        const signatureData = signaturePadRef.current.toDataURL();

        try {
            const updateData = isEmployeeView
                ? {
                    employee_signature: signatureData,
                    employee_signed_at: new Date().toISOString(),
                    status: contract?.employer_signed_at ? 'signed' : 'pending',
                }
                : {
                    employer_signature: signatureData,
                    employer_signed_at: new Date().toISOString(),
                    employer_name: contract?.business_units?.name || 'Employer',
                    status: contract?.employee_signed_at ? 'signed' : 'pending',
                };

            const { error } = await supabase
                .from('employee_contracts')
                .update(updateData)
                .eq('id', contractId);

            if (error) throw error;

            toast.success('Contract signed successfully!');
            setSignDialogOpen(false);
            fetchContract();
        } catch (error: any) {
            toast.error('Failed to sign contract: ' + error.message);
        }
    };

    const handleTerminateContract = async () => {
        if (!terminationReason.trim()) {
            toast.error('Please provide a termination reason');
            return;
        }

        try {
            const { error } = await supabase
                .from('employee_contracts')
                .update({
                    status: 'terminated',
                    termination_reason: terminationReason,
                    terminated_at: new Date().toISOString(),
                })
                .eq('id', contractId);

            if (error) throw error;

            toast.success('Contract terminated successfully');
            setTerminateDialogOpen(false);
            setTerminationReason('');
            fetchContract();
        } catch (error: any) {
            toast.error('Failed to terminate contract: ' + error.message);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-pulse text-muted-foreground">Loading...</div>
            </div>
        );
    }

    if (!contract) {
        return (
            <div className="text-center py-12">
                <p className="text-muted-foreground">Contract not found</p>
            </div>
        );
    }

    const canSign = isEmployeeView
        ? !contract.employee_signed_at
        : !contract.employer_signed_at;

    const pdfData = {
        title: contract.title,
        contractType: contract.contract_type,
        employeeName: contract.employees?.name || 'Employee',
        startDate: format(new Date(contract.start_date), 'MMM d, yyyy'),
        endDate: contract.end_date ? format(new Date(contract.end_date), 'MMM d, yyyy') : undefined,
        salaryAmount: contract.salary_amount || undefined,
        salaryFrequency: contract.salary_frequency || undefined,
        terms: contract.terms,
        employeeSignature: contract.employee_signature || undefined,
        employeeSignedDate: contract.employee_signed_at
            ? format(new Date(contract.employee_signed_at), 'MMM d, yyyy')
            : undefined,
        employerSignature: contract.employer_signature || undefined,
        employerName: contract.employer_name || undefined,
        employerSignedDate: contract.employer_signed_at
            ? format(new Date(contract.employer_signed_at), 'MMM d, yyyy')
            : undefined,
        businessName: contract.business_units?.name || 'Company',
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'signed':
                return 'bg-green-500/10 text-green-600 border-green-500/20';
            case 'pending':
                return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
            default:
                return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link to={`/business/${businessId}/contracts`}>
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold">{contract.title}</h1>
                        <p className="text-sm text-muted-foreground">
                            {contract.employees?.name}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Badge className={getStatusColor(contract.status)}>
                        {contract.status}
                    </Badge>
                </div>
            </div>

            {/* Contract Details Card */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        Contract Details
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>Contract Type</Label>
                            <p className="text-sm capitalize">{contract.contract_type}</p>
                        </div>
                        <div>
                            <Label>Start Date</Label>
                            <p className="text-sm">
                                {format(new Date(contract.start_date), 'MMM d, yyyy')}
                            </p>
                        </div>
                        {contract.end_date && (
                            <div>
                                <Label>End Date</Label>
                                <p className="text-sm">
                                    {format(new Date(contract.end_date), 'MMM d, yyyy')}
                                </p>
                            </div>
                        )}
                        {contract.salary_amount && (
                            <div>
                                <Label>Compensation</Label>
                                <p className="text-sm">
                                    ₦{contract.salary_amount.toLocaleString()}
                                    {contract.salary_frequency && ` (${contract.salary_frequency})`}
                                </p>
                            </div>
                        )}
                    </div>

                    <div>
                        <Label>Terms and Conditions</Label>
                        <div className="mt-2 p-4 bg-secondary/30 rounded-lg text-sm whitespace-pre-wrap">
                            {contract.terms}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Signatures Card */}
            <Card>
                <CardHeader>
                    <CardTitle>Signatures</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Employee Signature */}
                        <div>
                            <Label className="mb-2 block">Employee Signature</Label>
                            {contract.employee_signature ? (
                                <div>
                                    <img
                                        src={contract.employee_signature}
                                        alt="Employee signature"
                                        className="border rounded p-2 bg-white max-h-24"
                                    />
                                    <p className="text-xs text-muted-foreground mt-2">
                                        Signed:{' '}
                                        {format(new Date(contract.employee_signed_at!), 'MMM d, yyyy h:mm a')}
                                    </p>
                                </div>
                            ) : (
                                <div className="border-2 border-dashed rounded p-8 text-center text-muted-foreground">
                                    Not signed yet
                                </div>
                            )}
                        </div>

                        {/* Employer Signature */}
                        <div>
                            <Label className="mb-2 block">Employer Signature</Label>
                            {contract.employer_signature ? (
                                <div>
                                    <img
                                        src={contract.employer_signature}
                                        alt="Employer signature"
                                        className="border rounded p-2 bg-white max-h-24"
                                    />
                                    <p className="text-xs text-muted-foreground mt-2">
                                        Signed by: {contract.employer_name}
                                        <br />
                                        {format(new Date(contract.employer_signed_at!), 'MMM d, yyyy h:mm a')}
                                    </p>
                                </div>
                            ) : (
                                <div className="border-2 border-dashed rounded p-8 text-center text-muted-foreground">
                                    Not signed yet
                                </div>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex gap-2">
                {canSign && (
                    <Button onClick={() => setSignDialogOpen(true)}>
                        <Pencil className="w-4 h-4 mr-2" />
                        Sign Contract
                    </Button>
                )}

                {!isEmployeeView && contract.status !== 'terminated' && (
                    <Button
                        variant="destructive"
                        onClick={() => setTerminateDialogOpen(true)}
                    >
                        <X className="w-4 h-4 mr-2" />
                        Terminate Contract
                    </Button>
                )}

                <Button variant="outline" onClick={() => setPdfPreviewOpen(true)}>
                    <Eye className="w-4 h-4 mr-2" />
                    Preview PDF
                </Button>

                <PDFDownloadLink
                    document={<ContractPDF data={pdfData} />}
                    fileName={`contract-${contract.title}-${format(new Date(), 'yyyy-MM-dd')}.pdf`}
                >
                    {({ loading }) => (
                        <Button variant="outline" disabled={loading}>
                            <Download className="w-4 h-4 mr-2" />
                            {loading ? 'Generating...' : 'Download PDF'}
                        </Button>
                    )}
                </PDFDownloadLink>
            </div>

            {/* Sign Dialog */}
            <Dialog open={signDialogOpen} onOpenChange={setSignDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Sign Contract</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                            Please sign in the box below to confirm your agreement to the contract terms.
                        </p>
                        <div className="border-2 border-primary rounded-lg">
                            <SignatureCanvas
                                ref={signaturePadRef}
                                canvasProps={{
                                    className: 'w-full h-64 cursor-crosshair',
                                }}
                            />
                        </div>
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={clearSignature}>
                            <X className="w-4 h-4 mr-2" />
                            Clear
                        </Button>
                        <Button onClick={handleSign}>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Confirm Signature
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* PDF Preview Dialog */}
            <Dialog open={pdfPreviewOpen} onOpenChange={setPdfPreviewOpen}>
                <DialogContent className="max-w-4xl h-[80vh]">
                    <DialogHeader>
                        <DialogTitle>Contract PDF Preview</DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 overflow-auto">
                        <PDFViewer width="100%" height="600px">
                            <ContractPDF data={pdfData} />
                        </PDFViewer>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Termination Dialog */}
            <Dialog open={terminateDialogOpen} onOpenChange={setTerminateDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Terminate Contract</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                            Are you sure you want to terminate this contract? This action will mark the contract as terminated.
                        </p>
                        <div className="space-y-2">
                            <Label>Termination Reason / Penalty Details *</Label>
                            <Textarea
                                value={terminationReason}
                                onChange={(e) => setTerminationReason(e.target.value)}
                                placeholder="Enter the reason for termination, any penalties, or breach details..."
                                rows={5}
                                required
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setTerminateDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleTerminateContract}>
                            Terminate Contract
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
