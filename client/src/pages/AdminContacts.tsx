import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Search, Mail, Phone, MessageSquare } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";

interface ContactSubmission {
  id: string;
  name: string;
  email: string;
  phone?: string;
  preferredContact: string;
  message: string;
  createdAt: string;
}

export default function AdminContacts() {
  const [searchTerm, setSearchTerm] = useState("");

  const { data, isLoading } = useQuery<{ success: boolean; data: ContactSubmission[] }>({
    queryKey: ["/api/admin/contacts"],
  });

  const contacts = data?.data || [];
  
  const filteredContacts = contacts.filter(contact =>
    contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.message.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AdminLayout>
    <div className="space-y-6" data-testid="page-admin-contacts">
      <div>
        <h1 className="text-3xl font-bold">Contact Submissions</h1>
        <p className="text-muted-foreground mt-2">
          View and manage client inquiries from your website
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, email, or message..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
          data-testid="input-search-contacts"
        />
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Submissions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{contacts.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Email Preferred</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {contacts.filter(c => c.preferredContact === "email").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Phone Preferred</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {contacts.filter(c => c.preferredContact === "phone").length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contact List */}
      <div className="space-y-4">
        {filteredContacts.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No contact submissions found</p>
              <p className="text-sm text-muted-foreground">
                {searchTerm ? "Try a different search term" : "Submissions will appear here"}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredContacts.map((contact) => (
            <Card key={contact.id} data-testid={`contact-card-${contact.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-xl">{contact.name}</CardTitle>
                    <CardDescription className="flex items-center gap-4 mt-2">
                      <span className="flex items-center gap-1">
                        <Mail className="h-4 w-4" />
                        {contact.email}
                      </span>
                      {contact.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-4 w-4" />
                          {contact.phone}
                        </span>
                      )}
                    </CardDescription>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge variant={contact.preferredContact === "email" ? "default" : "secondary"}>
                      Prefers {contact.preferredContact}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {new Date(contact.createdAt).toLocaleDateString()} at{" "}
                      {new Date(contact.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium mb-2">Message:</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {contact.message}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="default"
                      onClick={() => window.open(`mailto:${contact.email}?subject=Re: Your inquiry to MindFit Mental Health`, '_blank')}
                      data-testid={`button-email-${contact.id}`}
                    >
                      <Mail className="mr-2 h-4 w-4" />
                      Send Email
                    </Button>
                    {contact.phone && (
                      <Button
                        variant="outline"
                        onClick={() => window.open(`tel:${contact.phone}`, '_blank')}
                        data-testid={`button-call-${contact.id}`}
                      >
                        <Phone className="mr-2 h-4 w-4" />
                        Call
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
    </AdminLayout>
  );
}
