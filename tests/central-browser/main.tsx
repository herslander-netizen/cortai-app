import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRoot } from "react-dom/client";

import { CentralDeAtendimento } from "../../src/components/whatsapp/CentralDeAtendimento";
import "../../src/styles.css";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
});

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <main data-testid="central-bancada" className="mx-auto min-h-dvh max-w-[1320px] bg-ink px-3 py-6 text-paper sm:px-5">
      <CentralDeAtendimento />
    </main>
  </QueryClientProvider>,
);
