import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
    page: {
        padding: 30,
        fontSize: 10,
        fontFamily: 'Helvetica',
    },
    header: {
        textAlign: 'center',
        marginBottom: 10,
        paddingBottom: 8,
        borderBottomWidth: 2,
        borderBottomColor: '#333',
    },
    businessName: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 2,
    },
    businessInfo: {
        fontSize: 8,
        color: '#666',
        marginBottom: 1,
    },
    title: {
        fontSize: 14,
        fontWeight: 'bold',
        textAlign: 'center',
        marginVertical: 8,
        color: '#e65100',
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    label: {
        fontSize: 9,
        color: '#666',
    },
    value: {
        fontSize: 9,
        fontWeight: 'bold',
    },
    divider: {
        borderBottomWidth: 1,
        borderBottomColor: '#ddd',
        marginVertical: 6,
    },
    section: {
        marginBottom: 10,
    },
    sectionTitle: {
        fontSize: 10,
        fontWeight: 'bold',
        marginBottom: 4,
        color: '#333',
    },
    paymentRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 3,
        paddingVertical: 2,
    },
    totalBox: {
        backgroundColor: '#e8f5e9',
        padding: 8,
        borderRadius: 3,
        marginTop: 6,
    },
    totalLabel: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#2e7d32',
    },
    balanceBox: {
        backgroundColor: '#fff3e0',
        padding: 8,
        borderRadius: 3,
        marginTop: 6,
        borderWidth: 1,
        borderColor: '#ff9800',
    },
    balanceLabel: {
        fontSize: 11,
        fontWeight: 'bold',
        color: '#e65100',
    },
    clearedBox: {
        backgroundColor: '#e8f5e9',
        padding: 8,
        borderRadius: 3,
        marginTop: 6,
        borderWidth: 1,
        borderColor: '#4caf50',
    },
    clearedLabel: {
        fontSize: 11,
        fontWeight: 'bold',
        color: '#2e7d32',
    },
    footer: {
        textAlign: 'center',
        fontSize: 8,
        color: '#999',
        marginTop: 15,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#ddd',
    },
});

export interface PaymentReceiptData {
    receiptNumber: string;
    date: string;
    businessName: string;
    businessAddress?: string;
    businessPhone?: string;
    customerName: string;
    customerPhone?: string;
    saleNumber: string;
    saleDate: string;
    originalTotal: number;
    previouslyPaid: number;
    thisPayment: number;
    totalPaid: number;
    remainingBalance: number;
    paymentMethod: string;
}

function formatNaira(amount: number): string {
    return `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;
}

export function PaymentReceiptPDF({ data }: { data: PaymentReceiptData }) {
    const isCleared = data.remainingBalance <= 0;

    return (
        <Document>
            <Page size={[226, 500]} style={styles.page}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.businessName}>{data.businessName}</Text>
                    {data.businessAddress && (
                        <Text style={styles.businessInfo}>{data.businessAddress}</Text>
                    )}
                    {data.businessPhone && (
                        <Text style={styles.businessInfo}>Tel: {data.businessPhone}</Text>
                    )}
                </View>

                <Text style={styles.title}>PAYMENT RECEIPT</Text>

                {/* Receipt Info */}
                <View style={styles.section}>
                    <View style={styles.row}>
                        <Text style={styles.label}>Receipt #:</Text>
                        <Text style={styles.value}>{data.receiptNumber}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Date:</Text>
                        <Text style={styles.value}>{data.date}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Payment Method:</Text>
                        <Text style={styles.value}>{data.paymentMethod.toUpperCase()}</Text>
                    </View>
                </View>

                <View style={styles.divider} />

                {/* Customer */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Customer</Text>
                    <View style={styles.row}>
                        <Text style={styles.label}>Name:</Text>
                        <Text style={styles.value}>{data.customerName}</Text>
                    </View>
                    {data.customerPhone && (
                        <View style={styles.row}>
                            <Text style={styles.label}>Phone:</Text>
                            <Text style={styles.value}>{data.customerPhone}</Text>
                        </View>
                    )}
                </View>

                <View style={styles.divider} />

                {/* Sale Reference */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Sale Reference</Text>
                    <View style={styles.row}>
                        <Text style={styles.label}>Sale #:</Text>
                        <Text style={styles.value}>{data.saleNumber}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Sale Date:</Text>
                        <Text style={styles.value}>{data.saleDate}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Original Total:</Text>
                        <Text style={styles.value}>{formatNaira(data.originalTotal)}</Text>
                    </View>
                </View>

                <View style={styles.divider} />

                {/* Payment Breakdown */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Payment Breakdown</Text>
                    <View style={styles.paymentRow}>
                        <Text style={styles.label}>Previously Paid:</Text>
                        <Text style={styles.value}>{formatNaira(data.previouslyPaid)}</Text>
                    </View>
                    <View style={styles.paymentRow}>
                        <Text style={[styles.value, { color: '#2e7d32', fontSize: 11 }]}>
                            This Payment:
                        </Text>
                        <Text style={[styles.value, { color: '#2e7d32', fontSize: 11 }]}>
                            {formatNaira(data.thisPayment)}
                        </Text>
                    </View>
                </View>

                {/* Total Paid */}
                <View style={styles.totalBox}>
                    <View style={styles.row}>
                        <Text style={styles.totalLabel}>Total Paid:</Text>
                        <Text style={styles.totalLabel}>{formatNaira(data.totalPaid)}</Text>
                    </View>
                </View>

                {/* Balance */}
                {isCleared ? (
                    <View style={styles.clearedBox}>
                        <Text style={styles.clearedLabel}>✓ FULLY PAID</Text>
                    </View>
                ) : (
                    <View style={styles.balanceBox}>
                        <View style={styles.row}>
                            <Text style={styles.balanceLabel}>BALANCE DUE:</Text>
                            <Text style={styles.balanceLabel}>
                                {formatNaira(data.remainingBalance)}
                            </Text>
                        </View>
                    </View>
                )}

                {/* Footer */}
                <Text style={styles.footer}>
                    Thank you for your payment!{'\n'}
                    {!isCleared && `Outstanding balance: ${formatNaira(data.remainingBalance)}\n`}
                    {data.businessName}
                </Text>
            </Page>
        </Document>
    );
}
