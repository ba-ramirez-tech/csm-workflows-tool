import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from "@react-email/components";

type Props = { firstName: string; intakeUrl: string; currentStep: number; totalSteps: number };

export function IntakeReminderEmail({ firstName, intakeUrl, currentStep, totalSteps }: Props) {
  return (
    <Html lang="fr">
      <Head />
      <Preview>Votre questionnaire vous attend — reprenez où vous en étiez.</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Il vous reste quelques clics ✨</Heading>
          <Text style={text}>Bonjour {firstName},</Text>
          <Text style={text}>
            Vous avez complété {Math.max(0, currentStep - 1)} étape(s) sur {totalSteps}. Reprenez quand vous voulez —
            vos réponses sont sauvegardées.
          </Text>
          <Section style={btnWrap}>
            <Button href={intakeUrl} style={button}>
              Continuer mon questionnaire
            </Button>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const main = { backgroundColor: "#FDF8F0", fontFamily: "DM Sans, Helvetica, sans-serif" };
const container = { margin: "0 auto", padding: "32px 24px", maxWidth: "560px" };
const h1 = { color: "#1B4332", fontSize: "22px", margin: "0 0 20px" };
const text = { color: "#1A1A18", fontSize: "15px", lineHeight: "24px" };
const btnWrap = { textAlign: "center" as const, margin: "28px 0" };
const button = {
  backgroundColor: "#D4A853",
  color: "#1A1A18",
  padding: "14px 28px",
  borderRadius: "999px",
  textDecoration: "none",
  fontWeight: 600,
};
