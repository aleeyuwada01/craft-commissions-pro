import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { X } from 'lucide-react';

interface TerminateContractButtonProps {
    contractId: string;
    onTerminated: () => void;
}

export function TerminateContractButton({ contractId, onTerminated }: TerminateContractButtonProps) {
    const [terminateDialogOpen, setTerminateDialogOpen] = useState(false);
    const [terminationReason, setTerminationReason] = useState('');
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(false);

    // Check if user is admin
    useState(() => {
        const checkAdmin = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data } = await supabase
                .from('user_roles')
                .select('role')
                .eq('user_id', user.id)
                .eq('role', 'admin')
                .single();

            setIsAdmin(!!data);
        };
        checkAdmin();
    });

    const handleTerminateContract = async () => {
        if (!terminationReason.trim()) {
            toast.error('Please provide a termination reason');
            return;
        }

        setLoading(true);

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
            onTerminated();
        } catch (error: any) {
            toast.error('Failed to terminate contract: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    if (!isAdmin) return null;

    return (
        <>
            <Button
                variant="destructive"
                onClick={() => setTerminateDialogOpen(true)}
            >
                <X className="w-4 h-4 mr-2" />
                Terminate Contract
            </Button>

            <Dialog open={terminateDialogOpen} onOpenChange={setTerminateDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Terminate Contract (Admin Only)</DialogTitle>
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
                        <Button
                            variant="destructive"
                            onClick={handleTerminateContract}
                            disabled={loading}
                        >
                            {loading ? 'Terminating...' : 'Terminate Contract'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
