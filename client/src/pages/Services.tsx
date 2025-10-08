import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Brain, Users, Calendar, Heart, Target, ArrowRight } from "lucide-react";

export default function Services() {
  const services = [
    {
      icon: Brain,
      title: "Individual Therapy",
      description: "One-on-one therapy sessions tailored to your child or teen's specific needs, using evidence-based approaches like CBT, DBT, and play therapy.",
      features: [
        "Personalized treatment plans",
        "Flexible scheduling options",
        "Age-appropriate therapeutic techniques",
        "Parent consultation and support",
      ],
    },
    {
      icon: Calendar,
      title: "OCD Consultations",
      description: "Specialized assessment and treatment for obsessive-compulsive disorder, using exposure and response prevention (ERP) and other proven interventions.",
      features: [
        "Comprehensive OCD assessment",
        "ERP therapy implementation",
        "Family education and support",
        "Progress tracking and adjustment",
      ],
    },
    {
      icon: Users,
      title: "Group Therapy",
      description: "Peer-supported therapeutic groups for children and teens dealing with similar challenges, fostering connection and shared growth.",
      features: [
        "Age-appropriate group sessions",
        "Social skills development",
        "Peer support and validation",
        "Guided by expert facilitators",
      ],
    },
    {
      icon: Target,
      title: "Behavior Plans",
      description: "Customized behavior intervention plans to address specific challenges at home, school, or in the community.",
      features: [
        "Functional behavior assessment",
        "Customized intervention strategies",
        "Parent and teacher training",
        "Ongoing monitoring and refinement",
      ],
    },
    {
      icon: Heart,
      title: "Family Therapy",
      description: "Collaborative sessions that strengthen family bonds, improve communication, and create healthier family dynamics.",
      features: [
        "Whole-family participation",
        "Communication skills training",
        "Conflict resolution strategies",
        "Strengthening family connections",
      ],
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary to-[hsl(180,40%,55%)] text-white py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6" data-testid="text-services-heading">
              Comprehensive Mental Health Services
            </h1>
            <p className="text-lg md:text-xl leading-relaxed text-white/90">
              From individual therapy to family support, we offer a full range of evidence-based 
              mental health services for kids, teens, and families.
            </p>
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-20 bg-background">
        <div className="max-w-7xl mx-auto px-6">
          <div className="space-y-12">
            {services.map((service, index) => (
              <Card key={index} className="border-2 overflow-hidden" data-testid={`card-service-${index}`}>
                <CardContent className="p-0">
                  <div className="grid md:grid-cols-3 gap-8">
                    {/* Left - Icon & Title */}
                    <div className="bg-[hsl(30,15%,97%)] p-8 flex flex-col justify-center">
                      <service.icon className="h-12 w-12 text-primary mb-4" />
                      <h2 className="text-2xl font-semibold mb-3">{service.title}</h2>
                      <p className="text-muted-foreground leading-relaxed">{service.description}</p>
                    </div>

                    {/* Right - Features */}
                    <div className="md:col-span-2 p-8 flex flex-col justify-center">
                      <h3 className="text-lg font-semibold mb-4">What's Included:</h3>
                      <ul className="space-y-3">
                        {service.features.map((feature, idx) => (
                          <li key={idx} className="flex items-start gap-3">
                            <div className="mt-1 h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <div className="h-2 w-2 rounded-full bg-primary"></div>
                            </div>
                            <span className="text-foreground leading-relaxed">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section className="py-20 bg-[hsl(30,15%,97%)]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold mb-4">Our Process</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Simple, transparent steps to get your family the support you need
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              { step: "01", title: "Initial Contact", desc: "Reach out via our contact form or phone" },
              { step: "02", title: "Assessment", desc: "Meet with our team for a comprehensive evaluation" },
              { step: "03", title: "Treatment Plan", desc: "Receive a personalized care plan tailored to your needs" },
              { step: "04", title: "Ongoing Care", desc: "Begin therapy with continuous support and progress tracking" },
            ].map((item, index) => (
              <div key={index} className="text-center" data-testid={`process-step-${index}`}>
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary text-white text-2xl font-bold mb-4">
                  {item.step}
                </div>
                <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                <p className="text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-background">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold mb-6">
            Ready to Get Started?
          </h2>
          <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
            Contact us today to schedule an initial consultation and take the first step 
            toward better mental health for your family.
          </p>
          <Link href="/contact">
            <Button size="lg" data-testid="button-services-cta">
              Schedule a Consultation
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
