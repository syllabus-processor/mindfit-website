import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { insertContactSchema, type InsertContact } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Phone, Mail, Clock } from "lucide-react";

export default function Contact() {
  const { toast } = useToast();

  const form = useForm<InsertContact>({
    resolver: zodResolver(insertContactSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      preferredContact: "email",
      message: "",
    },
  });

  const contactMutation = useMutation({
    mutationFn: async (data: InsertContact) => {
      return await apiRequest("POST", "/api/contact/submit", data);
    },
    onSuccess: () => {
      toast({
        title: "Message sent successfully!",
        description: "We'll get back to you within 24 hours.",
      });
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send message",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertContact) => {
    contactMutation.mutate(data);
  };

  const contactInfo = [
    {
      icon: MapPin,
      title: "Office Location",
      detail: "123 Wellness Way, Suite 200\nYour City, ST 12345",
    },
    {
      icon: Phone,
      title: "Phone",
      detail: "(555) 123-4567",
    },
    {
      icon: Mail,
      title: "Email",
      detail: "contact@mindfithealth.com",
    },
    {
      icon: Clock,
      title: "Office Hours",
      detail: "Mon-Fri: 8am - 7pm\nSat: 9am - 3pm",
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary to-[hsl(180,40%,55%)] text-white py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6" data-testid="text-contact-heading">
              Get in Touch
            </h1>
            <p className="text-lg md:text-xl leading-relaxed text-white/90">
              Ready to take the first step? We're here to answer your questions and 
              help you get started with mental health care for your family.
            </p>
          </div>
        </div>
      </section>

      {/* Contact Form & Info */}
      <section className="py-20 bg-background">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12">
            {/* Contact Form */}
            <div>
              <h2 className="text-2xl font-semibold mb-6">Send Us a Message</h2>
              <Card className="shadow-xl">
                <CardContent className="p-8">
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Full Name</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Enter your full name" 
                                {...field} 
                                data-testid="input-contact-name"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email Address</FormLabel>
                            <FormControl>
                              <Input 
                                type="email" 
                                placeholder="your.email@example.com" 
                                {...field} 
                                data-testid="input-contact-email"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone Number (Optional)</FormLabel>
                            <FormControl>
                              <Input 
                                type="tel" 
                                placeholder="(555) 123-4567" 
                                {...field} 
                                data-testid="input-contact-phone"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="preferredContact"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Preferred Contact Method</FormLabel>
                            <FormControl>
                              <RadioGroup
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                                className="flex gap-4"
                              >
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="email" id="email" data-testid="radio-contact-email" />
                                  <Label htmlFor="email" className="cursor-pointer">Email</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="phone" id="phone" data-testid="radio-contact-phone" />
                                  <Label htmlFor="phone" className="cursor-pointer">Phone</Label>
                                </div>
                              </RadioGroup>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="message"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Message</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Tell us about your needs and how we can help..."
                                className="min-h-[150px] resize-none"
                                {...field}
                                data-testid="textarea-contact-message"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button 
                        type="submit" 
                        className="w-full md:w-auto" 
                        size="lg"
                        disabled={contactMutation.isPending}
                        data-testid="button-contact-submit"
                      >
                        {contactMutation.isPending ? "Sending..." : "Send Message"}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </div>

            {/* Contact Info */}
            <div>
              <h2 className="text-2xl font-semibold mb-6">Contact Information</h2>
              <div className="space-y-6">
                {contactInfo.map((info, index) => (
                  <Card key={index} className="border-2" data-testid={`contact-info-${index}`}>
                    <CardContent className="p-6 flex gap-4">
                      <div className="flex-shrink-0">
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <info.icon className="h-6 w-6 text-primary" />
                        </div>
                      </div>
                      <div>
                        <h3 className="font-semibold mb-1">{info.title}</h3>
                        <p className="text-sm text-muted-foreground whitespace-pre-line">{info.detail}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card className="border-2 bg-[hsl(30,15%,97%)] mt-6">
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-3">After-Hours Support</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    For urgent mental health needs outside of office hours, please contact the 
                    National Suicide Prevention Lifeline at 988 or text "HELLO" to 741741 for 
                    the Crisis Text Line.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Map/Location Section */}
      <section className="py-20 bg-[hsl(30,15%,97%)]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-semibold mb-4">Visit Our Office</h2>
            <p className="text-lg text-muted-foreground">
              We're conveniently located and offer both in-person and telehealth appointments
            </p>
          </div>
          <div className="bg-muted rounded-2xl h-96 flex items-center justify-center border-2">
            <p className="text-muted-foreground">Map location would be displayed here</p>
          </div>
        </div>
      </section>
    </div>
  );
}
