import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Heart, Award, Users, Target } from "lucide-react";

export default function About() {
  const teamMembers = [
    {
      name: "Dr. Sarah Johnson",
      role: "Clinical Director & Licensed Psychologist",
      initials: "SJ",
      bio: "Dr. Johnson specializes in child and adolescent psychology with over 15 years of experience. She leads our clinical team with a focus on evidence-based, compassionate care.",
    },
    {
      name: "Michael Chen, LMFT",
      role: "Licensed Marriage & Family Therapist",
      initials: "MC",
      bio: "Michael brings expertise in family systems therapy and has helped countless families navigate complex dynamics and strengthen their relationships.",
    },
    {
      name: "Emily Rodriguez, LCSW",
      role: "Teen & Young Adult Specialist",
      initials: "ER",
      bio: "Emily specializes in working with teenagers and young adults, addressing anxiety, depression, and identity development with warmth and skill.",
    },
    {
      name: "Dr. James Park, PhD",
      role: "OCD & Anxiety Specialist",
      initials: "JP",
      bio: "Dr. Park is certified in Exposure and Response Prevention (ERP) therapy and has extensive experience treating OCD and anxiety disorders in children and teens.",
    },
    {
      name: "Lisa Anderson, LCSW",
      role: "Child & Play Therapy Specialist",
      initials: "LA",
      bio: "Lisa uses play therapy and creative approaches to help younger children express themselves and work through challenges in developmentally appropriate ways.",
    },
    {
      name: "David Martinez, LPCC",
      role: "Behavioral Intervention Specialist",
      initials: "DM",
      bio: "David develops and implements behavior plans for children with challenging behaviors, working closely with families and schools to create positive change.",
    },
  ];

  const values = [
    {
      icon: Heart,
      title: "Compassionate Care",
      description: "We believe in treating every client and family with empathy, respect, and genuine care.",
    },
    {
      icon: Award,
      title: "Clinical Excellence",
      description: "Our team stays current with the latest research and uses only evidence-based therapeutic approaches.",
    },
    {
      icon: Users,
      title: "Collaborative Approach",
      description: "We work as partners with families, involving them in every step of the treatment journey.",
    },
    {
      icon: Target,
      title: "Results-Focused",
      description: "We measure progress and adjust our approach to ensure families see meaningful, lasting change.",
    },
  ];

  const faqs = [
    {
      question: "Do you accept insurance?",
      answer: "We work with most major insurance providers. Our team will verify your coverage and help you understand your benefits before your first appointment. We also offer self-pay options for those who prefer not to use insurance.",
    },
    {
      question: "What ages do you work with?",
      answer: "We specialize in working with children (ages 5+), teens, and young adults up to age 25. We also provide family therapy for families of all configurations.",
    },
    {
      question: "How long are therapy sessions?",
      answer: "Individual therapy sessions are typically 50 minutes. Family therapy sessions are 60-90 minutes depending on the number of participants and treatment needs.",
    },
    {
      question: "Do you offer telehealth appointments?",
      answer: "Yes! We offer secure telehealth sessions for many of our services, making therapy more accessible for busy families. Some services, like initial assessments, may require in-person visits.",
    },
    {
      question: "How do I know if my child needs therapy?",
      answer: "If you're noticing changes in behavior, mood, school performance, or social relationships, therapy can help. We offer free 15-minute consultation calls to discuss your concerns and determine if therapy is a good fit.",
    },
    {
      question: "What can I expect in the first session?",
      answer: "The first session focuses on getting to know your family, understanding your concerns, and gathering information to create a personalized treatment plan. It's a collaborative conversation where questions are encouraged.",
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary to-[hsl(180,40%,55%)] text-white py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6" data-testid="text-about-heading">
              About MindFit Mental Health
            </h1>
            <p className="text-lg md:text-xl leading-relaxed text-white/90">
              We're a team of dedicated mental health professionals committed to transforming 
              the way families access and experience mental health care.
            </p>
          </div>
        </div>
      </section>

      {/* Mission & Values */}
      <section className="py-20 bg-background">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center mb-16">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold mb-6">Our Mission</h2>
            <p className="text-lg leading-relaxed text-foreground">
              To provide accessible, evidence-based mental health care that empowers children, teens, 
              and families to thrive. We combine clinical expertise with modern technology to make therapy 
              more effective, efficient, and family-friendly.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => (
              <Card key={index} className="border-2 text-center" data-testid={`value-card-${index}`}>
                <CardContent className="p-6">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                    <value.icon className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-3">{value.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{value.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section id="team" className="py-20 bg-[hsl(30,15%,97%)]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold mb-4">Meet Our Team</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Licensed, experienced mental health professionals who are passionate about helping families
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {teamMembers.map((member, index) => (
              <Card key={index} className="border-2" data-testid={`team-card-${index}`}>
                <CardContent className="p-6 text-center">
                  <Avatar className="w-32 h-32 mx-auto mb-4">
                    <AvatarFallback className="bg-primary/10 text-primary text-2xl font-semibold">
                      {member.initials}
                    </AvatarFallback>
                  </Avatar>
                  <h3 className="text-xl font-semibold mb-1">{member.name}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{member.role}</p>
                  <p className="text-sm leading-relaxed text-foreground">{member.bio}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 bg-background">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold mb-4">Frequently Asked Questions</h2>
            <p className="text-lg text-muted-foreground">
              Common questions we hear from families
            </p>
          </div>

          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`} className="border rounded-lg px-6" data-testid={`faq-item-${index}`}>
                <AccordionTrigger className="text-left font-semibold hover:no-underline">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Tech-Forward Section */}
      <section className="py-20 bg-[hsl(30,15%,97%)]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold mb-6">Tech-Empowered Care</h2>
            <p className="text-lg leading-relaxed text-foreground mb-8">
              We leverage modern technology to enhance every aspect of mental health care—from secure telehealth 
              sessions to streamlined scheduling, digital progress tracking, and family communication tools. 
              Our HIPAA-compliant platform makes therapy more accessible while maintaining the highest standards 
              of privacy and security.
            </p>
            <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <div className="h-2 w-2 rounded-full bg-green-500"></div>
              <span>HIPAA Compliant • Secure • Private</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
