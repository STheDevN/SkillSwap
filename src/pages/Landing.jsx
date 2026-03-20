import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button.jsx";
import ThemeToggle from "@/components/ThemeToggle.jsx";
import { ArrowRight, Users, Calendar, Star, Repeat, Quote, HelpCircle } from "lucide-react";
import { motion } from "framer-motion";
import { Avatar, AvatarFallback } from "@/components/ui/avatar.jsx";
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from "@/components/ui/carousel.jsx";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion.jsx";
import heroIllustration from "@/assets/hero-illustration.png";

const testimonials = [
  {
    name: "Aisha M.",
    initials: "AM",
    skill: "Learned Python",
    quote:
      "I taught graphic design and learned Python in return. SkillSwap made it feel effortless — my partner was patient and brilliant.",
  },
  {
    name: "Carlos R.",
    initials: "CR",
    skill: "Learned Guitar",
    quote:
      "Trading Spanish lessons for guitar was the best deal I ever made. We still jam together every week!",
  },
  {
    name: "Priya K.",
    initials: "PK",
    skill: "Learned UX Design",
    quote:
      "As a data analyst, I never thought I'd pick up UX design. My swap partner made complex concepts so approachable.",
  },
  {
    name: "Jordan T.",
    initials: "JT",
    skill: "Learned Photography",
    quote:
      "I swapped my cooking skills for photography lessons. Now my food photos actually look as good as they taste.",
  },
  {
    name: "Lena S.",
    initials: "LS",
    skill: "Learned Japanese",
    quote:
      "Six months of language exchange and I can hold real conversations in Japanese. This platform changed my life.",
  },
];

const features = [
  {
    icon: Repeat,
    title: "Skill Exchange",
    description: "Teach what you know, learn what you don't. Every user is both a teacher and a learner.",
  },
  {
    icon: Users,
    title: "Smart Matching",
    description: "Get matched with peers whose teaching skills align with your learning goals.",
  },
  {
    icon: Calendar,
    title: "Easy Scheduling",
    description: "Request sessions, set your availability, and manage everything from your dashboard.",
  },
  {
    icon: Star,
    title: "Build Reputation",
    description: "Earn ratings and reviews to build credibility in the community.",
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: "easeOut" },
  }),
};

const floatAnimation = {
  y: [0, -12, 0],
  transition: {
    duration: 4,
    repeat: Infinity,
    ease: "easeInOut",
  },
};

const faqs = [
  {
    q: "Is SkillSwap really free?",
    a: "Yes! SkillSwap is completely free. The concept is simple — you teach a skill and learn one in return. No money changes hands, just knowledge.",
  },
  {
    q: "How does the matching work?",
    a: "When you sign up you list skills you can teach and skills you want to learn. Our smart matching algorithm finds peers whose teaching skills align with your learning goals, and vice versa.",
  },
  {
    q: "What kinds of skills can I exchange?",
    a: "Anything! Programming, languages, music, cooking, design, photography, marketing — if you can teach it online, it belongs on SkillSwap.",
  },
  {
    q: "How are sessions conducted?",
    a: "Once matched, you and your partner agree on a time. Sessions happen via the built-in video link or any platform you prefer. Each session is tracked on your dashboard.",
  },
  {
    q: "What if my partner cancels or doesn't show up?",
    a: "You can rate and review every session. Consistent no-shows affect a user's reputation score, so the community stays reliable and respectful.",
  },
  {
    q: "Can I swap with multiple people at once?",
    a: "Absolutely. You can have as many active swaps as you like. Many users run two or three exchanges simultaneously to accelerate their learning.",
  },
];

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((faq) => ({
    "@type": "Question",
    name: faq.q,
    acceptedAnswer: { "@type": "Answer", text: faq.a },
  })),
};

const Landing = () => {
  return (
    <div className="min-h-screen bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      <nav className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" className="text-xl font-bold text-primary">
            Skill<span className="text-secondary">Swap</span>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" asChild>
              <Link to="/login">Log in</Link>
            </Button>
            <Button asChild>
              <Link to="/signup">Get Started</Link>
            </Button>
          </div>
        </div>
      </nav>

      <section className="container mx-auto px-4 py-16 lg:py-24">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <motion.div initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7 }}>
            <span className="mb-4 inline-block rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-accent-foreground">
              Peer-to-peer learning
            </span>
            <h1 className="max-w-xl text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Learn a skill.{" "}
              <span className="text-primary">Teach a skill.</span>{" "}
              <span className="text-secondary">Grow together.</span>
            </h1>
            <p className="mt-6 max-w-lg text-lg text-muted-foreground">
              SkillSwap connects you with people who want to learn what you teach — and teach what you want to
              learn. No fees, just knowledge exchange.
            </p>
            <div className="mt-10 flex items-center gap-4">
              <Button size="lg" asChild>
                <Link to="/signup">
                  Start Swapping <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/login">I have an account</Link>
              </Button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="relative flex items-center justify-center"
          >
            <div className="absolute inset-0 -z-10 mx-auto h-72 w-72 rounded-full bg-primary/20 blur-3xl lg:h-96 lg:w-96" />
            <motion.img
              src={heroIllustration}
              alt="Two people exchanging knowledge orbs — representing peer-to-peer skill exchange"
              className="w-full max-w-lg rounded-2xl shadow-2xl"
              animate={floatAnimation}
            />
          </motion.div>
        </div>
      </section>

      <section className="border-y bg-muted/50 py-8">
        <div className="container mx-auto px-4">
          <motion.div
            className="grid grid-cols-2 gap-6 text-center md:grid-cols-4"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
          >
            {[
              { value: "1 000+", label: "Active learners" },
              { value: "250+", label: "Skills available" },
              { value: "5 000+", label: "Sessions completed" },
              { value: "4.8★", label: "Avg rating" },
            ].map((stat) => (
              <motion.div key={stat.label} variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}>
                <p className="text-2xl font-bold text-primary lg:text-3xl">{stat.value}</p>
                <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <section className="border-t bg-card py-20">
        <div className="container mx-auto px-4">
          <h2 className="mb-12 text-center text-3xl font-bold text-foreground">How it works</h2>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-50px" }}
                variants={fadeUp}
                whileHover={{ y: -6, transition: { duration: 0.2 } }}
                className="rounded-xl border bg-background p-6 text-center shadow-sm transition-shadow hover:shadow-lg"
              >
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-accent">
                  <f.icon className="h-6 w-6 text-accent-foreground" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-foreground">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t bg-muted/30 py-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <h2 className="mb-2 text-3xl font-bold text-foreground">What swappers say</h2>
            <p className="mb-12 text-muted-foreground">Real stories from our community</p>
          </motion.div>
          <div className="mx-auto max-w-4xl px-12">
            <Carousel opts={{ align: "start", loop: true }}>
              <CarouselContent>
                {testimonials.map((t) => (
                  <CarouselItem key={t.name} className="md:basis-1/2">
                    <motion.div
                      initial={{ opacity: 0, y: 16 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      className="flex h-full flex-col rounded-xl border bg-card p-6 shadow-sm"
                    >
                      <Quote className="mb-3 h-6 w-6 text-primary/40" />
                      <p className="flex-1 text-sm italic text-muted-foreground">"{t.quote}"</p>
                      <div className="mt-5 flex items-center gap-3 border-t pt-4">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                            {t.initials}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium text-foreground">{t.name}</p>
                          <p className="text-xs text-muted-foreground">{t.skill}</p>
                        </div>
                      </div>
                    </motion.div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious />
              <CarouselNext />
            </Carousel>
          </div>
        </div>
      </section>

      <section className="border-t py-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <HelpCircle className="mx-auto mb-3 h-8 w-8 text-primary/60" />
            <h2 className="mb-2 text-3xl font-bold text-foreground">Frequently asked questions</h2>
            <p className="mb-12 text-muted-foreground">Everything you need to know about SkillSwap</p>
          </motion.div>
          <div className="mx-auto max-w-2xl">
            <Accordion type="single" collapsible className="space-y-3">
              {faqs.map((faq, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05, duration: 0.4 }}
                >
                  <AccordionItem value={`faq-${i}`} className="rounded-lg border bg-card px-5">
                    <AccordionTrigger className="text-left text-sm font-medium text-foreground hover:no-underline">
                      {faq.q}
                    </AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground">{faq.a}</AccordionContent>
                  </AccordionItem>
                </motion.div>
              ))}
            </Accordion>
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl font-bold text-foreground">Ready to start learning?</h2>
            <p className="mx-auto mt-4 max-w-lg text-muted-foreground">
              Join a community of curious people sharing skills every day.
            </p>
            <Button size="lg" className="mt-8" asChild>
              <Link to="/signup">
                Create your free account <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </motion.div>
        </div>
      </section>

      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} SkillSwap. Built for learning.
        </div>
      </footer>
    </div>
  );
};

export default Landing;
