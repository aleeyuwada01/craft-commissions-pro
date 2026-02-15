import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { formatCurrency } from '@/lib/currency';

const styles = StyleSheet.create({
    page: {
        padding: 40,
        fontSize: 11,
        fontFamily: 'Helvetica',
    },
    header: {
        marginBottom: 20,
        borderBottom: '2 solid #000',
        paddingBottom: 10,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    subtitle: {
        fontSize: 10,
        color: '#666',
    },
    section: {
        marginTop: 15,
        marginBottom: 15,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 10,
        color: '#333',
    },
    row: {
        flexDirection: 'row',
        marginBottom: 5,
    },
    label: {
        width: '40%',
        fontWeight: 'bold',
    },
    value: {
        width: '60%',
    },
    paymentBox: {
        backgroundColor: '#f5f5f5',
        padding: 15,
        borderRadius: 5,
        marginTop: 10,
        border: '1 solid #ddd',
    },
    paymentTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    paymentRow: {
        flexDirection: 'row',
        marginBottom: 4,
    },
    paymentLabel: {
        width: '35%',
        fontSize: 10,
    },
    paymentValue: {
        width: '65%',
        fontSize: 10,
        fontWeight: 'bold',
    },
    instructions: {
        fontSize: 9,
        color: '#555',
        marginTop: 8,
        fontStyle: 'italic',
    },
    paystackLink: {
        backgroundColor: '#0078ff',
        color: '#fff',
        padding: 10,
        marginTop: 10,
        borderRadius: 5,
        textAlign: 'center',
    },
    paystackText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: 'bold',
    },
    footer: {
        position: 'absolute',
        bottom: 30,
        left: 40,
        right: 40,
        textAlign: 'center',
        fontSize: 9,
        color: '#888',
        borderTop: '1 solid #ddd',
        paddingTop: 10,
    },
    total: {
        fontSize: 16,
        fontWeight: 'bold',
        marginTop: 10,
        textAlign: 'right',
    },
});

interface BookingReceiptData {
    receiptNumber: string;
    bookingDate: string;
    customerName: string;
    customerEmail?: string;
    customerPhone?: string;
    serviceName: string;
    bookingTime: string;
    duration?: number;
    totalAmount: number;
    depositPaid?: number;
    balanceDue?: number;
    businessName: string;
    // Payment details
    bankName?: string;
    accountNumber?: string;
    accountName?: string;
    paymentInstructions?: string;
    paystackLink?: string;
}

interface BookingReceiptPDFProps {
    data: BookingReceiptData;
}

export function BookingReceiptPDF({ data }: BookingReceiptPDFProps) {
    const hasPaymentDetails = data.bankName || data.paystackLink;

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.title}>BOOKING RECEIPT</Text>
                    <Text style={styles.subtitle}>{data.businessName}</Text>
                </View>

                {/* Receipt Info */}
                <View style={styles.section}>
                    <View style={styles.row}>
                        <Text style={styles.label}>Receipt Number:</Text>
                        <Text style={styles.value}>{data.receiptNumber}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Booking Date:</Text>
                        <Text style={styles.value}>{data.bookingDate}</Text>
                    </View>
                </View>

                {/* Customer Details */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Customer Information</Text>
                    <View style={styles.row}>
                        <Text style={styles.label}>Name:</Text>
                        <Text style={styles.value}>{data.customerName}</Text>
                    </View>
                    {data.customerEmail && (
                        <View style={styles.row}>
                            <Text style={styles.label}>Email:</Text>
                            <Text style={styles.value}>{data.customerEmail}</Text>
                        </View>
                    )}
                    {data.customerPhone && (
                        <View style={styles.row}>
                            <Text style={styles.label}>Phone:</Text>
                            <Text style={styles.value}>{data.customerPhone}</Text>
                        </View>
                    )}
                </View>

                {/* Booking Details */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Booking Details</Text>
                    <View style={styles.row}>
                        <Text style={styles.label}>Service:</Text>
                        <Text style={styles.value}>{data.serviceName}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Date & Time:</Text>
                        <Text style={styles.value}>{data.bookingTime}</Text>
                    </View>
                    {data.duration && (
                        <View style={styles.row}>
                            <Text style={styles.label}>Duration:</Text>
                            <Text style={styles.value}>{data.duration} minutes</Text>
                        </View>
                    )}
                </View>

                {/* Payment Summary */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Payment Summary</Text>
                    <View style={styles.row}>
                        <Text style={styles.label}>Total Amount:</Text>
                        <Text style={styles.value}>{formatCurrency(data.totalAmount)}</Text>
                    </View>
                    {data.depositPaid !== undefined && (
                        <View style={styles.row}>
                            <Text style={styles.label}>Deposit Paid:</Text>
                            <Text style={styles.value}>{formatCurrency(data.depositPaid)}</Text>
                        </View>
                    )}
                    {data.balanceDue !== undefined && data.balanceDue > 0 && (
                        <View style={styles.row}>
                            <Text style={styles.label}>Balance Due:</Text>
                            <Text style={[styles.value, { fontWeight: 'bold', color: '#d9534f' }]}>
                                {formatCurrency(data.balanceDue)}
                            </Text>
                        </View>
                    )}
                </View>

                {/* Payment Details */}
                {hasPaymentDetails && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Payment Information</Text>

                        {/* Bank Transfer Details */}
                        {data.bankName && (
                            <View style={styles.paymentBox}>
                                <Text style={styles.paymentTitle}>💳 Bank Transfer Details</Text>
                                <View style={styles.paymentRow}>
                                    <Text style={styles.paymentLabel}>Bank Name:</Text>
                                    <Text style={styles.paymentValue}>{data.bankName}</Text>
                                </View>
                                {data.accountNumber && (
                                    <View style={styles.paymentRow}>
                                        <Text style={styles.paymentLabel}>Account Number:</Text>
                                        <Text style={styles.paymentValue}>{data.accountNumber}</Text>
                                    </View>
                                )}
                                {data.accountName && (
                                    <View style={styles.paymentRow}>
                                        <Text style={styles.paymentLabel}>Account Name:</Text>
                                        <Text style={styles.paymentValue}>{data.accountName}</Text>
                                    </View>
                                )}
                                {data.paymentInstructions && (
                                    <Text style={styles.instructions}>{data.paymentInstructions}</Text>
                                )}
                            </View>
                        )}

                        {/* Paystack Payment Link */}
                        {data.paystackLink && (
                            <View style={[styles.paymentBox, { marginTop: 10, backgroundColor: '#e3f2fd' }]}>
                                <Text style={styles.paymentTitle}>💳 Pay Online with Paystack</Text>
                                <Text style={{ fontSize: 9, marginBottom: 5 }}>
                                    Click the link below to pay securely online:
                                </Text>
                                <View style={styles.paystackLink}>
                                    <Text style={styles.paystackText}>{data.paystackLink}</Text>
                                </View>
                            </View>
                        )}
                    </View>
                )}

                {/* Footer */}
                <View style={styles.footer}>
                    <Text>Thank you for your booking! We look forward to serving you.</Text>
                    <Text style={{ marginTop: 5 }}>
                        For any inquiries, please contact {data.businessName}
                    </Text>
                </View>
            </Page>
        </Document>
    );
}
