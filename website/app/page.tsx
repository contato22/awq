import Header   from "@/components/Header";
import Hero      from "@/components/Hero";
import Numbers   from "@/components/Numbers";
import Portfolio from "@/components/Portfolio";
import About     from "@/components/About";
import ESG       from "@/components/ESG";
import Careers   from "@/components/Careers";
import Contact   from "@/components/Contact";
import Footer    from "@/components/Footer";

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <Numbers />
        <Portfolio />
        <About />
        <ESG />
        <Careers />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
