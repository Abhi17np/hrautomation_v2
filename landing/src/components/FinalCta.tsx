export default function FinalCta() {
  return (
    <section id="book" className="bg-bg-tint py-32 md:py-40">
      <div className="rail text-center">
        <h2 className="type-section mx-auto max-w-[18ch] text-balance">
          See it with your own records
        </h2>
        <div className="mt-10">
          <a href="mailto:hello@infopaceindia.com?subject=Infopace%20HR%20demo"
             className="inline-flex min-h-11 items-center rounded-full bg-accent px-6
                        text-[17px] font-medium leading-none text-accent-on whitespace-nowrap
                        transition-colors duration-200 ease-out hover:bg-accent-hover
                        active:scale-[0.98]">
            Book a demo
          </a>
        </div>
      </div>
    </section>
  );
}
