"use client";

import { useState } from "react";
import Header from "@/components/Header";
import { Settings, Bell, Shield, Database, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface SettingsSectionProps {
  icon: React.ElementType;
  title: string;
  description: string;
  children?: React.ReactNode;
  [extra: string]: unknown;
}

function SettingsSection({ icon: Icon, title, description, children }: SettingsSectionProps) {
  return (
    <div className="card p-5 lg:p-6">
      <div className="flex items-start gap-3.5 mb-5">
        <div className="w-9 h-9 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-400 shrink-0">
          <Icon size={16} />
        </div>
        <div>
          <div className="text-sm font-semibold text-gray-900">{title}</div>
          <div className="text-[11px] text-gray-500 mt-0.5 font-medium">{description}</div>
        </div>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Toggle({ label, description, defaultChecked = false }: {
  label: string;
  description?: string;
  defaultChecked?: boolean;
}) {
  const [checked, setChecked] = useState(defaultChecked);

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => setChecked(!checked)}
      className="flex items-center justify-between py-2.5 w-full text-left group"
    >
      <div className="pr-4">
        <div className="text-sm text-gray-700 font-medium group-hover:text-gray-900 transition-colors">{label}</div>
        {description && <div className="text-[11px] text-gray-400 mt-0.5">{description}</div>}
      </div>
      <div
        className={cn(
          "relative w-10 h-[22px] rounded-full transition-colors shrink-0",
          checked ? "bg-brand-600" : "bg-gray-200"
        )}
      >
        <div
          className={cn(
            "absolute top-[3px] w-4 h-4 rounded-full bg-white shadow-sm transition-transform",
            checked ? "translate-x-[22px]" : "translate-x-[3px]"
          )}
        />
      </div>
    </button>
  );
}

function FormField({ label, children }: { label: string; children?: React.ReactNode; [extra: string]: unknown }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

const inputClass = "w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20 focus:bg-white transition-all placeholder:text-gray-400";

export default function SettingsPage() {
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <>
      <Header title="Settings" subtitle="AWQ Group · Preferências do workspace" />

      <div className="page-container max-w-4xl">
        <SettingsSection
          icon={Settings}
          title="Geral"
          description="Workspace e preferências de exibição"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Workspace Name">
              <input type="text" defaultValue="AWQ Group" className={inputClass} />
            </FormField>
            <FormField label="Moeda Padrão">
              <select className={inputClass}>
                <option>BRL — Real Brasileiro</option>
                <option>USD — US Dollar</option>
                <option>EUR — Euro</option>
              </select>
            </FormField>
            <FormField label="Início do Ano Fiscal">
              <select className={inputClass}>
                <option>Janeiro</option>
                <option>Abril</option>
                <option>Julho</option>
                <option>Outubro</option>
              </select>
            </FormField>
            <FormField label="Fuso Horário">
              <select className={inputClass}>
                <option>UTC-3 — Brasília</option>
                <option>UTC+0 — London</option>
                <option>UTC-5 — New York</option>
              </select>
            </FormField>
          </div>
        </SettingsSection>

        <SettingsSection
          icon={Bell}
          title="Notificações"
          description="Configure alertas e preferências de entrega"
        >
          <div className="divide-y divide-gray-100">
            <Toggle label="Alertas de milestone de receita" defaultChecked={true} />
            <Toggle label="Avisos de cliente em risco" description="Alerta quando probabilidade de churn > 70%" defaultChecked={true} />
            <Toggle label="Digest semanal por e-mail" defaultChecked={true} />
            <Toggle label="Alertas via Slack" description="Postar no canal #analytics" defaultChecked={false} />
            <Toggle label="Notificações de atualização de dados" defaultChecked={false} />
          </div>
        </SettingsSection>

        <SettingsSection
          icon={Shield}
          title="Segurança & Acesso"
          description="Gerencie permissões e acesso ao time"
        >
          <div className="divide-y divide-gray-100">
            {[
              { name: "Alex Whitmore", email: "alex@awqgroup.com", role: "Owner" },
              { name: "Sam Chen", email: "s.chen@jacqes.com", role: "Admin" },
              { name: "Priya Nair", email: "p.nair@jacqes.com", role: "Analyst" },
              { name: "Danilo", email: "danilo@jacqes.com", role: "CS Ops" },
            ].map((member) => (
              <div key={member.email} className="flex items-center gap-3 py-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-brand-400 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                  {member.name.split(" ").map((n) => n[0]).join("")}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">{member.name}</div>
                  <div className="text-[11px] text-gray-400 truncate">{member.email}</div>
                </div>
                <span className="badge-blue shrink-0">{member.role}</span>
              </div>
            ))}
          </div>
          <button className="btn-secondary text-xs mt-2">+ Convidar Membro</button>
        </SettingsSection>

        <SettingsSection
          icon={Database}
          title="Fontes de Dados"
          description="Integrações e pipelines de dados conectados"
        >
          <div className="divide-y divide-gray-100">
            {[
              { name: "Notion",            status: "Conectado",    lastSync: "2 min atrás"  },
              { name: "Google Analytics",   status: "Conectado",    lastSync: "1 hr atrás"   },
              { name: "Stripe",            status: "Conectado",    lastSync: "15 min atrás"  },
              { name: "HubSpot",           status: "Desconectado", lastSync: "—" },
            ].map((source) => (
              <div key={source.name} className="flex items-center justify-between py-3">
                <div>
                  <div className="text-sm font-medium text-gray-900">{source.name}</div>
                  <div className="text-[11px] text-gray-400 font-medium">Último sync: {source.lastSync}</div>
                </div>
                <span
                  className={source.status === "Conectado" ? "badge-green" : "badge-red"}
                >
                  {source.status}
                </span>
              </div>
            ))}
          </div>
        </SettingsSection>

        {/* Save button */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            className={cn(
              "btn-primary flex items-center gap-2",
              saved && "bg-emerald-600 hover:bg-emerald-700"
            )}
          >
            {saved ? (
              <>
                <Check size={14} />
                Salvo
              </>
            ) : (
              "Salvar Alterações"
            )}
          </button>
        </div>
      </div>
    </>
  );
}
