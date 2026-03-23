import { Body, Button, Container, Head, Heading, Html, Preview, Text } from "@react-email/components";

type Props = { firstName: string; unsubscribeUrl?: string };

export function DripTravelTipsEmail({ firstName, unsubscribeUrl }: Props) {
  return (
    <Html lang="fr">
      <Head />
      <Preview>5 choses à savoir avant votre voyage en Colombie</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>5 repères pour votre Colombie</Heading>
          <Text style={text}>Bonjour {firstName},</Text>
          <Text style={text}>
            Pendant que nous peaufinons votre itinéraire, voici{" "}
            <a href="https://www.colombiesurmesure.com" style={link}>
              notre carnet de conseils
            </a>{" "}
            — altitude, saisons, et petites astuces locales.
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
const link = { color: "#1B4332" };
const fine = { fontSize: "12px", color: "#8A877D", marginTop: "24px" };
