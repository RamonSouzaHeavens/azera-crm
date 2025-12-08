import {
  Document,
  Page,
  Text,
  View,
  StyleSheet
} from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    padding: 48,
    fontFamily: 'Helvetica'
  },
  title: {
    textAlign: 'center',
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 12,
    letterSpacing: 1
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: '#0f172a',
    marginVertical: 6
  },
  paragraph: {
    fontSize: 11,
    color: '#111827',
    lineHeight: 1.6,
    marginBottom: 10
  },
  clauseTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    marginTop: 8,
    marginBottom: 2
  },
  signatureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 30
  },
  signature: {
    textAlign: 'center',
    fontSize: 10,
    borderTopWidth: 1,
    borderTopColor: '#0f172a',
    paddingTop: 4,
    width: '40%'
  }
})

export interface ContractData {
  templateName: string
  clientName: string
  value: string
  validity: string
  notes: string
  date: string
}

export const ContractDocument = ({ data }: { data: ContractData }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <Text style={styles.title}>{data.templateName.toUpperCase()}</Text>
      <View style={styles.divider} />

      <Text style={styles.paragraph}>
        Pelo presente instrumento particular, de um lado AZERA TECNOLOGIA, e de outro lado {data.clientName}.
      </Text>

      <Text style={styles.clauseTitle}>CLÁUSULA 1ª - DO VALOR:</Text>
      <Text style={styles.paragraph}>
        Pelos serviços prestados, a CONTRATANTE pagará à CONTRATADA o valor total de {data.value}.
      </Text>

      <Text style={styles.clauseTitle}>CLÁUSULA 2ª - OBSERVAÇÕES:</Text>
      <Text style={styles.paragraph}>{data.notes}</Text>

      <Text style={styles.clauseTitle}>CLÁUSULA 3ª - VALIDADE:</Text>
      <Text style={styles.paragraph}>
        Proposta válida por {data.validity} dias a contar de {data.date}.
      </Text>

      <View style={styles.signatureRow}>
        <Text style={styles.signature}>CONTRATADA</Text>
        <Text style={styles.signature}>CONTRATANTE</Text>
      </View>
    </Page>
  </Document>
)
