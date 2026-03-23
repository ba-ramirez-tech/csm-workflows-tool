import { Body, Container, Head, Heading, Html, Preview, Text } from "@react-email/components";

type Props = { firstName: string; regionLabel: string; unsubscribeUrl?: string };

export function DripRegionHighlightEmail({ firstName, regionLabel, unsubscribeUrl }: Props) {
  return (
    <Html lang="fr">
      <Head />
      <Preview>Expériences incontournables dans la région qui vous inspire</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Autour de {regionLabel}</Heading>
          <Text style={text}>Bonjour {firstName},</Text>
          <Text style={text}>
            Vous nous avez indiqué un intérêt pour <strong>{regionLabel}</strong>. Nous sélectionnons des expériences
            francophones, hors des sentiers trop battus, avec des partenaires locaux de confiance.
          </Text>
          {unsubscribeUrl ? (
            <Text style={fine}>
              <a href={unsubscribeUrl}>Ne plus recevoir ces emails</a>
            </Text>
          ) : null}
        </Container>
      </Body>
    </Html>
  );
}

const main = { backgroundColor: "#FDF8F0", fontFamily: "DM Sans, Helvetica, sans-serif" };
const container = { margin: "0 auto", padding: "32px 24px", maxWidth: "560px" };
const h1 = { color: "#1B4332", fontSize: "22px" };
const text = { color: "#1A1A18", fontSize: "15px", lineHeight: "24px" };
const fine = { fontSize: "12px", color: "#8A877D", marginTop: "24px" };
