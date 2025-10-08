import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Brain, Users, Calendar, Heart, ArrowRight, CheckCircle } from "lucide-react";

export default function Home() {
  const services = [
    {
      icon: Brain,
      title: "Individual Therapy",
      description: "Personalized, one-on-one sessions tailored to your child or teen's unique needs.",
    },
    {
      icon: Users,
      title: "Family Therapy",
      description: "Strengthen family dynamics and communication with collaborative sessions.",
    },
    {
      icon: Calendar,
      title: "OCD Consultations",
      description: "Specialized assessment and treatment planning for obsessive-compulsive disorder.",
    },
  ];

  const values = [
    {
      title: "Evidence-Based Care",
      description: "We use proven therapeutic approaches backed by research and clinical expertise.",
    },
    {
      title: "Technology-Enhanced",
      description: "Modern tools and platforms that make therapy more accessible and effective.",
    },
    {
      title: "Family-Centered",
      description: "We involve families in the healing process, creating lasting positive change.",
    },
  ];

  const testimonials = [
    {
      quote: "MindFit helped our family navigate some of our toughest challenges. The therapists are incredibly skilled and genuinely care.",
      author: "Parent of Teen Client",
      initials: "SK",
    },
    {
      quote: "The tech-forward approach made therapy accessible for our busy family. We could actually stick with treatment and see results.",
      author: "Parent of Child Client",
      initials: "JM",
    },
    {
      quote: "Finding a practice that specializes in OCD was life-changing. They really understand what we're going through.",
      author: "Parent of Teen Client",
      initials: "AL",
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative min-h-[80vh] flex items-center bg-gradient-to-br from-[hsl(210,65%,45%)] to-[hsl(180,40%,55%)] text-white overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItMnptMCAwdjItMnptMCAwdjItMnptMCAwdjItMnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-10"></div>
        
        <div className="relative max-w-7xl mx-auto px-6 py-20 w-full">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Column - Content */}
            <div className="space-y-8">
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-tight" data-testid="text-hero-heading">
                Tech-Empowered Mental Health Care for Families
              </h1>
              <p className="text-lg md:text-xl leading-relaxed text-white/90 max-w-2xl" data-testid="text-hero-subheading">
                Compassionate, evidence-based therapy for kids, teens, and families. 
                We combine clinical expertise with modern technology to help you thrive.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/contact">
                  <Button size="lg" className="bg-white text-primary hover:bg-white/90 text-base px-8" data-testid="button-hero-schedule">
                    Schedule Appointment
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link href="/services">
                  <Button 
                    size="lg" 
                    variant="outline" 
                    className="border-2 border-white bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 text-base px-8"
                    data-testid="button-hero-learn-more"
                  >
                    Learn More
                  </Button>
                </Link>
              </div>
            </div>

            {/* Right Column - Visual Element */}
            <div className="hidden lg:block">
              <div className="relative">
                <div className="absolute inset-0 bg-white/10 rounded-2xl blur-3xl"></div>
                <div className="relative bg-white/20 backdrop-blur-md rounded-2xl p-8 border border-white/30">
                  <div className="space-y-6">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-full bg-white/30 flex items-center justify-center">
                        <Heart className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-white">Compassionate Care</p>
                        <p className="text-sm text-white/80">Personalized for your family</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-full bg-white/30 flex items-center justify-center">
                        <CheckCircle className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-white">Proven Methods</p>
                        <p className="text-sm text-white/80">Evidence-based approaches</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-full bg-white/30 flex items-center justify-center">
                        <Users className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-white">Family-Centered</p>
                        <p className="text-sm text-white/80">Supporting the whole family</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Overview */}
      <section className="py-20 bg-background" data-testid="section-services-overview">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold mb-4">Our Services</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Comprehensive mental health support tailored to your family's unique needs
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {services.map((service, index) => (
              <Card key={index} className="border-2 hover:shadow-lg transition-shadow" data-testid={`card-service-${index}`}>
                <CardContent className="p-8">
                  <service.icon className="h-12 w-12 text-primary mb-4" />
                  <h3 className="text-xl font-semibold mb-3">{service.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{service.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="text-center mt-12">
            <Link href="/services">
              <Button variant="outline" size="lg" data-testid="button-view-all-services">
                View All Services
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Why MindFit */}
      <section className="py-20 bg-[hsl(30,15%,97%)]" data-testid="section-why-mindfit">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold mb-4">Why Choose MindFit?</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              We're redefining mental health care with a modern, tech-empowered approach
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {values.map((value, index) => (
              <div key={index} className="text-center" data-testid={`value-${index}`}>
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                  <CheckCircle className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3">{value.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team Preview */}
      <section className="py-20 bg-background" data-testid="section-team-preview">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold mb-4">Meet Our Expert Team</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Licensed therapists specializing in child, teen, and family mental health
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 max-w-4xl mx-auto">
            {[
              { name: "Dr. Sarah Johnson", role: "Clinical Director", initials: "SJ" },
              { name: "Michael Chen, LMFT", role: "Family Therapist", initials: "MC" },
              { name: "Emily Rodriguez, LCSW", role: "Teen Specialist", initials: "ER" },
            ].map((member, index) => (
              <div key={index} className="text-center" data-testid={`team-member-${index}`}>
                <Avatar className="w-32 h-32 mx-auto mb-4">
                  <AvatarFallback className="bg-primary/10 text-primary text-2xl font-semibold">
                    {member.initials}
                  </AvatarFallback>
                </Avatar>
                <h3 className="text-xl font-semibold mb-1">{member.name}</h3>
                <p className="text-sm text-muted-foreground">{member.role}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-12">
            <Link href="/about">
              <Button variant="outline" size="lg" data-testid="button-meet-full-team">
                Meet the Full Team
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-[hsl(30,15%,97%)]" data-testid="section-testimonials">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold mb-4">What Families Say</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Real stories from families we've had the privilege to support
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="border-2" data-testid={`testimonial-${index}`}>
                <CardContent className="p-8">
                  <p className="font-serif italic text-lg mb-6 leading-relaxed">"{testimonial.quote}"</p>
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {testimonial.initials}
                      </AvatarFallback>
                    </Avatar>
                    <p className="text-sm font-medium text-muted-foreground">{testimonial.author}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-gradient-to-br from-primary to-[hsl(180,40%,55%)] text-white" data-testid="section-final-cta">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold mb-6">
            Ready to Start Your Journey?
          </h2>
          <p className="text-lg md:text-xl leading-relaxed mb-8 text-white/90">
            Take the first step toward better mental health for your family. 
            Schedule a consultation with our expert team today.
          </p>
          <Link href="/contact">
            <Button size="lg" className="bg-white text-primary hover:bg-white/90 text-base px-8" data-testid="button-final-cta">
              Schedule Your Appointment
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
