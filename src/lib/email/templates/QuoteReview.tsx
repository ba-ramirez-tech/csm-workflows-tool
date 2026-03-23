import { Body, Container, Head, Heading, Html, Link, Preview, Section, Text } from "@react-email/components";

type Props = {
  quoteName: string;
  clientName: string;
  printUrl: string;
  validUntilLabel: string;
};

/** Internal / review email: PDF is print view; document row is already on the client file. */
export function QuoteReviewEmail({ quoteName, clientName, printUrl, validUntilLabel }: Props) {
  return (
    <Html>
      <Head />
      <Preview>Devis — {quoteName}</Preview>
      <Body style={{ fontFamily: "sans-serif", backgroundColor: "#f6f9fc", padding: 24 }}>
        <Container style={{ maxWidth: 560, margin: "0 auto", backgroundColor: "#fff", padding: 24, borderRadius: 8 }}>
          <Heading style={{ fontSize: 20, margin: "0 0 16px" }}>Devis enregistré sur la fiche client</Heading>
          <Text style={{ margin: "0 0 12px", color: "#333" }}>
            <strong>{quoteName}</strong> — client : {clientName}
          </Text>
          <Text style={{ margin: "0 0 16px", color: "#333", fontSize: 14 }}>
            Le PDF (export impression) est référencé sur la fiche client avant envoi. Validité indicative :{" "}
            {validUntilLabel}.
          </Text>
          <Section>
            <Link href={printUrl} style={{ color: "#0d9488", fontWeight: 600 }}>
              Ouvrir la version imprimable / PDF
            </Link>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
