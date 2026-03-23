import { Body, Container, Head, Heading, Html, Hr, Preview, Section, Text } from "@react-email/components";

type Props = {
  firstName: string;
  conciergeName: string;
  summaryLines: string[];
  unsubscribeUrl?: string;
};

export function IntakeConfirmationEmail({ firstName, conciergeName, summaryLines, unsubscribeUrl }: Props) {
  return (
    <Html lang="fr">
      <Head />
      <Preview>Merci — votre concierge prépare votre expérience.</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Merci {firstName} ! 🇨🇴</Heading>
          <Text style={text}>
            Nous avons bien reçu vos préférences. <strong>{conciergeName}</strong> vous contactera sous 24–48h pour
            la suite.
          </Text>
          <Hr style={hr} />
          <Text style={sub}>En résumé :</Text>
          {summaryLines.map((line) => (
            <Text key={line} style={bullet}>
              • {line}
            </Text>
          ))}
          {unsubscribeUrl ? (
            <Text style={fine}>
              <a href={unsubscribeUrl} style={link}>
                Se désabonner des emails de découverte
              </a>
            </Text>
          ) : null}
        </Container>
      </Body>
    </Html>
  );
}

const main = { backgroundColor: "#FDF8F0", fontFamily: "DM Sans, Helvetica, sans-serif" };
const container = { margin: "0 auto", padding: "32px 24px", maxWidth: "560px" };
const h1 = { color: "#1B4332", fontSize: "24px", margin: "0 0 16px" };
const text = { color: "#1A1A18", fontSize: "15px", lineHeight: "24px" };
const hr = { borderColor: "#E8E0D4", margin: "24px 0" };
const sub = { color: "#1B4332", fontWeight: 600, fontSize: "14px" };
const bullet = { color: "#5C5A52", fontSize: "14px", margin: "4px 0" };
const fine = { fontSize: "12px", color: "#8A877D", marginTop: "28px" };
const link = { color: "#1B4332" };
