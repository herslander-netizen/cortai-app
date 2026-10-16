import { useEffect } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { ShowroomCortai } from "@/components/apresentacao/ShowroomCortai";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { LandingHero } from "@/components/landing/LandingHero";
import { LandingAudiences } from "@/components/landing/LandingAudiences";
import { LandingHowItWorks } from "@/components/landing/LandingHowItWorks";
import { LandingFaq } from "@/components/landing/LandingFaq";
import { LandingFinal } from "@/components/landing/LandingFinal";
import { initAnalytics, track } from "@/lib/analytics";
import { supabase } from "@/integrations/supabase/client";
import { destinoDoPapel } from "@/lib/guarda";
import { getSessao } from "@/lib/sessao.functions";
import { useReveal } from "@/hooks/useReveal";
export const Route = createFileRoute("/")({
 ssr:false,
 head:()=>({meta:[
  {title:"Cortaí — Agendamentos de um jeito mais simples"},
  {name:"description",content:"Encontre um estabelecimento, conheça as opções e organize seu próximo atendimento com o Cortaí."},
  {property:"og:title",content:"Cortaí — Agendamentos de um jeito mais simples"},
  {property:"og:description",content:"Encontre um estabelecimento, conheça as opções e organize seu próximo atendimento com o Cortaí."},
  {property:"og:type",content:"website"},{property:"og:locale",content:"pt_BR"},{name:"theme-color",content:"#06245A"}
 ]}),
 beforeLoad:async()=>{const {data}=await supabase.auth.getUser();if(data.user){const sessao=await getSessao();throw redirect({to:destinoDoPapel(sessao)});}},
 component:Inicio
});
function Inicio(){useReveal();useEffect(()=>{initAnalytics();track("landing_view")},[]);return <><a href="#conteudo" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-white focus:p-4 focus:text-[#06245A]">Pular para o conteúdo</a><LandingHeader/><main id="conteudo"><LandingHero/><section id="demo" className="scroll-mt-24 bg-white px-5 py-16 sm:px-8 sm:py-24"><div className="mx-auto max-w-7xl"><p className="mb-5 text-xs font-extrabold uppercase tracking-widest text-[#0A3F80]">Demonstração interativa</p><ShowroomCortai segmento="barbearia"/></div></section><LandingAudiences/><LandingHowItWorks/><LandingFaq/></main><LandingFinal/></>}
