import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { formatCurrency } from '@/lib/currency';

const styles = StyleSheet.create({
    page: {
        padding: 40,
        fontSize: 11,
        fontFamily: 'Helvetica',
        lineHeight: 1.6,
    },
    header: {
        marginBottom: 30,
        borderBottom: '2 solid #000',
        paddingBottom: 15,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 10,
        color: '#666',
        textAlign: 'center',
    },
    section: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 10,
        color: '#000',
    },
    row: {
        flexDirection: 'row',
        marginBottom: 8,
    },
    label: {
        width: '35%',
        fontWeight: 'bold',
        color: '#555',
    },
    value: {
        width: '65%',
    },
    terms: {
        fontSize: 10,
        lineHeight: 1.8,
        textAlign: 'justify',
        marginBottom: 15,
    },
    signatureSection: {
        marginTop: 40,
        paddingTop: 20,
        borderTop: '1 solid #ddd',
    },
    signatureRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 50,
    },
    signatureBlock: {
        width: '45%',
    },
    signatureLine: {
        borderTop: '1 solid #000',
        marginBottom: 5,
    },
    signatureImage: {
        width: 150,
        height: 60,
        marginBottom: 5,
    },
    signatureLabel: {
        fontSize: 9,
        color: '#666',
    },
    footer: {
        position: 'absolute',
        bottom: 30,
        left: 40,
        right: 40,
        textAlign: 'center',
        fontSize: 8,
        color: '#999',
    },
});

interface ContractPDFProps {
    data: {
        title: string;
        contractType: string;
        employeeName: string;
        startDate: string;
        endDate?: string;
        salaryAmount?: number;
        salaryFrequency?: string;
        terms: string;
        employeeSignature?: string;
        employeeSignedDate?: string;
        employerSignature?: string;
        employerName?: string;
        employerSignedDate?: string;
        businessName: string;
    };
}

export const ContractPDF: React.FC<ContractPDFProps> = ({ data }) => (
    <Document>
        <Page size="A4" style={styles.page}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.title}>{data.title}</Text>
                <Text style={styles.subtitle}>{data.businessName}</Text>
            </View>

            {/* Contract Details */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Contract Information</Text>
                <View style={styles.row}>
                    <Text style={styles.label}>Contract Type:</Text>
                    <Text style={styles.value}>{data.contractType}</Text>
                </View>
                <View style={styles.row}>
                    <Text style={styles.label}>Employee:</Text>
                    <Text style={styles.value}>{data.employeeName}</Text>
                </View>
                <View style={styles.row}>
                    <Text style={styles.label}>Start Date:</Text>
                    <Text style={styles.value}>{data.startDate}</Text>
                </View>
                {data.endDate && (
                    <View style={styles.row}>
                        <Text style={styles.label}>End Date:</Text>
                        <Text style={styles.value}>{data.endDate}</Text>
                    </View>
                )}
                {data.salaryAmount && (
                    <View style={styles.row}>
                        <Text style={styles.label}>Compensation:</Text>
                        <Text style={styles.value}>
                            {formatCurrency(data.salaryAmount)} {data.salaryFrequency && `(${data.salaryFrequency})`}
                        </Text>
                    </View>
                )}
            </View>

            {/* Terms and Conditions */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Terms and Conditions</Text>
                <Text style={styles.terms}>{data.terms}</Text>
            </View>

            {/* Signatures */}
            <View style={styles.signatureSection}>
                <Text style={styles.sectionTitle}>Signatures</Text>
                <View style={styles.signatureRow}>
                    {/* Employee Signature */}
                    <View style={styles.signatureBlock}>
                        {data.employeeSignature ? (
                            <Image src={data.employeeSignature} style={styles.signatureImage} />
                        ) : (
                            <View style={{ height: 60 }}></View>
                        )}
                        <View style={styles.signatureLine}></View>
                        <Text style={styles.signatureLabel}>{data.employeeName}</Text>
                        <Text style={styles.signatureLabel}>Employee</Text>
                        {data.employeeSignedDate && (
                            <Text style={styles.signatureLabel}>Date: {data.employeeSignedDate}</Text>
                        )}
                    </View>

                    {/* Employer Signature */}
                    <View style={styles.signatureBlock}>
                        {data.employerSignature ? (
                            <Image src={data.employerSignature} style={styles.signatureImage} />
                        ) : (
                            <View style={{ height: 60 }}></View>
                        )}
                        <View style={styles.signatureLine}></View>
                        <Text style={styles.signatureLabel}>{data.employerName || 'Employer'}</Text>
                        <Text style={styles.signatureLabel}>Employer Representative</Text>
                        {data.employerSignedDate && (
                            <Text style={styles.signatureLabel}>Date: {data.employerSignedDate}</Text>
                        )}
                    </View>
                </View>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
                <Text>This is a legally binding document. Keep a copy for your records.</Text>
                <Text>Generated by JB-Manager Super App</Text>
            </View>
        </Page>
    </Document>
);
