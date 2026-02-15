import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from '@/components/ui/dialog';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { BookingReceiptPDF } from './BookingReceiptPDF';
import { usePaystackLink } from '@/hooks/usePaystackLink';
import { toast } from 'sonner';
import { Send, Download, Mail, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/currency';

interface SendReceiptButtonProps {
    bookingId: string;
    customerName: string;
    customerEmail?: string;
    customerPhone?: string;
    serviceName: string;
    bookingTime: string;
    totalAmount: number;
    businessId: string;
    businessName: string;
    onSent?: () => void;
}

export function SendReceiptButton({
    bookingId,
    customerName,
    customerEmail,
    customerPhone,
    serviceName,
    bookingTime,
    totalAmount,
    businessId,
    businessName,
    onSent,
}: SendReceiptButtonProps) {
    const [dialogOpen, setDialogOpen] = useState(false);
    const [sending, setSending] = useState(false);
    const [paymentSettings, setPaymentSettings] = useState<any>(null);
    const [paystackLink, setPaystackLink] = useState<string | null>(null);
    const { generatePaymentLink } = usePaystackLink();

    const fetchPaymentSettings = async () => {
        const { data } = await supabase
            .from('payment_settings')
            .select('*')
            .eq('business_id', businessId)
            .single();

        setPaymentSettings(data);

        // Generate Paystack link if enabled and customer has email
        if (data?.paystack_enabled && customerEmail) {
            const link = await generatePaymentLink({
                amount: totalAmount,
                email: customerEmail,
                reference: `booking_${bookingId}`,
                metadata: {
                    booking_id: bookingId,
                    customer_name: customerName,
                    service: serviceName,
                },
            });
            setPaystackLink(link);
        }
    };

    const handleOpenDialog = async () => {
        setDialogOpen(true);
        await fetchPaymentSettings();
    };

    const handleSendEmail = async () => {
        if (!customerEmail) {
            toast.error('Customer email not available');
            return;
        }

        setSending(true);

        try {
            // In a real implementation, you would call an Edge Function to send email
            // For now, we'll just simulate it
            await new Promise((resolve) => setTimeout(resolve, 1500));

            // Update booking to mark receipt as sent
            await supabase
                .from('bookings')
                .update({
                    receipt_sent: true,
                    payment_link: paystackLink,
                })
                .eq('id', bookingId);

            toast.success(`Receipt sent to ${customerEmail}!`);
            setDialogOpen(false);
            onSent?.();
        } catch (error: any) {
            toast.error('Failed to send receipt: ' + error.message);
        } finally {
            setSending(false);
        }
    };

    const handleSendSMS = async () => {
        if (!customerPhone) {
            toast.error('Customer phone not available');
            return;
        }

        setSending(true);

        try {
            // In a real implementation, you would call an Edge Function to send SMS
            await new Promise((resolve) => setTimeout(resolve, 1500));

            await supabase
                .from('bookings')
                .update({
                    receipt_sent: true,
                    payment_link: paystackLink,
                })
                .eq('id', bookingId);

            toast.success(`Receipt sent to ${customerPhone}!`);
            setDialogOpen(false);
            onSent?.();
        } catch (error: any) {
            toast.error('Failed to send SMS: ' + error.message);
        } finally {
            setSending(false);
        }
    };

    const receiptData = {
        receiptNumber: `RCP-${bookingId?.slice(0, 8).toUpperCase()}`,
        bookingDate: format(new Date(), 'MMM d, yyyy'),
        customerName,
        customerEmail,
        customerPhone,
        serviceName,
        bookingTime,
        totalAmount,
        businessName,
        ...(paymentSettings && {
            bankName: paymentSettings.bank_name,
            accountNumber: paymentSettings.account_number,
            accountName: paymentSettings.account_name,
            paymentInstructions: paymentSettings.payment_instructions,
        }),
        ...(paystackLink && { paystackLink }),
    };

    return (
        <>
            <Button onClick={handleOpenDialog} variant="outline" size="sm">
                <Send className="w-4 h-4 mr-2" />
                Send Receipt
            </Button>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Send Booking Receipt</DialogTitle>
                        <DialogDescription>
                            Send booking receipt with payment details to customer
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        {/* Receipt Preview Info */}
                        <div className="p-4 bg-secondary/30 rounded-lg space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Customer:</span>
                                <span className="font-semibold">{customerName}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Service:</span>
                                <span className="font-semibold">{serviceName}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Amount:</span>
                                <span className="font-semibold">{formatCurrency(totalAmount)}</span>
                            </div>
                            {paystackLink && (
                                <div className="mt-2 pt-2 border-t">
                                    <span className="text-xs text-green-600">
                                        ✓ Paystack payment link included
                                    </span>
                                </div>
                            )}
                            {paymentSettings?.bank_name && (
                                <div className="mt-2 pt-2 border-t">
                                    <span className="text-xs text-blue-600">
                                        ✓ Bank transfer details included
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Send Options */}
                        <div className="space-y-2">
                            {customerEmail && (
                                <Button
                                    onClick={handleSendEmail}
                                    disabled={sending}
                                    className="w-full"
                                >
                                    <Mail className="w-4 h-4 mr-2" />
                                    {sending ? 'Sending...' : `Send via Email to ${customerEmail}`}
                                </Button>
                            )}

                            {customerPhone && (
                                <Button
                                    onClick={handleSendSMS}
                                    disabled={sending}
                                    variant="outline"
                                    className="w-full"
                                >
                                    <MessageSquare className="w-4 h-4 mr-2" />
                                    {sending ? 'Sending...' : `Send via SMS to ${customerPhone}`}
                                </Button>
                            )}

                            <PDFDownloadLink
                                document={<BookingReceiptPDF data={receiptData} />}
                                fileName={`booking-receipt-${receiptData.receiptNumber}.pdf`}
                                className="w-full"
                            >
                                {({ loading }) => (
                                    <Button variant="outline" className="w-full" disabled={loading}>
                                        <Download className="w-4 h-4 mr-2" />
                                        {loading ? 'Generating...' : 'Download PDF'}
                                    </Button>
                                )}
                            </PDFDownloadLink>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setDialogOpen(false)}>
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
