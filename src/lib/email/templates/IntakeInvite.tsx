import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from "@react-email/components";

type Props = { firstName: string; intakeUrl: string };

export function IntakeInviteEmail({ firstName, intakeUrl }: Props) {
  return (
    <Html lang="fr">
      <Head />
      <Preview>Racontez-nous votre voyage de rêve pour Colombie sur mesure.</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Colombie sur mesure</Heading>
          <Text style={text}>Bonjour {firstName},</Text>
          <Text style={text}>
            Pour préparer un voyage qui vous ressemble, nous avons préparé un court questionnaire (environ 4
            minutes). Vos réponses restent confidentielles et aident votre concierge à tout orchestrer.
          </Text>
          <Section style={btnWrap}>
            <Button href={intakeUrl} style={button}>
              Commencer mon questionnaire
            </Button>
          </Section>
          <Text style={muted}>Si le bouton ne fonctionne pas, copiez ce lien : {intakeUrl}</Text>
        </Container>
      </Body>
    </Html>
  );
}

const main = { backgroundColor: "#FDF8F0", fontFamily: "DM Sans, Helvetica, sans-serif" };
const container = { margin: "0 auto", padding: "32px 24px", maxWidth: "560px" };
const h1 = { color: "#1B4332", fontSize: "24px", margin: "0 0 24px" };
const text = { color: "#1A1A18", fontSize: "15px", lineHeight: "24px" };
const btnWrap = { textAlign: "center" as const, margin: "28px 0" };
const button = {
  backgroundColor: "#1B4332",
  color: "#fff",
  padding: "14px 28px",
  borderRadius: "999px",
  textDecoration: "none",
  fontWeight: 600,
};
const muted = { color: "#8A877D", fontSize: "12px", lineHeight: "18px" };
