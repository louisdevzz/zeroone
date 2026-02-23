import { Navbar } from "@/components/landing/navbar";
import { Hero } from "@/components/landing/hero";
import { Features } from "@/components/landing/features";
import { ProvidersMarquee } from "@/components/landing/providers-marquee";
import { Testimonials } from "@/components/landing/testimonials";
import { Pricing } from "@/components/landing/pricing";
import { Footer } from "@/components/landing/footer";

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": "https://zeroonec.xyz/#website",
      url: "https://zeroonec.xyz",
      name: "ZeroOne",
      description: "Deploy AI agents in one click. No infra. No hassle.",
      publisher: { "@id": "https://zeroonec.xyz/#organization" },
    },
    {
      "@type": "Organization",
      "@id": "https://zeroonec.xyz/#organization",
      name: "ZeroOne",
      url: "https://zeroonec.xyz",
      logo: {
        "@type": "ImageObject",
        url: "https://zeroonec.xyz/logo.png",
      },
      sameAs: ["https://github.com/zeroclaw-labs/zeroclaw"],
    },
    {
      "@type": "SoftwareApplication",
      name: "ZeroOne",
      applicationCategory: "DeveloperApplication",
      operatingSystem: "Linux, Docker",
      url: "https://zeroonec.xyz",
      description:
        "ZeroClaw-as-a-Service platform. Deploy and manage ZeroClaw AI agent instances with ~5MB RAM each inside isolated Docker containers.",
      offers: [
        {
          "@type": "Offer",
          name: "Hobby",
          price: "0",
          priceCurrency: "USD",
          description: "1 active agent, free forever",
        },
        {
          "@type": "Offer",
          name: "Pro",
          price: "9",
          priceCurrency: "USD",
          billingIncrement: "month",
          description: "Up to 10 active agents, custom domain, priority resources",
        },
      ],
    },
  ],
};

export default function LandingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="min-h-screen bg-background text-foreground">
        <Navbar />
        <main>
          <Hero />
          <Features />
          <ProvidersMarquee />
          <Testimonials />
          <Pricing />
        </main>
        <Footer />
      </div>
    </>
  );
}
